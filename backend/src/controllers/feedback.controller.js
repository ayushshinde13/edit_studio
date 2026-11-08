import { store } from "../services/store.js";

export function submitFeedback(req, res) {
  const { message, deviceInfo } = req.body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "Feedback message cannot be empty." },
    });
  }

  const record = store.addFeedback({
    message: message.trim(),
    deviceInfo: deviceInfo || {
      deviceClass: req.clientInfo.deviceClass,
      browser: req.clientInfo.browser,
      os: req.clientInfo.os,
    },
    ipHash: req.clientInfo.ipHash,
  });

  res.status(201).json({ success: true, feedback: record });
}

export function submitReport(req, res) {
  const { shareId, reason } = req.body;

  if (!shareId || !reason) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "shareId and reason are required." },
    });
  }

  const record = store.addReport({
    shareId,
    reason,
    ipHash: req.clientInfo.ipHash,
  });

  res.status(201).json({ success: true, report: record });
}

