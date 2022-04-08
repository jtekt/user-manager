const {Router} = require('express')
const {
  get_users,
  get_user,
} = require('../../controllers/v2/employee.js')

const router = Router({mergeParams: true})

router.route('/')
  .get(get_users)

router.route('/:user_id')
  .get(get_user)


module.exports = router
