import { Router } from "express"
import { revokeToken } from "../../controllers/v3/tokens"
const router = Router({ mergeParams: true })

router.route("/").delete(revokeToken).put(revokeToken)

export default router
