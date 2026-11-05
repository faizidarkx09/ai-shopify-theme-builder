// components/editor/SectionLibrary.tsx — Curated section library panel
// (Cut B #11). Grid of the 12 library blocks from lib/sectionLibrary.ts.
// Insert appends the built section; Swap replaces the selected section
// (disabled when nothing is selected). No direct store writes —
// everything goes through props; the integrator wires onInsert/onSwap
// to onSectionsChange in the editor (append / replace by id).
"use client";

import type { CsvProduct, Section, SectionType, Theme } from "@/lib/types";
import { SECTION_LIBRARY } from "@/lib/sectionLibrary";

export interface SectionLibraryProps {
  theme: Theme;
  products?: CsvProduct[];
  /** Called with the built section to append it to the page. */
  onInsert: (section: Section) => void;
  /** Called with the built section to replace the selected section. */
  onSwap?: (section: Section) => void;
  /** Type of the currently selected section, if any — Swap needs one. */
  selectedSectionType?: SectionType;
}

export default function SectionLibrary({
  theme,
  products,
  onInsert,
  onSwap,
  selectedSectionType,
}: SectionLibraryProps) {
  const canSwap = Boolean(selectedSectionType) && typeof onSwap === "function";
  return (
    <section
      aria-label="Section library"
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: 16,
        background: "#ffffff",
      }}
    >
      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Section library</h3>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
        12 ready-made blocks, matched to your theme. Insert adds one to the
        page; Swap replaces the section you have selected.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {SECTION_LIBRARY.map((block) => (
          <article
            key={block.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <strong style={{ fontSize: 14 }}>{block.name}</strong>
            <p style={{ margin: 0, fontSize: 13, color: "#6b7280", flex: 1 }}>
              {block.description}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => onInsert(block.build(theme, products))}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                + Insert
              </button>
              <button
                type="button"
                disabled={!canSwap}
                title={
                  canSwap
                    ? `Replace the selected ${selectedSectionType} section with ${block.name}`
                    : "Pehle page me ek section select karo, phir Swap chalega"
                }
                onClick={() => onSwap?.(block.build(theme, products))}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #d1d5db",
                  background: canSwap ? "#fff" : "#f3f4f6",
                  color: canSwap ? "#111827" : "#9ca3af",
                  cursor: canSwap ? "pointer" : "not-allowed",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Swap
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
