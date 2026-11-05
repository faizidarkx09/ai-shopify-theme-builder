// lib/ai/plan.ts — Plan approval gate (Cut A, idea #1).
// A SitePlan is plain JSON data: the theme (derived once, never re-derived)
// plus the sitemap — pages with their section skeletons. The UI edits the
// plan directly (PlanApproval.tsx) and hands the approved plan to
// /api/generate, which generates pages from it instead of re-deriving.
// Theme derivation is NOT duplicated here: deriveTheme / detectNiche from
// lib/theme.ts stay the single source of truth.

import type { PageType, SectionType, Theme } from '../types';
import { isSectionType } from '../types';
import { deriveTheme, detectNiche, slugify, type Niche } from '../theme';
import { buildLogo, type Logo } from '../logo';
import type { ReferenceSummary } from '../reference';

/** One section in the plan — type + editable display title only. */
export interface PlanSection {
  type: SectionType;
  title: string;
}

/** One page in the plan's sitemap. */
export interface PlanPage {
  slug: string;
  title: string;
  pageType: PageType;
  sections: PlanSection[];
}

/** The whole approved-for-generation plan. Plain JSON — editable by the UI. */
export interface SitePlan {
  /** The original prompt the plan was derived from. */
  prompt: string;
  /** Niche the plan was derived for (template niche id, lib/theme.ts). */
  niche: Niche;
  theme: Theme;
  pages: PlanPage[];
  /**
   * Cut C #29 — text wordmark built from the store name during theme
   * derivation (lib/logo.ts). Pure SVG string, no external assets.
   */
  logo?: Logo;
}

/**
 * Evocative display names for the derived themes (Cut C #29, "named
 * themes" in the GoDaddy "Organic Luxury Warm Ivory" style). Original
 * wording: the derived theme name plus a niche descriptor, e.g.
 * "Rose Glow — Soft Pink Beauty". Only used when the theme has no
 * displayName yet — a theme that already carries one keeps it.
 */
const NICHE_DISPLAY: Record<Niche, string> = {
  cosmetic: 'Soft Pink Beauty',
  fashion: 'Premium Dark Boutique',
  grocery: 'Clean Green Grocery',
  tech: 'Bright Blue Gadgets',
  food: 'Warm Orange Food',
  general: 'Clean Modern Store',
};

export function evocativeDisplayName(theme: Theme, niche: Niche): string {
  if (theme.displayName?.trim()) return theme.displayName;
  return `${theme.name} — ${NICHE_DISPLAY[niche]}`;
}

/**
 * Store name from a prompt's first words (Cut C #29): the first two
 * words, title-cased, punctuation stripped ("cosmetic e-commerce
 * website, pink shade" -> "Cosmetic E-commerce"). Falls back to
 * "My Store" when the prompt has no usable words. This is only the
 * logo/wordmark name — the plan's theme and pages are unaffected.
 */
export function storeNameFromPrompt(prompt: string): string {
  const words = prompt
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.length > 0 ? words.join(' ') : 'My Store';
}

/** Default section skeleton (type + title) per page type. */
export const DEFAULT_PLAN_SECTIONS: Record<PageType, PlanSection[]> = {
  home: [
    { type: 'header', title: 'Header' },
    { type: 'hero', title: 'Hero' },
    { type: 'banner', title: 'Announcement banner' },
    { type: 'category', title: 'Shop by Category' },
    { type: 'product', title: 'Best Sellers' },
    { type: 'features', title: 'Why Shop With Us' },
    { type: 'testimonials', title: 'What Customers Say' },
    { type: 'newsletter', title: 'Join the List' },
    { type: 'cta', title: 'Call to Action' },
    { type: 'footer', title: 'Footer' },
  ],
  product: [
    { type: 'header', title: 'Header' },
    { type: 'hero', title: 'Product Hero' },
    { type: 'product', title: 'Product Details' },
    { type: 'features', title: 'Why This Product' },
    { type: 'trust-badges', title: 'Trust Badges' },
    { type: 'cta', title: 'Buy Now' },
    { type: 'footer', title: 'Footer' },
  ],
  category: [
    { type: 'header', title: 'Header' },
    { type: 'hero', title: 'Category Hero' },
    { type: 'category', title: 'All Categories' },
    { type: 'product', title: 'Best in Category' },
    { type: 'footer', title: 'Footer' },
  ],
};

function planPage(pageType: PageType, title: string, slug: string): PlanPage {
  return {
    slug: slugify(slug) || pageType,
    title,
    pageType,
    sections: DEFAULT_PLAN_SECTIONS[pageType].map((s) => ({ ...s })),
  };
}

/**
 * Derive a plan from a prompt — theme first (reuses lib/theme.ts), then a
 * 3-page sitemap: Home + Product Detail + Category. `niche` (a demo-niche
 * id such as "beauty", or a template niche) is only a hint: when the prompt
 * itself detects as 'general' it nudges theme detection, it never overrides
 * an explicit niche the prompt already states.
 * `reference` (Cut B #9): when a reference URL was read, its hints are
 * applied on top — see applyReferenceToPlan.
 */
export function derivePlan(prompt: string, niche?: string, reference?: ReferenceSummary): SitePlan {
  const clean = prompt.trim();
  const detected = detectNiche(clean);
  const hint = (niche ?? '').trim().toLowerCase();
  const themePrompt =
    detected === 'general' && hint ? `${clean} ${hint}` : clean;
  const theme = deriveTheme(themePrompt);
  const planNiche: Niche =
    detected === 'general' && hint ? detectNiche(themePrompt) : detected;
  // displayName: the named palette shown on the theme card (idea #1).
  // Cut C #29: only fill when missing — a theme that already names
  // itself keeps its own displayName.
  const namedTheme: Theme = {
    ...theme,
    colors: { ...theme.colors },
    displayName: evocativeDisplayName(theme, planNiche),
  };
  // Cut C #29: wordmark logo from the store name in the prompt's first
  // words, drawn in the derived theme.
  const logo = buildLogo(storeNameFromPrompt(clean), namedTheme);
  const plan: SitePlan = {
    prompt: clean,
    niche: planNiche,
    theme: namedTheme,
    pages: [
      planPage('home', 'Home', 'home'),
      planPage('product', 'Product Detail', 'product-detail'),
      planPage('category', 'Category', 'category'),
    ],
    logo,
  };
  return reference ? applyReferenceToPlan(plan, reference) : plan;
}

/**
 * Apply reference hints to a plan (Cut B #9). Pure + immutable:
 * - accent colour hint → plan theme accent (validated hex only).
 * - store-name hint → the Home page's header section title, so the plan
 *   card shows the reference store's name instead of the generic "Header".
 * - niche hint → plan.niche, but ONLY when the prompt detected as
 *   'general' (an explicit prompt niche always wins; the theme is NOT
 *   re-derived — the accent override above is the only theme change).
 */
export function applyReferenceToPlan(plan: SitePlan, ref: ReferenceSummary): SitePlan {
  const theme: Theme = {
    ...plan.theme,
    colors: {
      ...plan.theme.colors,
      ...(ref.accent ? { accent: ref.accent } : {}),
    },
  };
  const niche =
    plan.niche === 'general' && ref.nicheHint
      ? detectNiche(ref.nicheHint)
      : plan.niche;
  const pages = plan.pages.map((page, pageIndex) => {
    if (pageIndex !== 0 || !ref.storeNameHint) return page;
    return {
      ...page,
      sections: page.sections.map((s) =>
        s.type === 'header' ? { ...s, title: ref.storeNameHint as string } : s,
      ),
    };
  });
  return { ...plan, theme, niche, pages };
}

// --- Pure plan-editing helpers -------------------------------------------
// The plan is plain data, so the UI may edit it directly; these helpers
// just make the common edits one-liners and keep every edit immutable.

/** Rename a page (title only; slug is unchanged). */
export function updatePlanPageTitle(
  plan: SitePlan,
  pageIndex: number,
  title: string,
): SitePlan {
  const pages = plan.pages.map((p, i) =>
    i === pageIndex ? { ...p, title } : p,
  );
  return { ...plan, pages };
}

/** Rename a section inside a page. */
export function updatePlanSectionTitle(
  plan: SitePlan,
  pageIndex: number,
  sectionIndex: number,
  title: string,
): SitePlan {
  const pages = plan.pages.map((p, i) =>
    i === pageIndex
      ? {
          ...p,
          sections: p.sections.map((s, j) =>
            j === sectionIndex ? { ...s, title } : s,
          ),
        }
      : p,
  );
  return { ...plan, pages };
}

/** Add a section of `type` to a page (at the end, or at `atIndex`). */
export function addPlanSection(
  plan: SitePlan,
  pageIndex: number,
  type: SectionType,
  atIndex?: number,
): SitePlan {
  const label = type
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  const pages = plan.pages.map((p, i) => {
    if (i !== pageIndex) return p;
    const sections = [...p.sections];
    const entry: PlanSection = { type, title: label };
    if (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= sections.length) {
      sections.splice(atIndex, 0, entry);
    } else {
      sections.push(entry);
    }
    return { ...p, sections };
  });
  return { ...plan, pages };
}

/** Remove a section from a page (no-op if it would leave the page empty). */
export function removePlanSection(
  plan: SitePlan,
  pageIndex: number,
  sectionIndex: number,
): SitePlan {
  const pages = plan.pages.map((p, i) => {
    if (i !== pageIndex || p.sections.length <= 1) return p;
    return { ...p, sections: p.sections.filter((_, j) => j !== sectionIndex) };
  });
  return { ...plan, pages };
}

/** Toggle a section type on/off for a page: present → remove, absent → add. */
export function togglePlanSection(
  plan: SitePlan,
  pageIndex: number,
  type: SectionType,
): SitePlan {
  const page = plan.pages[pageIndex];
  if (!page) return plan;
  const idx = page.sections.findIndex((s) => s.type === type);
  return idx >= 0
    ? removePlanSection(plan, pageIndex, idx)
    : addPlanSection(plan, pageIndex, type);
}

/** Append a new page to the sitemap. */
export function addPlanPage(
  plan: SitePlan,
  pageType: PageType,
  title?: string,
): SitePlan {
  const name = (title ?? '').trim() || (pageType === 'home' ? 'Home' : pageType === 'product' ? 'Product Detail' : 'Category');
  const slugBase = slugify(name) || pageType;
  const slug = plan.pages.some((p) => p.slug === slugBase)
    ? `${slugBase}-${plan.pages.length + 1}`
    : slugBase;
  return { ...plan, pages: [...plan.pages, planPage(pageType, name, slug)] };
}

/** Remove a page from the sitemap (no-op if it would leave the plan empty). */
export function removePlanPage(plan: SitePlan, pageIndex: number): SitePlan {
  if (plan.pages.length <= 1) return plan;
  return { ...plan, pages: plan.pages.filter((_, i) => i !== pageIndex) };
}

// --- Validation / normalisation ------------------------------------------
// Incoming plans (from the client, via /api/generate) are untrusted JSON:
// normalise them into a valid SitePlan or return null.

function isPageType(value: unknown): value is PageType {
  return value === 'home' || value === 'product' || value === 'category';
}

export function normalizePlan(value: unknown): SitePlan | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as {
    prompt?: unknown;
    niche?: unknown;
    theme?: unknown;
    pages?: unknown;
  };
  const theme = raw.theme as Theme | undefined;
  if (
    !theme ||
    typeof theme.name !== 'string' ||
    typeof theme.font !== 'string' ||
    typeof theme.style !== 'string' ||
    !theme.colors ||
    typeof theme.colors !== 'object' ||
    ['primary', 'secondary', 'background', 'text', 'accent'].some(
      (k) => typeof (theme.colors as unknown as Record<string, unknown>)[k] !== 'string',
    )
  ) {
    return null;
  }
  if (!Array.isArray(raw.pages) || raw.pages.length === 0) return null;
  const pages: PlanPage[] = [];
  for (const p of raw.pages as Array<Record<string, unknown>>) {
    if (typeof p !== 'object' || p === null) return null;
    const pageType = isPageType(p.pageType) ? p.pageType : 'home';
    if (!Array.isArray(p.sections) || p.sections.length === 0) return null;
    const sections: PlanSection[] = [];
    for (const s of p.sections as Array<Record<string, unknown>>) {
      if (typeof s !== 'object' || s === null || !isSectionType(s.type)) return null;
      sections.push({
        type: s.type,
        title: typeof s.title === 'string' && s.title.trim() ? s.title.trim() : s.type,
      });
    }
    pages.push({
      slug: slugify(typeof p.slug === 'string' ? p.slug : pageType) || pageType,
      title: typeof p.title === 'string' && p.title.trim() ? p.title.trim() : pageType,
      pageType,
      sections,
    });
  }
  const niche: Niche =
    typeof raw.niche === 'string' ? detectNiche(raw.niche) : 'general';
  // Cut C #29: keep a valid logo when the client sends one back, and
  // fill an evocative displayName when the theme has none.
  const rawLogo = (value as { logo?: unknown }).logo as
    | { svg?: unknown; text?: unknown; initials?: unknown }
    | undefined;
  const logo: Logo | undefined =
    rawLogo &&
    typeof rawLogo.svg === 'string' &&
    typeof rawLogo.text === 'string' &&
    typeof rawLogo.initials === 'string'
      ? { svg: rawLogo.svg, text: rawLogo.text, initials: rawLogo.initials }
      : undefined;
  return {
    prompt: typeof raw.prompt === 'string' ? raw.prompt : '',
    niche,
    theme: {
      ...theme,
      colors: { ...theme.colors },
      displayName: evocativeDisplayName(theme, niche),
    },
    pages,
    ...(logo ? { logo } : {}),
  };
}
