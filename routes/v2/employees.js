const {Router} = require('express')
// const password_router = require('./password')
const {
  get_users,
  get_user,
  // patch_user,
} = require('../../controllers/v2/employee.js')

const router = Router({mergeParams: true})

router.route('/')
  .get(get_users)

router.route('/:user_id')
  .get(get_user)
  // .patch(patch_user)

// router.use('/:user_id/password', password_router)

module.exports = router
