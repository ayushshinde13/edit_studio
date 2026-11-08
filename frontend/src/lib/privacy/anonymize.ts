import crypto from "crypto";

const SERVER_SALT = process.env.ANALYTICS_SALT || "edito-privacy-salt-2026-default";

export function maskIP(ip: string): string {
  if (!ip) return "unknown";
  
  // IPv4 mask e.g. 103.120.45.67 -> 103.xxx.xxx.xxx or 103.120.xxx.xxx
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.xxx.xxx.xxx`;
    }
  }

  // IPv6 mask e.g. 2001:0db8:85a3:... -> 2001:0db8:xxxx:...
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return parts.slice(0, 2).concat(["xxxx", "xxxx"]).join(":");
  }

  return "xxx.xxx.xxx.xxx";
}

export function hashIP(ip: string): string {
  if (!ip) return "anon";
  return crypto.createHmac("sha256", SERVER_SALT).update(ip.trim()).digest("hex").slice(0, 32);
}

export function generateSessionHash(str?: string): string {
  const seed = str || Math.random().toString(36).substring(2) + Date.now().toString(36);
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24);
}

