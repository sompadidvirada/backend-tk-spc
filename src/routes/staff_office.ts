import { Router } from "express";
import { checkStaffPassword, createStaffBaristar, createStaffOffice, deleteStaff, getAllStaff, updateAvailableStaff, updateBranchStaff, updateStaffOffice, updateStaffPassword, updateSTaffRole, updateUserProfile } from "../controller/staff_office.js";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!, // The ! tells TS this won't be undefined
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_STAFF!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const filename = `staff/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
      cb(null, filename);
    },
  }),
});

const router = Router()

router.post("/createstaff",verifyTokenAndRole(["ADMIN"]), upload.single("image"), createStaffOffice)
router.put("/updatestaffoffice/:id",verifyTokenAndRole(["STAFF_SPC", "ADMIN"]), updateStaffOffice)
router.put("/updaterolestaff/:id",verifyTokenAndRole(["ADMIN"]), updateSTaffRole)
router.get("/getallstaff",verifyTokenAndRole(["STAFF_SPC", "STAFF_WH", "ADMIN"]), getAllStaff)
router.put("/updateavailablestaff/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), updateAvailableStaff)
router.post("/checkpasswordstaff", verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), checkStaffPassword)
router.post("/deletestaff", verifyTokenAndRole(["ADMIN"]), deleteStaff)
router.post("/createstaffbaristar", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), upload.single("image"), createStaffBaristar)
router.put("/updatebranchstaff/:id", verifyTokenAndRole(["ADMIN","STAFF_SPC"]), updateBranchStaff)
router.put("/updatepasswordstaff/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), updateStaffPassword)
router.put("/updateprofilestaff/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), upload.single("image"), updateUserProfile)

export default router