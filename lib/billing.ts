// lib/billing.ts
// Billing + paywall rules for Cut 1–5.
//
// TEST MODE ONLY. There is no real Stripe account, no real key, no real
// payment anywhere in this file. The $9.99 demo price is labelled test-mode
// everywhere it is shown — it is NOT a real price.
//
// Rules (from PLAN.md / blueprint):
//   Free    = max 2 projects, view/edit only, NO Shopify export.
//   Monthly = unlimited projects + Shopify export. Demo price $9.99/month.
//   Yearly  = unlimited projects + Shopify export. Demo price shown as
//             $9.99/month billed yearly — the real yearly price is NOT set
//             yet, so we do not invent one.
//
// Enforcement is in pure functions (canCreateProject / canExportShopify)
// so the API route, the editor and the billing page all share one rule.
// The "upgrade" here only flips a local flag for the demo — it never
// charges anyone. Real Stripe Checkout lands in Cut 5.

export type PlanId = 'free' | 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  /** Demo price in USD. Free = 0. Always shown with the TEST MODE label. */
  priceUsd: number;
  billingPeriod: 'forever' | 'month' | 'year';
  maxProjects: number; // Infinity = unlimited
  shopifyExport: boolean;
  features: string[];
}

export const TEST_MODE_LABEL = 'TEST MODE ONLY — not a real price';

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    billingPeriod: 'forever',
    maxProjects: 2,
    shopifyExport: false,
    features: [
      'Maximum 2 projects',
      'Projects dekh aur edit kar sakte ho',
      'Export to Code aur PNG',
      'Shopify export NAHI milega',
    ],
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    priceUsd: 9.99,
    billingPeriod: 'month',
    maxProjects: Number.POSITIVE_INFINITY,
    shopifyExport: true,
    features: [
      'Unlimited projects',
      'Shopify theme export (zip)',
      'Export to Code aur PNG',
      'Saari premium features',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    priceUsd: 9.99,
    billingPeriod: 'year',
    maxProjects: Number.POSITIVE_INFINITY,
    shopifyExport: true,
    features: [
      'Unlimited projects',
      'Shopify theme export (zip)',
      'Export to Code aur PNG',
      'Saari premium features',
      'Yearly billing — asli yearly price abhi set nahi hui (test mode)',
    ],
  },
};

export const FREE_PROJECT_LIMIT = 2;

export interface BillingState {
  planId: PlanId;
  updatedAt: string;
  /** Demo-only marker: this plan was set by the test-mode switch, never paid. */
  demoMode: true;
}

const BILLING_STORAGE_KEY = 'ai-shopify-builder:billing:v1';

export function getPlan(planId: PlanId): Plan {
  return PLANS[planId];
}

export function getBillingState(): BillingState {
  if (typeof window === 'undefined') {
    return { planId: 'free', updatedAt: new Date().toISOString(), demoMode: true };
  }
  try {
    const raw = window.localStorage.getItem(BILLING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BillingState>;
      if (parsed.planId && PLANS[parsed.planId]) {
        return {
          planId: parsed.planId,
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
          demoMode: true,
        };
      }
    }
  } catch {
    // Fall through to free.
  }
  return { planId: 'free', updatedAt: new Date().toISOString(), demoMode: true };
}

/**
 * Demo-only plan switch. Flips a local flag so the paywall can be tested.
 * NEVER charges, NEVER contacts Stripe. Real checkout lands in Cut 5.
 */
export function setPlanDemo(planId: PlanId): BillingState {
  const state: BillingState = {
    planId,
    updatedAt: new Date().toISOString(),
    demoMode: true,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(state));
  }
  return state;
}

// ---------------------------------------------------------------------------
// Paywall enforcement (pure functions — shared by UI + API route)
// ---------------------------------------------------------------------------

export interface GateResult {
  allowed: boolean;
  /** Roman Urdu message shown to the user when blocked. */
  reason?: string;
  /** True when the fix is "upgrade to a paid plan". */
  upgradeRequired?: boolean;
}

/** Free user may create a project only while under the 2-project limit. */
export function canCreateProject(planId: PlanId, projectCount: number): GateResult {
  const plan = getPlan(planId);
  if (projectCount < plan.maxProjects) return { allowed: true };
  return {
    allowed: false,
    upgradeRequired: true,
    reason:
      `Free plan me maximum ${FREE_PROJECT_LIMIT} projects bana sakte ho. ` +
      `Tumhare ${projectCount} projects hain. Aage barhne ke liye paid plan lo (test mode).`,
  };
}

/** Shopify export is a paid feature — free users are always blocked. */
export function canExportShopify(planId: PlanId): GateResult {
  const plan = getPlan(planId);
  if (plan.shopifyExport) return { allowed: true };
  return {
    allowed: false,
    upgradeRequired: true,
    reason:
      'Shopify theme export Free plan me nahi hai. ' +
      'Export karne ke liye paid plan lo (test mode).',
  };
}

// ---------------------------------------------------------------------------
// Usage display ("2 me se 2 use" style counter)
// ---------------------------------------------------------------------------

export interface ProjectUsage {
  used: number;
  /** null = unlimited (paid plan). */
  limit: number | null;
  /** e.g. "2 me se 2 use" / "1 me se 2 use" / "Unlimited — 5 use". */
  label: string;
  isFull: boolean;
  percentUsed: number; // 0–100; 100 when full, 0 when unlimited
}

export function getProjectUsage(planId: PlanId, projectCount: number): ProjectUsage {
  const plan = getPlan(planId);
  if (!Number.isFinite(plan.maxProjects)) {
    return {
      used: projectCount,
      limit: null,
      label: `Unlimited — ${projectCount} use`,
      isFull: false,
      percentUsed: 0,
    };
  }
  const used = Math.min(projectCount, plan.maxProjects);
  return {
    used,
    limit: plan.maxProjects,
    label: `${used} me se ${plan.maxProjects} use`,
    isFull: projectCount >= plan.maxProjects,
    percentUsed: Math.round((used / plan.maxProjects) * 100),
  };
}

// ---------------------------------------------------------------------------
// Stripe TEST-MODE STUB (Cut 5 fills this in with real keys — not here)
// ---------------------------------------------------------------------------

export const STRIPE_TEST_MODE = {
  enabled: true,
  mode: 'test' as const,
  /** No real keys exist in this repo. Keep it that way. */
  publishableKey: null as string | null,
  secretKey: null as string | null,
  webhookSecret: null as string | null,
  note:
    'Stripe sirf test mode stub hai. Koi asli key, koi asli payment nahi. ' +
    'Asli checkout Cut 5 me aayega.',
} as const;

/** What a (fake) test checkout would return — no URL, no charge. */
export function createTestCheckoutSession(planId: PlanId): {
  stub: true;
  planId: PlanId;
  checkoutUrl: null;
  message: string;
} {
  return {
    stub: true,
    planId,
    checkoutUrl: null,
    message:
      `Ye sirf test-mode stub hai — ${getPlan(planId).name} ke liye koi asli ` +
      `Stripe checkout nahi khula, koi payment nahi hui. Demo me plan local ` +
      `flag se badalta hai.`,
  };
}

/** Minimal shape check for a webhook payload. No signature verification here. */
export function parseBillingWebhookEvent(body: unknown): {
  ok: boolean;
  type?: string;
  reason?: string;
} {
  if (!body || typeof body !== 'object') {
    return { ok: false, reason: 'Webhook body khali ya ghalat hai.' };
  }
  const type = (body as { type?: unknown }).type;
  if (typeof type !== 'string' || !type) {
    return { ok: false, reason: 'Webhook event me "type" nahi mila.' };
  }
  const known = [
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_failed',
  ];
  if (!known.includes(type)) {
    return { ok: false, type, reason: `Unknown test event type: ${type}` };
  }
  return { ok: true, type };
}
