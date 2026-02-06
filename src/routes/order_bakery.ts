import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { checkConfirmStt, deleteOrderBakery, getBakeryHistory_L1_L2_L3, getBakeryOrder, getBakeryOrderToPrint, getSendAndExp, insertBakeryOrder, insertManyBakeryOrders, trackingOrderBakery, updateBakeryOrder, updateConfirmBaristar, updateConfirmSttAdmin, updateOrderWant } from "../controller/order_bakery.js";

const router = Router()

router.post("/insertorderbakery",verifyTokenAndRole(["ADMIN","STAFF_SPC"]), insertBakeryOrder)
router.post("/getallorderbakery",verifyTokenAndRole(["ADMIN","SATFF_SPC", "BARISTAR"]), getBakeryOrder)
router.post("/getdatatoorder",verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), getBakeryHistory_L1_L2_L3)
router.put("/updateorderbakery/:id",verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), updateBakeryOrder)
router.delete("/deleteorderbakery/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteOrderBakery)
router.post("/insertmanyorderbakery", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), insertManyBakeryOrders)
router.put("/updateorderwant/:id", verifyTokenAndRole(["ADMIN", "BARISTAR"]), updateOrderWant)
router.put("/updatecomfirmorder", verifyTokenAndRole(["ADMIN", "BARISTAR"]), updateConfirmBaristar)
router.post("/checkconfirmorder", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "BARISTAR"]), checkConfirmStt)
router.post("/getsendandexp", verifyTokenAndRole(["ADMIN","BARISTAR"]), getSendAndExp)
router.put("/updateconfirmstatusadmin/:id", verifyTokenAndRole(["ADMIN"]), updateConfirmSttAdmin)
router.post("/trackorderbakery",verifyTokenAndRole(["ADMIN", "BARISTAR", "STAFF_SPC"]), trackingOrderBakery)
router.post("/getordertoprint", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), getBakeryOrderToPrint)

export default router