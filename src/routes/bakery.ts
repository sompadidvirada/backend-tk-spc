import { Router } from "express";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
import { checkBakeryAvailableBranch, createBakery, createCategoryBakery, deleteBakery, deleteCategoryBakery, getAllBakery, getAllCaterogory, updateBakery, updateStatus, updateStatusSellBranches } from "../controller/bakery.js";
import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";

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
      const filename = `bakery/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;
      cb(null, filename);
    },
  }),
});


const router = Router()

//bakery

router.post("/createbakery", verifyTokenAndRole(["STAFF_SPC", "ADMIN"]), upload.single("image"), createBakery)
router.put("/updatebakery/:id", verifyTokenAndRole(["STAFF_SPC", "ADMIN", ]), upload.single("image"), updateBakery)
router.get("/getallbakery", getAllBakery)
router.delete("/deletebakery/:id", verifyTokenAndRole(["ADMIN"]), deleteBakery)
router.put("/updatestatus/:id", verifyTokenAndRole(["STAFF_SPC", "ADMIN"]), updateStatus)
router.post("/updatestatussellbranchs", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), updateStatusSellBranches)
router.get("/checkavailablebakeryonbranchs/:id", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), checkBakeryAvailableBranch)

//category

router.post("/createcategorybakery", verifyTokenAndRole(["ADMIN", "STAFF_SPC"]), createCategoryBakery)
router.get("/getallcategory", verifyTokenAndRole(["ADMIN", "STAFF_SPC", "STAFF_WH"]), getAllCaterogory)
router.delete("/deletecategory/:id", verifyTokenAndRole(["ADMIN"]), deleteCategoryBakery)


export default router