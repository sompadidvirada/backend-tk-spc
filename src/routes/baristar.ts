import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { getHistoryReport, insertBakeryReport, updateBaristarProfile } from "../controller/baristar.js";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
const router = Router()

const s3 = new S3Client({
  region: process.env.AWS_REGION!, // The ! tells TS this won't be undefined
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const uploadProfile = multer({
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

const uploadImageReport = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_IMAGE_TRACK!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const filename = `report/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
      cb(null, filename);
    },
  }),
});



router.put("/updatebaristar/:id", verifyTokenAndRole(["ADMIN", "BARISTAR"]), uploadProfile.single("image"), updateBaristarProfile)
router.post("/reportbaristar", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "BARISTAR"]),uploadImageReport.array("images"), insertBakeryReport)
router.post("/getreporthistory", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "BARISTAR"]), getHistoryReport)


export default router