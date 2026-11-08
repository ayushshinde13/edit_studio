import { Router } from "express";
import { listProjects, saveProject, deleteProject } from "../controllers/projects.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.get("/", listProjects);
router.post("/", saveProject);
router.delete("/:id", deleteProject);

export default router;

