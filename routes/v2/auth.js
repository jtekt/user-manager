const {Router} = require('express')
const password_router = require('./password')
const { login } = require('../../controllers/v2/auth.js')

const router = Router()

router.route('/login')
  .post(login)

module.exports = router
