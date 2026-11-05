// components/billing/UsageCounter.tsx
// Sidebar/footer usage display: "2 me se 2 use" style counter.
// Pure presentational — pass the numbers in, no store access inside.
//
// Cut B #14: optional `credits` prop adds the aggregate AI-credits panel
// (totals across all projects + recent history). The billing page
// computes the aggregate and passes it in; this component only renders.

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
    <div
      style={{
        border: '1px solid #d1d5db',
        borderRadius: 10,
        padding: 12,
        background: usage.isFull ? '#fef2f2' : '#ffffff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span>Projects</span>
        <span>{usage.label}</span>
      </div>
      {usage.limit !== null && (
        <div
          style={{
            marginTop: 8,
            height: 8,
            borderRadius: 999,
            background: '#e5e7eb',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${usage.percentUsed}%`,
              height: '100%',
              background: usage.isFull ? '#dc2626' : '#111827',
            }}
          />
        </div>
      )}
      {usage.isFull && (
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#b91c1c' }}>
          Limit poori ho gayi hai — naya project banane ke liye paid plan lo (test mode).
        </p>
      )}

      {credits && (
        <div style={{ marginTop: 16, borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span>AI credits (all projects)</span>
            <span>
              {!Number.isFinite(credits.totalBalance)
                ? 'Unlimited'
                : `${credits.totalBalance} left`}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
            {credits.totalUsed} used · {credits.projectCount} project
            {credits.projectCount === 1 ? '' : 's'} · {TEST_MODE_LABEL}
          </p>
          {credits.recentHistory.length > 0 && (
            <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 4, fontSize: 13 }}>
              {credits.recentHistory.map((h, i) => (
                <li key={`${h.createdAt}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.action} · {h.projectName}
                  </span>
                  <strong style={{ flexShrink: 0 }}>−{h.cost}</strong>
                </li>
              ))}
            </ul>
          )}
          {credits.recentHistory.length === 0 && (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#6b7280' }}>
              Abhi koi credit use nahi hua.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
