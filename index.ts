import dotenv from "dotenv"
dotenv.config()
import { version } from "./package.json"
console.log(`= Account manager v${version} =`)

import express from "express"
import "express-async-errors"
import cors from "cors"
import promBundle from "express-prom-bundle"
import rootRouter from "./routes/index"
import errorHandler from "./utils/errorHandler"
import { init as db_init } from "./db"
import { init as cache_init } from "./cache"

db_init()
cache_init()

const { APP_PORT = 80, TZ } = process.env
process.env.TZ = TZ || "Asia/Tokyo"
const promOptions = { includeMethod: true, includePath: true }

export const app = express()
app.use(express.json())
app.use(cors())
app.use(promBundle(promOptions))
app.use("/", rootRouter)
app.use(errorHandler)

app.listen(APP_PORT, () =>
  console.log(`[Express] listening on port ${APP_PORT}`)
)
