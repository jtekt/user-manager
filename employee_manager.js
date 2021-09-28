const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const apiMetrics = require('prometheus-api-metrics')
const {version, author, name: application_name} = require('./package.json')
const dotenv = require('dotenv')
const router_v1 = require('./routes/v1/employees.js')
const router_v2 = require('./routes/v2/employees.js')
const group_router_v2 = require('./routes/v2/groups.js')

const controller = require('./controllers/v2/employee.js')

dotenv.config()

// Express port
const APP_PORT = process.env.APP_PORT || 80

// Time zone
process.env.TZ = process.env.TZ || 'Asia/Tokyo'

var app = express()
app.use(bodyParser.json())
app.use(cors())
app.use(apiMetrics())

app.get('/', (req, res) => {
  res.send({
    application_name,
    author,
    version,
    neo4j_url: process.env.NEO4J_URL,
    authentication_api_url: process.env.AUTHENTICATION_API_URL,
  })
})

app.use('/employees', router_v1)
app.use('/users', router_v1) // alias

app.use('/v2/employees', router_v2)
app.use('/v2/users', router_v2) // alias

app.use('/v2/groups', group_router_v2)


// Start the server
app.listen(APP_PORT, () => console.log(`Employee manager listening on port ${APP_PORT}`))

// Create the administrator account if it does not exist
controller.create_admin_if_not_exists()
