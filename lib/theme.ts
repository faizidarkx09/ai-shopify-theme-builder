// lib/theme.ts — Theme-first derivation (Agent 2).
// Usool (blueprint §1, step 3): page banne se PEHLE theme banta hai, taake
// har page ka color/font/style ek jaisa rahe. Ye sirf prompt ke keywords
// se theme chunta hai — koi AI call nahi, is liye demo bina key ke bhi
// consistent rehta hai. Original code.

import type { Theme } from './ai/types';

export type Niche =
  | 'cosmetic'
  | 'fashion'
  | 'grocery'
  | 'tech'
  | 'food'
  | 'general';

const PRESETS: Record<Niche, Theme> = {
  cosmetic: {
    name: 'Rose Glow',
    colors: {
      primary: '#ec4899',
      secondary: '#f9a8d4',
      background: '#fff1f2',
      text: '#1f2937',
      accent: '#be185d',
    },
    font: 'Poppins',
    style: 'soft, feminine, premium',
  },
  fashion: {
    name: 'Noir Luxe',
    colors: {
      primary: '#111827',
      secondary: '#374151',
      background: '#0f0f0f',
      text: '#f9fafb',
      accent: '#d4af37',
    },
    font: 'Playfair Display',
    style: 'premium dark, luxury',
  },
  grocery: {
    name: 'Fresh Mart',
    colors: {
      primary: '#16a34a',
      secondary: '#86efac',
      background: '#f0fdf4',
      text: '#14532d',
      accent: '#f59e0b',
    },
    font: 'Inter',
    style: 'fresh, clean, friendly',
  },
  tech: {
    name: 'Nova Tech',
    colors: {
      primary: '#2563eb',
      secondary: '#93c5fd',
      background: '#eff6ff',
      text: '#0f172a',
      accent: '#06b6d4',
    },
    font: 'Inter',
    style: 'modern, clean tech',
  },
  food: {
    name: 'Saffron Kitchen',
    colors: {
      primary: '#ea580c',
      secondary: '#fdba74',
      background: '#fff7ed',
      text: '#431407',
      accent: '#dc2626',
    },
    font: 'Inter',
    style: 'warm, appetising',
  },
  general: {
    name: 'Modern Store',
    colors: {
      primary: '#4f46e5',
      secondary: '#a5b4fc',
      background: '#ffffff',
      text: '#111827',
      accent: '#ec4899',
    },
    font: 'Inter',
    style: 'modern, clean',
  },
};

const NICHE_KEYWORDS: Array<{ niche: Niche; words: string[] }> = [
  {
    niche: 'cosmetic',
    words: ['cosmetic', 'beauty', 'makeup', 'make-up', 'skincare', 'skin', 'glow', 'lipstick', 'perfume', 'salon', 'pink'],
  },
  {
    niche: 'fashion',
    words: ['fashion', 'clothing', 'clothes', 'apparel', 'boutique', 'luxury', 'premium', 'dark theme', 'streetwear', 'shoes', 'dress'],
  },
  {
    niche: 'grocery',
    words: ['grocery', 'groceries', 'vegetable', 'vegetables', 'fruit', 'fruits', 'fresh', 'organic', 'farm', 'mart', 'green'],
  },
  {
    niche: 'tech',
    words: ['tech', 'gadget', 'electronics', 'mobile', 'phone', 'laptop', 'software', 'digital'],
  },
  {
    niche: 'food',
    words: ['food', 'restaurant', 'cafe', 'coffee', 'bakery', 'pizza', 'burger', 'kitchen', 'spice'],
  },
];

/** Prompt se niche pehchano — pehla match jeetta hai, warna 'general'. */
export function detectNiche(prompt: string): Niche {
  const lower = prompt.toLowerCase();
  for (const { niche, words } of NICHE_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return niche;
  }
  return 'general';
}

/**
 * Prompt se consistent theme banao. 'dark' lafz ho to fashion preset ka
 * dark variant chuno, chahe niche kuch bhi ho — "premium dark theme"
 * wala example isi liye kaam karta hai.
 */
export function deriveTheme(prompt: string): Theme {
  const lower = prompt.toLowerCase();
  const niche = detectNiche(prompt);
  if (lower.includes('dark') && niche !== 'grocery' && niche !== 'cosmetic') {
    return { ...PRESETS.fashion, colors: { ...PRESETS.fashion.colors } };
  }
  const preset = PRESETS[niche];
  return { ...preset, colors: { ...preset.colors } };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'store';
}

/** Chhota unique id — demo/seeded ids ke liye kaafi hai. */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
