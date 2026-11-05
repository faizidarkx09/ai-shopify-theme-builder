// components/billing/UsageCounter.tsx
// Sidebar/footer usage display: "2 me se 2 use" style counter.
// Pure presentational — pass the numbers in, no store access inside.

import type { ProjectUsage } from '../../lib/billing';

interface UsageCounterProps {
  usage: ProjectUsage;
}

export default function UsageCounter({ usage }: UsageCounterProps) {
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
    </div>
  );
}
