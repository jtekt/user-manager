import { Router } from "express"
import { middleware } from "../../controllers/v2/auth"
import employee_router from "./employees"

const router = Router()

router.use("/employees", middleware, employee_router)
router.use("/users", middleware, employee_router)

export default router
