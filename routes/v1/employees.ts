import { Router } from "express"
import { get_employees, get_employee } from "../../controllers/v1/employee"

const router = Router()

// use the router
router.route("/").get(get_employees)

router.route("/:employee_id").get(get_employee)

export default router
