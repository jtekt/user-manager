const {Router} = require('express')
const password_router = require('./password')
const {
  get_employees,
  create_employee,
  get_employee,
  patch_employee,
  delete_employee
} = require('../../controllers/v2/employee.js')


const router = Router({mergeParams: true})

router.route('/')
  .get(get_employees)
  .post(create_employee)

router.route('/:employee_id')
  .get(get_employee)
  .patch(patch_employee)
  .delete(delete_employee)

router.use('/:employee_id/password', password_router)

module.exports = router
