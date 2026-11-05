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

/**
 * Curated retheme gallery (Cut A #5) — 12 original presets.
 * The first 6 are the existing derivation presets (Rose Glow, Noir Luxe,
 * Fresh Mart, Nova Tech, Saffron Kitchen, Modern Store) with stable
 * presetIds; the last 6 are new original looks. Every preset carries a
 * presetId + displayName (Theme.presetId / Theme.displayName) and default
 * tokens (radius/spacing in px) so ThemeTokensPanel can apply it in one
 * click without regenerating the project. deriveTheme() above is untouched
 * — it still returns the niche preset without presetId/tokens.
 */
export const THEME_PRESETS: Theme[] = [
  {
    name: "Rose Glow",
    presetId: "rose-glow",
    displayName: "Rose Glow — Soft Pink Beauty",
    colors: { primary: "#ec4899", secondary: "#f9a8d4", background: "#fff1f2", text: "#1f2937", accent: "#be185d" },
    font: "Poppins",
    style: "soft, feminine, premium",
    tokens: { radius: 16, spacing: 48 },
  },
  {
    name: "Noir Luxe",
    presetId: "noir-luxe",
    displayName: "Noir Luxe — Premium Dark Boutique",
    colors: { primary: "#111827", secondary: "#374151", background: "#0f0f0f", text: "#f9fafb", accent: "#d4af37" },
    font: "Playfair Display",
    style: "premium dark, luxury",
    tokens: { radius: 8, spacing: 56 },
  },
  {
    name: "Fresh Mart",
    presetId: "fresh-mart",
    displayName: "Fresh Mart — Clean Green Grocery",
    colors: { primary: "#16a34a", secondary: "#86efac", background: "#f0fdf4", text: "#14532d", accent: "#f59e0b" },
    font: "Inter",
    style: "fresh, clean, friendly",
    tokens: { radius: 12, spacing: 40 },
  },
  {
    name: "Nova Tech",
    presetId: "nova-tech",
    displayName: "Nova Tech — Bright Blue Gadgets",
    colors: { primary: "#2563eb", secondary: "#93c5fd", background: "#eff6ff", text: "#0f172a", accent: "#06b6d4" },
    font: "Inter",
    style: "modern, clean tech",
    tokens: { radius: 10, spacing: 48 },
  },
  {
    name: "Saffron Kitchen",
    presetId: "saffron-kitchen",
    displayName: "Saffron Kitchen — Warm Orange Food",
    colors: { primary: "#ea580c", secondary: "#fdba74", background: "#fff7ed", text: "#431407", accent: "#dc2626" },
    font: "Inter",
    style: "warm, appetising",
    tokens: { radius: 14, spacing: 44 },
  },
  {
    name: "Modern Store",
    presetId: "modern-store",
    displayName: "Modern Store — Clean Indigo Everyday",
    colors: { primary: "#4f46e5", secondary: "#a5b4fc", background: "#ffffff", text: "#111827", accent: "#ec4899" },
    font: "Inter",
    style: "modern, clean",
    tokens: { radius: 12, spacing: 48 },
  },
  {
    name: "Ember Night",
    presetId: "ember-night",
    displayName: "Ember Night — Warm Charcoal Glow",
    colors: { primary: "#f97316", secondary: "#78350f", background: "#1c1917", text: "#fafaf9", accent: "#fbbf24" },
    font: "Montserrat",
    style: "warm dark, bold",
    tokens: { radius: 10, spacing: 52 },
  },
  {
    name: "Meadow Pastel",
    presetId: "meadow-pastel",
    displayName: "Meadow Pastel — Soft Sage Calm",
    colors: { primary: "#65a30d", secondary: "#bef264", background: "#f7fee7", text: "#1a2e05", accent: "#eab308" },
    font: "Lora",
    style: "soft, calm, natural",
    tokens: { radius: 18, spacing: 44 },
  },
  {
    name: "Ocean Drift",
    presetId: "ocean-drift",
    displayName: "Ocean Drift — Cool Teal Coastal",
    colors: { primary: "#0e7490", secondary: "#67e8f9", background: "#ecfeff", text: "#164e63", accent: "#f59e0b" },
    font: "DM Sans",
    style: "cool, coastal, airy",
    tokens: { radius: 14, spacing: 48 },
  },
  {
    name: "Golden Hour",
    presetId: "golden-hour",
    displayName: "Golden Hour — Warm Amber Sunset",
    colors: { primary: "#b45309", secondary: "#fcd34d", background: "#fffbeb", text: "#451a03", accent: "#dc2626" },
    font: "Playfair Display",
    style: "warm, rich, sunset",
    tokens: { radius: 16, spacing: 52 },
  },
  {
    name: "Mono Studio",
    presetId: "mono-studio",
    displayName: "Mono Studio — Black And White Minimal",
    colors: { primary: "#000000", secondary: "#a1a1aa", background: "#ffffff", text: "#09090b", accent: "#3f3f46" },
    font: "Roboto",
    style: "minimal, monochrome, sharp",
    tokens: { radius: 4, spacing: 56 },
  },
  {
    name: "Berry Sorbet",
    presetId: "berry-sorbet",
    displayName: "Berry Sorbet — Bright Berry Playful",
    colors: { primary: "#9d174d", secondary: "#f0abfc", background: "#fdf2f8", text: "#500724", accent: "#7c3aed" },
    font: "Poppins",
    style: "playful, bright, sweet",
    tokens: { radius: 20, spacing: 40 },
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
