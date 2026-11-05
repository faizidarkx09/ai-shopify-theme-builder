// lib/logo.ts — AI Logo Maker, Cut C #29 (text-based wordmark only).
// Pure string building: NO external calls, NO images, NO font downloads.
// A wordmark = initials in a rounded square (theme primary background) +
// the store name set in the theme font. The SVG is inline and self
// contained, so it renders in the plan card, the editor header and the
// exported theme without any asset.

import type { Theme } from './types';

export interface Logo {
  /** Complete inline SVG (self-contained, no external refs). */
  svg: string;
  /** Store name as shown next to the mark. */
  text: string;
  /** 1–2 letter initials inside the mark. */
  initials: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseHex(color: string): [number, number, number] | null {
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const hex = m[1];
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

/** White or near-black, whichever reads better on `bg` (WCAG luminance). */
export function legibleOn(bg: string): string {
  const rgb = parseHex(bg);
  if (!rgb) return '#ffffff';
  const lum = rgb
    .map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    })
    .reduce((acc, c, i) => acc + [0.2126, 0.7152, 0.0722][i] * c, 0);
  return lum > 0.179 ? '#111827' : '#ffffff';
}

/**
 * Initials from a store name: first letters of the first two words
 * ("Glow Studio" -> "GS", "Fresh Mart" -> "FM", "Nova" -> "N").
 * Non-letters are stripped; empty input falls back to "S".
 */
export function storeInitials(storeName: string): string {
  const words = storeName
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return 'S';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Build a text wordmark for a store. `storeName` is the display name
 * (from the prompt or the brand kit); `theme` supplies the primary
 * colour, the text colour and the font. The mark is a 64×64 rounded
 * square with the initials, followed by the store name in the theme
 * font — sized to the name length so long names do not overflow.
 */
export function buildLogo(storeName: string, theme: Theme): Logo {
  const text = storeName.trim() || 'My Store';
  const initials = storeInitials(text);
  const bg = theme.colors.primary;
  const onBg = legibleOn(bg);
  const fg = theme.colors.text;
  const font = escapeXml(theme.font);
  // Rough width estimate: ~11px per character at 28px font size, plus
  // the 64px mark and gaps. Pure SVG, so the width just needs to fit.
  const textWidth = Math.max(40, text.length * 17);
  const width = 64 + 16 + textWidth + 16;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="64" viewBox="0 0 ${width} 64" role="img" aria-label="${escapeXml(text)} logo">` +
    `<rect x="0" y="0" width="64" height="64" rx="14" fill="${escapeXml(bg)}"/>` +
    `<text x="32" y="41" text-anchor="middle" font-family="${font}, sans-serif" font-size="26" font-weight="700" fill="${escapeXml(onBg)}">${escapeXml(initials)}</text>` +
    `<text x="80" y="40" font-family="${font}, sans-serif" font-size="28" font-weight="700" fill="${escapeXml(fg)}">${escapeXml(text)}</text>` +
    `</svg>`;
  return { svg, text, initials };
}

/** Convenience wrapper: just the SVG string for a store + theme. */
export function logoSvgForTheme(storeName: string, theme: Theme): string {
  return buildLogo(storeName, theme).svg;
}
