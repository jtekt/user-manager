const {Router} = require('express')
const { middleware } = require('../../controllers/v3/auth.js')

const router = Router()

router.use('/auth', require('./auth.js'))

router.use('/employees', middleware, require('./employees.js'))
router.use('/users', middleware, require('./employees.js'))



module.exports = router
