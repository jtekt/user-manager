import { Router } from "express"
import { middleware } from "../../controllers/v2/auth"
import usersRouter from "./users"

const router = Router()

router.use("/users", middleware, usersRouter)
router.use("/employees", middleware, usersRouter)

export default router
