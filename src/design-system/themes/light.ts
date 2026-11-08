import { colors } from "../tokens/colors";

export const lightTheme = {
  background: colors.light.bg,
  surface: colors.light.surface,
  surfaceRaised: colors.light.surfaceRaised,
  border: colors.light.border,
  borderInteractive: colors.light.borderInteractive,
  borderHover: colors.light.borderHover,
  text: colors.light.textPrimary,
  textMuted: colors.light.textMuted,
  textDisabled: colors.light.textDisabled,
  accent: colors.primary.DEFAULT,
  accentHover: colors.primary.hover,
  accentContrast: colors.primary.contrast,
  focusRing: colors.primary.DEFAULT,
} as const;

