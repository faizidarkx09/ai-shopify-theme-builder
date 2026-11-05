// app/billing/page.tsx
// Billing / plans page — TEST MODE ONLY, no real payments.
//
// Wave 3 — beginner-first tidy-up (presentation only): two plan cards
// max (Free / Paid), plain language, TEST MODE as a small muted badge
// next to the price. Billing rules, prices and TEST-MODE behaviour are
// unchanged — see lib/billing.ts. "Upgrade" only flips a local flag
// (lib/billing.ts setPlanDemo) so the paywall can be tested.
// Real Stripe Checkout lands in Cut 5.

'use client';

import { useEffect, useState } from 'react';
import {
  PLANS,
  TEST_MODE_LABEL,
  canExportShopify,
  getBillingState,
  getProjectUsage,
  setPlanDemo,
  type BillingState,
  type PlanId,
  type ProjectUsage,
} from '../../lib/billing';
import { getOrCreateDemoUser } from '../../lib/auth';
import { getProjectStore } from '../../lib/db/store';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import PlanCard from '../../components/billing/PlanCard';
import UsageCounter, { type AggregateCredits } from '../../components/billing/UsageCounter';
import UpgradePopup from '../../components/billing/UpgradePopup';
import {
  CREDIT_ACTION_LABELS,
  CREDIT_COSTS,
  getCredits,
  type CreditAction,
} from '../../lib/credits';
import type { Project } from '../../lib/types';

/** Sum credits across all projects (Cut B #14). Paid plan → Unlimited. */
export function aggregateCredits(projects: Project[]): AggregateCredits {
  const paid = getBillingState().planId !== 'free';
  let totalBalance = 0;
  let totalUsed = 0;
  const history: AggregateCredits['recentHistory'] = [];
  for (const p of projects) {
    const c = getCredits(p);
    if (Number.isFinite(c.balance)) totalBalance += c.balance;
    totalUsed += c.used;
    for (const h of p.credits?.history ?? []) {
      history.push({
        projectName: p.name,
        action: CREDIT_ACTION_LABELS[h.action as CreditAction] ?? h.action,
        cost: h.cost,
        createdAt: h.createdAt,
      });
    }
  }
  history.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    totalBalance: paid ? Number.POSITIVE_INFINITY : totalBalance,
    totalUsed,
    projectCount: projects.length,
    recentHistory: history.slice(0, 5),
  };
}

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [usage, setUsage] = useState<ProjectUsage | null>(null);
  const [credits, setCredits] = useState<AggregateCredits | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupReason, setPopupReason] = useState('');

  useEffect(() => {
    const state = getBillingState();
    const user = getOrCreateDemoUser();
    const store = getProjectStore();
    const count = store.count(user.id);
    setBilling(state);
    setUsage(getProjectUsage(state.planId, count));
    setCredits(aggregateCredits(store.list(user.id) as Project[]));
  }, []);

  const refresh = (state: BillingState) => {
    const user = getOrCreateDemoUser();
    const store = getProjectStore();
    const count = store.count(user.id);
    setBilling(state);
    setUsage(getProjectUsage(state.planId, count));
    setCredits(aggregateCredits(store.list(user.id) as Project[]));
  };

  const handleSelectPlan = (planId: PlanId) => {
    // Demo switch only — no Stripe, no payment (see lib/billing.ts).
    refresh(setPlanDemo(planId));
  };

  const handleTryShopifyExport = () => {
    if (!billing) return;
    const gate = canExportShopify(billing.planId);
    if (!gate.allowed) {
      setPopupReason(gate.reason ?? 'Shopify export ke liye paid plan chahiye.');
      setPopupOpen(true);
    }
  };

  if (!billing || !usage) {
    return (
      <main className="stb-container py-8">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

  const exportGate = canExportShopify(billing.planId);

  return (
    <main className="stb-container py-8">
      <h1>Billing aur plans</h1>
      <p className="stb-lead mt-2">
        Free plan me maximum 2 projects, Shopify export nahi. Paid plan me
        unlimited projects aur Shopify export.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {TEST_MODE_LABEL} — yahan dikhaya gaya $9.99 koi asli price nahi hai,
        aur yahan koi payment nahi hoti.
      </p>

      <section className="mt-6 max-w-md">
        <UsageCounter usage={usage} credits={credits ?? undefined} />
      </section>

      {/* Two cards max: Free / Paid (Monthly). Yearly stays in lib/billing.ts,
          it is not shown here so a beginner sees one simple choice. */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <PlanCard
          plan={PLANS.free}
          isCurrent={billing.planId === 'free'}
          onSelect={handleSelectPlan}
        />
        <PlanCard
          plan={PLANS.monthly}
          isCurrent={billing.planId === 'monthly'}
          onSelect={handleSelectPlan}
        />
      </section>

      <Card
        title="AI credit costs"
        description="Ye costs test-mode numbers hain — asli payment nahi, sirf demo balance. Free project 100 test credits se shuru hota hai; paid plan me credits unlimited hain."
        className="mt-6"
      >
        <ul className="grid gap-2">
          {(Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => (
            <li
              key={action}
              className="flex justify-between gap-4 text-sm text-slate-600"
            >
              <span>{CREDIT_ACTION_LABELS[action]}</span>
              <strong className="shrink-0 font-semibold text-slate-900">
                {CREDIT_COSTS[action]} credits
              </strong>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Shopify export check" className="mt-6">
        <p className="text-sm leading-relaxed text-slate-600">
          {exportGate.allowed
            ? 'Tumhara plan Shopify export allow karta hai (paid plan).'
            : 'Tumhara Free plan Shopify export allow nahi karta.'}
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={handleTryShopifyExport}
          className="mt-4"
        >
          Shopify export try karo
        </Button>
        <p className="mt-3 text-sm text-slate-500">
          Export ki hui theme me placeholder products/content hote hain — asli
          products Shopify me khud lagane honge.
        </p>
      </Card>

      <UpgradePopup
        open={popupOpen}
        reason={popupReason}
        onClose={() => setPopupOpen(false)}
        onUpgradeDemo={() => {
          setPopupOpen(false);
          handleSelectPlan('monthly');
        }}
      />
    </main>
  );
}
