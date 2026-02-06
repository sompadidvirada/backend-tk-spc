import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { checkUnreadyReport, getAllTrackReport, getReportDetail, markReportAsRead, updateStatusReport } from "../controller/track_report_bakery.js";
const router = Router()

router.post("/getalltracbakeryreport", verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), getAllTrackReport)
router.post("/checknotification", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), checkUnreadyReport)
router.post("/markasread", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), markReportAsRead)
router.get("/getreportdetail/:id",verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), getReportDetail)
router.put("/updatestatusreport/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), updateStatusReport)

export default router