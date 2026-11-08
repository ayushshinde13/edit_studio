// PRD Section 16.5 & Feature B10: Abuse Reporting & Takedown Handling
import crypto from "crypto";
import { store } from "../services/store.js";

export async function createReport(req, res) {
  const { shareId, reason, comments } = req.body;

  if (!shareId || !reason) {
    return res.status(400).json({
      error: { code: "INVALID_REPORT", message: "shareId and reason are required." },
    });
  }

  const reportId = `rep_${crypto.randomBytes(6).toString("hex")}`;
  const reportItem = {
    id: reportId,
    shareId,
    reason,
    comments: comments || "",
    reporterIpMasked: req.clientGeo?.ipMasked || "anonymous",
    status: "pending_review",
    createdAt: new Date().toISOString(),
  };

  // Add report to telemetry / moderation queue in store
  if (!store.reports) {
    store.reports = [];
  }
  store.reports.push(reportItem);

  res.status(201).json({
    status: "received",
    reportId,
    message: "Thank you for helping keep Edito safe. Our moderation system will review this report promptly.",
  });
}

