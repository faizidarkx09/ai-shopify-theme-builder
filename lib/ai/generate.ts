// lib/ai/generate.ts — Generation orchestration (Agent 2).
// Flow: prompt -> deriveTheme (theme FIRST) -> Gemini (agar key hai) warna
// template -> sections ko validate/complete karo -> ek-ek section event
// ke tor par stream karo. Route is generator ko SSE me badalta hai.
// Note: Gemini ko ek call me bulaya jata hai, phir sections ek-ek kar ke
// emit hote hain taake preview live update ho. Token-level streaming
// abhi nahi hai — wo Cut 2 ki behtari hai, is Cut 1 me section-level
// streaming hi spec hai. Original code.

import type {
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
  if (input.pageType) return input.pageType;
  return detectPageType(input.prompt);
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
  const pageType = resolvePageType(input);
  const theme = input.theme ?? deriveTheme(prompt);
  yield { type: 'theme', theme };

  const title = input.pageTitle?.trim();
  // Slug pageTitle/pageType se banta hai — prompt ke pehle alfaz se nahi,
  // warna har prompt ka slug alag aur be-tarteeb hota.
  const defaultTitle =
    pageType === 'home' ? 'Home' : pageType === 'product' ? 'Product Detail' : 'Category';
  const defaultSlug =
    pageType === 'home' ? 'home' : pageType === 'product' ? 'product-detail' : 'category';
  const pageSlug = title ? slugify(title) : defaultSlug;
  const pageTitle = title || defaultTitle;

  let sections: Section[];
  if (hasGeminiKey()) {
    const raw = await generateWithGemini(prompt, theme, pageType);
    if (raw && raw.length > 0) {
      sections = completeSections(raw, theme, pageSlug);
    } else {
      // Gemini fail ho gaya to chup-chaap template par gir jao, user ko
      // khali page kabhi mat do.
      sections = buildPageFromTemplate(prompt, theme, pageType, pageTitle).sections;
    }
  } else {
    sections = buildPageFromTemplate(prompt, theme, pageType, pageTitle).sections;
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
