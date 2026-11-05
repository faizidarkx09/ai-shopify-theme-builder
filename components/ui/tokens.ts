/* Wave 0 — design tokens as typed constants, mirroring the @theme
   tokens in app/globals.css. Later waves should use the Tailwind
   classes (bg-accent, text-ink …) — these constants are for code
   that needs a raw value (e.g. inline styles, canvas, meta tags). */

export const TOKENS = {
  color: {
    page: "#FFFFFF",
    panel: "#F8FAFC",
    ink: "#0F172A",
    body: "#475569",
    muted: "#64748B",
    border: "#E2E8F0",
    accent: "#4F46E5",
    accentHover: "#4338CA",
    accentSoft: "#EEF2FF",
    accentText: "#3730A3",
  },
  font: {
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
    weights: [400, 500, 600, 700] as const,
  },
  type: {
    heroDesktop: { size: 40, lineHeight: 48 },
    heroMobile: { size: 32, lineHeight: 40 },
    h2: { size: 28, lineHeight: 36 },
    h3: { size: 20, lineHeight: 28 },
    body: { size: 16, lineHeight: 25.6 },
    small: { size: 14, lineHeight: 21 },
  },
  layout: {
    maxContentWidth: 1120,
    sectionGapDesktop: 80,
    sectionGapMobile: 48,
  },
  touchTargetMin: 44,
} as const;
