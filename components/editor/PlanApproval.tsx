// components/editor/PlanApproval.tsx — Plan approval gate (Cut A, idea #1).
// Shows the derived plan BEFORE anything streams: a theme card (named
// palette swatches, font, style) + an editable sitemap tree. Editing is
// inline by default — page titles and section titles are inputs, sections
// can be added/removed per page via a type dropdown, pages can be added
// or removed. The integrator wires it between the prompt and generation:
//   const [plan, setPlan] = useState<SitePlan | null>(null);
//   {plan && <PlanApproval plan={plan} onPlanChange={setPlan}
//     onApprove={() => generateFromPlan(plan)} onCancel={() => setPlan(null)} />}
// All UI text is original.

"use client";

import { useState } from "react";
import { SECTION_TYPES, type PageType, type SectionType } from "@/lib/types";
import {
  addPlanPage,
  addPlanSection,
  removePlanPage,
  removePlanSection,
  updatePlanPageTitle,
  updatePlanSectionTitle,
  type SitePlan,
} from "@/lib/ai/plan";

export interface PlanApprovalProps {
  /** The plan to review/edit (plain JSON from derivePlan / /api/plan). */
  plan: SitePlan;
  /** Called with a new plan object on every edit. */
  onPlanChange: (plan: SitePlan) => void;
  /** Start generation from the current (possibly edited) plan. */
  onApprove: () => void;
  /** Drop the plan and go back to the prompt. */
  onCancel: () => void;
  /** True while generation is running after approval. */
  generating?: boolean;
}

const PAGE_TYPE_LABELS: Record<PageType, string> = {
  home: "Homepage",
  product: "Product page",
  category: "Category page",
};

function sectionLabel(type: SectionType): string {
  return type
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PlanApproval({
  plan,
  onPlanChange,
  onApprove,
  onCancel,
  generating = false,
}: PlanApprovalProps) {
  const [newSectionType, setNewSectionType] = useState<Record<number, SectionType>>({});
  const [newPageType, setNewPageType] = useState<PageType>("product");
  const theme = plan.theme;
  const swatches: Array<{ label: string; value: string }> = [
    { label: "Primary", value: theme.colors.primary },
    { label: "Secondary", value: theme.colors.secondary },
    { label: "Background", value: theme.colors.background },
    { label: "Text", value: theme.colors.text },
    { label: "Accent", value: theme.colors.accent },
  ];
  const totalSections = plan.pages.reduce((n, p) => n + p.sections.length, 0);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-bold">Your store plan</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Check the theme and the pages below. Change anything you like, then
        approve to start building — nothing is generated yet.
      </p>

      {/* Theme card */}
      <div className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Theme
            </p>
            <p className="text-base font-bold">
              {theme.displayName ?? theme.name}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Font: {theme.font} · Style: {theme.style}
            </p>
          </div>
          {/* Cut C #29 — wordmark logo from the plan, next to the theme
              name (inline SVG from derivePlan; no external asset). */}
          {plan.logo ? (
            <div
              aria-label={`${plan.logo.text} logo`}
              className="[&>svg]:h-10 [&>svg]:w-auto"
              dangerouslySetInnerHTML={{ __html: plan.logo.svg }}
            />
          ) : null}
          <div className="flex gap-2">
            {swatches.map((s) => (
              <span key={s.label} className="text-center" title={`${s.label}: ${s.value}`}>
                <span
                  className="block h-8 w-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                  style={{ backgroundColor: s.value }}
                />
                <span className="mt-1 block text-[10px] text-zinc-500">{s.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Editable sitemap */}
      <div className="mt-4">
        <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Pages ({plan.pages.length}) · Sections ({totalSections})
        </p>
        <div className="mt-2 space-y-3">
          {plan.pages.map((page, pageIndex) => (
            <div
              key={`${page.slug}-${pageIndex}`}
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold dark:bg-zinc-800">
                  {PAGE_TYPE_LABELS[page.pageType]}
                </span>
                <input
                  value={page.title}
                  onChange={(e) =>
                    onPlanChange(updatePlanPageTitle(plan, pageIndex, e.target.value))
                  }
                  aria-label={`Title for ${page.slug} page`}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <span className="text-xs text-zinc-400">/{page.slug}</span>
                {plan.pages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onPlanChange(removePlanPage(plan, pageIndex))}
                    disabled={generating}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700"
                  >
                    Remove page
                  </button>
                )}
              </div>

              <ul className="mt-2 space-y-1 pl-4">
                {page.sections.map((section, sectionIndex) => (
                  <li key={`${section.type}-${sectionIndex}`} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-zinc-500">
                      {sectionLabel(section.type)}
                    </span>
                    <input
                      value={section.title}
                      onChange={(e) =>
                        onPlanChange(
                          updatePlanSectionTitle(plan, pageIndex, sectionIndex, e.target.value),
                        )
                      }
                      aria-label={`Title for ${section.type} section on ${page.title}`}
                      className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onPlanChange(removePlanSection(plan, pageIndex, sectionIndex))
                      }
                      disabled={generating || page.sections.length <= 1}
                      aria-label={`Remove ${section.type} section`}
                      className="shrink-0 rounded-full border border-zinc-300 px-2 py-1 text-xs hover:border-red-500 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-2 flex flex-wrap items-center gap-2 pl-4">
                <select
                  value={newSectionType[pageIndex] ?? "testimonials"}
                  onChange={(e) =>
                    setNewSectionType((prev) => ({
                      ...prev,
                      [pageIndex]: e.target.value as SectionType,
                    }))
                  }
                  aria-label={`Section type to add to ${page.title}`}
                  className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {SECTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {sectionLabel(t)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onPlanChange(
                      addPlanSection(
                        plan,
                        pageIndex,
                        newSectionType[pageIndex] ?? "testimonials",
                      ),
                    )
                  }
                  disabled={generating}
                  className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold hover:border-pink-500 hover:text-pink-600 disabled:opacity-50 dark:border-zinc-700"
                >
                  + Add section
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={newPageType}
            onChange={(e) => setNewPageType(e.target.value as PageType)}
            aria-label="Page type to add"
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {(Object.keys(PAGE_TYPE_LABELS) as PageType[]).map((t) => (
              <option key={t} value={t}>
                {PAGE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onPlanChange(addPlanPage(plan, newPageType))}
            disabled={generating}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:border-pink-500 hover:text-pink-600 disabled:opacity-50 dark:border-zinc-700"
          >
            + Add page
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={generating}
          className="rounded-full bg-pink-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
        >
          {generating ? "Building…" : "Approve & start generation"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={generating}
          className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-semibold hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700"
        >
          Back to prompt
        </button>
      </div>
    </div>
  );
}
