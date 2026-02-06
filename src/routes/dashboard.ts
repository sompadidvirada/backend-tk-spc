import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { getAllBakeryTrackReport, reportSellForlineGrap, reportSellForlineGrapBakeryName } from "../controller/dashboard.js";
const router = Router()

router.post("/getreportselllinechart",verifyTokenAndRole(["ADMIN"]), reportSellForlineGrap)
router.post("/getbakerynameline",verifyTokenAndRole(["ADMIN"]), reportSellForlineGrapBakeryName)
router.post("/getreportcardbakery",verifyTokenAndRole(["ADMIN"]), getAllBakeryTrackReport)

export default router