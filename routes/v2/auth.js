const { Router } = require('express')
const { login } = require('../../controllers/v2/auth.js')

const router = Router()

router.route('/login')
  .post(login)

module.exports = router
