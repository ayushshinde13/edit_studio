import { Router } from "express";
import { getProfile, updateProfile, deleteAccount } from "../controllers/me.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", getProfile);
router.patch("/", updateProfile);
router.delete("/", deleteAccount);

export default router;

