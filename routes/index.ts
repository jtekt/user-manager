import { Router } from "express";
import { SMTP_HOST, SMTP_PORT, SMTP_FROM } from "../mail";
import {
  LDAP_HOSTNAME,
  LDAP_SEARCH_OU,
  LDAP_USERNAME_ATTRIBUTE,
} from "../ldap";
import { REDIS_URL } from "../cache";
import { NEO4J_URL, get_connected as get_neo4j_connected } from "../db";
import { author } from "../package.json";
import healthRouter from "./health";
import router_v1 from "./v1/index";
import router_v2 from "./v2/index";
import router_v3 from "./v3/index";
import { Request, Response } from "express";
import {
  APP_VERSION,
  userQueryIdentifierFields,
  JWT_EXPIRATION_TIME,
  loginIdentifierFields,
  OIDC_JWKS_URI,
  searchableFields,
  OIDC_IDENTIFIER_FIELD,
  OIDC_TOKEN_IDENTIFIER_FIELD,
  API_KEY_SERVICE_URL,
  API_KEY_IDENTIFIER_FIELD,
} from "../config";
const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.send({
    application_name: "Account manager",
    author,
    version: APP_VERSION,
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
      loginIdentifierFields,
      jwt_expiration_time: JWT_EXPIRATION_TIME,
      oidc: {
        jwks_uri: OIDC_JWKS_URI,
        token_user_identifier: OIDC_TOKEN_IDENTIFIER_FIELD,
        neo4j_user_identifier: OIDC_IDENTIFIER_FIELD,
      },
      api_key: {
        api_key_service_url: API_KEY_SERVICE_URL,
        api_key_identifier_field: API_KEY_IDENTIFIER_FIELD,
      },
    },
    userQueryIdentifierFields,
    searchableFields,
  });
});

router.use("/health", healthRouter);
router.use("/", router_v1);
router.use("/v1", router_v1);
router.use("/v2", router_v2);
router.use("/v3", router_v3);

export default router;
