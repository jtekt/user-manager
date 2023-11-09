import { Router } from "express"
import { smtp } from "../mail"
import { hostname as ldapHostname } from "../ldap"
import { REDIS_URL } from "../cache"
import { url as neo4j_url, get_connected as get_neo4j_connected } from "../db"
import { version, author } from "../package.json"
import router_v1 from "./v1/index"
import router_v2 from "./v2/index"
import router_v3 from "./v3/index"

const router = Router()

router.route("/", (req: Request, res: Response) => {
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

router.use("/", router_v1)
router.use("/v1", router_v1)
router.use("/v2", router_v2)
router.use("/v3", router_v3)

export default router
