const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios')
const neo4j = require('neo4j-driver').v1

const secrets = require('./secrets');

const app_port = 8097;

process.env.TZ = 'Asia/Tokyo';

var driver = neo4j.driver(
  secrets.neo4j.url,
  neo4j.auth.basic(secrets.neo4j.username, secrets.neo4j.password)
)

var app = express()
app.use(bodyParser.json())
app.use(cors())

// Todo: replace by middleware
function check_authentication(req, res, next){

  let token = req.headers.authorization.split(" ")[1];
  if(!token) return res.status(400).send(`No token in authorization header`)

  axios.post(secrets.authentication_api_url, { jwt: token })
  .then(response => {
    res.locals.user = response.data
    next()
  })
  .catch(error => { res.status(400).send(error) })
}

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

app.get('/employee', check_authentication, (req, res) => {
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
});

app.get('/find_employee', check_authentication, (req, res) => {
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
    WHERE toLower(toStringemployeen[key])) CONTAINS toLower({query})

    RETURN DISTINCT employee
    LIMIT 200
    `,
    {
      query: req.body.query,
      exceptions: [
        'password_hashed'
      ]
    })
  .then(result => {
    if(result.records.length < 1) return res.status(404).send('Not found')
    res.send(result.records[0].get('employee'))
  })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});



app.get('/nodes_related_to_employee', check_authentication, (req, res) => {
  // Route to retrieve nodes related to one employee
  // WARNING: Might respond with a lot of data

  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee)
    WHERE id(employee)=toInt({employee_id})
    WITH employee
    MATCH (related_node)--(employee)
    RETURN related_node
    `,
    {
      employee_id: get_employee_id_for_viewing(req, res),
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});





app.get('/workplaces_of_employee', check_authentication, (req, res) => {
  // Route to retrieve a user's workplaces
  // here it is assumed that an employee can have multiple workplaces

  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee)-[:WORKS_IN]->(workplace:Workplace)
    WHERE id(employee)=toInt({employee_id})
    RETURN workplace
    `,
    {
      employee_id: get_employee_id_for_viewing(req, res),
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
})




app.post('/join_workplace', check_authentication, (req, res) => {
  // Route to join a workplace

  const session = driver.session();
  session
  .run(`
    // Find the employee
    MATCH (employee:Employee)
    WHERE id(employee)=toInt({employee_id})

    // Find the workplace
    WITH employee
    MATCH (workplace:Workplace)
    WHERE id(workplace)=toInt({workplace_id})

    // MERGE relationship
    MERGE (employee)-[:WORKS_IN]->(workplace)

    // Return
    RETURN employee, workplace
    `,
    {
      employee_id: get_employee_id_for_modification(req, res),
      workplace_id: req.body.workplace_id
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => {session.close()})
})

app.post('/leave_workplace', check_authentication, (req, res) => {
  // Route to leave a user's workplaces
  // here it is assumed that an employee can have multiple workplaces

  const session = driver.session();
  session
  .run(`
    // Find the employee and the workplace
    MATCH (employee:Employee)-[r:WORKS_IN]->(workplace:Workplace)
    WHERE id(employee)=toInt({employee_id}) AND id(workplace)=toInt({workplace_id})

    // delete relationship
    DELETE r

    // Return
    RETURN employee
    `,
    {
      employee_id: get_employee_id_for_modification(req, res),
      workplace_id: req.body.workplace_id
    })
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
})


app.post('/get_all_workplaces', function (req, res) {
  const session = driver.session();
  session
  .run(`
    MATCH (workplace:Workplace)
    RETURN workplace
    `,{})
  .then(result => {
    session.close();
    res.send(result.records);
  })
  .catch(error => res.status(400).send(`Error accessing DB: ${error}`))

});


app.get('/all_workplaces', (req, res) => {
  const session = driver.session();
  session
  .run(`
    MATCH (workplace:Workplace)
    RETURN workplace
    `,{})
  .then(result => { res.send(result.records) })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })

});

app.get('/workplace', (req, res) => {
  const session = driver.session();
  session
  .run(`
    MATCH (workplace:Workplace)
    WHERE id(workplace)=toInt({id})
    RETURN workplace
    `,{
      id: req.query.id
    })
  .then(result => {
    if(result.records.length < 1) return res.status(404).send('Workplace not found')
    res.send(result.records[0].get('workplace'))
  })
  .catch(error => { res.status(400).send(`Error accessing DB: ${error}`) })
  .finally( () => { session.close() })
});

app.post('/update_avatar_src', check_authentication, (req, res) => {
  // Could be combined with route to update all employee information
  const session = driver.session();
  session
  .run(`
    MATCH (employee:Employee)
    WHERE id(employee) = toInt({employee_id})
    SET employee.avatar_src={avatar_src}
    RETURN employee
    `, {
      employee_id: get_employee_id_for_modification(req, res),
      avatar_src: req.body.avatar_src
    })
    .then(result => { res.send(result.records) })
    .catch(error => res.status(400).send(`Error accessing DB: ${error}`))
    .finally( () => session.close())
});




app.listen(app_port, () => console.log(`Employee manager listening on port ${app_port}`))
