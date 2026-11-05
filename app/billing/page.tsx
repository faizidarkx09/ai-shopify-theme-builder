// app/billing/page.tsx
// Billing / plans page — TEST MODE ONLY, no real payments.
//
// Shows Free / Monthly / Yearly, the live project usage counter
// ("2 me se 2 use"), and a demo plan switch. "Upgrade" here only flips a
// local flag (lib/billing.ts setPlanDemo) so the paywall can be tested.
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
    return <main style={{ padding: 24 }}>Loading…</main>;
  }

  const exportGate = canExportShopify(billing.planId);

  return (
    <main style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 8px' }}>Billing aur plans</h1>
      <p style={{ margin: '0 0 8px', color: '#374151' }}>
        Free plan me maximum 2 projects, Shopify export nahi. Paid plan me
        unlimited projects aur Shopify export.
      </p>
      <p
        style={{
          margin: '0 0 24px',
          fontSize: 13,
          color: '#b45309',
          fontWeight: 600,
        }}
      >
        {TEST_MODE_LABEL} — yahan dikhaya gaya $9.99 koi asli price nahi hai, aur
        yahan koi payment nahi hoti.
      </p>

      <section style={{ marginBottom: 24, maxWidth: 360 }}>
        <UsageCounter usage={usage} credits={credits ?? undefined} />
      </section>

      <section
        style={{
          border: '1px solid #d1d5db',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: '0 0 4px' }}>AI credit costs — TEST MODE ONLY</h2>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
          Ye costs test-mode numbers hain — asli payment nahi, sirf demo
          balance. Free project 100 test credits se shuru hota hai; paid
          plan me credits unlimited hain.
        </p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
          {(Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => (
            <li
              key={action}
              style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}
            >
              <span>{CREDIT_ACTION_LABELS[action]}</span>
              <strong>{CREDIT_COSTS[action]} credits</strong>
            </li>
          ))}
        </ul>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {(Object.keys(PLANS) as PlanId[]).map((planId) => (
          <PlanCard
            key={planId}
            plan={PLANS[planId]}
            isCurrent={billing.planId === planId}
            onSelect={handleSelectPlan}
          />
        ))}
      </section>

      <section
        style={{ border: '1px solid #d1d5db', borderRadius: 12, padding: 20 }}
      >
        <h2 style={{ margin: '0 0 8px' }}>Shopify export check</h2>
        <p style={{ margin: '0 0 12px' }}>
          {exportGate.allowed
            ? 'Tumhara plan Shopify export allow karta hai (paid plan).'
            : 'Tumhara Free plan Shopify export allow nahi karta.'}
        </p>
        <button
          type="button"
          onClick={handleTryShopifyExport}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#111827',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Shopify export try karo
        </button>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#6b7280' }}>
          Export ki hui theme me placeholder products/content hote hain — asli
          products Shopify me khud lagane honge.
        </p>
      </section>

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
