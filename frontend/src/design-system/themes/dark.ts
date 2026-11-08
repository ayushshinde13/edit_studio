import { colors } from "../tokens/colors";

export const darkTheme = {
  background: colors.dark.bg,
  surface: colors.dark.surface,
  surfaceRaised: colors.dark.surfaceRaised,
  border: colors.dark.border,
  borderInteractive: colors.dark.borderInteractive,
  borderHover: colors.dark.borderHover,
  text: colors.dark.textPrimary,
  textMuted: colors.dark.textMuted,
  textDisabled: colors.dark.textDisabled,
  accent: colors.primary.DEFAULT,
  accentHover: colors.primary.hover,
  accentContrast: colors.primary.contrast,
  focusRing: colors.primary.DEFAULT,
} as const;

