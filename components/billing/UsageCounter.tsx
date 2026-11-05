// components/billing/UsageCounter.tsx
// Sidebar/footer usage display: "2 me se 2 use" style counter.
// Pure presentational — pass the numbers in, no store access inside.
//
// Cut B #14: optional `credits` prop adds the aggregate AI-credits panel
// (totals across all projects + recent history). The billing page
// computes the aggregate and passes it in; this component only renders.
//
// Wave 3 — light Wave 0 chrome: white panel, slate text, indigo bar.
// No red full-state background; the limit message is plain muted text.

import type { ProjectUsage } from '../../lib/billing';
import { TEST_MODE_LABEL } from '../../lib/billing';

export interface AggregateCredits {
  /** Infinity = unlimited (paid plan). */
  totalBalance: number;
  totalUsed: number;
  projectCount: number;
  /** Newest first, already trimmed by the caller. */
  recentHistory: Array<{
    projectName: string;
    action: string;
    cost: number;
    createdAt: string;
  }>;
}

interface UsageCounterProps {
  usage: ProjectUsage;
  /** Aggregate AI credits (Cut B #14) — omit to show projects only. */
  credits?: AggregateCredits;
}

export default function UsageCounter({ usage, credits }: UsageCounterProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex justify-between text-sm font-semibold text-slate-900">
        <span>Projects</span>
        <span>{usage.label}</span>
      </div>
      {usage.limit !== null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-indigo-600"
            style={{ width: `${usage.percentUsed}%` }}
          />
        </div>
      )}
      {usage.isFull && (
        <p className="mt-2 text-sm text-slate-600">
          Limit poori ho gayi hai — naya project banane ke liye paid plan lo
          (test mode).
        </p>
      )}

      {credits && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="flex justify-between text-sm font-semibold text-slate-900">
            <span>AI credits (all projects)</span>
            <span>
              {!Number.isFinite(credits.totalBalance)
                ? 'Unlimited'
                : `${credits.totalBalance} left`}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {credits.totalUsed} used · {credits.projectCount} project
            {credits.projectCount === 1 ? '' : 's'} · {TEST_MODE_LABEL}
          </p>
          {credits.recentHistory.length > 0 && (
            <ul className="mt-2.5 grid gap-1 text-sm text-slate-600">
              {credits.recentHistory.map((h, i) => (
                <li
                  key={`${h.createdAt}-${i}`}
                  className="flex justify-between gap-2"
                >
                  <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {h.action} · {h.projectName}
                  </span>
                  <strong className="shrink-0 font-semibold text-slate-900">
                    −{h.cost}
                  </strong>
                </li>
              ))}
            </ul>
          )}
          {credits.recentHistory.length === 0 && (
            <p className="mt-2.5 text-sm text-slate-500">
              Abhi koi credit use nahi hua.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
