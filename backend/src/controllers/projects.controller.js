import { store } from "../services/store.js";

export function listProjects(req, res) {
  const userId = req.user.id;
  const projects = store.getProjectsByUser(userId);
  res.json({ projects });
}

export function saveProject(req, res) {
  const userId = req.user.id;
  const projectData = req.body;

  if (!projectData || !projectData.title) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "Project title is required." },
    });
  }

  const saved = store.saveProject(userId, projectData);
  res.status(201).json({ project: saved });
}

export function deleteProject(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  const deleted = store.deleteProject(userId, id);
  if (!deleted) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Project not found or unauthorized." },
    });
  }

  res.json({ success: true, message: "Project deleted successfully" });
}

