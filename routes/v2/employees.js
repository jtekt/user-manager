const express = require('express')
const controller = require('../../controllers/v2/employee.js')
const auth = require('@moreillon/authentication_middleware')


const router = express.Router()

// use the router

router.use(auth.authenticate)

router.route('/')
  .get(controller.get_employees)
  .post(controller.create_employee)

router.route('/:employee_id')
  .get(controller.get_employee)
  .patch(controller.patch_employee)
  .delete(controller.delete_employee)

router.route('/:employee_id/password')
  .put(controller.update_password)

module.exports = router
