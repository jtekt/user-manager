const express = require('express')
const controller = require('../../controllers/v2/employee.js')

const router = express.Router()

router.route('/:group_id/employees')
  .get(controller.get_employees_of_group)


module.exports = router
