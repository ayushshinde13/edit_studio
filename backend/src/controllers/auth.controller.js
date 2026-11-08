import { config } from "../config/env.js";
import { generateToken } from "../middleware/auth.js";

export function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: { code: "BAD_REQUEST", message: "Email and password are required." },
    });
  }

  // Admin credentials check
  if (email.toLowerCase() === config.adminEmail.toLowerCase() && password === config.adminPassword) {
    const token = generateToken({
      id: "admin-root",
      email: config.adminEmail,
      isAdmin: true,
      role: "admin",
    });

    return res.json({
      token,
      user: {
        id: "admin-root",
        email: config.adminEmail,
        isAdmin: true,
        displayName: "Studio Admin",
      },
    });
  }

  // Standard user mock/demo login
  const token = generateToken({
    id: `user-${Buffer.from(email).toString("hex").substring(0, 10)}`,
    email,
    isAdmin: false,
    role: "user",
  });

  return res.json({
    token,
    user: {
      id: `user-${Buffer.from(email).toString("hex").substring(0, 10)}`,
      email,
      isAdmin: false,
      displayName: email.split("@")[0],
    },
  });
}

export function me(req, res) {
  if (!req.user) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "Not authenticated" },
    });
  }
  return res.json({ user: req.user });
}

export function logout(req, res) {
  return res.json({ success: true, message: "Logged out successfully" });
}

