import { Router } from "express"
import { login } from "../../controllers/v2/auth"

const router = Router()

router.route("/login").post(login)

export default router
