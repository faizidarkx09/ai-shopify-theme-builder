// components/billing/PlanCard.tsx
// One plan card on the billing page. "use client" is not needed here —
// this is a pure presentational component; the page owns the state.

import type { Plan } from '../../lib/billing';
import { TEST_MODE_LABEL } from '../../lib/billing';

interface PlanCardProps {
  plan: Plan;
  isCurrent: boolean;
  onSelect: (planId: Plan['id']) => void;
}

export function formatPlanPrice(plan: Plan): string {
  if (plan.priceUsd === 0) return 'Free';
  if (plan.billingPeriod === 'month') return `$${plan.priceUsd.toFixed(2)} / month`;
  if (plan.billingPeriod === 'year') return `$${plan.priceUsd.toFixed(2)} / month, yearly billing`;
  return `$${plan.priceUsd.toFixed(2)}`;
}

export default function PlanCard({ plan, isCurrent, onSelect }: PlanCardProps) {
  return (
    <div
      style={{
        border: isCurrent ? '2px solid #111827' : '1px solid #d1d5db',
        borderRadius: 12,
        padding: 20,
        background: isCurrent ? '#f9fafb' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: 20 }}>{plan.name}</h3>
        {isCurrent && (
          <span
            style={{
              background: '#111827',
              color: '#fff',
              borderRadius: 999,
              padding: '2px 10px',
              fontSize: 12,
            }}
          >
            Current plan
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{formatPlanPrice(plan)}</p>
      {plan.priceUsd > 0 && (
        <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>{TEST_MODE_LABEL}</p>
      )}

      <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <button
        type="button"
        disabled={isCurrent}
        onClick={() => onSelect(plan.id)}
        style={{
          marginTop: 'auto',
          padding: '10px 16px',
          borderRadius: 8,
          border: 'none',
          background: isCurrent ? '#9ca3af' : '#111827',
          color: '#fff',
          cursor: isCurrent ? 'default' : 'pointer',
          fontWeight: 600,
        }}
      >
        {isCurrent
          ? 'Ye plan active hai'
          : plan.id === 'free'
            ? 'Free par wapas jao (demo)'
            : `${plan.name} plan lo — demo, koi payment nahi`}
      </button>
    </div>
  );
}
