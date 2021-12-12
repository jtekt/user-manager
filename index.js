const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const apiMetrics = require('prometheus-api-metrics')
const {version, author, name: application_name} = require('./package.json')
const { middleware: auth_middleware } = require('./controllers/v2/auth.js')
const router_v1 = require('./routes/v1/employees.js')
const router_v2 = require('./routes/v2/employees.js')
const group_router_v2 = require('./routes/v2/groups.js')
const auth_router_v2 = require('./routes/v2/auth.js')
const { create_admin_if_not_exists } = require('./controllers/v2/employee.js')
const { smtp } = require('./mail.js')
const {
  url: neo4j_url,
  connected: neo4j_connected,
  init: db_init,
 } = require('./db.js')

dotenv.config()


console.log(`= Employee manager v${version} =`)

db_init()

// Express port
const APP_PORT = process.env.APP_PORT || 80

// Time zone
process.env.TZ = process.env.TZ || 'Asia/Tokyo'

const app = express()
app.use(express.json())
app.use(cors())
app.use(apiMetrics())

app.get('/', (req, res) => {
  res.send({
    application_name,
    author,
    version,
    neo4j: {
      url: neo4j_url,
      connected: neo4j_connected
    },
    smtp,
  })
})

// Auth route is not protected
app.use('/v2/auth', auth_router_v2)

// Authenticate all the followign routes
app.use(auth_middleware)
app.use('/employees', router_v1)
app.use('/users', router_v1) // alias
app.use('/v1/employees', router_v1) // alias
app.use('/v1/users', router_v1) // alias
app.use('/v2/employees', router_v2)
app.use('/v2/users', router_v2) // alias
app.use('/v2/groups', group_router_v2)

// Start the server
app.listen(APP_PORT, () => console.log(`[Express] listening on port ${APP_PORT}`))

// Create the administrator account if it does not exist
create_admin_if_not_exists()

exports.app = app
