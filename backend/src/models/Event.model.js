// PRD Section 17.10: Events Data Model for MongoDB
import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, index: true },
    ts: { type: Date, default: Date.now, index: true },
    sessionHash: { type: String, required: true },
    ipHash: { type: String, required: true, index: true },
    ipMasked: { type: String, required: true },
    countryCode: { type: String, default: "UNKNOWN", index: true },
    city: { type: String, default: "Unknown" },
    category: { type: String, required: true, enum: ["audio", "image", "video", "general"], index: true },
    tool: { type: String, required: true, index: true },
    action: { type: String, required: true, enum: ["open", "tool_open", "process", "tool_process", "export", "tool_export", "error", "tool_error", "capability_check"], index: true },
    ok: { type: Boolean, default: true },
    errorType: { type: String, default: null },
    deviceClass: { type: String, default: "desktop" },
    os: { type: String, default: "Unknown" },
    browser: { type: String, default: "Unknown" },
    webgpuSupported: { type: Boolean, default: false },
    backendUsed: { type: String, default: "wasm" },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Compound index per PRD Section 17.10: (tool, ts), (countryCode, ts), (action, ts)
EventSchema.index({ tool: 1, ts: -1 });
EventSchema.index({ countryCode: 1, ts: -1 });
EventSchema.index({ action: 1, ts: -1 });

export const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);

