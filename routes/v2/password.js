const {Router} = require('express')
const password_router = require('./password')
const {
  update_password,
} = require('../../controllers/v2/password.js')


const router = Router({mergeParams: true})

router.route('/')
  .patch(update_password)
  .put(update_password)

module.exports = router
