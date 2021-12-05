const {Router} = require('express')
const { login } = require('../../controllers/v2/auth.js')
const {
  update_password,
  request_password_reset,
 } = require('../../controllers/v2/password.js')

const router = Router()

router.route('/login')
  .post(login)

router.route('/password')
  .patch(update_password)
  .put(update_password)

router.route('/password/reset')
  .post(request_password_reset)

module.exports = router
