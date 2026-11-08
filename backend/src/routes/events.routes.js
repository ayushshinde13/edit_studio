import { Router } from "express";
import { trackEvents } from "../controllers/events.controller.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();
// High threshold for event batching
const eventsLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120 });

router.post("/", eventsLimiter, trackEvents);

export default router;

