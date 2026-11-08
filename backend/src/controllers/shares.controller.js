import { store } from "../services/store.js";

export function createShare(req, res) {
  const userId = req.user ? req.user.id : "guest-user";
  const { projectId, visibility, expiryDays } = req.body;

  if (!projectId) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "projectId is required" },
    });
  }

  const share = store.createShare(projectId, userId, { visibility, expiryDays });
  res.status(201).json({ share, shareUrl: `/s/${share.token}` });
}

export function getShare(req, res) {
  const { token } = req.params;
  const share = store.getShare(token);

  if (!share) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Share link not found or has expired." },
    });
  }

  // Find associated project metadata
  const project = store.projects.get(share.projectId) || {
    id: share.projectId,
    title: "Shared Stem Audio Mix",
    type: "stems",
    state: {},
  };

  res.json({ share, project });
}

export function revokeShare(req, res) {
  const userId = req.user.id;
  const { token } = req.params;

  const revoked = store.revokeShare(userId, token);
  if (!revoked) {
    return res.status(404).json({
      error: { code: "NOT_FOUND", message: "Share link not found or unauthorized." },
    });
  }

  res.json({ success: true, message: "Share revoked" });
}

