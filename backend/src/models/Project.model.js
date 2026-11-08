// PRD Section 16.4: Projects Data Model for MongoDB
import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    projectId: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ["stems", "audio_tool", "photo", "collage", "video"] },
    title: { type: String, required: true },
    state: { type: mongoose.Schema.Types.Mixed, default: {} },
    thumbnailPath: { type: String, default: null },
    sizeBytes: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const Project = mongoose.models.Project || mongoose.model("Project", ProjectSchema);

