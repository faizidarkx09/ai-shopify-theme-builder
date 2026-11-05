// lib/ai/generate.ts — Generation orchestration (Agent 2).
// Flow: prompt -> deriveTheme (theme FIRST) -> Gemini (agar key hai) warna
// template -> sections ko validate/complete karo -> ek-ek section event
// ke tor par stream karo. Route is generator ko SSE me badalta hai.
// Note: Gemini ko ek call me bulaya jata hai, phir sections ek-ek kar ke
// emit hote hain taake preview live update ho. Token-level streaming
// abhi nahi hai — wo Cut 2 ki behtari hai, is Cut 1 me section-level
// streaming hi spec hai. Original code.

import type {
  CsvProduct,
  GenerateEvent,
  GenerateInput,
  Page,
  PageType,
  Section,
  Theme,
} from './types';
import { deriveTheme, slugify, uid } from '../theme';
import { buildPageFromTemplate, detectPageType, FALLBACK_IMAGE, imageUrl } from '../templates';
import { generateWithGemini, hasGeminiKey } from './gemini';
import { demoProductsForPrompt } from '../demoCatalog';
import { applyBrandKitToTheme } from '../brandKit';
import type { PlanSection, SitePlan } from './plan';

export type GenerationMode = 'gemini' | 'template';

export function getGenerationMode(): GenerationMode {
  return hasGeminiKey() ? 'gemini' : 'template';
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Gemini/template se aayi kachchi sections ko mukammal Section banao. */
export function completeSections(
  raw: Array<Partial<Section>>,
  theme: Theme,
  pageSlug: string,
): Section[] {
  return raw.map((s, index) => {
    const type = s.type ?? 'hero';
    const image =
      typeof s.image === 'string' && s.image.startsWith('http')
        ? s.image
        : imageUrl(`${pageSlug}-${type}-${index}`, 1200, 800);
    return {
      id: s.id?.trim() || `sec_${pageSlug}_${type}_${index}`,
      type,
      title: s.title?.trim() || '',
      subtitle: s.subtitle?.trim() || '',
      text: s.text ?? '',
      image,
      bgColor: s.bgColor?.trim() || theme.colors.background,
      textColor: s.textColor?.trim() || theme.colors.text,
      align: s.align === 'left' || s.align === 'center' || s.align === 'right' ? s.align : 'left',
      padding:
        typeof s.padding === "number"
          ? s.padding
          : typeof (s as { padding?: unknown }).padding === "string"
            ? Number.parseInt((s as { padding?: string }).padding as string, 10) || 48
            : 48,
    };
  });
}

export function resolvePageType(input: GenerateInput): PageType {
  if (input.plan) {
    const idx = Math.max(0, Math.min(input.planPageIndex ?? 0, input.plan.pages.length - 1));
    return input.plan.pages[idx].pageType;
  }
  if (input.pageType) return input.pageType;
  return detectPageType(input.prompt);
}

/**
 * Products for the product sections: the project's real csvProducts when
 * the caller passes them, otherwise the demo catalog for the prompt's
 * niche (clearly labelled demo data — see lib/demoCatalog.ts).
 */
export function resolveProducts(input: GenerateInput): CsvProduct[] {
  if (input.products && input.products.length > 0) return input.products;
  return demoProductsForPrompt(input.prompt);
}

/**
 * Shape a candidate section list to the plan's skeleton: keep only the
 * section types the plan lists, in the plan's order; reuse a matching
 * candidate section when one exists (plan title wins, except header/footer
 * where the candidate carries the store name); otherwise build a minimal
 * section from the plan entry. Sections the plan dropped are dropped.
 */
export function applyPlanSections(
  candidates: Section[],
  planSections: PlanSection[],
  theme: Theme,
  pageSlug: string,
): Section[] {
  const pool = new Map<string, Section[]>();
  for (const s of candidates) {
    const list = pool.get(s.type) ?? [];
    list.push(s);
    pool.set(s.type, list);
  }
  const built: Section[] = [];
  for (const spec of planSections) {
    const match = pool.get(spec.type)?.shift();
    if (match) {
      // Header/footer titles are the store name — plan titles there are
      // just generic labels ("Header"), so keep the candidate's title.
      const keepTitle = spec.type === 'header' || spec.type === 'footer';
      built.push(keepTitle ? match : { ...match, title: spec.title || match.title });
    } else {
      built.push(
        ...completeSections(
          [{ type: spec.type, title: spec.title }],
          theme,
          pageSlug,
        ),
      );
    }
  }
  return built;
}

/** Image URL kharab ho to fallback — editor/preview isay use kar sakta hai. */
export function withImageFallback(image: string): string {
  return image && image.startsWith('http') ? image : FALLBACK_IMAGE;
}

/**
 * Page generate karo aur events stream karo:
 * 1. `theme` — pehle theme, taake preview theme foran laga sake
 * 2. `section` — har section ek-ek kar ke, live preview ke liye
 * 3. `done` — mukammal page
 */
export async function* generatePageEvents(
  input: GenerateInput,
): AsyncGenerator<GenerateEvent, void, unknown> {
  const prompt = input.prompt.trim();
  if (!prompt) {
    yield { type: 'error', message: 'Prompt khali hai — pehle prompt likho.' };
    return;
  }
  // Plan present ho to plan hi source of truth hai: uska theme, uska page
  // (slug/title/type/sections). Bina plan ke purana behaviour — kuch nahi
  // badla, purane callers bilkul waisay hi chalte hain.
  const plan: SitePlan | undefined = input.plan;
  const planPage = plan
    ? plan.pages[Math.max(0, Math.min(input.planPageIndex ?? 0, plan.pages.length - 1))]
    : undefined;
  const pageType = planPage ? planPage.pageType : resolvePageType(input);
  // Cut B #10 — brand kit overrides the theme BEFORE generation: the
  // base theme is the plan theme when a plan is present, else the
  // caller-supplied theme, else the prompt-derived theme. The theme event
  // below therefore already carries the kit, so later pages inherit it.
  const baseTheme = plan && planPage ? plan.theme : (input.theme ?? deriveTheme(prompt));
  const theme = applyBrandKitToTheme(baseTheme, input.brandKit);
  yield { type: 'theme', theme };

  const title = planPage ? planPage.title : input.pageTitle?.trim();
  // Slug pageTitle/pageType se banta hai — prompt ke pehle alfaz se nahi,
  // warna har prompt ka slug alag aur be-tarteeb hota.
  const defaultTitle =
    pageType === 'home' ? 'Home' : pageType === 'product' ? 'Product Detail' : 'Category';
  const defaultSlug =
    pageType === 'home' ? 'home' : pageType === 'product' ? 'product-detail' : 'category';
  const pageSlug = planPage ? planPage.slug : title ? slugify(title) : defaultSlug;
  const pageTitle = title || defaultTitle;
  const products = resolveProducts(input);

  let sections: Section[];
  if (hasGeminiKey()) {
    const raw = await generateWithGemini(prompt, theme, pageType, products);
    if (raw && raw.length > 0) {
      sections = completeSections(raw, theme, pageSlug);
    } else {
      // Gemini fail ho gaya to chup-chaap template par gir jao, user ko
      // khali page kabhi mat do.
      sections = buildPageFromTemplate(prompt, theme, pageType, pageTitle, products).sections;
    }
  } else {
    sections = buildPageFromTemplate(prompt, theme, pageType, pageTitle, products).sections;
  }

  // Plan ka skeleton lagao: sirf plan wale sections, plan ki order me.
  if (planPage) {
    sections = applyPlanSections(sections, planPage.sections, theme, pageSlug);
  }

  const page: Page = {
    id: uid('page'),
    slug: pageSlug,
    title: pageTitle,
    sections,
  };

  // Demo pacing: template mode me sections thora waqfa de kar aayein taake
  // streaming preview nazar aaye. Gemini mode me waqfa chhota hai.
  const paceMs = getGenerationMode() === 'template' ? 150 : 60;
  for (let i = 0; i < sections.length; i++) {
    yield { type: 'section', section: sections[i], index: i, total: sections.length };
    if (i < sections.length - 1) await sleep(paceMs);
  }
  yield { type: 'done', page };
}

/** Non-streaming caller ke liye — saare events jama kar ke page de do. */
export async function generatePage(input: GenerateInput): Promise<Page> {
  let page: Page | null = null;
  for await (const event of generatePageEvents(input)) {
    if (event.type === 'done') page = event.page;
    if (event.type === 'error') throw new Error(event.message);
  }
  if (!page) throw new Error('Page generate nahi hui.');
  return page;
}
