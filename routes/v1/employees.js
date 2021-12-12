const {Router} = require('express')
const {
  get_employees,
  get_employee
} = require('../../controllers/v1/employee.js')

const router = Router()

// use the router
router.route('/')
  .get(get_employees)

router.route('/:employee_id')
  .get(get_employee)


module.exports = router
