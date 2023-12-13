import { Router } from "express"
import { update_password } from "../../controllers/v3/password"
import {
  get_users,
  create_user,
  get_user,
  patch_user,
  delete_user,
} from "../../controllers/v3/employee"
import { revokeToken } from "../../controllers/v3/accessTokens"

const router = Router({ mergeParams: true })

router.route("/").get(get_users).post(create_user)
router.route("/:user_id").get(get_user).patch(patch_user).delete(delete_user)
router.route("/:user_id/token").delete(revokeToken).put(revokeToken)
router.route("/:user_id/password").patch(update_password).put(update_password)

export default router
