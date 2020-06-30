# Employees manager
A microservice to handle employee information

## API
| Route | Method | Query / body | Description |
| --- | --- | --- | --- |
| /employees/{Employee ID}/ | GET | - | Gets the information of an employee, here use 'self' as ID for one's own data |
| /employees/{Employee ID}/ | PATCH | properties | Updates information of an employee, here use 'self' as ID for one's own data |
| /employees/{Employee ID}/password | PUT | new_password | Updates the password of an employee, here use 'self' as ID for one's own data |
