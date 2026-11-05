// components/billing/UpgradePopup.tsx
// Upgrade popup shown when the paywall blocks an action:
//  - free user tries to create a 3rd project, or
//  - free user tries Shopify export.
// Demo only: the upgrade button flips a local flag — no payment, no Stripe.
//
// Wave 3 — light Wave 0 chrome (ui Button, slate text, indigo primary).
// Behaviour and props unchanged.

'use client';

import { TEST_MODE_LABEL } from '../../lib/billing';
import { Button } from '../ui/Button';

interface UpgradePopupProps {
  open: boolean;
  /** Why the user was blocked (from lib/billing.ts gate reason). */
  reason: string;
  onClose: () => void;
  /** Demo upgrade — caller switches the local plan flag. */
  onUpgradeDemo: () => void;
}

export default function UpgradePopup({
  open,
  reason,
  onClose,
  onUpgradeDemo,
}: UpgradePopupProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade required"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-slate-900">
          Upgrade zaroori hai
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{reason}</p>
        <p className="mt-2 text-xs text-slate-500">
          {TEST_MODE_LABEL} — demo me upgrade karne par koi payment nahi hoti.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Baad me
          </Button>
          <Button type="button" variant="primary" onClick={onUpgradeDemo}>
            Demo me Monthly lo
          </Button>
        </div>
      </div>
    </div>
  );
}
