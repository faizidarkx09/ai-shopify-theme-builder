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
//
// Fix pass 3 — REAL scroller diagnosis (fix pass 2's claim was wrong
// in the live browser): the WINDOW scrolls, not the card. Why: the
// editor root is `flex h-[calc(100vh-121px)] flex-1 flex-col` — but
// `flex-1` = `flex: 1 1 0%`, and flex-basis 0% overrides the `height`
// property for the main size, so the 100vh calc is dead code; the root
// also has no `min-h-0`, so min-height:auto (content height) lets it
// grow with the 22-row list; and html/body/main above it have no
// bounded height either (body is only min-h-full). Nothing above the
// card bounds its height, so the card's inner overflow-y-auto never
// engages and the whole page scrolls — taking any in-flow bar with it.
// Fix: the Approve bar is `position: fixed` to the VIEWPORT, which
// stays visible no matter which element scrolls. It only renders while
// this component is mounted (Step 2, plan not yet approved), and the
// page content gets bottom padding so nothing hides behind it.

"use client";

import { useState } from "react";
import { SECTION_TYPES, type PageType, type SectionType } from "@/lib/types";
import { SECTION_LABELS } from "@/lib/sections";
import { colorName } from "@/lib/colorNames";
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

export default function PlanApproval({
  plan,
  onPlanChange,
  onApprove,
  onCancel,
  generating = false,
}: PlanApprovalProps) {
  const [newSectionType, setNewSectionType] = useState<Record<number, SectionType>>({});
  const [newPageType, setNewPageType] = useState<PageType>("product");
  // Full editable sitemap is collapsed by default — beginners see the
  // compact summary first and open it only if they want to change it.
  const [editingSections, setEditingSections] = useState(false);
  const theme = plan.theme;
  const swatches: Array<{ role: string; value: string }> = [
    { role: "Primary", value: theme.colors.primary },
    { role: "Secondary", value: theme.colors.secondary },
    { role: "Background", value: theme.colors.background },
    { role: "Text", value: theme.colors.text },
    { role: "Accent", value: theme.colors.accent },
  ];
  const totalSections = plan.pages.reduce((n, p) => n + p.sections.length, 0);

  return (
    // Fix pass 3 — the card is a bounded flex column: content scrolls
    // inside (min-h-0 flex-1 overflow-y-auto) IF an ancestor bounds its
    // height. On this page no ancestor does (see file header: the window
    // is the scroller), so the inner scroll is a bonus, not the
    // mechanism that keeps Approve visible — the fixed bar below is.
    // pb-20 keeps the last rows clear of the fixed bar when the inner
    // scroll does engage.
    <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="min-h-0 flex-1 overflow-y-auto pb-20">
      <h2 className="text-lg font-bold">Your store plan</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Check the theme and the pages below. Change anything you like, then
        approve to start building — nothing is generated yet.
      </p>

      {/* Theme card — colours shown as plain names with the hex beside
          the name, never a bare hex code as the only label. */}
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
          <div className="flex gap-3">
            {swatches.map((s) => (
              <span
                key={s.role}
                className="text-center"
                title={`${s.role}: ${colorName(s.value)} ${s.value}`}
              >
                <span
                  className="block h-8 w-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                  style={{ backgroundColor: s.value }}
                />
                <span className="mt-1 block text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                  {colorName(s.value)}
                </span>
                <span className="block text-[10px] text-zinc-500">
                  {s.value.toUpperCase()}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Compact summary (default view): pages + section counts only. */}
      <div className="mt-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-bold">
          {plan.pages.length} pages · {totalSections} sections
        </p>
        <ul className="mt-2 space-y-1">
          {plan.pages.map((page, i) => (
            <li key={`${page.slug}-${i}`} className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold dark:bg-zinc-800">
                {PAGE_TYPE_LABELS[page.pageType]}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-zinc-800 dark:text-zinc-200">
                {page.title}
              </span>
              <span className="shrink-0 text-xs">
                {page.sections.length} sections
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setEditingSections((v) => !v)}
          aria-expanded={editingSections}
          className="mt-3 rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:border-zinc-700"
        >
          {editingSections
            ? "Hide section editor ↑"
            : `Edit sections (${totalSections}) — pages aur sections badlo ↓`}
        </button>
      </div>

      {/* Full editable sitemap — only when the expander is open. */}
      {editingSections ? (
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
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
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
                      {/* Fix pass 2 — label WRAPS (no truncate): the full
                          plain-language label is always readable. */}
                      <span className="w-44 shrink-0 break-words text-xs leading-snug text-zinc-500">
                        {SECTION_LABELS[section.type]}
                      </span>
                      <input
                        value={section.title}
                        onChange={(e) =>
                          onPlanChange(
                            updatePlanSectionTitle(plan, pageIndex, sectionIndex, e.target.value),
                          )
                        }
                        aria-label={`Title for ${section.type} section on ${page.title}`}
                        className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
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
                        {SECTION_LABELS[t]}
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
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 dark:border-zinc-700"
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
              className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-semibold hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-50 dark:border-zinc-700"
            >
              + Add page
            </button>
          </div>
        </div>
      ) : null}

      </div>

      {/* Fix pass 3 — VIEWPORT-FIXED bottom bar (not a flex sibling,
          not sticky): `position: fixed` is relative to the viewport, so
          Approve stays visible while the expanded 22-section list
          scrolls, whichever element scrolls (the window, here). z-40
          sits below the z-50 modals (Export/CustomBlock) so dialogs stay
          on top. Only mounted on Step 2 while the plan is unapproved. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onApprove}
            disabled={generating}
            className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
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
    </div>
  );
}
