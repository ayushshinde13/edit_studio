import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load backend/.env explicitly
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
// Also fallback to root .env if present
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "edito_default_jwt_secret_change_me",
  adminEmail: process.env.ADMIN_EMAIL || "admin@edito.studio",
  adminPassword: process.env.ADMIN_PASSWORD || "adminedito2026",
  ipSalt: process.env.IP_SALT || "edito_salt_v1",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/edito_studio",
};

