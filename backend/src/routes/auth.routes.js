import { Router } from "express";
import { login, me, logout } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();
const loginLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10, message: "Too many login attempts." });

router.post("/login", loginLimiter, login);
router.get("/me", requireAuth, me);
router.post("/logout", logout);

export default router;

