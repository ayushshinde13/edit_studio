// PRD Section 16.4: Shares Data Model for MongoDB
import mongoose from "mongoose";

const ShareSchema = new mongoose.Schema(
  {
    shareId: { type: String, required: true, unique: true },
    projectId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    visibility: { type: String, enum: ["public", "unlisted"], default: "unlisted" },
    expiresAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    viewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Share = mongoose.models.Share || mongoose.model("Share", ShareSchema);

