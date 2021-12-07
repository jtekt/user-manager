# Employees manager
A microservice to handle employee information. Based on https://gitlab.com/moreillon_k8s/user_manager

## API
| Route | Method | Query / body | Description |
| --- | --- | --- | --- |
| /employees/{Employee ID}/ | GET | - | Gets the information of an employee, here use 'self' as ID for one's own data |
| /employees/{Employee ID}/ | PATCH | properties | Updates information of an employee, here use 'self' as ID for one's own data |
| /employees/{Employee ID}/password | PUT | current_password, new_password, new_password_confirm | Updates the password of an employee, here use 'self' as ID for one's own data |
