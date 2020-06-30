const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const auth = require('@moreillon/authentication_middleware')
const dotenv = require('dotenv')

dotenv.config()

const controller = require('./controllers/employee.js')

const app_port = process.env.APP_PORT || 80

process.env.TZ = 'Asia/Tokyo';


var app = express()
app.use(bodyParser.json())
app.use(cors())

app.get('/', (req,res) => {
  res.send('Employee manager API, Maxime MOREILLON')
})

app.route('/employees/find')
  .get(auth.authenticate, controller.get_nodes_related_to_employee)

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



app.listen(app_port, () => console.log(`Employee manager listening on port ${app_port}`))
