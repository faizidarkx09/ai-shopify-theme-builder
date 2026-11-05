// components/editor/GuidedTour.tsx — Guided first run (Cut B #17).
// A 3-step highlight overlay for a first generation: 1 hover toolbar →
// 2 AI chat → 3 export, plus a launch checklist (Preview → Edit →
// Export → Import to Shopify). All copy is original.
//
// STATELESS by design: the parent owns `step` and advances it with
// onNext/onDone; this component only renders. Persistence is the
// integrator's job — after onDone, store the flag
//   localStorage.setItem(`stb-tour-done-${projectId}`, '1')
// (key: `stb-tour-done-<projectId>`) and do not auto-open the tour
// again for that project. onSkip dismisses without marking done.
"use client";

export interface TourChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface GuidedTourProps {
  /** 0 = welcome, 1 = hover toolbar, 2 = AI chat, 3 = export. */
  step: 0 | 1 | 2 | 3;
  onNext: () => void;
  onSkip: () => void;
  onDone: () => void;
  checklist: TourChecklistItem[];
  /** Optional: parent toggles a checklist item (persisted with the project). */
  onToggleCheck?: (id: string) => void;
}

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Your store is ready — let’s walk through it",
    body: "Your first theme is generated. This quick tour shows the three things that matter: editing a section, asking the AI, and exporting your theme.",
  },
  {
    title: "1 · Hover a section to edit it",
    body: "Move your mouse over any section in the preview — a small toolbar appears inside it. Move, duplicate, delete, or open it in the edit panel. Nothing is overwritten silently: AI edits always ask first.",
  },
  {
    title: "2 · Ask the AI to change one section",
    body: "Pick a section, then tell the AI chat what to change — for example, “hero title Summer Sale rakho”. Review the proposal, then Accept or Discard. Every accepted edit saves a version you can restore.",
  },
  {
    title: "3 · Export your Shopify theme",
    body: "When the preview looks right, hit Export Shopify Theme. You get a real theme zip to upload in Shopify (Online Store → Themes → Add theme → Upload zip). The export check warns you about placeholders first.",
  },
];

export default function GuidedTour({
  step,
  onNext,
  onSkip,
  onDone,
  checklist,
  onToggleCheck,
}: GuidedTourProps) {
  const current = STEPS[step];
  const isLast = step === 3;

  return (
    <div
      role="dialog"
      aria-label="Guided first run"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <p style={{ margin: "0 0 4px", fontSize: 12, color: "#6b7280" }}>
          Step {step + 1} of 4 · Guided first run
        </p>
        <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{current.title}</h2>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: "#374151" }}>
          {current.body}
        </p>

        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 16,
          }}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: i <= step ? "#111827" : "#e5e7eb",
              }}
            />
          ))}
        </div>

        <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Launch checklist</h3>
        <ul style={{ margin: "0 0 20px", padding: 0, listStyle: "none" }}>
          {checklist.map((item) => (
            <li key={item.id} style={{ marginBottom: 6 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  cursor: onToggleCheck ? "pointer" : "default",
                }}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={!onToggleCheck}
                  onChange={() => onToggleCheck?.(item.id)}
                />
                <span
                  style={{
                    textDecoration: item.done ? "line-through" : "none",
                    color: item.done ? "#6b7280" : "#111827",
                  }}
                >
                  {item.label}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Skip tour
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onDone}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Done — start editing
            </button>
          ) : (
            <button
              type="button"
              onClick={onNext}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                background: "#111827",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Default launch checklist items for the integrator (Preview → Edit → Export → Import). */
export const DEFAULT_TOUR_CHECKLIST: TourChecklistItem[] = [
  { id: "preview", label: "Preview — check every page on desktop and mobile", done: false },
  { id: "edit", label: "Edit — fix titles, text and images", done: false },
  { id: "export", label: "Export — download the Shopify theme zip", done: false },
  { id: "import", label: "Import — upload the zip in Shopify (Online Store → Themes)", done: false },
];
