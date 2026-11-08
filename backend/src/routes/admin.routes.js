import { Router } from "express";
import {
  getSummary,
  getCharts,
  getLogs,
  exportLogs,
  getErrors,
  getSettings,
  updateSettings,
  runCleanup,
} from "../controllers/admin.controller.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// Protect all admin routes per PRD 17.1
router.use(requireAdmin);

router.get("/summary", getSummary);
router.get("/charts", getCharts);
router.get("/logs", getLogs);
router.get("/logs/export", exportLogs);
router.get("/errors", getErrors);
router.get("/settings", getSettings);
router.patch("/settings", updateSettings);
router.post("/cleanup", runCleanup);

export default router;

