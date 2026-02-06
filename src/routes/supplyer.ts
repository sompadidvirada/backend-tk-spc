import { Router } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { createSupplyer, createSupplyerSpc, deleteSupplyer, editSupplyer, getAllSupplyer, getAllSupplyerSpc, updateSupllyerSpc } from "../controller/supplyer.js";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
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
      const filename = `supplyer/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
      cb(null, filename);
    },
  }),
});

const router = Router()

router.post("/createsupplyer", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),upload.single("image"), createSupplyer)
router.get("/getallsupplyer", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), getAllSupplyer)
router.put("/updatesupplyer/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), upload.single("image"), editSupplyer)
router.delete("/deletesupplyer/:id", verifyTokenAndRole(["ADMIN"]), deleteSupplyer)


router.post("/createsupplyerspc", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]),upload.single("image"), createSupplyerSpc)
router.get("/getallsupplyerspc", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), getAllSupplyerSpc)
router.put("/updatesupplyerspc/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), upload.single("image"), updateSupllyerSpc)




export default router