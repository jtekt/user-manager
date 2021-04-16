const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const pjson = require('./package.json')
const dotenv = require('dotenv')
const router = require('./routes/employees.js')
const apiMetrics = require('prometheus-api-metrics')
const controller = require('./controllers/employee.js')

dotenv.config()

// Express port
const APP_PORT = process.env.APP_PORT || 80

// Time zone
process.env.TZ = 'Asia/Tokyo'

var app = express()
app.use(bodyParser.json())
app.use(cors())
app.use(apiMetrics())

app.get('/', (req, res) => {
  res.send({
    application_name: 'Employee account management API',
    author: 'Maxime MOREILLON',
    version: pjson.version,
    neo4j_url: process.env.NEO4J_URL,
    authentication_api_url: process.env.AUTHENTICATION_API_URL,
  })
})

app.use('/employees', router)
app.use('/users', router) // alias


// Start the server
app.listen(APP_PORT, () => console.log(`Employee manager listening on port ${APP_PORT}`))

// Create the administrator account if it does not exist
controller.create_admin_if_not_exists()
