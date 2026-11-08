// PRD Section 16.4: Feedback & Bug Reports Data Model for MongoDB
import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    feedbackId: { type: String, required: true, unique: true },
    userId: { type: String, default: null },
    message: { type: String, required: true },
    deviceInfo: { type: mongoose.Schema.Types.Mixed, default: {} },
    email: { type: String, default: null },
    ipMasked: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const Feedback = mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);

