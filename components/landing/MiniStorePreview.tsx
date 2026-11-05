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

export function MiniStorePreview({
  theme,
  prompt,
  label,
  photoFree = false,
}: {
  /** Preset theme (Rose Glow / Noir Luxe / Fresh Mart …). */
  theme: Theme;
  /** Niche prompt — template isi se store ka content banata hai. */
  prompt: string;
  /** Screen-reader label, preview ke liye. */
  label: string;
  /** True = no <img> at all; designed gradient tiles instead. */
  photoFree?: boolean;
}) {
  const sections = useMemo(() => {
    const page = buildPageFromTemplate(prompt, theme, "home");
    return page.sections.filter((s) =>
      (PREVIEW_TYPES as readonly string[]).includes(s.type),
    );
  }, [theme, prompt]);

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
          />
        ))}
      </div>
    </div>
  );
}
