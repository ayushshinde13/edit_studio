import jwt from "jsonwebtoken";
import { config } from "../config/env.js";

/**
 * Generate a JWT token for an authenticated user
 */
export function generateToken(payload) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
}

/**
 * Authenticate optional user token (guest or authenticated)
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
  } catch (err) {
    req.user = null;
  }
  next();
}

/**
 * Require valid authenticated session
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Authentication required." },
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Session expired or invalid." },
    });
  }
}

/**
 * Require Admin role (PRD Section 17.1)
 */
export function requireAdmin(req, res, next) {
  // Check authorization header first
  const authHeader = req.headers.authorization;
  const adminKeyHeader = req.headers["x-admin-key"];

  // Direct dev API key bypass
  if (adminKeyHeader && adminKeyHeader === config.adminPassword) {
    req.user = { id: "admin-root", email: config.adminEmail, isAdmin: true };
    return next();
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({
      error: { code: "FORBIDDEN", message: "Admin access required." },
    });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (!decoded.isAdmin) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Admin privileges required." },
      });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Session expired or invalid." },
    });
  }
}

