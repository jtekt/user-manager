import { Router } from "express"
import { login } from "../../controllers/v3/auth"
import { request_password_reset } from "../../controllers/v3/password"
import { decodeToken } from "../../controllers/v3/accessTokens"
const router = Router()

router.route("/login").post(login)
router.route("/token").post(decodeToken)
router.route("/password/reset").post(request_password_reset)

export default router
