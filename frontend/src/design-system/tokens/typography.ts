/**
 * Edito Typography System
 * High legibility sans-serif scales exceeding WCAG AAA (> 4.5:1 text-to-background contrast).
 */

export const typography = {
  fontFamily: {
    sans: 'var(--font-geist-sans), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'var(--font-geist-mono), "JetBrains Mono", "SF Mono", Consolas, monospace',
  },
  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
    sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
    base: ["0.875rem", { lineHeight: "1.375rem" }], // 14px (SaaS default)
    md: ["0.9375rem", { lineHeight: "1.5rem" }], // 15px
    lg: ["1.125rem", { lineHeight: "1.625rem" }], // 18px
    xl: ["1.375rem", { lineHeight: "1.875rem" }], // 22px
    "2xl": ["1.75rem", { lineHeight: "2.125rem" }], // 28px
    "3xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
  },
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  letterSpacing: {
    tight: "-0.02em",
    normal: "0em",
    wide: "0.03em",
  },
} as const;

