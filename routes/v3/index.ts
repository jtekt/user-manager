import { Router } from "express"
import { initializeOidcAuth, middlewareChain } from "../../controllers/v3/auth"
import usersRouter from "./users"
import authRouter from "./auth"
const router = Router()

router.use("/auth", authRouter)

initializeOidcAuth()
router.use("/employees", middlewareChain, usersRouter)
router.use("/users", middlewareChain, usersRouter)

export default router
