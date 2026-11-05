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
    title: "Your store is ready — 4 steps me",
    body: "Upar wizard dekho: 1 Prompt, 2 Plan, 3 Pages, 4 Export. Ye quick tour teen cheezein dikhata hai: section edit karna, AI se poochhna, aur theme export karna. Kisi bhi step par wapas jaane ke liye uspar click karo.",
  },
  {
    title: "1 · Hover a section to edit it",
    body: "Step 3 (Pages) me preview par kisi section par mouse le jao — uske andar hi ek chhota toolbar khulta hai. Move, duplicate, delete, ya edit panel kholo. AI edits hamesha pehle poochhte hain, chupke se kuch overwrite nahi hota.",
  },
  {
    title: "2 · Ask the AI to change one section",
    body: "Step 3 me ek section chuno, phir AI chat me likho kya badalna hai — jaise “hero title Summer Sale rakho”. Proposal review karo, phir Accept ya Discard. Har accepted edit ki version save ho jati hai.",
  },
  {
    title: "3 · Export your Shopify theme",
    body: "Jab preview theek lage, Step 4 (Export) par jao aur Export Shopify Theme dabao. Theme zip milega — Shopify me Online Store → Themes → Add theme → Upload zip se upload karo. Export check pehle placeholders ke baare me warn karta hai.",
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
                background: i <= step ? "#4F46E5" : "#e5e7eb",
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
                background: "#4F46E5",
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
                background: "#4F46E5",
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
