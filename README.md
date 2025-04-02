# Account manager

This is a simple user management and authentication microservice used for internal applications. It stores user information in a Neo4J database and provides JWT-based authentication.

## API

### Users

| Route                            | Method | Query / body                                         | Description                                                                   |
| -------------------------------- | ------ | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| /v3/users                        | GET    | -                                                    | Gets a list of users                                                          |
| /v3/users                        | POST   | email_address, password, password_confirm            | Create a user (Admin only)                                                    |
| /v3/users/{Employee ID}          | GET    | -                                                    | Gets the information of an employee, here use 'self' as ID for one's own data |
| /v3/users/{Employee ID}          | DELETE | -                                                    | Delete a user (admin only)                                                    |
| /v3/users/{Employee ID}          | PATCH  | properties                                           | Updates information of an employee, here use 'self' as ID for one's own data  |
| /v3/users/{Employee ID}/password | PUT    | current_password, new_password, new_password_confirm | Updates the password of an employee, here use 'self' as ID for one's own data |

### Authentication

| Route           | Method | Query / body              | Description                               |
| --------------- | ------ | ------------------------- | ----------------------------------------- |
| /v3/auth/login/ | POST   | {email_address, password} | Get one's JWT in exchange for credentials |

## Environment variables

| variable                     | Description                                                           | Default          |
| ---------------------------- | --------------------------------------------------------------------- | ---------------- |
| APP_PORT                     | Port used by Express                                                  | 80               |
| NEO4J_URL                    | URL of the Neo4J instance                                             | bolt://localhost |
| NEO4J_USERNAME               | Username for the Neo4J instance                                       | neo4j            |
| NEO4J_PASSWORD               | Password for the Neo4J instance                                       | neo4j            |
| DEFAULT_ADMIN_USERNAME       | Username administrator account                                        | administrator    |
| DEFAULT_ADMIN_PASSWORD       | Password administrator account                                        | administrator    |
| JWT_SECRET                   | Secret used to encrypt JWTs                                           |                  |
| JWT_EXPIRATION_TIME          | Life time of a JWT                                                    | infinite         |
| SMTP_HOST                    | SMTP server host for email functions                                  |                  |
| SMTP_PORT                    | SMTP port for email functions                                         |                  |
| SMTP_USERNAME                | SMTP username for email functions                                     |                  |
| SMTP_PASSWORD                | SMTP password for email functions                                     |                  |
| SMTP_FROM                    | Sender e-mail address for email functions                             |                  |
| PASSWORD_RESET_URL           | URL to which users are directed to in order to reset their password   |                  |
| LDAP_HOSTNAME                | Hosatname for the LDAP server                                         |                  |
| LDAP_SEARCH_OU               | User search base                                                      |                  |
| LDAP_USERNAME                | Username for LDAP queries                                             |                  |
| LDAP_PASSWORD                | Password for LDAP queries                                             |                  |
| LDAP_USERNAME_ATTRIBUTE      | Username attribute for user queries when logging in                   | mail             |
| REDIS_URL                    | URL of the Redis cache, leave empty to disable caching                |                  |
| ADDITIONAL_SEARCHABLE_FIELDS | Comma separated list of fields to query users with                    |                  |
| ADDITIONAL_IDENTIFIER_FIELDS | Comma separated list of fields users can use as identiufier for login |                  |
