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
  | 'cta'
  | 'testimonials'
  | 'faq'
  | 'newsletter'
  | 'announcement'
  | 'countdown'
  | 'trust-badges'
  | 'bundle'
  | 'sticky-atc'
  | 'delivery'
  | 'custom';

export const SECTION_TYPES: readonly SectionType[] = [
  'hero',
  'header',
  'footer',
  'banner',
  'category',
  'product',
  'features',
  'cta',
  'testimonials',
  'faq',
  'newsletter',
  'announcement',
  'countdown',
  'trust-badges',
  'bundle',
  'sticky-atc',
  'delivery',
  'custom',
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
  /** Editable design tokens (Cut A #5): radius/spacing in px. */
  tokens?: { radius?: number; spacing?: number };
  /** Id of the preset this theme was derived from, if any. */
  presetId?: string;
  /** Display name shown in the theme gallery (e.g. "Organic Luxury Warm Ivory"). */
  displayName?: string;
  /** Cut C #22: theme-wide motion cap. 'none' = no animation classes
   *  render; 'low' = fade only; 'medium' = fade + slide-up; 'high' = all
   *  entrances. Defaults to 'medium' when unset. */
  animationLevel?: AnimationLevel;
}

/** Cut C #22: theme-wide animation level (TeleportHQ-style). */
export type AnimationLevel = 'none' | 'low' | 'medium' | 'high';

/** Entrances a given animation level allows (SectionAnimation.entrance). */
export const ALLOWED_ENTRANCES: Record<
  AnimationLevel,
  readonly ('none' | 'fade' | 'slide-up' | 'zoom' | 'slide-left')[]
> = {
  none: ['none'],
  low: ['none', 'fade'],
  medium: ['none', 'fade', 'slide-up'],
  high: ['none', 'fade', 'slide-up', 'zoom', 'slide-left'],
};

/** Clamp an entrance to what the theme's animation level allows. */
export function capEntrance(
  entrance: SectionAnimation['entrance'],
  level: AnimationLevel | undefined,
): SectionAnimation['entrance'] {
  const allowed = ALLOWED_ENTRANCES[level ?? 'medium'];
  if (!entrance || entrance === 'none') return entrance ?? 'none';
  return (allowed as readonly string[]).includes(entrance) ? entrance : 'fade';
}

/** Entrance/hover motion for a section (Wave 0 foundation; Cut C #22 builds the UI). */
export interface SectionAnimation {
  entrance?: 'none' | 'fade' | 'slide-up' | 'zoom' | 'slide-left';
  delayMs?: number;
  hover?: 'none' | 'lift' | 'scale';
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
  /** Entrance + hover motion (optional; 'none' = no animation). */
  animation?: SectionAnimation;
  /** Layout variant name, e.g. "full-width" | "boxed" | "narrow" (free-form). */
  layout?: string;
  /** Global section (header/footer/announcement): edit once, updates everywhere. */
  global?: boolean;
  /** Cut C #28: shared identity for a global section across pages.
   *  Sections with the same globalKey are the SAME logical section; the
   *  exporter emits its Liquid once and references it from every template. */
  globalKey?: string;
  /** Custom block content (type 'custom'): raw HTML/CSS/JS, sandboxed on render. */
  customHtml?: string;
  customCss?: string;
  customJs?: string;
  /** CRO / commerce data: countdown target, stock count, etc. */
  meta?: Record<string, string | number | boolean>;
}

export interface PageSeo {
  title?: string;
  description?: string;
  /** URL handle (slug override) for the exported theme. */
  handle?: string;
  noindex?: boolean;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
  /** Per-page SEO (Cut B #13). */
  seo?: PageSeo;
  /** Variant B source page id (Cut C #24 seed). */
  variantOf?: string;
  /** Funnel step (Cut C #23): landing -> product -> upsell -> thankyou. */
  funnelStep?: 'landing' | 'product' | 'upsell' | 'thankyou';
}

export interface ProjectMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface BrandKit {
  colors?: Partial<ThemeColors>;
  font?: string;
  tone?: string;
  logoText?: string;
  logoColor?: string;
  /** URL the brand was read from (Cut B #10 "Read brand from URL"). */
  sourceUrl?: string;
}

export interface CreditHistoryEntry {
  id: string;
  action: string;
  cost: number;
  createdAt: string;
}

export interface ProjectVersion {
  id: string;
  label: string;
  createdAt: string;
  pages: Page[];
  theme: Theme;
}

export interface ProjectComment {
  id: string;
  pageId: string;
  sectionId?: string;
  /** Pin position as % of the preview width/height. */
  xPct: number;
  yPct: number;
  text: string;
  status: 'open' | 'done';
  createdAt: string;
}

export interface CsvProduct {
  name: string;
  price: number;
  description?: string;
  image?: string;
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
  /** Brand kit that compounds across pages (Cut B #10). */
  brandKit?: BrandKit;
  /** AI-credit balance (Cut B #14). */
  credits?: { balance: number; used: number; history: CreditHistoryEntry[] };
  /** Version snapshots, max 10 (Cut A #4) — see lib/db/versions.ts. */
  versions?: ProjectVersion[];
  /** Comment-mode pins on the preview (Cut B/C #25). */
  comments?: ProjectComment[];
  /** Page ids in funnel order (Cut C #23). */
  funnelOrder?: string[];
  /** True when this project is saved as a reusable template (Cut C #27). */
  isTemplate?: boolean;
  templateName?: string;
  /** Demo products imported from CSV (Cut C: Shopify CSV import first). */
  csvProducts?: CsvProduct[];
}

export interface NewProjectInput {
  name?: string;
  prompt: string;
  theme?: Theme;
  pages?: Page[];
}

/** Fields a caller is allowed to change after creation. */
export type ProjectPatch = Partial<
  Pick<
    Project,
    | 'name'
    | 'prompt'
    | 'theme'
    | 'pages'
    | 'messages'
    | 'brandKit'
    | 'credits'
    | 'versions'
    | 'comments'
    | 'funnelOrder'
    | 'isTemplate'
    | 'templateName'
    | 'csvProducts'
  >
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
