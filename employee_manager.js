const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const axios = require('axios')
const neo4j = require('neo4j-driver').v1
const auth = require('@moreillon/authentication_middleware')
const dotenv = require('dotenv')
const bcrypt = require('bcrypt')

dotenv.config()

const driver = require('./neo4j_driver.js')
const controller = require('./controllers/employee.js')

const app_port = process.env.APP_PORT || 80

process.env.TZ = 'Asia/Tokyo';


function get_employee_id_for_viewing(req, res){
  if('employee_id' in req.body) return req.body.employee_id
  if('employee_id' in req.query) return req.query.employee_id

  if('user_id' in req.body) return req.body.user_id
  if('user_id' in req.query) return req.query.user_id

  // if nothing, just use the logged in user
  return res.locals.user.identity.low
}

function get_employee_id_for_modification(req, res){

  // If not requiring particular employee, just return self
  if(! ('employee_id' in req.body)) return res.locals.user.identity.low

  if(res.locals.user.identity.low !== req.body.employee_id) {
    // Does not get gaught by Neo4j catch!
    res.status(403).send(`Cannot edit someone else's info`)
    throw "Cannot edit someone else's info"
  }
  else return eq.body.employee_id

}


var app = express()
app.use(bodyParser.json())
app.use(cors())

app.get('/', (req,res) => {
  res.send('Employee manager API, Maxime MOREILLON')
})

app.route('/employees/:employee_id')
  .get(auth.authenticate, controller.get_employee)
  .patch(auth.authenticate, controller.patch_employee)

app.route('/employees/:employee_id/password')
  .put(auth.authenticate, controller.update_password)

app.route('/employees/:employee_id/related_nodes')
  .put(auth.authenticate, controller.get_nodes_related_to_employee)

/////////////
// LEGACY //
////////////

app.get('/employee', auth.authenticate, (req, res) => {
  // Route to retrieve an employee's data

  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee)
    WHERE id(employee)=toInt({employee_id})
    RETURN employee
    `, {
    employee_id: get_employee_id_for_viewing(req, res),
  })
  .then(result => {
    if(result.records.length < 1) return res.status(404).send('Not found')
    res.send(result.records[0].get('employee'))
  })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
})

app.get('/find_employee', auth.authenticate, (req, res) => {
  // Finding an employee using whichever of his properties

  const session = driver.session();
  session
  .run(`
    // Match all employees
    MATCH (employee:Employee)

    // Make a list of the keys of each node
    // Additionally, filter out fields that should not be searched
    WITH [key IN KEYS(employee) WHERE NOT key IN {exceptions}] AS keys, employee

    // Unwinding
    UNWIND keys as key

    // Filter nodes by looking for properties
    WITH key, employee
    WHERE toLower(toString(employee[key])) CONTAINS toLower({query})

    RETURN DISTINCT employee
    LIMIT 100
    `,
    {
      query: req.query.query,
      exceptions: [
        'password_hashed'
      ]
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});



app.get('/nodes_related_to_employee', auth.authenticate, controller.get_nodes_related_to_employee);



app.listen(app_port, () => console.log(`Employee manager listening on port ${app_port}`))
