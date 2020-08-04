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

// Create the administrator account if it does not exist
controller.create_admin_if_not_exists()

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

const router = express.Router()

router.use(auth.authenticate)

router.route('/find')
  .get(controller.find_employee)

app.route('/:employee_id')
  .get(controller.get_employee)
  .patch(controller.patch_employee)

app.route('/:employee_id/password')
  .put(controller.update_password)

app.use('/employees', router)



app.route('/employee')
  .get(auth.authenticate, controller.get_employee)





// Start the server
app.listen(APP_PORT, () => console.log(`Employee manager listening on port ${APP_PORT}`))
