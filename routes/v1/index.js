const {Router} = require('express')
const { middleware } = require('../../controllers/v2/auth.js')

const router = Router()

// use the router
router.use('/employees', middleware, require('./employees.js'))
router.use('/users', middleware, require('./employees.js'))

module.exports = router
