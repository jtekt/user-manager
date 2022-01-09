# Employees manager
A microservice to handle user information and authentication. Based on https://gitlab.com/moreillon_k8s/user_manager.


## API
### Authentication
| Route | Method | Query / body | Description |
| --- | --- | --- | --- |
| /v3/auth/login/ | POST | {email_address, password} | Get one's JWT in exchange for credentials |

### Employees
| Route | Method | Query / body | Description |
| --- | --- | --- | --- |
| /v3/employees | GET | - | Gets a list of users |
| /v3/employees | POST | email_address, password, password_confirm | Create a user (Admin only) |
| /v3/employees/{Employee ID} | GET | - | Gets the information of an employee, here use 'self' as ID for one's own data |
| /v3/employees/{Employee ID} | DELETE | - | Delete a user (admin only) |
| /v3/employees/{Employee ID} | PATCH | properties | Updates information of an employee, here use 'self' as ID for one's own data |
| /v3/employees/{Employee ID}/password | PUT | current_password, new_password, new_password_confirm | Updates the password of an employee, here use 'self' as ID for one's own data |