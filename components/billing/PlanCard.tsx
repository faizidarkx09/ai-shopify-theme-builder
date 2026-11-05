// components/billing/PlanCard.tsx
// One plan card on the billing page. "use client" is not needed here —
// this is a pure presentational component; the page owns the state.
//
// Wave 3 — Wave 0 system (ui Card + Button), light chrome only.
// TEST MODE is a small muted badge next to the price, never a large
// coloured line. 3–4 short bullet benefits per card.

import type { Plan } from '../../lib/billing';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

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
    <Card
      className={
        isCurrent ? 'border-indigo-600 ring-1 ring-indigo-600' : ''
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
        {isCurrent && (
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            Current plan
          </span>
        )}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-2xl font-bold text-slate-900">
          {formatPlanPrice(plan)}
        </span>
        {plan.priceUsd > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            TEST MODE
          </span>
        )}
      </p>

      <ul className="mt-4 grid gap-2 text-sm text-slate-600">
        {plan.features.slice(0, 4).map((feature) => (
          <li key={feature} className="flex gap-2">
            <span aria-hidden className="text-indigo-600">
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        variant={
          isCurrent || plan.id === 'free' ? 'ghost' : 'primary'
        }
        disabled={isCurrent}
        onClick={() => onSelect(plan.id)}
        className="mt-5 w-full"
      >
        {isCurrent
          ? 'Ye plan active hai'
          : plan.id === 'free'
            ? 'Free par wapas jao (demo)'
            : 'Monthly lo — demo, koi payment nahi'}
      </Button>
    </Card>
  );
}
