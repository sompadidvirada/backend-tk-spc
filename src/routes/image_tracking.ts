import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { deleteImageTrack, getAllBranchImageTrack, getImageTracking, insertImageTracking } from "../controller/image_tracking.js";
const router = Router()


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
    bucket: process.env.AWS_BUCKET_IMAGE_TRACK!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const filename = `track-image/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
      cb(null, filename);
    },
  }),
});

router.post("/uploadtrackimage", verifyTokenAndRole(["ADMIN","STAFF_SPC","BARISTAR"]), upload.array("images"), insertImageTracking)
router.post("/gettrackingimages", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "BARISTAR"]), getImageTracking)
router.delete("/deleteimagetrack/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), deleteImageTrack)
router.post("/getallbranchimagetrack",verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), getAllBranchImageTrack)



export default router