const {
  ADDITIONAL_LOGIN_IDENTIFIER_FIELDS = "",
  ADDITIONAL_IDENTIFIER_FIELDS = "",
  JWT_EXPIRATION_TIME = "infinite",
  ADDITIONAL_SEARCHABLE_FIELDS = "",
  OIDC_JWKS_URI = "",
  OIDC_IDENTIFIER_FIELD = "username",
} = process.env;

export const oidc_jwks_uri = OIDC_JWKS_URI;
export const oidc_identifier_field = OIDC_IDENTIFIER_FIELD;
export const jwt_expiration_time = JWT_EXPIRATION_TIME;

// Only used for login
export const loginIdentifierFields = ["email_address", "username"];
if (ADDITIONAL_LOGIN_IDENTIFIER_FIELDS)
  ADDITIONAL_LOGIN_IDENTIFIER_FIELDS.split(",").forEach((f) =>
    loginIdentifierFields.push(f)
  );

// Used for GET /users/users_id
export const identifierFields = ["_id", "username", "email_address"];
if (ADDITIONAL_IDENTIFIER_FIELDS)
  ADDITIONAL_IDENTIFIER_FIELDS.split(",").forEach((f) =>
    identifierFields.push(f)
  );

export const searchableFields = ["email_address", "display_name", "_id"];
if (ADDITIONAL_SEARCHABLE_FIELDS)
  ADDITIONAL_SEARCHABLE_FIELDS.split(",").forEach((f) =>
    searchableFields.push(f)
  );
