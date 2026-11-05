// components/editor/EditorTopBar.tsx — Wave 0 split of app/editor/[projectId]/page.tsx.
// Top bar ONLY: project name + theme badge + page tabs + +Page button +
// Desktop/Mobile toggle + Export buttons. No state lives here — the editor
// page owns all state and passes it down as props.
//
// Cut A #6: the old "Export ▾" dropdown is gone. Both export buttons now
// open the ExportModal (pre-export audit + Shopify hero + deploy guide);
// the modal, not this bar, owns the format choice and the billing gate.

import type { Page } from "@/lib/types";

export type ExportFormat = "shopify" | "code" | "png";
/** Cut B #15: desktop / tablet (768px) / mobile (390px). */
export type ViewMode = "desktop" | "tablet" | "mobile";

export interface EditorTopBarProps {
  projectName: string;
  themeName: string;
  themeStyle: string;
  pages: Page[];
  activePageId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: () => void;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  /** Open the ExportModal (audit + export hero + deploy guide). */
  onOpenExport: () => void;
  exporting: boolean;
  exportDisabled: boolean;
  /** Cut C #24: duplicate the ACTIVE page as Variant B (integrator wires
   *  this to lib/variants.ts duplicatePageAsVariant). Hidden when absent. */
  onDuplicateVariant?: (pageId: string) => void;
  /** Cut C #30: one-click Polish pass (integrator wires to lib/polish.ts). */
  onPolish?: () => void;
  polishing?: boolean;
}

export default function EditorTopBar({
  projectName,
  themeName,
  themeStyle,
  pages,
  activePageId,
  onSelectPage,
  onAddPage,
  view,
  onViewChange,
  onOpenExport,
  exporting,
  exportDisabled,
  onDuplicateVariant,
  onPolish,
  polishing = false,
}: EditorTopBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
      <span className="max-w-48 truncate font-semibold">{projectName}</span>
      <span
        className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
        title={themeStyle}
      >
        {themeName}
      </span>
      <div className="flex items-center gap-1 overflow-x-auto">
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectPage(p.id)}
            className={`rounded-t-lg border-b-2 px-3 py-1.5 text-sm whitespace-nowrap ${
              p.id === activePageId
                ? "border-pink-600 font-semibold text-pink-600"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {p.title}
          </button>
        ))}
        <button
          type="button"
          onClick={onAddPage}
          className="rounded-full border border-dashed border-zinc-400 px-3 py-1 text-sm text-zinc-500 hover:border-pink-500 hover:text-pink-600"
        >
          + Page
        </button>
        {/* Cut C #24 — duplicate the active page as Variant B. */}
        {onDuplicateVariant && activePageId ? (
          <button
            type="button"
            onClick={() => onDuplicateVariant(activePageId)}
            title="Duplicate this page as Variant B with one AI-suggested headline change"
            className="rounded-full border border-violet-400 px-3 py-1 text-sm text-violet-600 hover:bg-violet-50"
          >
            Duplicate as Variant B
          </button>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex rounded-full border border-zinc-300 text-sm dark:border-zinc-700">
          <button
            type="button"
            onClick={() => onViewChange("desktop")}
            className={`rounded-full px-3 py-1 ${view === "desktop" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}
          >
            Desktop
          </button>
          <button
            type="button"
            onClick={() => onViewChange("tablet")}
            className={`rounded-full px-3 py-1 ${view === "tablet" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}
          >
            Tablet
          </button>
          <button
            type="button"
            onClick={() => onViewChange("mobile")}
            className={`rounded-full px-3 py-1 ${view === "mobile" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}
          >
            Mobile
          </button>
        </div>
        {/* Cut C #30 — one-click Polish pass (alt text, contrast, spacing). */}
        {onPolish ? (
          <button
            type="button"
            onClick={onPolish}
            disabled={polishing || exportDisabled}
            title="Polish this page: fix alt text, low contrast and spacing"
            className="rounded-full border border-emerald-500 px-4 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            {polishing ? "Polishing…" : "✨ Polish"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenExport}
          disabled={exporting || exportDisabled}
          className="rounded-full bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {exporting ? "Export…" : "Export Shopify Theme"}
        </button>
        <button
          type="button"
          onClick={onOpenExport}
          disabled={exporting || exportDisabled}
          className="rounded-full bg-pink-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
        >
          {exporting ? "Export…" : "Export ▾"}
        </button>
      </div>
    </div>
  );
}
