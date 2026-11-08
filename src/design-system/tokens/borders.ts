/**
 * 1px Border Specifications & Crisp Radiuses
 * Strictly avoids diffuse shadows in favor of crisp 1px borders for SaaS hierarchy.
 */

export const borders = {
  width: {
    DEFAULT: "1px",
    focus: "1px",
  },
  radius: {
    none: "0px",
    sm: "4px",
    DEFAULT: "6px",
    md: "8px",
    lg: "10px",
    xl: "12px",
    full: "9999px",
  },
} as const;

