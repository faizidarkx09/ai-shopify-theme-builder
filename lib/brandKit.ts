// lib/brandKit.ts — Brand Kit that compounds (Cut B, idea #10).
// A BrandKit is the project's persistent brand: colours / font / tone /
// logo. It is stored on Project.brandKit (lib/types.ts) and, when a
// generate request carries one, applied to the theme BEFORE generation
// (lib/ai/generate.ts) so every later page inherits the kit.
// All inputs are validated/sanitised here — never trust client JSON.

import type { BrandKit, Theme, ThemeColors } from './types';
import { fetchReferenceSummary, validateHexColor } from './reference';

const FONT_ALLOWLIST = [
  'Inter',
  'Poppins',
  'Playfair Display',
  'Montserrat',
  'Roboto',
  'Lora',
  'DM Sans',
] as const;

function cleanColor(value: unknown): string | undefined {
  return typeof value === 'string' ? validateHexColor(value) : undefined;
}

function cleanFont(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 32);
  if (!clean) return undefined;
  const match = (FONT_ALLOWLIST as readonly string[]).find(
    (f) => f.toLowerCase() === clean.toLowerCase(),
  );
  return match ?? clean;
}

function cleanText(value: unknown, max = 120): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/\s+/g, ' ').slice(0, max);
  return clean || undefined;
}

/**
 * Validate + normalise an untrusted brand-kit object. Unknown fields are
 * dropped; invalid colours are dropped (never passed through). Returns
 * null when nothing usable survives.
 */
export function normalizeBrandKit(value: unknown): BrandKit | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const kit: BrandKit = {};
  if (raw.colors && typeof raw.colors === 'object') {
    const c = raw.colors as Record<string, unknown>;
    const colors: Partial<ThemeColors> = {};
    for (const key of ['primary', 'secondary', 'background', 'text', 'accent'] as const) {
      const v = cleanColor(c[key]);
      if (v) colors[key] = v;
    }
    if (Object.keys(colors).length > 0) kit.colors = colors;
  }
  const font = cleanFont(raw.font);
  if (font) kit.font = font;
  const tone = cleanText(raw.tone, 200);
  if (tone) kit.tone = tone;
  const logoText = cleanText(raw.logoText, 48);
  if (logoText) kit.logoText = logoText;
  const logoColor = cleanColor(raw.logoColor);
  if (logoColor) kit.logoColor = logoColor;
  const sourceUrl = cleanText(raw.sourceUrl, 500);
  if (sourceUrl) kit.sourceUrl = sourceUrl;
  return Object.keys(kit).length > 0 ? kit : null;
}

/** Build a BrandKit from loose editor input (same validation as normalize). */
export function deriveBrandKit(input: {
  colors?: Partial<ThemeColors>;
  font?: string;
  tone?: string;
  logoText?: string;
  logoColor?: string;
  sourceUrl?: string;
}): BrandKit {
  return normalizeBrandKit(input) ?? {};
}

/**
 * Apply a brand kit on top of a theme: kit colours/font override the
 * theme; everything else (name, style, tokens, preset) is kept. The kit
 * never mutates its input — it returns a new theme.
 */
export function applyBrandKitToTheme(theme: Theme, kit: BrandKit | null | undefined): Theme {
  if (!kit) return theme;
  const next: Theme = {
    ...theme,
    colors: { ...theme.colors, ...(kit.colors ?? {}) },
  };
  if (kit.font) next.font = kit.font;
  // A hand-applied kit is no longer a stock preset.
  if (kit.colors || kit.font) next.presetId = undefined;
  return next;
}

/**
 * Read a brand from a public URL (server-side only — uses the same
 * safe-fetch helper as the plan route, lib/reference.ts, with the same
 * SSRF limits: http/https only, 5 s timeout, 200 KB cap, no redirects,
 * private hosts blocked). Maps the reference summary onto a partial
 * BrandKit: page title → logo text, theme-color → accent colour.
 * Never throws — on failure it returns an empty kit with the source URL.
 */
export async function readBrandFromUrl(url: string): Promise<Partial<BrandKit>> {
  const ref = await fetchReferenceSummary(url);
  const kit: Partial<BrandKit> = { sourceUrl: ref.url };
  if (ref.storeNameHint) kit.logoText = ref.storeNameHint;
  if (ref.accent) {
    kit.colors = { accent: ref.accent };
    kit.logoColor = ref.accent;
  }
  if (ref.description) kit.tone = ref.description.slice(0, 200);
  return kit;
}
