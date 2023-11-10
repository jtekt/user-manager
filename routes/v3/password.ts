import { Router } from "express"
import { update_password } from "../../controllers/v3/password"

const router = Router({ mergeParams: true })

router.route("/").patch(update_password).put(update_password)

export default router
