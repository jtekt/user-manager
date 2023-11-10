import { Router } from "express"
import { middleware } from "../../controllers/v3/auth"
import employeesRouter from "./employees"
import authRouter from "./auth"
const router = Router()

router.use("/auth", authRouter)

router.use("/employees", middleware, employeesRouter)
router.use("/users", middleware, employeesRouter)

export default router
