// lib/ai/gemini.ts — Gemini generation (Agent 2).
// REST API (fetch) use hoti hai, koi paid SDK nahi. Key sirf env se aati
// hai — kabhi code me hardcode nahi, aur kabhi log nahi hoti.
// Key na ho ya Gemini fail ho jaye to caller template mode par gir jata
// hai (lib/ai/generate.ts), is liye ye function kabhi throw nahi karta —
// fail hone par `null` deta hai. Original code.

import type { CsvProduct, PageType, Section, Theme } from './types';
import { isSectionType } from './types';

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/** Model env se configurable, default gemini-2.5-flash (PLAN.md). */
export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

const SYSTEM_PROMPT = `You are a Shopify theme designer. You design ONE e-commerce web page as JSON sections only.
Rules:
- Reply with a JSON array ONLY — no markdown, no code fences, no extra text.
- Each item: {"type": "hero"|"header"|"footer"|"banner"|"category"|"product"|"features"|"cta", "title": string, "subtitle": string, "text": string, "image": string, "bgColor": hex, "textColor": hex, "align": "left"|"center"|"right", "padding": string}
- Use the given theme colors for bgColor/textColor so the page stays consistent.
- For "image" use a picsum.photos seeded URL like https://picsum.photos/seed/<slug>/1200/800 — never invent another image host.
- Products and content are PLACEHOLDERS, not a real catalog.
- Homepage: 8 sections in this order: header, hero, banner, category, product, features, cta, footer.
- Product page: header, hero, features, cta, footer.
- Category page: header, hero, category, product, footer.`;

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function parseSections(raw: string): Array<Partial<Section>> | null {
  try {
    const parsed: unknown = JSON.parse(stripCodeFences(raw));
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed as { sections?: unknown }).sections;
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const cleaned = arr.filter(
      (s): s is Partial<Section> =>
        typeof s === 'object' && s !== null && isSectionType((s as { type?: unknown }).type),
    );
    return cleaned.length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

/**
 * Gemini se page sections mango. Timeout 60s. Koi bhi failure
 * (no key, network, bad JSON, empty) par `null` — caller fallback chalata hai.
 */
export async function generateWithGemini(
  prompt: string,
  theme: Theme,
  pageType: PageType,
  products?: CsvProduct[],
): Promise<Array<Partial<Section>> | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = getGeminiModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const userText = [
      `Store prompt: ${prompt}`,
      `Page type: ${pageType}`,
      `Theme: ${theme.name} (${theme.style}), font ${theme.font}`,
      `Colors: primary ${theme.colors.primary}, secondary ${theme.colors.secondary}, background ${theme.colors.background}, text ${theme.colors.text}, accent ${theme.colors.accent}`,
      // Demo products (or the merchant's real csvProducts) so the product
      // section features real names/prices instead of inventing its own.
      ...(products && products.length > 0
        ? [
            `Products to feature (demo data unless the merchant supplied their own — do not invent others): ${products
              .slice(0, 6)
              .map((p) => `${p.name} ($${p.price})`)
              .join(', ')}`,
          ]
        : []),
      'Generate the page sections as a JSON array.',
    ].join('\n');
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.error('[gemini] API error', res.status);
      return null;
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('') ?? '';
    if (!text.trim()) return null;
    return parseSections(text);
  } catch (err) {
    console.error('[gemini] request failed', err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
