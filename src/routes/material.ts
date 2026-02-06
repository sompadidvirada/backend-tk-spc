import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { createCategoryMaterial, createMaterial, creatematerialVaraint, deleteMaterialVariant, getAllCategoryMaterial, getAllMaterial, updateMaterial, updateRelationMaterialVariant } from "../controller/materail.js";

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
    bucket: process.env.AWS_BUCKET_BAKERY!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const filename = `material/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
      cb(null, filename);
    },
  }),
});

const router = Router();


router.post("/creatematerial", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), upload.single("image"), createMaterial)
router.post("/createcategorymaterial", verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), createCategoryMaterial)
router.get("/getallcategorymaterial", verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), getAllCategoryMaterial)
router.get("/getallmaterial", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), getAllMaterial)
router.post("/createnewmaterialvariant", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), creatematerialVaraint)
router.post("/updaterelationmaterialvariant", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), updateRelationMaterialVariant)
router.delete("/deletematerialvarinat/:id", verifyTokenAndRole(["ADMIN","STAFF_SPC", "STAFF_WH"]), deleteMaterialVariant)
router.put("/updatematerial/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), upload.single("image"), updateMaterial)

export default router;
