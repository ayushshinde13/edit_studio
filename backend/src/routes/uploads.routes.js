import { Router } from "express";
import { signUpload } from "../controllers/uploads.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.post("/sign", signUpload);

export default router;

