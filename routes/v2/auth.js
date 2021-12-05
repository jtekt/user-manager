const {Router} = require('express')
const { login } = require('../../controllers/v2/auth.js')
const { request_password_reset } = require('../../controllers/v2/password.js')

const router = Router()

router.route('/login')
  .post(login)

router.route('/password/reset')
  .post(request_password_reset)

module.exports = router
