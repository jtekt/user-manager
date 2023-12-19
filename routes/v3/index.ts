import { Router } from "express"
import { middleware } from "../../controllers/v3/auth"
import usersRouter from "./users"
import authRouter from "./auth"
const router = Router()

router.use("/auth", authRouter)

router.use("/employees", middleware, usersRouter)
router.use("/users", middleware, usersRouter)

export default router
