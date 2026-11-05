// components/landing/ThemeCardPreview.tsx — Fix pass (theme cards).
// A theme card's preview is a FIXED-height (320px) designed mini
// storefront — header strip + hero block + 3 product tiles. No <img>
// at all: solid colours, gradients and typographic tiles with real
// product names from the demo catalog, so a preview can never show a
// wrong photo and text can never clip mid-word ("Contac").
// Every block has a fixed height and text uses line-clamp / truncate
// (ellipsis, word-safe) — nothing overflows, nothing is cut mid-line.
"use client";

import { DEMO_NICHES } from "@/lib/demoCatalog";
import type { Theme } from "@/lib/types";

/** Preset id -> demo-catalog niche whose products fill the tiles. */
const PRESET_NICHE: Record<string, string> = {
  "rose-glow": "beauty",
  "noir-luxe": "fashion",
  "fresh-mart": "food",
};

export function ThemeCardPreview({
  theme,
  tagline,
}: {
  /** Preset theme (Rose Glow / Noir Luxe / Fresh Mart …). */
  theme: Theme;
  /** One-line plain description shown in the hero block. */
  tagline: string;
}) {
  const nicheId = theme.presetId ? (PRESET_NICHE[theme.presetId] ?? "fashion") : "fashion";
  const niche = DEMO_NICHES.find((n) => n.id === nicheId) ?? DEMO_NICHES[0];
  const products = niche.products.slice(0, 3);
  const storeName = theme.displayName ?? theme.name;
  const heroBg = `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`;

  return (
    <div
      role="img"
      aria-label={`${storeName} theme ka sample store preview`}
      className="flex h-[320px] flex-col overflow-hidden rounded-xl border border-border bg-white"
    >
      {/* Header strip — fixed 44px: store name + 3 short nav links. */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-white px-4">
        <span className="min-w-0 truncate text-sm font-bold text-ink">
          {storeName}
        </span>
        <span className="flex shrink-0 gap-3 text-xs font-medium text-body">
          <span>Home</span>
          <span>Shop</span>
          <span>About</span>
        </span>
      </div>

      {/* Hero block — fills the middle: theme gradient, headline,
          one-line tagline, white CTA pill. Text clamps, never clips. */}
      <div
        className="flex min-h-0 flex-1 flex-col justify-center px-4 py-3"
        style={{ background: heroBg }}
      >
        <p className="line-clamp-2 text-lg leading-snug font-bold text-white">
          {storeName}
        </p>
        <p className="mt-1 line-clamp-1 text-xs text-white/85">{tagline}</p>
        <span className="mt-3 inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-ink">
          Shop Now
        </span>
      </div>

      {/* Product row — fixed 104px: 3 tiles, gradient initial + name + price. */}
      <div className="grid h-[104px] shrink-0 grid-cols-3 gap-2 bg-white p-2">
        {products.map((p) => (
          <div
            key={p.name}
            className="flex min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-border bg-panel px-1 py-2 text-center"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: theme.colors.primary }}
            >
              {p.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="w-full truncate text-[11px] leading-tight font-semibold text-ink">
              {p.name}
            </span>
            <span className="text-[11px] text-muted">${p.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
