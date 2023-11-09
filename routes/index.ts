import { Router } from "express"
import { SMTP_HOST, SMTP_PORT, SMTP_FROM } from "../mail"
import { hostname as ldapHostname } from "../ldap"
import { REDIS_URL } from "../cache"
import { NEO4J_URL, get_connected as get_neo4j_connected } from "../db"
import { version, author } from "../package.json"
import router_v1 from "./v1/index"
import router_v2 from "./v2/index"
import router_v3 from "./v3/index"
import { Request, Response } from "express"

const router = Router()

router.get("/", (req: Request, res: Response) => {
  res.send({
    application_name: "Account manager",
    author,
    version,
    neo4j: {
      url: NEO4J_URL,
      connected: get_neo4j_connected(),
    },
    smtp: {
      host: SMTP_HOST,
      port: SMTP_PORT,
      from: SMTP_FROM,
    },
    ldap: {
      hostname: ldapHostname,
    },
    redis: {
      url: REDIS_URL,
    },
  })
})

router.use("/", router_v1)
router.use("/v1", router_v1)
router.use("/v2", router_v2)
router.use("/v3", router_v3)

export default router
