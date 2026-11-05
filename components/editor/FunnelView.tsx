// components/editor/FunnelView.tsx — Funnel view, Cut C #23.
// Shows the project's pages as a funnel map in funnelOrder:
// Landing -> Product -> Upsell -> Thank-you. Pages the project does
// not have yet (Upsell / Thank-you) get a "generate" button.
//
// INTEGRATOR NOTE — funnel-page generation: the generator's pageType
// stays 'home' | 'product' | 'category', so a funnel page is generated
// as pageType 'home' with a custom slug/title — slug 'upsell' (title
// "Upsell") or slug 'thank-you' (title "Thank You") — and funnelStep
// set to 'upsell' / 'thankyou' on the resulting Page. The funnel view
// itself never creates pages; it only asks for them via
// onGenerateFunnelPage(step).
//
// Reorder is up/down buttons (no drag): onReorder receives the full
// new page-id order (funnelOrder), which the integrator persists with
// store.update(project.id, { funnelOrder }).

"use client";

import type { Page, Project } from "@/lib/types";

export type FunnelStep = 'landing' | 'product' | 'upsell' | 'thankyou';

export interface FunnelViewProps {
  project: Project;
  onSelectPage: (pageId: string) => void;
  /** Ask the shell to generate a missing funnel page (see note above). */
  onGenerateFunnelPage?: (step: 'upsell' | 'thankyou') => void;
  /** New full page-id order (funnelOrder) after an up/down move. */
  onReorder?: (pageIds: string[]) => void;
}

const FUNNEL_STEPS: Array<{
  step: FunnelStep;
  label: string;
  hint: string;
}> = [
  { step: 'landing', label: 'Landing', hint: 'First impression — the home page' },
  { step: 'product', label: 'Product', hint: 'Product detail — the buy decision' },
  { step: 'upsell', label: 'Upsell', hint: 'Bundle / add-on offer after add-to-cart' },
  { step: 'thankyou', label: 'Thank-you', hint: 'Order confirmation + next steps' },
];

const STEP_LABEL: Record<FunnelStep, string> = {
  landing: 'Landing',
  product: 'Product',
  upsell: 'Upsell',
  thankyou: 'Thank-you',
};

export function funnelStepLabel(step: FunnelStep | undefined): string {
  return step ? STEP_LABEL[step] : 'Unplaced';
}

/**
 * Pages in funnel order: funnelOrder first (existing ids only), then any
 * pages missing from it, in their original order.
 */
export function orderedFunnelPages(project: Project): Page[] {
  const byId = new Map(project.pages.map((p) => [p.id, p]));
  const ordered: Page[] = [];
  for (const id of project.funnelOrder ?? []) {
    const page = byId.get(id);
    if (page) ordered.push(page);
  }
  for (const page of project.pages) {
    if (!ordered.includes(page)) ordered.push(page);
  }
  return ordered;
}

export default function FunnelView({
  project,
  onSelectPage,
  onGenerateFunnelPage,
  onReorder,
}: FunnelViewProps) {
  const ordered = orderedFunnelPages(project);
  const byStep = new Map<FunnelStep, Page>();
  for (const page of project.pages) {
    if (page.funnelStep && !byStep.has(page.funnelStep)) {
      byStep.set(page.funnelStep, page);
    }
  }
  const unplaced = project.pages.filter((p) => !p.funnelStep);

  function move(pageId: string, dir: -1 | 1) {
    if (!onReorder) return;
    const ids = ordered.map((p) => p.id);
    const i = ids.indexOf(pageId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    onReorder(next);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="font-semibold">Funnel</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Landing → Product → Upsell → Thank-you. Click a step to open its
        page; use ↑ ↓ to change the order.
      </p>

      <ol className="mt-4 space-y-2">
        {FUNNEL_STEPS.map(({ step, label, hint }, index) => {
          const page = byStep.get(step);
          const pos = page ? ordered.findIndex((p) => p.id === page.id) : -1;
          const canGenerate =
            !page && (step === 'upsell' || step === 'thankyou') && onGenerateFunnelPage;
          return (
            <li
              key={step}
              className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {label}
                  {page && (
                    <span className="ml-2 truncate text-sm font-normal text-zinc-500">
                      {page.title} · /{page.slug} · {page.sections.length} sections
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">{hint}</p>
              </div>
              {page ? (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(page.id, -1)}
                    disabled={!onReorder || pos <= 0}
                    aria-label={`Move ${label} up`}
                    className="rounded-full border border-zinc-300 px-2 py-1 text-xs hover:border-pink-500 disabled:opacity-40 dark:border-zinc-700"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(page.id, 1)}
                    disabled={!onReorder || pos < 0 || pos >= ordered.length - 1}
                    aria-label={`Move ${label} down`}
                    className="rounded-full border border-zinc-300 px-2 py-1 text-xs hover:border-pink-500 disabled:opacity-40 dark:border-zinc-700"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPage(page.id)}
                    className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
                  >
                    Open
                  </button>
                </div>
              ) : canGenerate ? (
                <button
                  type="button"
                  onClick={() => onGenerateFunnelPage(step)}
                  className="shrink-0 rounded-full bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700"
                >
                  Generate {label} page
                </button>
              ) : (
                <span className="shrink-0 text-xs text-zinc-400">
                  Not generated yet
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {unplaced.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Unplaced pages (no funnel step yet)
          </p>
          <ul className="mt-2 space-y-1">
            {unplaced.map((page) => (
              <li key={page.id}>
                <button
                  type="button"
                  onClick={() => onSelectPage(page.id)}
                  className="text-sm text-zinc-600 underline hover:text-pink-600 dark:text-zinc-400"
                >
                  {page.title} · /{page.slug}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
