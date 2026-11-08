import { Router } from "express";
import { createReport } from "../controllers/reports.controller.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Rate limit public reports to 10 per 15 minutes
router.post("/", createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), createReport);

export default router;
