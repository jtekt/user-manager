import { Router } from "express";
import { SMTP_HOST, SMTP_PORT, SMTP_FROM } from "../mail";
import {
  LDAP_HOSTNAME,
  LDAP_SEARCH_OU,
  LDAP_USERNAME_ATTRIBUTE,
} from "../ldap";
import { REDIS_URL } from "../cache";
import { NEO4J_URL, get_connected as get_neo4j_connected } from "../db";
import { version, author } from "../package.json";
import router_v1 from "./v1/index";
import router_v2 from "./v2/index";
import router_v3 from "./v3/index";
import { Request, Response } from "express";
import {
  identifierFields,
  jwt_expiration_time,
  loginIdentifierFields,
  oidc_jwks_uri,
  searchableFields,
} from "../config";
const router = Router();

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
      hostname: LDAP_HOSTNAME,
      search_ou: LDAP_SEARCH_OU,
      username_attribute: LDAP_USERNAME_ATTRIBUTE,
    },
    redis: {
      url: REDIS_URL,
    },
    auth: {
      oidc_jwks_uri: oidc_jwks_uri,
    },
    jwt_expiration_time,
    identifierFields,
    searchableFields,
    loginIdentifierFields,
  });
});

router.use("/", router_v1);
router.use("/v1", router_v1);
router.use("/v2", router_v2);
router.use("/v3", router_v3);

export default router;
