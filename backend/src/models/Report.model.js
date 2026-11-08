// PRD Section 16.4: Reports & Moderation Data Model for MongoDB
import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true },
    shareId: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    comments: { type: String, default: "" },
    reporterIpMasked: { type: String, default: "anonymous" },
    status: { type: String, default: "pending_review", enum: ["pending_review", "resolved", "dismissed"] },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.models.Report || mongoose.model("Report", ReportSchema);

