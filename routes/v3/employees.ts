import { Router } from "express"
import password_router from "./password"
import {
  get_users,
  create_user,
  get_user,
  patch_user,
  delete_user,
} from "../../controllers/v3/employee"

const router = Router({ mergeParams: true })

router.route("/").get(get_users).post(create_user)

router.route("/:user_id").get(get_user).patch(patch_user).delete(delete_user)

router.use("/:user_id/password", password_router)

export default router
