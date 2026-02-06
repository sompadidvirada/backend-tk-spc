import { Router } from "express";
import { login } from "../controller/auth.js";
import { verifyTokenAndRole } from "../middleware/authmiddleware.js";
const router = Router()


router.post("/login", login)

export default router