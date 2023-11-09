import { Router } from "express"
import { get_users, get_user } from "../../controllers/v2/employee"

const router = Router({ mergeParams: true })

router.route("/").get(get_users)

router.route("/:user_id").get(get_user)

export default router
