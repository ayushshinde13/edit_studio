import { Router } from "express";
import { getManifest } from "../controllers/models.controller.js";

const router = Router();

router.get("/manifest", getManifest);

export default router;

