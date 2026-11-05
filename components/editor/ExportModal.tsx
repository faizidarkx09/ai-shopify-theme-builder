// components/editor/ExportModal.tsx — Export hero + pre-export audit +
// guided "Deploy to Shopify" steps (Cut A #3 + #6).
// The parent (editor page) owns the audit result, the export call and the
// billing gate — this modal only presents them:
//   - big "Export Shopify Theme" hero button (zip contents preview first)
//   - audit checklist with severity icons + one-click fix buttons
//     (onApplyFix — the parent applies the fix via applyAuditFix)
//   - post-download import guide (numbered Shopify admin steps)
//   - when billingAllowed is false, the Shopify button is locked and the
//     paid-plan upgrade path is shown (TEST MODE ONLY label, /billing link).
// All UI text is original. The $9.99 figure is test-mode only everywhere.
"use client";

import Link from "next/link";
import type { Page, Project } from "@/lib/types";
import type { AuditFix, AuditResult } from "@/lib/export/audit";

export type ExportModalFormat = "shopify" | "code" | "png";

export interface ExportModalProps {
  project: Project;
  page: Page;
  audit: AuditResult;
  onClose: () => void;
  onExport: (format: ExportModalFormat) => void;
  /** One-click audit fix — parent applies it (see applyAuditFix). */
  onApplyFix?: (fix: AuditFix) => void;
  exporting?: boolean;
  exportMsg?: string;
  /** False = free plan: Shopify export locked, upgrade path shown. */
  billingAllowed: boolean;
  /** Shopify zip file count when known (default 27 — the zip stays 27 files). */
  shopifyFileCount?: number;
  /** Zip size estimate in bytes when known (shown only when provided). */
  estimatedSizeBytes?: number;
  /** True right after a download finished — highlights the deploy guide. */
  justDownloaded?: boolean;
}

const SEVERITY_ICON: Record<string, string> = {
  error: "⛔",
  warning: "⚠️",
  info: "ℹ️",
};

const SEVERITY_STYLE: Record<string, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

const FIX_LABEL: Record<AuditFix["type"], string> = {
  "replace-image": "Clear placeholder image",
  "fill-text": "Fill in text",
  "set-alt": "Set alt text",
  "set-meta": "Fill in SEO",
  "remove-empty": "Remove section",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ExportModal({
  project,
  page,
  audit,
  onClose,
  onExport,
  onApplyFix,
  exporting = false,
  exportMsg = "",
  billingAllowed,
  shopifyFileCount = 27,
  estimatedSizeBytes,
  justDownloaded = false,
}: ExportModalProps) {
  const errors = audit.issues.filter((i) => i.severity === "error").length;
  const warnings = audit.issues.filter((i) => i.severity === "warning").length;
  const scoreTone =
    audit.score >= 90
      ? "text-green-700"
      : audit.score >= 70
        ? "text-amber-700"
        : "text-red-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Export theme"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---- header ---- */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Export your theme</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {project.name} — page “{page.title}” · {page.sections.length} sections
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close export dialog"
          >
            ✕
          </button>
        </div>

        {/* ---- hero: Export Shopify Theme ---- */}
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <button
            type="button"
            disabled={!billingAllowed || exporting}
            onClick={() => onExport("shopify")}
            className="w-full rounded-full bg-violet-600 px-6 py-3 text-base font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "⬇ Export Shopify Theme (.zip)"}
          </button>
          <p className="mt-2 text-center text-xs text-gray-600">
            A real Shopify theme zip — {shopifyFileCount} files
            {estimatedSizeBytes ? ` · about ${formatBytes(estimatedSizeBytes)}` : ""} ·
            layout, templates, sections, snippets, assets, config and locales.
            {billingAllowed
              ? " Install it in any Shopify store — your theme works without us."
              : " Shopify export is a paid-plan feature."}
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            Placeholder products and content are inside — add your real products
            in Shopify after import.
          </p>
          {!billingAllowed ? (
            <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-sm text-amber-900">
              <p className="font-semibold">Shopify export needs a paid plan.</p>
              <p className="mt-0.5 text-xs">
                Paid plan — $9.99/month ·{" "}
                <span className="font-semibold">TEST MODE ONLY — not a real price</span>
              </p>
              <Link
                href="/billing"
                className="mt-2 inline-block rounded-full bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700"
              >
                See plans on the billing page
              </Link>
            </div>
          ) : null}
        </div>

        {/* ---- other formats ---- */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() => onExport("code")}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-violet-400 hover:text-violet-700 disabled:opacity-50"
          >
            Export to Code (.zip)
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => onExport("png")}
            className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-violet-400 hover:text-violet-700 disabled:opacity-50"
          >
            Export this page as PNG
          </button>
        </div>

        {exportMsg ? (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
            {exportMsg}
          </p>
        ) : null}

        {/* ---- pre-export audit ---- */}
        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-bold text-gray-900">Pre-export check</h3>
            <span className={`text-sm font-bold ${scoreTone}`}>
              Score {audit.score}/100 · {errors} errors · {warnings} warnings
            </span>
          </div>
          {audit.issues.length === 0 ? (
            <p className="mt-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              ✅ All clear — no placeholder, contrast, SEO or link problems found
              on this page. Ready to export.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {audit.issues.map((issue) => (
                <li
                  key={issue.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLE[issue.severity]}`}
                >
                  <span>
                    <span aria-hidden="true">{SEVERITY_ICON[issue.severity]} </span>
                    {issue.message}
                  </span>
                  {issue.fix && onApplyFix ? (
                    <button
                      type="button"
                      onClick={() => onApplyFix(issue.fix as AuditFix)}
                      className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm hover:bg-gray-100"
                    >
                      {FIX_LABEL[issue.fix.type]}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Errors and warnings do not block the download — fix what matters,
            then export. Placeholder products stay placeholders until you add
            real ones in Shopify.
          </p>
        </div>

        {/* ---- guided deploy steps (after download) ---- */}
        <div
          className={`mt-5 rounded-xl border p-4 ${
            justDownloaded ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
          }`}
        >
          <h3 className="font-bold text-gray-900">
            {justDownloaded ? "✅ Downloaded — now deploy it to Shopify" : "After download — deploy to Shopify"}
          </h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-700">
            <li>Open your Shopify admin and go to Online Store → Themes.</li>
            <li>Click “Add theme” → “Upload zip file”.</li>
            <li>Choose the theme zip you just downloaded and upload it.</li>
            <li>Once it appears in your theme library, click “Publish” to make it live.</li>
            <li>Replace the placeholder products, images and text with your real catalog — the theme ships with demo content only.</li>
            <li>Open Online Store → Preferences and check your store title and description match the theme.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
