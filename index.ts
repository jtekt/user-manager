import dotenv from "dotenv"
dotenv.config()

import express from "express"
import "express-async-errors"

import cors from "cors"
import apiMetrics from "prometheus-api-metrics"
import { version, author } from "./package.json"

import router_v1 from "./routes/v1/index"
import router_v2 from "./routes/v2/index"
import router_v3 from "./routes/v3/index"

import { smtp } from "./mail"
import { hostname as ldapHostname } from "./ldap"

import { REDIS_URL } from "./cache"

import {
  url as neo4j_url,
  init as db_init,
  get_connected as get_neo4j_connected,
} from "./db"
import { init as cache_init } from "./cache"

console.log(`= Account manager v${version} =`)

db_init()
cache_init()

// Express port
const { APP_PORT = 80, TZ } = process.env

// Time zone
process.env.TZ = TZ || "Asia/Tokyo"

export const app = express()
app.use(express.json())
app.use(cors())
app.use(apiMetrics())

// TODO: have in /routes/index
app.get("/", (req: Request, res: Response) => {
  res.send({
    application_name: "Account manager",
    author,
    version,
    neo4j: {
      url: neo4j_url,
      connected: get_neo4j_connected(),
    },
    smtp,
    ldap: {
      hostname: ldapHostname,
    },
    redis: {
      url: REDIS_URL,
    },
  })
})

app.use("/", router_v1)
app.use("/v1", router_v1)
app.use("/v2", router_v2)
app.use("/v3", router_v3)

// Express error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error(error)
  let { statusCode = 500, message = error } = error
  if (isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)
})

// Start the server
app.listen(APP_PORT, () =>
  console.log(`[Express] listening on port ${APP_PORT}`)
)
