// lib/polish.ts — One-click "Polish" pass, Cut C #30.
// Honest scope, stated up front: this pass fixes ALT TEXT, CONTRAST,
// SPACING and DUPLICATE-WORD cleanup. It is NOT a spell-checker — no
// spelling claims are made and no words are "corrected" beyond removing
// an exact repeated word ("the the" -> "the") and collapsing double
// spaces. Pure function: returns a NEW page, never mutates the input.

import type { Page, Section, Theme } from './types';
import { contrastRatio } from './export/audit';

export interface PolishFix {
  id: string;
  message: string;
}

export interface PolishResult {
  page: Page;
  fixes: PolishFix[];
}

const MIN_PADDING = 16;
const MAX_PADDING = 96;
const MIN_CONTRAST = 4.5;

/** Collapse runs of 2+ spaces and trim. Returns null when unchanged. */
function tidySpaces(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const cleaned = value.replace(/\s{2,}/g, ' ').trim();
  return cleaned === value ? undefined : cleaned;
}

/**
 * Remove an exact repeated word ("the the" -> "the", case-insensitive).
 * Returns null when unchanged. Only collapses a word repeated
 * immediately after itself — it never rewrites any other wording.
 */
function dedupeWords(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const cleaned = value.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
  return cleaned === value ? undefined : cleaned;
}

function tidyText(value: string | undefined): { value: string | undefined; changed: boolean } {
  let out = value;
  let changed = false;
  const spaced = tidySpaces(out);
  if (spaced !== undefined) {
    out = spaced;
    changed = true;
  }
  const deduped = dedupeWords(out);
  if (deduped !== undefined) {
    out = deduped;
    changed = true;
  }
  return { value: out, changed };
}

/**
 * Polish one page against its theme. Fixes, in order:
 *  (1) Alt text — a section with an image but an empty title gets
 *      title = "<type> image" (the renderer uses the title as alt text).
 *  (2) Contrast — text/bg below 4.5:1 gets textColor switched to black
 *      (#111827) or white (#ffffff), whichever passes (at least one
 *      always does — the higher of the two ratios is >= ~4.58:1).
 *  (3) Spacing — padding clamped into 16–96px; double spaces trimmed
 *      in title/subtitle/text.
 *  (4) Duplicate-word cleanup — "the the" -> "the" (see dedupeWords).
 * No spelling is checked and none is claimed.
 */
export function polishPage(page: Page, theme: Theme): PolishResult {
  const fixes: PolishFix[] = [];
  let n = 0;
  const add = (message: string) => {
    n += 1;
    fixes.push({ id: `polish-${n}`, message });
  };

  const sections: Section[] = page.sections.map((section) => {
    let s: Section = { ...section };
    const label = s.title?.trim() || s.type;

    // (1) Alt text.
    if (s.image && !s.title?.trim()) {
      const alt = `${s.type} image`;
      s = { ...s, title: alt };
      add(`Section "${s.type}": image had no title for alt text — set title to "${alt}".`);
    }

    // (2) Contrast.
    const bg = s.bgColor ?? theme.colors.background;
    const fg = s.textColor ?? theme.colors.text;
    const ratio = contrastRatio(fg, bg);
    if (ratio !== null && ratio < MIN_CONTRAST) {
      const black = contrastRatio('#111827', bg) ?? 0;
      const white = contrastRatio('#ffffff', bg) ?? 0;
      const next = black >= white ? '#111827' : '#ffffff';
      const nextRatio = Math.max(black, white);
      s = { ...s, textColor: next };
      add(
        `Section "${label}": text contrast was ${ratio.toFixed(2)}:1 (below ${MIN_CONTRAST}:1) — switched text colour to ${next} (${nextRatio.toFixed(2)}:1).`,
      );
    }

    // (3) Spacing — padding clamp.
    if (typeof s.padding === 'number' && (s.padding < MIN_PADDING || s.padding > MAX_PADDING)) {
      const clamped = Math.min(MAX_PADDING, Math.max(MIN_PADDING, s.padding));
      s = { ...s, padding: clamped };
      add(`Section "${label}": padding ${section.padding}px clamped to ${clamped}px (allowed ${MIN_PADDING}–${MAX_PADDING}px).`);
    }

    // (3)+(4) Spacing + duplicate words in title/subtitle/text.
    for (const field of ['title', 'subtitle', 'text'] as const) {
      const { value, changed } = tidyText(s[field]);
      if (changed) {
        s = { ...s, [field]: value };
        add(`Section "${label}": trimmed extra spaces / repeated words in ${field}.`);
      }
    }

    return s;
  });

  return { page: { ...page, sections }, fixes };
}
