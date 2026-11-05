// components/billing/UpgradePopup.tsx
// Upgrade popup shown when the paywall blocks an action:
//  - free user tries to create a 3rd project, or
//  - free user tries Shopify export.
// Demo only: the upgrade button flips a local flag — no payment, no Stripe.

'use client';

import { TEST_MODE_LABEL } from '../../lib/billing';

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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 440,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: 0 }}>Upgrade zaroori hai</h2>
        <p style={{ margin: 0 }}>{reason}</p>
        <p style={{ margin: 0, fontSize: 13, color: '#b45309' }}>
          {TEST_MODE_LABEL} — demo me upgrade karne par koi payment nahi hoti.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Baad me
          </button>
          <button
            type="button"
            onClick={onUpgradeDemo}
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
            Demo me Monthly lo
          </button>
        </div>
      </div>
    </div>
  );
}
