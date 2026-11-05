/* Wave 0 — Stepper. Numbered steps with done / current / upcoming
   states. Horizontal on desktop; compact on mobile (current step
   only, "Step X of N"). One accent only: indigo #4F46E5. */

export type StepperStep = string | { label: string; hint?: string };

function normalize(steps: StepperStep[]): { label: string; hint?: string }[] {
  return steps.map((s) => (typeof s === "string" ? { label: s } : s));
}

export function Stepper({
  steps,
  current,
  className = "",
}: {
  steps: StepperStep[];
  /** 0-based index of the step the user is on now. */
  current: number;
  className?: string;
}) {
  const items = normalize(steps);
  const total = items.length;
  const safeCurrent = Math.max(0, Math.min(current, total - 1));
  const currentStep = items[safeCurrent];

  return (
    <div className={className}>
      {/* Mobile: compact — current step only. */}
      <p className="text-sm font-medium text-slate-600 sm:hidden">
        <span className="font-semibold text-indigo-600">
          Step {safeCurrent + 1} of {total}
        </span>
        {currentStep ? ` — ${currentStep.label}` : ""}
      </p>
      <div
        className="mt-2 flex gap-1.5 sm:hidden"
        aria-hidden="true"
      >
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${
              i < safeCurrent
                ? "bg-indigo-600"
                : i === safeCurrent
                  ? "bg-indigo-600"
                  : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      {/* Desktop: full numbered stepper. */}
      <ol className="hidden list-none sm:flex sm:items-start">
        {items.map((step, i) => {
          const state =
            i < safeCurrent ? "done" : i === safeCurrent ? "current" : "upcoming";
          return (
            <li
              key={step.label}
              aria-current={state === "current" ? "step" : undefined}
              className="flex flex-1 items-start last:flex-none"
            >
              <div className="flex flex-col items-start gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    state === "done"
                      ? "bg-indigo-600 text-white"
                      : state === "current"
                        ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                        : "border border-slate-300 bg-white text-slate-500"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className="max-w-32">
                  <span
                    className={`block text-sm font-semibold ${
                      state === "upcoming" ? "text-slate-500" : "text-slate-900"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.hint ? (
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                      {step.hint}
                    </span>
                  ) : null}
                </span>
              </div>
              {i < total - 1 ? (
                <span
                  aria-hidden="true"
                  className={`mx-3 mt-4 h-px flex-1 ${
                    i < safeCurrent ? "bg-indigo-600" : "bg-slate-200"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
