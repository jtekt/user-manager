const { middleware } = require('../../controllers/v2/auth.js')
const {Router} = require('express')

const router = Router()

router.use('/auth', require('./auth.js'))


router.use('/employees', middleware, require('./employees.js'))
router.use('/users', middleware, require('./employees.js'))
// router.use('/groups', middleware, require('./groups.js'))



module.exports = router
