import { middleware } from "../../controllers/v2/auth"
import { Router } from "express"
import employeeRouter from "./employees"
import authRouter from "./auth"
const router = Router()

router.use("/auth", authRouter)

router.use("/employees", middleware, employeeRouter)
router.use("/users", middleware, employeeRouter)

export default router
