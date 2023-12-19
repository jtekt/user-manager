import { middleware } from "../../controllers/v2/auth"
import { Router } from "express"
import userRouter from "./users"
import authRouter from "./auth"
const router = Router()

router.use("/auth", authRouter)

router.use("/users", middleware, userRouter)
router.use("/employees", middleware, userRouter) // alias

export default router
