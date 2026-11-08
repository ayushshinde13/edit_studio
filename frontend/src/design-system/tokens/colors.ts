/**
 * Edito Solid Color Tokens
 * Strict Neo-Minimalist SaaS palette inspired by Linear, Raycast, and Vercel.
 * STRICT RULE: No gradients, no blurs, no glowing halos. Pure solid colors.
 */

export const colors = {
  // Brand Primary Anchor
  primary: {
    DEFAULT: "#fb6b6a", // Soft Coral / Sunset Red
    hover: "#ea5857",
    active: "#d94746",
    subtle: "#fb6b6a15", // 8% alpha for tags/subtle highlights
    contrast: "#ffffff",
  },

  // Dark Theme Scales (Deep Obsidian & Muted Slabs)
  dark: {
    bg: "#09090b",
    surface: "#121215",
    surfaceRaised: "#18181c",
    border: "#27272a",
    borderInteractive: "#3f3f46",
    borderHover: "#fb6b6a",
    textPrimary: "#f4f4f5",
    textMuted: "#a1a1aa",
    textDisabled: "#52525b",
  },

  // Light Theme Scales (Pure White & Clean Slabs)
  light: {
    bg: "#ffffff",
    surface: "#fbfbfb",
    surfaceRaised: "#f4f4f5",
    border: "#e5e7eb",
    borderInteractive: "#d1d5db",
    borderHover: "#fb6b6a",
    textPrimary: "#111827",
    textMuted: "#6b7280",
    textDisabled: "#9ca3af",
  },

  // Functional Status Colors (Solid flat fills)
  status: {
    success: "#10b981",
    successSubtle: "#10b98115",
    warning: "#f59e0b",
    warningSubtle: "#f59e0b15",
    error: "#ef4444",
    errorSubtle: "#ef444415",
    info: "#3b82f6",
    infoSubtle: "#3b82f615",
  },
} as const;

