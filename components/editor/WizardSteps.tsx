// components/editor/WizardSteps.tsx — Wave 2 (beginner-first redesign).
// The editor's guided wizard: 1 Prompt -> 2 Plan -> 3 Pages -> 4 Export.
// The current step derives from project state (no extra wizard state in
// lib/types.ts — the page keeps one local manualStep override so the user
// can jump back/forward by clicking a step). Step 4 is only ever reached
// by clicking it (or the Export button): pages existing means "editing",
// not "ready to export".
"use client";

import { Stepper } from "@/components/ui";

export const WIZARD_STEPS = ["Prompt", "Plan", "Pages", "Export"] as const;

export type WizardStepArgs = {
  /** Project already has at least one generated page. */
  hasPages: boolean;
  /** A plan is on screen waiting for approval. */
  planPending: boolean;
  /** /api/plan is still running. */
  planLoading: boolean;
  /** Generation is streaming (plan approved, or + Page quick action). */
  generating: boolean;
};

/** Derive the wizard step from project state. Step 4 (index 3) is never
 *  derived — the user opens it by clicking the step or the Export button. */
export function deriveWizardStep({
  hasPages,
  planPending,
  planLoading,
  generating,
}: WizardStepArgs): number {
  if (planPending || planLoading) return 1;
  if (generating) return 2;
  if (!hasPages) return 0;
  return 2;
}

export interface WizardStepperProps {
  /** 0-based current step. */
  current: number;
  /** Which steps the user may jump to (earlier steps + Export when pages exist). */
  canGoTo: (step: number) => boolean;
  onStepClick: (step: number) => void;
}

/**
 * The Wave 0 ui Stepper as the visible progress indicator, with one
 * invisible tap target per step laid over it so any reachable step is
 * clickable (the Stepper itself renders no buttons). Mobile shows the
 * Stepper's compact "Step X of 4" + progress bar; the same quarters
 * stay tappable.
 */
export function WizardStepper({ current, canGoTo, onStepClick }: WizardStepperProps) {
  return (
    <div className="relative">
      <Stepper steps={[...WIZARD_STEPS]} current={current} />
      <div className="absolute inset-0 flex" aria-label="Wizard steps">
        {WIZARD_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={!canGoTo(i)}
            onClick={() => onStepClick(i)}
            aria-label={`Step ${i + 1} par jao: ${label}`}
            title={
              canGoTo(i)
                ? `Step ${i + 1} par jao: ${label}`
                : `Step ${i + 1} (${label}) abhi khula nahi`
            }
            className="min-h-11 flex-1 cursor-pointer rounded-lg disabled:cursor-default"
          />
        ))}
      </div>
    </div>
  );
}
