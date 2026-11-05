// components/editor/usePageEditor.ts — Agent 3
// Editor state: sections list + selection + persistence.
// React state is the source of truth; edits mirror to localStorage
// (lib/db from Agent 5 will replace the storage layer later).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ElementKey, Page, Section, SectionType } from "@/lib/sections";
import {
  createSection,
  deleteSection,
  duplicateSection,
  loadSections,
  moveSection,
  saveSections,
  updateSection,
} from "@/lib/sections";

export interface UsePageEditor {
  sections: Section[];
  selectedId: string | null;
  selectedSection: Section | null;
  selectedElement: ElementKey;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  select: (id: string | null, el?: ElementKey) => void;
  patchSection: (id: string, patch: Partial<Section>) => void;
  replaceSection: (next: Section) => void;
  duplicate: (id: string) => void;
  move: (id: string, dir: -1 | 1) => void;
  remove: (id: string) => void;
  add: (type: SectionType) => void;
}

export function usePageEditor(projectId: string, page: Page): UsePageEditor {
  const [sections, setSections] = useState<Section[]>(() => page.sections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<ElementKey>("section");
  const [editMode, setEditMode] = useState(true);
  const hydrated = useRef(false);

  // hydrate from localStorage once (client only)
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const saved = loadSections(projectId, page.id);
    if (saved && saved.length > 0) setSections(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, page.id]);

  // persist every change
  useEffect(() => {
    if (!hydrated.current) return;
    saveSections(projectId, page.id, sections);
  }, [sections, projectId, page.id]);

  const select = useCallback((id: string | null, el: ElementKey = "section") => {
    setSelectedId(id);
    setSelectedElement(el);
  }, []);

  const patchSection = useCallback((id: string, patch: Partial<Section>) => {
    setSections((prev) => updateSection(prev, id, patch));
  }, []);

  const replaceSection = useCallback((next: Section) => {
    setSections((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }, []);

  const duplicate = useCallback((id: string) => {
    setSections((prev) => duplicateSection(prev, id));
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setSections((prev) => moveSection(prev, id, dir));
  }, []);

  const remove = useCallback((id: string) => {
    setSections((prev) => deleteSection(prev, id));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  const add = useCallback((type: SectionType) => {
    const created = createSection(type);
    setSections((prev) => [...prev, created]);
    setSelectedId(created.id);
    setSelectedElement("section");
  }, []);

  const selectedSection = sections.find((s) => s.id === selectedId) ?? null;

  return {
    sections,
    selectedId,
    selectedSection,
    selectedElement,
    editMode,
    setEditMode,
    select,
    patchSection,
    replaceSection,
    duplicate,
    move,
    remove,
    add,
  };
}
