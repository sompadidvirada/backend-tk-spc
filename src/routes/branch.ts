import { Router } from "express";
import { addPhonNumberBranch, createBranch, deleteBranch, getAllBranch, updateBranch } from "../controller/branch.js";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
const router = Router()

router.post("/createbranch",verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), createBranch)
router.get("/getallbranch", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), getAllBranch)
router.put("/updatephonebranch/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), addPhonNumberBranch)
router.put("/updatebranchdetail/:id", verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), updateBranch)
router.delete("/deletebranch/:id", verifyTokenAndRole(["ADMIN"]), deleteBranch)

export default router