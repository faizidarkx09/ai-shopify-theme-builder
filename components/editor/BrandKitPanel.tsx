// components/editor/BrandKitPanel.tsx — Brand Kit editor (Cut B, idea #10).
// Persistent brand for a project: colours / font / tone / logo. The parent
// owns the kit state and persistence (Project.brandKit) — this panel only
// calls onBrandKitChange with a NEW kit on every edit.
//   <BrandKitPanel brandKit={project.brandKit}
//     onBrandKitChange={(kit) => saveProject({ brandKit: kit })}
//     onReadFromUrl={async (url) => {
//       const res = await fetch("/api/brand", { method: "POST",
//         headers: { "content-type": "application/json" },
//         body: JSON.stringify({ url }) });
//       const data = await res.json();
//       return data.brandKit as Partial<BrandKit>;
//     }} />
// onReadFromUrl is optional: when absent, the "Read brand from URL" row
// is hidden. It must resolve to a partial kit (or null) — the panel merges
// it over the current kit itself.

"use client";

import { useState } from "react";
import type { BrandKit, ThemeColors } from "@/lib/types";
import { TOKEN_FONTS } from "@/components/editor/ThemeTokensPanel";

export interface BrandKitPanelProps {
  /** Current kit (may be undefined for a project with no kit yet). */
  brandKit?: BrandKit;
  /** Called with the full new kit whenever any field changes. */
  onBrandKitChange: (kit: BrandKit) => void;
  /**
   * Read a brand from a public URL. Resolve to a partial kit (merged over
   * the current kit) or null when nothing could be read. Omit to hide the
   * read-from-URL row. The default wiring is POST /api/brand.
   */
  onReadFromUrl?: (url: string) => Promise<Partial<BrandKit> | null>;
}

const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string }> = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
];

const FIELD =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900";

export default function BrandKitPanel({
  brandKit,
  onBrandKitChange,
  onReadFromUrl,
}: BrandKitPanelProps) {
  const kit: BrandKit = brandKit ?? {};
  const [url, setUrl] = useState(kit.sourceUrl ?? "");
  const [reading, setReading] = useState(false);
  const [readMsg, setReadMsg] = useState("");

  function patch(next: BrandKit) {
    onBrandKitChange(next);
  }

  function patchColors(key: keyof ThemeColors, value: string) {
    patch({ ...kit, colors: { ...kit.colors, [key]: value } });
  }

  async function readFromUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!onReadFromUrl) return;
    const clean = url.trim();
    if (!clean) {
      setReadMsg("Pehle ek URL likho.");
      return;
    }
    setReading(true);
    setReadMsg("");
    try {
      const partial = await onReadFromUrl(clean);
      if (!partial || Object.keys(partial).length <= 1) {
        setReadMsg("Us URL se brand nahi padha ja saka — fields khud bhar lo.");
        return;
      }
      patch({
        ...kit,
        ...partial,
        colors: { ...kit.colors, ...partial.colors },
        sourceUrl: partial.sourceUrl ?? clean,
      });
      setReadMsg("Brand read ho gaya — colours aur logo text update ho gaye.");
    } catch {
      setReadMsg("Brand read nahi ho saka — dobara try karo.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold">Brand Kit</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Ye colours aur font har naye page par lagte hain — ek dafa set karo,
        baar baar nahi.
      </p>

      {/* Colours */}
      <div className="mt-3 space-y-2">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label
            key={key}
            className="flex items-center justify-between gap-2 text-sm text-zinc-700 dark:text-zinc-300"
          >
            <span>{label}</span>
            <span className="flex items-center gap-2">
              <code className="text-xs text-zinc-500">
                {kit.colors?.[key] ?? "—"}
              </code>
              <input
                type="color"
                value={kit.colors?.[key] ?? "#ffffff"}
                onChange={(e) => patchColors(key, e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border"
                aria-label={`${label} colour`}
              />
            </span>
          </label>
        ))}
      </div>

      {/* Font */}
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Font
        </span>
        <select
          value={kit.font ?? ""}
          onChange={(e) =>
            patch({ ...kit, font: e.target.value || undefined })
          }
          className={FIELD}
          aria-label="Brand font"
        >
          <option value="">Theme default</option>
          {TOKEN_FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>

      {/* Tone */}
      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Tone — brand kis lehje me baat karta hai
        </span>
        <input
          value={kit.tone ?? ""}
          onChange={(e) => patch({ ...kit, tone: e.target.value || undefined })}
          placeholder="e.g. warm, playful, premium"
          className={FIELD}
          aria-label="Brand tone"
        />
      </label>

      {/* Logo */}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Logo text
          </span>
          <input
            value={kit.logoText ?? ""}
            onChange={(e) =>
              patch({ ...kit, logoText: e.target.value || undefined })
            }
            placeholder="e.g. Ember & Oak"
            className={FIELD}
            aria-label="Logo text"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Logo colour
          </span>
          <input
            type="color"
            value={kit.logoColor ?? kit.colors?.primary ?? "#111827"}
            onChange={(e) =>
              patch({ ...kit, logoColor: e.target.value })
            }
            className="h-9 w-12 cursor-pointer rounded border"
            aria-label="Logo colour"
          />
        </label>
      </div>

      {/* Read brand from URL */}
      {onReadFromUrl ? (
        <form onSubmit={readFromUrl} className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <span className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            Read brand from URL
          </span>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              inputMode="url"
              className={FIELD}
              aria-label="Brand source URL"
            />
            <button
              type="submit"
              disabled={reading}
              className="shrink-0 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
            >
              {reading ? "Reading…" : "Read"}
            </button>
          </div>
          {readMsg && <p className="mt-2 text-xs text-zinc-500">{readMsg}</p>}
          {kit.sourceUrl && (
            <p className="mt-1 text-xs text-zinc-400">Source: {kit.sourceUrl}</p>
          )}
        </form>
      ) : null}
    </div>
  );
}
