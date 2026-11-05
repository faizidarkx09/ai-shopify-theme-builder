// lib/types.ts — CANONICAL shared types (Agent 1 owns this file).
// Shapes follow PLAN.md exactly. INTEGRATION (2026-11-05): lib/ai/types.ts,
// lib/db/types.ts and lib/export/types.ts now re-export from here, and
// lib/sections.ts extends this Section — single source of truth.
// Optional section fields + padding in px (number), per PLAN.md.
//
// All dates are ISO strings so projects survive JSON/localStorage
// round-trips. No credentials, keys or external services are referenced.

export type SectionType =
  | 'hero'
  | 'header'
  | 'footer'
  | 'banner'
  | 'category'
  | 'product'
  | 'features'
  | 'cta';

export const SECTION_TYPES: readonly SectionType[] = [
  'hero',
  'header',
  'footer',
  'banner',
  'category',
  'product',
  'features',
  'cta',
];

export function isSectionType(value: unknown): value is SectionType {
  return (
    typeof value === 'string' &&
    (SECTION_TYPES as readonly string[]).includes(value)
  );
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  /** e.g. "Inter", "Playfair Display" — a font-family name, not a download. */
  font: string;
  /** e.g. "modern", "premium-dark", "minimal", "playful". */
  style: string;
}

export interface Section {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  text?: string;
  /** Placeholder image URL (picsum seed) unless the user uploads one. */
  image?: string;
  bgColor?: string;
  textColor?: string;
  /** "left" | "center" | "right" */
  align?: 'left' | 'center' | 'right';
  /** Padding in px applied around the section. */
  padding?: number;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
}

export interface ProjectMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface Project {
  id: string;
  /** Owner id from lib/auth.ts (guest/demo user id in Cut 1). */
  ownerId: string;
  name: string;
  /** The original prompt the user typed, e.g. "cosmetic store, pink shade". */
  prompt: string;
  theme: Theme;
  pages: Page[];
  /** Chat history for this project (prompt + AI edits). */
  messages: ProjectMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NewProjectInput {
  name?: string;
  prompt: string;
  theme?: Theme;
  pages?: Page[];
}

/** Fields a caller is allowed to change after creation. */
export type ProjectPatch = Partial<
  Pick<Project, 'name' | 'prompt' | 'theme' | 'pages' | 'messages'>
>;

/** Page jo generate karni hai: homepage pehle, baad me product/category. */
export type PageType = 'home' | 'product' | 'category';

/** Fallback image when an image URL fails to load (picsum seed). */
export function placeholderImage(seed: string, w = 1200, h = 800): string {
  const safe = seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `https://picsum.photos/seed/${safe || 'store'}/${w}/${h}`;
}
