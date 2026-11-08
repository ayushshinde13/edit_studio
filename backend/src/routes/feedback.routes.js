import { Router } from "express";
import { submitFeedback, submitReport } from "../controllers/feedback.controller.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();
const feedbackLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 10 });

router.post("/", feedbackLimiter, submitFeedback);
router.post("/report", feedbackLimiter, submitReport);

export default router;

