import crypto from "crypto";
import { config } from "../config/env.js";

/**
 * Creates a salted SHA-256 hash of an IP address.
 * Matches PRD 17.9: Stored as a salted hash for unique counting and IP search.
 */
export function hashIp(ip) {
  if (!ip) return "unknown_hash";
  return crypto
    .createHmac("sha256", config.ipSalt)
    .update(ip)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Masks an IP address (e.g., 103.xxx.xxx.xxx).
 * Matches PRD 17.9: Displayed masked for safe admin review.
 */
export function maskIp(ip) {
  if (!ip) return "xxx.xxx.xxx.xxx";

  // IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.xxx.xxx.xxx`;
    }
  }

  // IPv6
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts[0]}:xxxx:xxxx:xxxx`;
  }

  return "xxx.xxx.xxx.xxx";
}

/**
 * Express middleware to attach privacy-safe client metadata to req.clientInfo
 */
export function anonymizeMiddleware(req, res, next) {
  const forwarded = req.headers["x-forwarded-for"];
  const rawIp = forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "127.0.0.1";

  // Extract Cloudflare / Vercel geolocation headers if available
  const countryCode =
    req.headers["cf-ipcountry"] ||
    req.headers["x-vercel-ip-country"] ||
    req.headers["x-country-code"] ||
    "US";

  const city =
    req.headers["cf-ipcity"] ||
    req.headers["x-vercel-ip-city"] ||
    "Localhost";

  // Parse simple device class from user-agent
  const ua = req.headers["user-agent"] || "";
  let deviceClass = "desktop";
  if (/iPad|tablet/i.test(ua)) {
    deviceClass = "tablet";
  } else if (/Mobi|Android|iPhone/i.test(ua)) {
    deviceClass = "mobile";
  }

  let browser = "Chromium";
  if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Edg/i.test(ua)) browser = "Edge";

  let os = "Desktop OS";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad/i.test(ua)) os = "iOS";

  req.clientInfo = {
    rawIp,
    ipHash: hashIp(rawIp),
    ipMasked: maskIp(rawIp),
    countryCode: String(countryCode).toUpperCase(),
    city,
    deviceClass,
    browser,
    os,
  };

  next();
}

