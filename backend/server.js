import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./src/config/env.js";
import { connectDB } from "./src/config/db.js";
import { anonymizeMiddleware } from "./src/middleware/anonymize.js";
import { errorHandler, notFoundHandler } from "./src/middleware/errorHandler.js";
import { initRetentionWorker } from "./src/services/retention.js";

// Routes
import authRoutes from "./src/routes/auth.routes.js";
import meRoutes from "./src/routes/me.routes.js";
import projectsRoutes from "./src/routes/projects.routes.js";
import uploadsRoutes from "./src/routes/uploads.routes.js";
import sharesRoutes from "./src/routes/shares.routes.js";
import reportsRoutes from "./src/routes/reports.routes.js";
import eventsRoutes from "./src/routes/events.routes.js";
import feedbackRoutes from "./src/routes/feedback.routes.js";
import modelsRoutes from "./src/routes/models.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";

const app = express();

// Security Headers (PRD 6.3 & 16.7: COOP & COEP for WASM/SharedArrayBuffer)
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginEmbedderPolicy: { policy: "require-corp" },
  })
);

// CORS
app.use(
  cors({
    origin: [config.frontendUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
  })
);

// Request Logging
if (config.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// Body Parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Anonymization & Device Extraction
app.use(anonymizeMiddleware);

// Health Check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "edito-backend",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Mount API v1 Routes per PRD Section 16.5
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/me", meRoutes);
app.use("/api/v1/projects", projectsRoutes);
app.use("/api/v1/uploads", uploadsRoutes);
app.use("/api/v1/shares", sharesRoutes);
app.use("/api/v1/reports", reportsRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/models", modelsRoutes);
app.use("/api/v1/admin", adminRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server (only if not running under test suite)
let server = null;
if (process.env.NODE_ENV !== "test") {
  server = app.listen(config.port, () => {
    console.log(`\n======================================================`);
    console.log(`  Edito Express.js Backend running on port ${config.port}`);
    console.log(`  Environment: ${config.nodeEnv}`);
    console.log(`  Health Check: http://localhost:${config.port}/health`);
    console.log(`  API Base URL: http://localhost:${config.port}/api/v1/`);
    console.log(`======================================================\n`);

    connectDB();
    initRetentionWorker();
  });
}

export default app;

