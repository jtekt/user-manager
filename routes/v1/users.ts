import { Router } from "express"
import { getUsers, getUser } from "../../controllers/v1/user"

const router = Router()

router.route("/").get(getUsers)
router.route("/:user_id").get(getUser)

export default router
