// components/landing/MiniStorePreview.tsx — Wave 1 (landing rebuild).
// Ek ASLI mini storefront preview: buildPageFromTemplate se bana hua
// home page (header + hero + product + features) SectionRenderer se
// render hota hai — na fake browser mock, na screenshot, na rang-birange
// boxes. Theme ke apne colours use hote hain (generated storefront
// apni theme rakhta hai); app chrome light rehta hai.
// Fix pass: photoFree mode — landing previews me kabhi photo nahi
// dikhti; SectionRenderer har photo ki jagah designed gradient tile
// banata hai (product/store initial + name), to koi ghalat photo
// (beauty store pe camera, fashion pe leopard) kabhi nazar nahi aati.
"use client";

import { useMemo } from "react";
import SectionRenderer from "@/components/sections/SectionRenderer";
import { buildPageFromTemplate } from "@/lib/templates";
import type { Theme } from "@/lib/types";

/** Sample preview me ye sections dikhte hain, isi order me. */
const PREVIEW_TYPES = ["header", "hero", "product", "features"] as const;
/**
 * Fix pass 2 — compact hero preview: sirf header + hero + product.
 * Features section hata di (wo hi preview ko 800px+ lamba karta tha,
 * jis se 560px cap "Best Sellers" heading ko beech se kaat deta tha).
 */
const COMPACT_PREVIEW_TYPES = ["header", "hero", "product"] as const;

export function MiniStorePreview({
  theme,
  prompt,
  label,
  photoFree = false,
  compact = false,
}: {
  /** Preset theme (Rose Glow / Noir Luxe / Fresh Mart …). */
  theme: Theme;
  /** Niche prompt — template isi se store ka content banata hai. */
  prompt: string;
  /** Screen-reader label, preview ke liye. */
  label: string;
  /** True = no <img> at all; designed gradient tiles instead. */
  photoFree?: boolean;
  /**
   * Fix pass 2 — true = sirf header + hero + product, chhoti images.
   * Preview apni natural height me fit hota hai (~560px) — koi cap,
   * koi overflow-hidden, koi kata hua heading nahi.
   */
  compact?: boolean;
}) {
  const sections = useMemo(() => {
    const page = buildPageFromTemplate(prompt, theme, "home");
    const types = compact ? COMPACT_PREVIEW_TYPES : PREVIEW_TYPES;
    return page.sections.filter((s) =>
      (types as readonly string[]).includes(s.type),
    );
  }, [theme, prompt, compact]);

  return (
    <div
      role="img"
      aria-label={label}
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm"
    >
      {/* Preview sirf dekhne ke liye hai — click/edit nahi. */}
      <div className="pointer-events-none select-none">
        {sections.map((s) => (
          <SectionRenderer
            key={s.id}
            section={s}
            theme={theme}
            photoFree={photoFree}
            compact={compact}
            // Fix pass 3 — landing preview: no "placeholder product"
            // label under prices; the niche products are the preview.
            hidePlaceholderLabel
          />
        ))}
      </div>
    </div>
  );
}
