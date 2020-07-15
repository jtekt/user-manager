const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const auth = require('@moreillon/authentication_middleware')
const pjson = require('./package.json')
const dotenv = require('dotenv')
const controller = require('./controllers/employee.js')

dotenv.config()

// Express port
const APP_PORT = process.env.APP_PORT || 80

// Time zone
process.env.TZ = 'Asia/Tokyo';


var app = express()
app.use(bodyParser.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send({
    application_name: 'Employee information management API',
    author: 'Maxime MOREILLON',
    version: pjson.version,
    neo4j_url: process.env.NEO4J_URL,
    authentication_api_url: process.env.AUTHENTICATION_API_URL
  })
})


app.route('/employee')
  .get(auth.authenticate, controller.get_employee)

app.route('/employees/find')
  .get(auth.authenticate, controller.find_employee)


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

app.get('/employee', auth.authenticate, controller.get_employee)
app.get('/find_employee', auth.authenticate, controller.find_employee);
app.get('/nodes_related_to_employee', auth.authenticate, controller.get_nodes_related_to_employee);

// Start the server
app.listen(APP_PORT, () => console.log(`Employee manager listening on port ${APP_PORT}`))
