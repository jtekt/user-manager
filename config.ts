const {
  ADDITIONAL_IDENTIFIER_FIELDS = "",
  JWT_EXPIRATION_TIME = "infinite",
  ADDITIONAL_SEARCHABLE_FIELDS = "",
} = process.env

export const jwt_expiration_time = JWT_EXPIRATION_TIME
export const identifierFields = ["email_address", "username", "_id"]

if (ADDITIONAL_IDENTIFIER_FIELDS)
  ADDITIONAL_IDENTIFIER_FIELDS.split(",").forEach((f) =>
    identifierFields.push(f)
  )

export const searchableFields = ["email_address", "display_name", "_id"]

if (ADDITIONAL_SEARCHABLE_FIELDS)
  ADDITIONAL_SEARCHABLE_FIELDS.split(",").forEach((f) =>
    searchableFields.push(f)
  )
