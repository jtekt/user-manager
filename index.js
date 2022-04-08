const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const apiMetrics = require('prometheus-api-metrics')
const {version, author, name: application_name} = require('./package.json')

const router_v1 = require('./routes/v1/index.js')
const router_v2 = require('./routes/v2/index.js')
const router_v3 = require('./routes/v3/index.js')

// TODO: Use controller v3
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


app.use('/', router_v1)
app.use('/v1', router_v1)

app.use('/v2', router_v2)
app.use('/v3', router_v3)

// Express error handler
app.use((error, req, res, next) => {
  console.error(error)
  let { statusCode = 500, message = error } = error
  if(isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)
})



// Start the server
app.listen(APP_PORT, () => console.log(`[Express] listening on port ${APP_PORT}`))

// Create the administrator account if it does not exist
create_admin_if_not_exists()

exports.app = app
