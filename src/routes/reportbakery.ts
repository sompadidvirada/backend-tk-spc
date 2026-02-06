import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { getBakeryFullReport } from "../controller/reportbakery.js";
const router = Router()

router.post("/reportbakery",verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), getBakeryFullReport)



export default router