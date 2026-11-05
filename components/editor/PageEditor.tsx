// components/editor/PageEditor.tsx — Agent 3
// Composition: live preview (sections) + hover toolbar anchored INSIDE each
// section + manual edit side panel + AI-chat edit.
// Wires into app/editor/[projectId]/page.tsx (Agent 1 shell) via props.
"use client";

import { useEffect, useState } from "react";
import type { Page, Section, Theme } from "@/lib/sections";
import { SECTION_LABELS, SECTION_TYPES } from "@/lib/sections";
import SectionRenderer from "@/components/sections/SectionRenderer";
import SectionToolbar from "./SectionToolbar";
import EditPanel from "./EditPanel";
import AiEditChat from "./AiEditChat";
import { usePageEditor } from "./usePageEditor";

export interface PageEditorProps {
  projectId: string;
  page: Page;
  theme?: Theme | null;
  /** called on every sections change — editor shell / Agent 5 store can sync */
  onSectionsChange?: (sections: Section[]) => void;
}

export default function PageEditor({ projectId, page, theme, onSectionsChange }: PageEditorProps) {
  const ed = usePageEditor(projectId, page);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // notify the shell/store after state actually updates (never stale)
  useEffect(() => {
    onSectionsChange?.(ed.sections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.sections]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* ---- preview column ---- */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{page.title}</h2>
          <span className="text-xs text-gray-500">/{page.slug}</span>
          <label className="ml-auto flex items-center gap-1.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={ed.editMode}
              onChange={(e) => ed.setEditMode(e.target.checked)}
            />
            Edit mode
          </label>
          <span className="text-xs text-gray-400">
            {ed.sections.length} sections · edits auto-save (localStorage)
          </span>
        </div>

        {notice ? (
          <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
            {notice}
          </div>
        ) : null}

        <div data-page-preview className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {ed.sections.map((s) => {
            const active = ed.selectedId === s.id;
            const showToolbar = ed.editMode && (hoverId === s.id || active);
            return (
              <div
                key={s.id}
                className={`group relative ${active ? "ring-2 ring-inset ring-violet-500" : ""}`}
                onMouseEnter={() => setHoverId(s.id)}
                onMouseLeave={() => setHoverId((cur) => (cur === s.id ? null : cur))}
                onClick={() => ed.select(s.id, "section")}
              >
                {showToolbar ? (
                  <SectionToolbar
                    section={s}
                    onPatch={(patch) => {
                      ed.patchSection(s.id, patch);
                    }}
                    onDuplicate={() => ed.duplicate(s.id)}
                    onMove={(dir) => ed.move(s.id, dir)}
                    onDelete={() => {
                      ed.remove(s.id);
                      setNotice(`Section "${s.type}" delete kar diya.`);
                    }}
                    onEditInPanel={() => ed.select(s.id, "title")}
                  />
                ) : null}
                <SectionRenderer
                  section={s}
                  theme={theme}
                  editMode={ed.editMode}
                  selectedElement={active ? ed.selectedElement : null}
                  onSelectElement={(el) => ed.select(s.id, el)}
                />
              </div>
            );
          })}
          {ed.sections.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              Koi section nahi hai — neeche se ek section add karo.
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-xs font-semibold text-gray-600">Add section</span>
          <div className="flex flex-wrap gap-2">
            {SECTION_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => ed.add(t)}
                className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-violet-400 hover:text-violet-700"
              >
                + {SECTION_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- side column: manual panel + AI chat ---- */}
      <aside className="w-full shrink-0 space-y-4 lg:w-80">
        <EditPanel
          section={ed.selectedSection}
          selectedElement={ed.selectedElement}
          onElementChange={(el) => ed.select(ed.selectedId, el)}
          onPatch={(patch) => {
            if (!ed.selectedId) return;
            ed.patchSection(ed.selectedId, patch);
          }}
          onClose={() => ed.select(null)}
        />
        <AiEditChat
          section={ed.selectedSection}
          onSectionUpdated={(next, changes) => {
            ed.replaceSection(next);
            setNotice(changes.join(" · "));
          }}
        />
      </aside>
    </div>
  );
}
