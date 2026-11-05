// components/editor/AdvancedPanel.tsx — Wave 2 (beginner-first redesign).
// ONE tidy drawer for everything advanced. It renders only when the
// editor page's Advanced toggle is ON (off by default); when OFF none of
// these panels exist on screen at all. The panels keep their own logic —
// this file only groups where they render, with a small plain-language
// heading per group. Nothing here is a new feature: every slot is wired
// by the editor page to the same handlers the old scattered layout used.
"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";

export interface AdvancedPanelProps {
  /** Close the drawer (turns the Advanced toggle off). */
  onClose: () => void;
  /** Cut A #5 — theme tokens (colours, font, radius). */
  themeTokens: ReactNode;
  /** Cut B #10 — brand kit (read from URL / manual). */
  brandKit: ReactNode;
  /** Cut B #11 — section library (+ CRO pack blocks inside it). */
  sectionLibrary: ReactNode;
  /** Cut B — media library (project images, apply / regenerate). */
  mediaLibrary: ReactNode;
  /** Cut C — Shopify CSV product import (real products). */
  csvImport: ReactNode;
  /** Cut B #13 — per-page SEO. Null when no page exists yet. */
  seo: ReactNode;
  /** Cut C #23 — funnel map (Landing / Product / Upsell / Thank-you). */
  funnel: ReactNode;
  /** Cut C #25 — comments list (pins are dropped in the preview). */
  comments: ReactNode;
  /** Cut B #14 — test-credit balance + history. */
  creditMeter: ReactNode;
  /** Cut C #24 — duplicate the active page as Variant B. */
  onDuplicateVariant?: () => void;
  variantDisabled?: boolean;
  /** Cut C #30 — one-click Polish pass (alt text, contrast, spacing). */
  onPolish?: () => void;
  polishing?: boolean;
  /** Cut C #21 — open the Custom Block modal (lives in PageEditor). */
  onOpenCustomBlock?: () => void;
}

function Group({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-page p-4">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-0.5 text-xs leading-relaxed text-body">{hint}</p>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

export default function AdvancedPanel({
  onClose,
  themeTokens,
  brandKit,
  sectionLibrary,
  mediaLibrary,
  csvImport,
  seo,
  funnel,
  comments,
  creditMeter,
  onDuplicateVariant,
  variantDisabled = false,
  onPolish,
  polishing = false,
  onOpenCustomBlock,
}: AdvancedPanelProps) {
  return (
    <aside
      aria-label="Advanced settings"
      className="max-h-[45vh] w-full shrink-0 overflow-y-auto border-t border-border bg-panel md:max-h-none md:min-h-0 md:w-96 md:border-t-0 md:border-l"
    >
      <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-border bg-panel px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Advanced</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-body">
            Ye sab zaroori nahi — beginner ko inki zaroorat nahi. Jab chahiye
            ho, yahin milega.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Band karo
        </Button>
      </div>

      <div className="space-y-4 p-4">
        <Group
          title="Design"
          hint="Theme ke rang, font aur brand — sirf tab chhedo jab look badalna ho."
        >
          {themeTokens}
          {brandKit}
        </Group>

        <Group
          title="Content"
          hint="Ready-made sections, images aur apne asli products (CSV se)."
        >
          {sectionLibrary}
          {mediaLibrary}
          {csvImport}
        </Group>

        <Group
          title="Grow"
          hint="Google (SEO) aur funnel — store live karne se pehle check karo."
        >
          {seo ?? (
            <p className="text-sm text-body">
              Pehle ek page generate karo — phir uski SEO yahan dikhegi.
            </p>
          )}
          {funnel}
        </Group>

        <Group
          title="Team"
          hint="Preview par pin lagakar note chhodo, phir AI se apply karwao."
        >
          {comments}
        </Group>

        <Group
          title="Actions"
          hint="Ek page ki doosri version, ek-click polish, ya custom block."
        >
          <div className="flex flex-wrap gap-2">
            {onDuplicateVariant ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDuplicateVariant}
                disabled={variantDisabled}
              >
                Duplicate as Variant B
              </Button>
            ) : null}
            {onPolish ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onPolish}
                disabled={polishing || variantDisabled}
              >
                {polishing ? "Polishing…" : "Polish page"}
              </Button>
            ) : null}
            {onOpenCustomBlock ? (
              <Button variant="ghost" size="sm" onClick={onOpenCustomBlock}>
                Custom block
              </Button>
            ) : null}
          </div>
        </Group>

        <Group
          title="Account"
          hint="Test credits — har generation aur AI edit se kuch credits katte hain."
        >
          {creditMeter}
        </Group>
      </div>
    </aside>
  );
}
