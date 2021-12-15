const {Router} = require('express')
const {get_employees_of_group} = require('../../controllers/v3/employee.js')

const router = Router()


router.route('/:group_id/employees')
  .get(get_employees_of_group)


module.exports = router
