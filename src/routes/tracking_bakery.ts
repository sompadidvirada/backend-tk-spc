import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { deleteAllTrackExp, deleteAllTrackSell, deleteAllTrackSend, deleteTrackExp, deleteTrackSell, deleteTrackSend, editTrackSell, editTrackSend, getAvailableBakery, getBakerySend, getBakerySold, getTrackingExp, inertTracksend, insertTrackExp, insertTracksell, insertTracksellMany, uploadFileTrackSell, uploadTrackSend } from "../controller/tracking_bakery.js";
const router = Router()

// tracking sell routes

router.post("/trackbakerysell", insertTracksell)
router.post("/trackbakerysellmany", insertTracksellMany)
router.post("/getbakerysold", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), getBakerySold)
router.put("/edittracksell/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), editTrackSell)
router.delete("/deletetracksell/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteTrackSell)
router.post("/deletealltracksell", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteAllTrackSell)
router.post("/uploadfiletracksell", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), uploadFileTrackSell)

//tracking send routes

router.post("/trackingsend", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), inertTracksend)
router.post("/getbakerysend", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), getBakerySend)
router.put("/updatetracksend/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), editTrackSend)
router.delete("/deletetracksend/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteTrackSend)
router.post("/deletealltracksend", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteAllTrackSend)
router.post("/uploadtrackingsend", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), uploadTrackSend)

//tracking exp routes

router.post("/trackexp", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), insertTrackExp)
router.post("/gettrackingexp", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), getTrackingExp)
router.delete("/deletetrackexp/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteTrackExp)
router.post("/deletalltrackexp", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteAllTrackExp)

// get bakery available on branch
router.post("/getavailablebakerys", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "BARISTAR"]), getAvailableBakery)

export default router