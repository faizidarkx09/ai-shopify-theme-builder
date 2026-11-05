// app/api/edit/route.ts — Agent 3 (Inline Editor)
// AI-chat edit endpoint. Updates ONLY the one section it receives —
// it never regenerates the whole page.
// - GEMINI_API_KEY set: asks Gemini for a JSON patch for that section only.
// - No key: rule-based fallback from lib/sections (same logic the chat
//   panel uses offline). No real keys are hardcoded anywhere.

import { NextResponse } from "next/server";
import type { Section } from "@/lib/sections";
import type { CsvProduct } from "@/lib/types";
import { applyAiEdit } from "@/lib/sections";
import { describeRegeneration, regenerateSection } from "@/lib/ai/regenerate";

// NOTE: no `export const dynamic` here — Next 16 enables cacheComponents
// in this scaffold and rejects the force-dynamic segment config; POST
// route handlers are dynamic by default anyway.

const ALLOWED_FIELDS = new Set([
  "title",
  "subtitle",
  "text",
  "image",
  "bgColor",
  "textColor",
  "align",
  "padding",
  "fontSize",
  "floating",
  "rounded",
]);

function sanitizePatch(raw: unknown, section: Section): Partial<Section> {
  if (!raw || typeof raw !== "object") return {};
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (k === "align" && v !== "left" && v !== "center" && v !== "right") continue;
    if ((k === "padding" || k === "fontSize") && typeof v !== "number") continue;
    if ((k === "floating" || k === "rounded") && typeof v !== "boolean") continue;
    if (
      (k === "title" || k === "subtitle" || k === "text" || k === "image" || k === "bgColor" || k === "textColor") &&
      typeof v !== "string"
    )
      continue;
    patch[k] = v;
  }
  void section;
  return patch as Partial<Section>;
}

function describeChanges(before: Section, after: Section): string[] {
  const out: string[] = [];
  (Object.keys(after) as (keyof Section)[]).forEach((k) => {
    if (before[k] !== after[k]) out.push(`${k} update kar diya`);
  });
  return out.length > 0 ? out : ["Koi change nahi mila — instruction dobara likho."];
}

async function geminiEdit(section: Section, instruction: string): Promise<Partial<Section> | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const prompt = [
    "You edit ONE website section. Return ONLY a JSON object (no markdown, no explanation).",
    "Only these fields are allowed: title, subtitle, text, image, bgColor, textColor, align (left|center|right), padding (number), fontSize (number), floating (boolean), rounded (boolean).",
    "Change ONLY what the instruction asks for. Do not invent new content for fields the instruction does not mention.",
    `Instruction: ${instruction}`,
    `Current section: ${JSON.stringify(section)}`,
  ].join("\n");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const jsonText = text.replace(/```json|```/g, "").trim();
  try {
    return sanitizePatch(JSON.parse(jsonText) as unknown, section);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { instruction, section, preview, mode, theme, products, seed } = (body ?? {}) as {
    instruction?: unknown;
    section?: unknown;
    /** Cut A #4: preview mode — the route NEVER applies an edit itself. */
    preview?: unknown;
    /** Cut B #7: mode 'regenerate' — fresh variation of the same section. */
    mode?: unknown;
    theme?: unknown;
    products?: unknown;
    seed?: unknown;
  };
  // This route is preview-only by design (Cut A #4, staged AI edits): it
  // returns the PROPOSED section and never writes anything. The client
  // shows the proposal and applies it only when the user clicks Accept
  // (PageEditor). `preview: true` in the request is accepted for clarity
  // and `preview: true, applied: false` is echoed in every response so
  // callers can rely on the contract. `preview` is optional — omitting it
  // behaves exactly the same, so old callers keep working.
  void preview;
  if (mode === "regenerate") {
    // Cut B #7: no instruction needed — regenerate varies the section
    // itself. Same preview-only response shape as the edit flow.
    if (!section || typeof section !== "object" || typeof (section as Section).id !== "string") {
      return NextResponse.json({ error: "section (Section object, id ke saath) zaroori hai" }, { status: 400 });
    }
    const current = section as Section;
    const list = Array.isArray(products) ? (products as CsvProduct[]) : undefined;
    const seedNum = typeof seed === "number" && Number.isFinite(seed) ? Math.floor(seed) : 0;
    const next = regenerateSection(
      current,
      theme && typeof theme === "object" ? (theme as Parameters<typeof regenerateSection>[1]) : null,
      list,
      seedNum,
    );
    return NextResponse.json({
      section: next,
      changes: describeRegeneration(current, next),
      mode: "regenerate",
      preview: true,
      applied: false,
    });
  }
  if (typeof instruction !== "string" || !instruction.trim()) {
    return NextResponse.json({ error: "instruction (string) zaroori hai" }, { status: 400 });
  }
  if (!section || typeof section !== "object" || typeof (section as Section).id !== "string") {
    return NextResponse.json({ error: "section (Section object, id ke saath) zaroori hai" }, { status: 400 });
  }
  const current = section as Section;

  // 1) Try Gemini when a key is configured.
  const patch = await geminiEdit(current, instruction).catch(() => null);
  if (patch && Object.keys(patch).length > 0) {
    const next: Section = { ...current, ...patch };
    return NextResponse.json({
      section: next,
      changes: describeChanges(current, next),
      mode: "gemini",
      // Preview-only contract (Cut A #4): proposed, NOT applied.
      preview: true,
      applied: false,
    });
  }

  // 2) Rule-based fallback (also used when Gemini returns nothing useful).
  const { section: next, changes } = applyAiEdit(current, instruction);
  return NextResponse.json({ section: next, changes, mode: "rules", preview: true, applied: false });
}
