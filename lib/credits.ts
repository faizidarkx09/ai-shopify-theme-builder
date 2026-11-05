// lib/credits.ts — AI-credit meter (Cut B #14).
//
// TEST-MODE NUMBERS ONLY. The costs below are test-mode numbers for the
// demo — they are NOT real money, NOT a real price, and no payment is
// ever taken. The $9.99 plan price in lib/billing.ts stays TEST MODE ONLY
// and is not changed here.
//
// CLIENT-SIDE ONLY — the server does NOT enforce credits. Deduction is
// wired by the integrator in the editor handlers: before a metered action
// (plan/generate/edit/regenerate) call spendCredits(project, action); if
// it returns ok:false, block the action and show the reason; if ok:true,
// persist the returned project (e.g. store.update(project.id, { credits:
// next.credits })) — the returned project is the new state. API routes
// (/api/generate, /api/edit, /api/plan) do NOT check credits.
//
// Paid plan = unlimited: balance is represented as Infinity. Infinity
// does not survive JSON/localStorage round-trips (it becomes null), so
// getCredits() re-derives it from the billing plan every time instead of
// trusting the stored value, and spendCredits() never subtracts from it.
// All arithmetic guards against NaN — a non-finite stored balance on a
// free plan falls back to the starting balance.
//
// Free plan starts at 100 test credits (FREE_STARTING_CREDITS). Existing
// billing plans are NOT changed: free = max 2 projects, no Shopify
// export; paid = unlimited projects + export (lib/billing.ts).

import { getBillingState } from './billing';
import type { CreditHistoryEntry, Project } from './types';

/** TEST-MODE credit costs per AI action — not real money. */
export const CREDIT_COSTS = {
  plan: 10,
  generatePage: 5,
  aiEdit: 2,
  regenerateSection: 2,
  regenerateImage: 1,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

/** Human labels for the cost table (CreditMeter + billing page). */
export const CREDIT_ACTION_LABELS: Record<CreditAction, string> = {
  plan: 'Plan approval (theme + sitemap)',
  generatePage: 'Generate one page',
  aiEdit: 'AI edit (one section)',
  regenerateSection: 'Regenerate one section',
  regenerateImage: 'Regenerate one image',
};

/** Test credits a free project starts with. */
export const FREE_STARTING_CREDITS = 100;

/** Balance below this shows a low-balance warning in the meter. */
export const LOW_BALANCE_THRESHOLD = 20;

export interface CreditBalance {
  /** Infinity = unlimited (paid plan). */
  balance: number;
  used: number;
}

function historyId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isPaidPlan(): boolean {
  return getBillingState().planId !== 'free';
}

function storedCredits(project: Project): { balance: number; used: number; history: CreditHistoryEntry[] } {
  const c = project.credits;
  const balance =
    c && typeof c.balance === 'number' && Number.isFinite(c.balance) && c.balance >= 0
      ? c.balance
      : FREE_STARTING_CREDITS;
  const used =
    c && typeof c.used === 'number' && Number.isFinite(c.used) && c.used >= 0 ? c.used : 0;
  return { balance, used, history: Array.isArray(c?.history) ? c.history : [] };
}

/**
 * Current credit state for a project. Paid plan → balance Infinity
 * (unlimited), used = stored used total. Missing credits field → a free
 * project starts at 100 test credits, 0 used.
 */
export function getCredits(project: Project): CreditBalance {
  const stored = storedCredits(project);
  if (isPaidPlan()) return { balance: Number.POSITIVE_INFINITY, used: stored.used };
  return { balance: stored.balance, used: stored.used };
}

export interface SpendResult {
  /** New project with updated credits + history entry (same project when ok:false). */
  project: Project;
  ok: boolean;
  /** Roman Urdu reason when ok:false. */
  reason?: string;
  /** Credits spent (0 when ok:false or on a paid plan). */
  spent: number;
}

/**
 * Pure: deduct the cost of `action` from the project and return a NEW
 * project (input untouched). Returns ok:false with the project unchanged
 * when the free balance is insufficient. Paid plan: always ok:true, no
 * deduction, history entry recorded at cost 0. Never produces NaN —
 * Infinity and non-finite stored values are normalised first.
 */
export function spendCredits(project: Project, action: CreditAction): SpendResult {
  const cost = CREDIT_COSTS[action];
  const stored = storedCredits(project);
  const entry: CreditHistoryEntry = {
    id: historyId(),
    action,
    cost: isPaidPlan() ? 0 : cost,
    createdAt: new Date().toISOString(),
  };

  if (isPaidPlan()) {
    return {
      project: {
        ...project,
        credits: { balance: Number.POSITIVE_INFINITY, used: stored.used, history: [...stored.history, entry] },
      },
      ok: true,
      spent: 0,
    };
  }

  if (stored.balance < cost) {
    return {
      project,
      ok: false,
      reason: `Credits khatam ho gaye — is action ke liye ${cost} credits chahiye, tumhare paas ${stored.balance} hain. Paid plan (test mode) lo ya naya project banao.`,
      spent: 0,
    };
  }

  return {
    project: {
      ...project,
      credits: {
        balance: stored.balance - cost,
        used: stored.used + cost,
        history: [...stored.history, entry],
      },
    },
    ok: true,
    spent: cost,
  };
}

/** True when the project can afford `action` (paid plan always can). */
export function canAfford(project: Project, action: CreditAction): boolean {
  if (isPaidPlan()) return true;
  return storedCredits(project).balance >= CREDIT_COSTS[action];
}
