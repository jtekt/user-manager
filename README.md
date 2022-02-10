# Employees manager

JTEKT employee data needs to be appropriately stored and managed. Moreover, employees are users of multiple applications, more and more of are built in-house. This generally requires a user management and authentication system. Instead of building such logic of every individual application, the service presented in this report leverages a microservice architecture to provide a centralized user management and authentication system which can be used by third party applications. Thanks to this approach, updating an employee information can be reflected instantly in all applications. In other words, this service can be used as single source of truth for employee information.

## API

### Employees
| Route | Method | Query / body | Description |
| --- | --- | --- | --- |
| /v3/employees | GET | - | Gets a list of users |
| /v3/employees | POST | email_address, password, password_confirm | Create a user (Admin only) |
| /v3/employees/{Employee ID} | GET | - | Gets the information of an employee, here use 'self' as ID for one's own data |
| /v3/employees/{Employee ID} | DELETE | - | Delete a user (admin only) |
| /v3/employees/{Employee ID} | PATCH | properties | Updates information of an employee, here use 'self' as ID for one's own data |
| /v3/employees/{Employee ID}/password | PUT | current_password, new_password, new_password_confirm | Updates the password of an employee, here use 'self' as ID for one's own data |

### Authentication
| Route | Method | Query / body | Description |
| --- | --- | --- | --- |
| /v3/auth/login/ | POST | {email_address, password} | Get one's JWT in exchange for credentials |


## Environment variables
| variable | Description
| --- | --- |
| NEO4J_URL | URL of the Neo4J instance |
| NEO4J_USERNAME | Username for the Neo4J instance |
| NEO4J_PASSWORD | Password for the Neo4J instance |
| JWT_SECRET | Secret used to encrypt JWTs |
| SMTP_HOST | SMTP server host for email functions |
| SMTP_PORT | SMTP port for email functions |
| SMTP_USERNAME | SMTP username for email functions |
| SMTP_PASSWORD | SMTP password for email functions |
| SMTP_FROM | Sender e-mail address for email functions |
| PASSWORD_RESET_URL | URL to which users are directed to in order to reset their password |
