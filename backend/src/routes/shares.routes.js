import { Router } from "express";
import { createShare, getShare, revokeShare } from "../controllers/shares.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();
const shareLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 30 });

router.post("/", optionalAuth, shareLimiter, createShare);
router.get("/:token", shareLimiter, getShare);
router.delete("/:token", requireAuth, revokeShare);

export default router;

