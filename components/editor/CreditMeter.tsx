// components/editor/CreditMeter.tsx — AI-credit meter (Cut B #14).
// Shows the project's balance (or "Unlimited" on a paid plan), the
// per-action cost list, and a low-balance warning under 20 credits.
// Reads the billing plan via lib/billing.ts getBillingState (client-side
// localStorage flag — read after mount to avoid a hydration mismatch)
// and the balance via lib/credits.ts getCredits. Read-only display:
// spending is done by the integrator with spendCredits() in the editor
// handlers; this component never deducts anything.
"use client";

import { useEffect, useState } from "react";
import {
  CREDIT_ACTION_LABELS,
  CREDIT_COSTS,
  LOW_BALANCE_THRESHOLD,
  getCredits,
  type CreditAction,
} from "@/lib/credits";
import { getBillingState, type BillingState } from "@/lib/billing";
import type { Project } from "@/lib/types";

export interface CreditMeterProps {
  project: Project;
}

export default function CreditMeter({ project }: CreditMeterProps) {
  const [billing, setBilling] = useState<BillingState | null>(null);

  useEffect(() => {
    setBilling(getBillingState());
  }, []);

  const { balance, used } = getCredits(project);
  const unlimited = !Number.isFinite(balance);
  const low = !unlimited && balance < LOW_BALANCE_THRESHOLD;

  return (
    <div
      style={{
        border: `1px solid ${low ? "#fca5a5" : "#d1d5db"}`,
        borderRadius: 10,
        padding: 12,
        background: low ? "#fef2f2" : "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span>AI credits</span>
        <span>
          {unlimited ? "Unlimited" : `${balance} left`}
          {billing && billing.planId !== "free" ? " · paid plan" : ""}
        </span>
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
        {unlimited
          ? "Paid plan — credits unlimited hain (test mode)."
          : `${used} used · Test mode credits — not real money.`}
      </p>
      {low && (
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "#b91c1c" }}>
          Credits kam ho rahe hain — sirf {balance} bache hain. Paid plan
          (test mode) lo ya credits bacha kar use karo.
        </p>
      )}
      <ul
        style={{
          margin: "10px 0 0",
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 4,
          fontSize: 13,
          color: "#374151",
        }}
      >
        {(Object.keys(CREDIT_COSTS) as CreditAction[]).map((action) => (
          <li
            key={action}
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>{CREDIT_ACTION_LABELS[action]}</span>
            <strong>{CREDIT_COSTS[action]} credits</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
