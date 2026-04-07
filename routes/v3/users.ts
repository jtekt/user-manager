import { Router } from "express"
import { update_password } from "../../controllers/v3/password"
import {
  get_users,
  create_user,
  get_user,
  patch_user,
  delete_user,
} from "../../controllers/v3/user"
import { decodeToken, getToken, revokeToken } from "../../controllers/v3/accessTokens"

const router = Router({ mergeParams: true })

router.route("/").get(get_users).post(create_user)
router.route("/:user_id").get(get_user).patch(patch_user).delete(delete_user)
router.route("/:user_id/password").patch(update_password).put(update_password)
router
  .route("/:user_id/token")
  .get(getToken)
  .post(decodeToken)
  .delete(revokeToken)
  .put(revokeToken)

export default router
