// components/editor/EditorTopBar.tsx — Wave 2 rewrite (beginner-first).
// Top bar ONLY, decluttered: back button + project name + the wizard
// Stepper + ONE Advanced switch + ONE primary Export button. Nothing
// else lives here in beginner mode:
//   - page tabs + Desktop/Tablet/Mobile view toggle + "+ Page" moved to
//     the slim Step-3 bar in the editor page (they belong to editing).
//   - Credit meter, Polish, Variant B moved into the Advanced drawer.
//   - the old duplicate "Export ▾" button is gone (Cut A #6 already
//     removed the dropdown; this removes the leftover second button).
// Light chrome only (Wave 0 tokens): white, slate, ONE indigo accent.
"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { WizardStepper } from "./WizardSteps";

/** Cut B #15: desktop / tablet (768px) / mobile (390px). */
export type ViewMode = "desktop" | "tablet" | "mobile";

export interface EditorTopBarProps {
  projectName: string;
  /** 0-based wizard step (Prompt / Plan / Pages / Export). */
  currentStep: number;
  canGoToStep: (step: number) => boolean;
  onStepClick: (step: number) => void;
  /** The single Advanced switch — off by default (beginner mode). */
  advanced: boolean;
  onAdvancedChange: (on: boolean) => void;
  /** Open the ExportModal (audit + export hero + deploy guide). */
  onOpenExport: () => void;
  exporting: boolean;
  exportDisabled: boolean;
}

export default function EditorTopBar({
  projectName,
  currentStep,
  canGoToStep,
  onStepClick,
  advanced,
  onAdvancedChange,
  onOpenExport,
  exporting,
  exportDisabled,
}: EditorTopBarProps) {
  return (
    <header className="border-b border-border bg-page px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-body hover:bg-panel hover:text-ink"
        >
          ← Dashboard
        </Link>
        <span className="max-w-48 truncate text-sm font-semibold text-ink">
          {projectName}
        </span>
        <div className="ml-auto flex items-start gap-3">
          <div className="flex flex-col">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
              <span>Advanced</span>
              <button
                type="button"
                role="switch"
                aria-checked={advanced}
                aria-label="Advanced settings dikhao ya chhupao"
                onClick={() => onAdvancedChange(!advanced)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  advanced ? "bg-accent" : "bg-slate-300"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    advanced ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
            <p className="text-[11px] text-muted">Pro features — zaroori nahi</p>
          </div>
          <div className="flex flex-col items-end">
            <Button
              size="sm"
              onClick={onOpenExport}
              disabled={exporting || exportDisabled}
            >
              {exporting ? "Export…" : "Export Shopify Theme"}
            </Button>
            {exportDisabled ? (
              <p className="mt-1 text-[11px] text-muted">
                Export Step 4 me milega
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <WizardStepper
          current={currentStep}
          canGoTo={canGoToStep}
          onStepClick={onStepClick}
        />
      </div>
    </header>
  );
}
