export const {
  APP_VERSION = "dev",
  ADDITIONAL_LOGIN_IDENTIFIER_FIELDS = "",
  ADDITIONAL_USER_QUERY_IDENTIFIER_FIELDS = "",
  JWT_EXPIRATION_TIME = "infinite",
  ADDITIONAL_SEARCHABLE_FIELDS = "",
  OIDC_JWKS_URI = "",
  OIDC_IDENTIFIER_FIELD = "username",
  OIDC_TOKEN_IDENTIFIER_FIELD = "preferred_username",
  API_KEY_SERVICE_URL = "",
  API_KEY_IDENTIFIER_FIELD = "_id",
} = process.env;

// Only used for login
export const loginIdentifierFields = ["email_address", "username"];
if (ADDITIONAL_LOGIN_IDENTIFIER_FIELDS)
  ADDITIONAL_LOGIN_IDENTIFIER_FIELDS.split(",").forEach((f) =>
    loginIdentifierFields.push(f),
  );

// Used as user_id in /users/:user_id queries
export const userQueryIdentifierFields = ["_id", "username"];
if (ADDITIONAL_USER_QUERY_IDENTIFIER_FIELDS)
  ADDITIONAL_USER_QUERY_IDENTIFIER_FIELDS.split(",").forEach((f) =>
    userQueryIdentifierFields.push(f),
  );

// Only used for GET /users
export const searchableFields = ["email_address", "display_name", "_id"];
if (ADDITIONAL_SEARCHABLE_FIELDS)
  ADDITIONAL_SEARCHABLE_FIELDS.split(",").forEach((f) =>
    searchableFields.push(f),
  );
