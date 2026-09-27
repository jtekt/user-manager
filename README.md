# User manager

[![AWS ECR](https://img.shields.io/badge/AWS%20ECR-user--manager-blue)](https://gallery.ecr.aws/jtekt-corporation/user-manager)

This is a user management and authentication microservice used by internal applications. It stores user information in a Neo4J database and provides JWT-based authentication. Requests can also be authenticated with OIDC tokens or API keys.

## API

The current API is `/v3`. `/v1` and `/v2` (also served at `/`) are kept for legacy clients. In routes taking a user ID, use `self` for one's own data.

### Users

| Route                       | Method     | Query / body                        | Description                                                                             |
| --------------------------- | ---------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| /v3/users                   | GET        | see below                           | Gets a list of users                                                                    |
| /v3/users                   | POST       | email_address or username, password | Creates a user (admin only)                                                             |
| /v3/users/{user_id}         | GET        | -                                   | Gets a user                                                                             |
| /v3/users/{user_id}         | PATCH      | properties                          | Updates a user                                                                          |
| /v3/users/{user_id}         | DELETE     | -                                   | Deletes a user (admin only)                                                             |
| /v3/users/{user_id}/password | PUT/PATCH | new_password, new_password_confirm  | Updates the password of a user                                                          |
| /v3/users/{user_id}/token   | GET        | -                                   | Generates a JWT for a user (the user themselves or an admin)                            |
| /v3/users/{user_id}/token   | DELETE/PUT | -                                   | Revokes the JWTs of a user                                                              |

`/v3/employees` is an alias of `/v3/users`.

#### GET /v3/users query parameters

| Parameter   | Description                                                                                 | Default      |
| ----------- | ------------------------------------------------------------------------------------------- | ------------ |
| search      | Case-insensitive substring match on email_address, display_name, _id and `ADDITIONAL_SEARCHABLE_FIELDS` | -            |
| batch_size  | Number of results per page                                                                  | 100          |
| start_index | Index of the first result                                                                   | 0            |
| sort        | Property used for sorting                                                                   | display_name |
| order       | `ASC` or `DESC`                                                                             | ASC          |
| (other)     | Any other parameter filters users on the property of the same name                          | -            |

### Authentication

| Route                   | Method | Query / body                                         | Description                                 |
| ----------------------- | ------ | ---------------------------------------------------- | ------------------------------------------- |
| /v3/auth/login          | POST   | username, email_address or identifier; password     | Gets a JWT in exchange for credentials      |
| /v3/auth/token          | POST   | token                                                | Decodes and verifies a JWT                  |
| /v3/auth/password/reset | POST   | email_address                                        | Sends a password reset e-mail               |

Requests to `/v3/users` are authenticated with one of:

- an API key in the `X-API-Key` header, validated by the API key service (`API_KEY_SERVICE_URL`)
- an OIDC access token, verified against `OIDC_JWKS_URI`
- a JWT issued by this service, in the `Authorization` header, a `jwt` or `token` cookie, or a `jwt` or `token` query parameter

### Service

| Route         | Method | Description                                                        |
| ------------- | ------ | ------------------------------------------------------------------ |
| /             | GET    | Application info: version, configuration, DB connection status     |
| /health/live  | GET    | Liveness probe: the process responds                               |
| /health/ready | GET    | Readiness probe: 503 until the DB is set up and reachable          |
| /docs         | GET    | Swagger UI                                                         |

## Environment variables

| Variable                                | Description                                                                                  | Default            |
| --------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| APP_PORT                                | Port used by Express                                                                         | 80                 |
| TZ                                      | Time zone                                                                                    | Asia/Tokyo         |
| NEO4J_URL                               | URL of the Neo4J instance                                                                    | bolt://localhost   |
| NEO4J_USERNAME                          | Username for the Neo4J instance                                                              | neo4j              |
| NEO4J_PASSWORD                          | Password for the Neo4J instance                                                              | neo4j              |
| DEFAULT_ADMIN_USERNAME                  | Username of the administrator account created at startup                                     | administrator      |
| DEFAULT_ADMIN_PASSWORD                  | Password of the administrator account created at startup                                     | administrator      |
| JWT_SECRET                              | Secret used to sign JWTs (required)                                                          |                    |
| JWT_EXPIRATION_TIME                     | Lifetime of a JWT                                                                            | infinite           |
| ADDITIONAL_LOGIN_IDENTIFIER_FIELDS      | Comma-separated user properties accepted as identifier at login, besides email_address and username | |
| ADDITIONAL_USER_QUERY_IDENTIFIER_FIELDS | Comma-separated user properties accepted as `{user_id}` in routes, besides _id and username  |                    |
| ADDITIONAL_SEARCHABLE_FIELDS            | Comma-separated user properties matched by the `search` query parameter                      |                    |
| OIDC_JWKS_URI                           | JWKS URI of the OIDC provider; leave empty to disable OIDC authentication                    |                    |
| OIDC_TOKEN_IDENTIFIER_FIELD             | OIDC token claim identifying the user                                                        | preferred_username |
| OIDC_IDENTIFIER_FIELD                   | User property matched against that claim                                                     | username           |
| API_KEY_SERVICE_URL                     | URL of the API key service; leave empty to disable API key authentication                    |                    |
| API_KEY_IDENTIFIER_FIELD                | User property matched against the `user_id` returned by the API key service                  | _id                |
| SMTP_HOST                               | SMTP server host for e-mails                                                                 |                    |
| SMTP_PORT                               | SMTP port for e-mails                                                                        |                    |
| SMTP_USERNAME                           | SMTP username for e-mails                                                                    |                    |
| SMTP_PASSWORD                           | SMTP password for e-mails                                                                    |                    |
| SMTP_FROM                               | Sender e-mail address                                                                        |                    |
| PASSWORD_RESET_URL                      | URL of the password reset page linked in reset e-mails                                       | Request origin     |
| LDAP_HOSTNAME                           | Hostname of the LDAP server; leave empty to disable LDAP login                               |                    |
| LDAP_SEARCH_OU                          | User search base                                                                             |                    |
| LDAP_USERNAME                           | Username for LDAP queries                                                                    |                    |
| LDAP_PASSWORD                           | Password for LDAP queries                                                                    |                    |
| LDAP_USERNAME_ATTRIBUTE                 | LDAP attribute matched against the login identifier                                         | mail               |
| REDIS_URL                               | URL of the Redis cache; leave empty to disable caching                                       |                    |

The version shown at `/` comes from `APP_VERSION`, set at build time from the git tag (`--build-arg APP_VERSION`).
