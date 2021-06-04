const express = require('express')
const controller = require('../../controllers/v2/employee.js')
const auth = require('@moreillon/authentication_middleware')


const router = express.Router()

// use the router

router.use(auth.authenticate)

router.route('/:group_id/employees')
  .get(controller.get_employees_of_group)


module.exports = router
