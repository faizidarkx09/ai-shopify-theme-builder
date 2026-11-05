// components/editor/PromptStarters.tsx — Kill the blank prompt box
// (Cut A, idea #2 + #19). Suggestion chips, structured fields (store name,
// what you sell, audience, vibe) and a personality picker. Used by the
// editor chat + the dashboard new-project form.
//   <PromptStarters onPick={(prompt) => setPrompt(prompt)}
//     onPickStructured={(fields) => setPrompt(buildPromptFromFields(fields))} />
// `buildPromptFromFields` is exported so callers can compose the same
// prompt string without duplicating the format. All UI text is original.

"use client";

import { useState } from "react";
import { DEMO_NICHES } from "@/lib/demoCatalog";

export interface StructuredPromptFields {
  storeName: string;
  sells: string;
  audience: string;
  vibe: string;
  personality: PersonalityId;
  /**
   * Cut B #9 — reference URL, optional. It is NOT part of the composed
   * prompt string; the caller sends it separately to POST /api/plan as
   * `referenceUrl` (see onReferenceUrl below).
   */
  referenceUrl?: string;
}

export type PersonalityId = "bold" | "refined" | "playful" | "luxe" | "minimal";

export interface Personality {
  id: PersonalityId;
  label: string;
  hint: string;
  description: string;
}

export const PERSONALITIES: readonly Personality[] = [
  { id: "bold", label: "Bold", hint: "bold and punchy", description: "Big type, strong colours, loud energy." },
  { id: "refined", label: "Refined", hint: "refined and calm", description: "Quiet, polished, plenty of breathing room." },
  { id: "playful", label: "Playful", hint: "playful and fun", description: "Bright, friendly, a little cheeky." },
  { id: "luxe", label: "Luxe", hint: "luxurious and premium", description: "Dark, rich, high-end feel." },
  { id: "minimal", label: "Minimal", hint: "minimal and clean", description: "Simple, airy, nothing extra." },
];

/** Suggestion chips — original wording, one per common store idea. */
export const SUGGESTION_CHIPS: readonly string[] = [
  "A cosy candle shop with warm, handmade scents",
  "A skincare store with a soft blush glow",
  "A sneaker shop for streetwear lovers",
  "A fresh grocery store with same-day delivery",
  "A coffee roastery selling beans and brewing gear",
  "A handmade jewellery boutique with a luxury feel",
];

/**
 * Compose one prompt string from the structured fields. The personality
 * becomes a tone hint at the end of the prompt.
 */
export function buildPromptFromFields(fields: StructuredPromptFields): string {
  const personality = PERSONALITIES.find((p) => p.id === fields.personality);
  const parts: string[] = [];
  if (fields.storeName.trim()) parts.push(`Store name: ${fields.storeName.trim()}.`);
  if (fields.sells.trim()) parts.push(`It sells ${fields.sells.trim()}.`);
  if (fields.audience.trim()) parts.push(`Made for ${fields.audience.trim()}.`);
  if (fields.vibe.trim()) parts.push(`Vibe: ${fields.vibe.trim()}.`);
  if (personality) parts.push(`Tone: ${personality.hint}.`);
  return parts.join(" ") || "A modern online store.";
}

export interface PromptStartersProps {
  /** A chip (or the composed structured prompt) was picked. */
  onPick: (prompt: string) => void;
  /**
   * Structured form was submitted. Callers that only need the prompt
   * string can ignore this and use onPick (it fires with the composed
   * prompt too); callers that want the raw fields use this.
   */
  onPickStructured?: (fields: StructuredPromptFields) => void;
  /**
   * Cut B #9 — a reference URL was entered next to the prompt. The
   * caller sends it to POST /api/plan as `referenceUrl` (the editor's
   * plan call); it is also included in the structured fields as
   * `referenceUrl`. Fires on structured submit, when the field is filled.
   */
  onReferenceUrl?: (url: string) => void;
  /** Pre-select a personality (default "refined"). */
  defaultPersonality?: PersonalityId;
}

export default function PromptStarters({
  onPick,
  onPickStructured,
  onReferenceUrl,
  defaultPersonality = "refined",
}: PromptStartersProps) {
  const [storeName, setStoreName] = useState("");
  const [sells, setSells] = useState("");
  const [audience, setAudience] = useState("");
  const [vibe, setVibe] = useState("");
  const [personality, setPersonality] = useState<PersonalityId>(defaultPersonality);
  const [referenceUrl, setReferenceUrl] = useState("");

  function submitStructured(e: React.FormEvent) {
    e.preventDefault();
    const fields: StructuredPromptFields = {
      storeName,
      sells,
      audience,
      vibe,
      personality,
      ...(referenceUrl.trim() ? { referenceUrl: referenceUrl.trim() } : {}),
    };
    onPickStructured?.(fields);
    if (referenceUrl.trim()) onReferenceUrl?.(referenceUrl.trim());
    onPick(buildPromptFromFields(fields));
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold">Not sure what to write? Start here</p>

      {/* Niche quick-start chips (idea #19) */}
      <div className="mt-3 flex flex-wrap gap-2">
        {DEMO_NICHES.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => onPick(n.prefillPrompt)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-700"
          >
            {n.label}
          </button>
        ))}
      </div>

      {/* Suggestion chips */}
      <div className="mt-2 flex flex-wrap gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onPick(chip)}
            className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-700 dark:bg-zinc-900 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Structured fields */}
      <form onSubmit={submitStructured} className="mt-4 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Store name — e.g. Ember & Oak"
            aria-label="Store name"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={sells}
            onChange={(e) => setSells(e.target.value)}
            placeholder="What you sell — e.g. handmade candles"
            aria-label="What you sell"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            placeholder="Who it is for — e.g. busy mums who love cosy homes"
            aria-label="Audience"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Vibe — e.g. warm, calm, a little rustic"
            aria-label="Vibe"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        {/* Personality picker */}
        <div className="flex flex-wrap gap-2 pt-1" role="radiogroup" aria-label="Personality">
          {PERSONALITIES.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={personality === p.id}
              onClick={() => setPersonality(p.id)}
              title={p.description}
              className={`rounded-xl border px-3 py-2 text-left ${
                personality === p.id
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
                  : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-700"
              }`}
            >
              <span className="block text-sm font-semibold">{p.label}</span>
              <span className="block text-xs text-zinc-500">{p.description}</span>
            </button>
          ))}
        </div>

        {/* Reference URL (Cut B #9) — optional, sent to /api/plan separately */}
        <label className="block pt-1">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Reference (optional) — kisi store ka URL paste karo, uske rang
            aur style se seekha jayega
          </span>
          <input
            value={referenceUrl}
            onChange={(e) => setReferenceUrl(e.target.value)}
            placeholder="https://example.com"
            inputMode="url"
            aria-label="Reference store URL (optional)"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          Use this description
        </button>
      </form>
    </div>
  );
}
