import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { deleteAllStockRemain, deleteAllStockRequisition, deleteStockRequisition, getAllRequisition, getStockRemain, getStockRequisitionReport, insertManyStockRemain, insertMaterialRequisition, updateStockRemain, updateStocRequisiton, uploadStockRequisition } from "../controller/material_requisition.js";
const router = Router()

router.post("/createstockrequisition", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), insertMaterialRequisition)
router.post("/getallstockrequisition", verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), getAllRequisition)
router.put("/updatestockrequisition/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), updateStocRequisiton)
router.delete("/deletestockrequisition/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), deleteStockRequisition)
router.post("/uploadstockrequisition", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), uploadStockRequisition)
router.post("/getreportstockrequisition", getStockRequisitionReport)
router.post("/delteallstockrequisition", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), deleteAllStockRequisition)

// STOCK REMAIN

router.post("/insertstockremain", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), insertManyStockRemain)
router.get("/getallstockremain", getStockRemain)
router.delete("/deleteallstockremain", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), deleteAllStockRemain)
router.put("/updatestockremain/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), updateStockRemain)

export default router
