// components/editor/PageEditor.tsx — Agent 3 + Cut A #4 (staged AI edits)
// + Cut B #7/#8/#16 (regenerate, layout switcher, scoped chat, add-with-AI,
// action chips). Composition: live preview (sections) + hover toolbar
// anchored INSIDE each section + manual edit side panel + AI-chat edit.
// Wires into app/editor/[projectId]/page.tsx (Agent 1 shell) via props.
//
// Cut A #4 — staged AI edits, never silent overwrite:
//   - AiEditChat results arrive as a PROPOSAL (onSectionUpdated is
//     intercepted here, not applied). The proposed section renders in a
//     review box with Accept / Discard. /api/edit is preview-only, so
//     nothing is applied server-side either.
//   - Accept: pushVersion(project, 'AI edit: …') snapshots the CURRENT
//     pages FIRST, then the proposal is applied. Discard: the proposal is
//     dropped and the section is untouched.
//   - History dropdown lists Project.versions (label + timestamp); Restore
//     puts that snapshot's pages back (versions themselves are kept).
//   - "Draft — not exported yet" badge shows whenever the current sections
//     differ from the last exported/saved snapshot. The editor page clears
//     it after a successful export by bumping `clearDirtySignal`.
//
// Integrator wiring (EditorPreview -> PageEditor): pass `project` and
// `onProjectChange` (persist the returned project in the store), forward
// `onDirtyChange` if the shell wants it, and bump `clearDirtySignal`
// after doExport succeeds. Without `project`, Accept still works but no
// snapshot is taken (the notice says so) and History shows an empty state.
"use client";

import { useEffect, useRef, useState } from "react";
import type { Page, Project, Section, SectionType, Theme } from "@/lib/sections";
import { SECTION_LABELS, SECTION_TYPES, createSection } from "@/lib/sections";
import { describeRegeneration, regenerateSection } from "@/lib/ai/regenerate";
import { pushVersion, restoreVersion } from "@/lib/db/versions";
import SectionRenderer from "@/components/sections/SectionRenderer";
import SectionToolbar from "./SectionToolbar";
import EditPanel from "./EditPanel";
import CustomBlockModal from "./CustomBlockModal";
import AiEditChat, { type MentionTarget } from "./AiEditChat";
import { usePageEditor } from "./usePageEditor";

export interface PageEditorProps {
  projectId: string;
  page: Page;
  theme?: Theme | null;
  /** called on every sections change — editor shell / Agent 5 store can sync */
  onSectionsChange?: (sections: Section[]) => void;
  /** Full project — needed for version snapshots + History. */
  project?: Project | null;
  /** Called with the NEW project after a version is pushed or restored. */
  onProjectChange?: (project: Project) => void;
  /** Fired whenever the draft/dirty flag changes. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Bump (increment) after a successful export to clear the draft badge. */
  clearDirtySignal?: number;
  /**
   * Cut B #16: optional override for "Add section with AI". Receives the
   * user's prompt, returns a proposed Section (or null to do nothing).
   * When absent, PageEditor calls /api/edit itself on a draft section.
   */
  onAddSectionAi?: (prompt: string) => Promise<Section | null>;
  /** Cut C #22: called with the new theme when Animation Level changes. */
  onThemeChange?: (theme: Theme) => void;
  /**
   * Cut C #25 (integrator): a comment-apply proposal staged by the
   * editor page — one /api/edit call per comment, already fetched. When
   * set, it is shown in the same Accept/Discard review box as any AI
   * edit; Accept applies it (and fires onCommentProposalAccept so the
   * editor page resolves the comment), Discard drops it.
   */
  commentProposal?: {
    section: Section;
    changes: string[];
    commentId: string;
  } | null;
  /** Fired only after the user Accepts a comment proposal. */
  onCommentProposalAccept?: (commentId: string) => void;
  /** Fired when the user Discards a comment proposal. */
  onCommentProposalDiscard?: (commentId: string) => void;
}

interface PendingProposal {
  section: Section;
  changes: string[];
  before: Section;
  /** Cut B #16: true when the proposal is a NEW section to append. */
  isNew?: boolean;
}

/** Guess the section type a free-text "add a section about…" prompt wants. */
function detectSectionType(prompt: string): SectionType {
  const p = prompt.toLowerCase();
  if (p.includes("faq") || p.includes("question")) return "faq";
  if (p.includes("testimonial") || p.includes("review") || p.includes("customer say")) return "testimonials";
  if (p.includes("product") || p.includes("best seller") || p.includes("collection")) return "product";
  if (p.includes("feature") || p.includes("benefit") || p.includes("why shop")) return "features";
  if (p.includes("countdown") || p.includes("timer") || p.includes("sale ends")) return "countdown";
  if (p.includes("newsletter") || p.includes("email") || p.includes("subscribe")) return "newsletter";
  if (p.includes("banner") || p.includes("promo") || p.includes("discount") || p.includes("offer")) return "banner";
  if (p.includes("cta") || p.includes("call to action") || p.includes("get started") || p.includes("sign up")) return "cta";
  if (p.includes("category") || p.includes("shop by")) return "category";
  if (p.includes("trust") || p.includes("guarantee") || p.includes("secure")) return "trust-badges";
  if (p.includes("delivery") || p.includes("shipping")) return "delivery";
  if (p.includes("bundle")) return "bundle";
  return "hero";
}

export default function PageEditor({
  projectId,
  page,
  theme,
  onSectionsChange,
  project,
  onProjectChange,
  onDirtyChange,
  clearDirtySignal = 0,
  onAddSectionAi,
  onThemeChange,
  commentProposal,
  onCommentProposalAccept,
  onCommentProposalDiscard,
}: PageEditorProps) {
  const ed = usePageEditor(projectId, page);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<PendingProposal | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Cut C #21: custom block modal open state.
  const [customOpen, setCustomOpen] = useState(false);
  // Cut B #8: chat scope (toolbar "✦ Ask AI" / @-mention). Null = chat
  // follows the editor's current selection.
  const [scopedId, setScopedId] = useState<string | null>(null);
  // Cut B #16: "Add section with AI" prompt + busy state.
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  // Cut B #7: per-section regenerate counter — seeds cycle the variant.
  const regenCountRef = useRef<Record<string, number>>({});
  // Cut C #25: comment id of the proposal currently in the review box
  // (null for ordinary AI edits). Resolved only on Accept.
  const pendingCommentIdRef = useRef<string | null>(null);

  // Cut C #25 — an external comment proposal enters the same staged
  // review box as an AI edit. Runs only when a NEW proposal arrives
  // (same object reference = no re-stage, e.g. after a remount-free
  // re-render); the editor page clears the prop after Accept/Discard.
  useEffect(() => {
    if (!commentProposal) return;
    const before =
      ed.sections.find((s) => s.id === commentProposal.section.id) ??
      commentProposal.section;
    pendingCommentIdRef.current = commentProposal.commentId;
    setPending({
      section: commentProposal.section,
      changes: commentProposal.changes,
      before,
    });
    setNotice("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentProposal]);

  // JSON of the sections as of the last export (or mount) — the draft
  // badge compares live sections against this, not against the page prop.
  const lastCleanRef = useRef<string>(JSON.stringify(page.sections));

  // notify the shell/store after state actually updates (never stale)
  useEffect(() => {
    onSectionsChange?.(ed.sections);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.sections]);

  // Draft badge: dirty whenever live sections differ from last export.
  useEffect(() => {
    const isDirty = JSON.stringify(ed.sections) !== lastCleanRef.current;
    setDirty((prev) => {
      if (prev !== isDirty) onDirtyChange?.(isDirty);
      return isDirty;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ed.sections]);

  // Editor page bumps this after a successful export -> badge clears.
  useEffect(() => {
    if (clearDirtySignal <= 0) return;
    lastCleanRef.current = JSON.stringify(ed.sections);
    setDirty(false);
    onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearDirtySignal]);

  // ---- staged AI edit ----------------------------------------------------
  const handleAiProposed = (next: Section, changes: string[]) => {
    const before = ed.sections.find((s) => s.id === next.id) ?? next;
    setPending({ section: next, changes, before });
    setNotice("");
  };

  const acceptProposal = () => {
    if (!pending) return;
    const label = pending.isNew
      ? `AI add section: ${pending.section.type}`
      : `AI edit: ${pending.changes[0] ?? pending.section.type}`;
    if (project) {
      // Snapshot BEFORE applying — the version holds the pre-edit pages.
      onProjectChange?.(pushVersion(project, label));
    }
    // Cut C #25: a comment proposal resolves its comment ONLY on Accept.
    const commentId = pendingCommentIdRef.current;
    pendingCommentIdRef.current = null;
    if (pending.isNew) {
      // Append the new section (replaceAllSections keeps usePageEditor's
      // persistence + dirty tracking working — no hook changes needed).
      ed.replaceAllSections([...ed.sections, pending.section]);
      setNotice(
        project
          ? `New section added — snapshot saved as “${label}”.`
          : "New section added (no snapshot — project not wired to the editor).",
      );
      setPending(null);
      if (commentId) onCommentProposalAccept?.(commentId);
      return;
    }
    ed.replaceSection(pending.section);
    setNotice(
      project
        ? `AI edit applied — snapshot saved as “${label}”.`
        : "AI edit applied (no snapshot — project not wired to the editor).",
    );
    setPending(null);
    if (commentId) onCommentProposalAccept?.(commentId);
  };

  // ---- Cut B #7: per-section regenerate (staged, like any AI edit) ------
  const handleRegenerate = async (section: Section) => {
    const seed = (regenCountRef.current[section.id] ?? 0) + 1;
    regenCountRef.current[section.id] = seed;
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "regenerate",
          section,
          theme: theme ?? undefined,
          seed,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data: { section: Section; changes: string[] } = await res.json();
      handleAiProposed(data.section, data.changes);
    } catch {
      // Offline fallback — same template regeneration the API uses.
      const next = regenerateSection(section, theme ?? null, undefined, seed);
      handleAiProposed(next, describeRegeneration(section, next));
    }
  };

  // ---- Cut B #16: propose a NEW section, staged like any AI edit --------
  const proposeNewSection = (type: SectionType, instruction: string) => {
    const draft = createSection(type);
    const readyNote = `New ${SECTION_LABELS[type]} section ready to review`;
    // Tailor the draft through /api/edit (preview-only); the draft itself
    // is the fallback when the API is unreachable.
    fetch("/api/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction, section: draft }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: { section: Section; changes: string[] } = await res.json();
        const changes = (data.changes ?? []).filter(
          (c) => !c.startsWith("Samajh nahi aaya"),
        );
        setPending({
          section: data.section,
          changes: [...changes, readyNote],
          before: draft,
          isNew: true,
        });
      })
      .catch(() => {
        setPending({ section: draft, changes: [readyNote], before: draft, isNew: true });
      });
  };

  const addSectionWithAi = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || aiBusy) return;
    setAiBusy(true);
    try {
      if (onAddSectionAi) {
        const proposed = await onAddSectionAi(text);
        if (proposed) {
          setPending({
            section: proposed,
            changes: [`New ${SECTION_LABELS[proposed.type]} section ready to review`],
            before: proposed,
            isNew: true,
          });
        }
        return;
      }
      proposeNewSection(detectSectionType(text), text);
    } finally {
      setAiBusy(false);
    }
  };

  // ---- Cut B #16: hover-toolbar action chips (scoped, staged) ------------
  const rewriteHeadline = (s: Section) => {
    const regen = regenerateSection(s, theme ?? null);
    const next: Section = { ...s, title: regen.title, subtitle: regen.subtitle ?? s.subtitle };
    handleAiProposed(next, [`Headline rewritten: "${regen.title}"`]);
  };

  const makeBolder = (s: Section) => {
    const before = s.fontSize ?? 24;
    const next: Section = { ...s, fontSize: before + 6 };
    handleAiProposed(next, [`Headline made bolder — font size ${before}px → ${next.fontSize}px`]);
  };

  // ---- Cut B #8: scoped chat + @-mentions --------------------------------
  const scopedSection =
    scopedId != null ? (ed.sections.find((s) => s.id === scopedId) ?? null) : null;
  const mentionTargets: MentionTarget[] = [
    {
      id: `page-${page.id}`,
      kind: "page",
      label: page.title,
      section: ed.sections[0] ?? null,
    },
    ...ed.sections.map((s) => ({
      id: s.id,
      kind: "section" as const,
      label: s.title || SECTION_LABELS[s.type],
      section: s,
    })),
  ];
  const handleMentionSelect = (t: MentionTarget) => {
    if (!t.section) return;
    setScopedId(t.section.id);
    ed.select(t.section.id, "section");
  };

  const discardProposal = () => {
    if (!pending) return;
    // Cut C #25: discarding a comment proposal does NOT resolve it.
    const commentId = pendingCommentIdRef.current;
    pendingCommentIdRef.current = null;
    setPending(null);
    setNotice("AI edit discarded — section unchanged.");
    if (commentId) onCommentProposalDiscard?.(commentId);
  };

  // ---- version history -----------------------------------------------------
  const restore = (versionId: string) => {
    if (!project) return;
    const restored = restoreVersion(project, versionId);
    if (!restored) {
      setNotice("Version nahi mili — restore nahi ho saka.");
      return;
    }
    // Persist the restored project FIRST (keeps the versions array), then
    // swap the live sections — the sections-change sync that follows
    // merges the same pages back, so versions are not overwritten.
    onProjectChange?.(restored);
    const restoredPage = restored.pages.find((p) => p.id === page.id);
    if (restoredPage) ed.replaceAllSections(restoredPage.sections);
    setHistoryOpen(false);
    setNotice("Purani version restore kar di.");
  };

  const versions = project?.versions ?? [];

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* ---- preview column ---- */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">{page.title}</h2>
          <span className="text-xs text-gray-500">/{page.slug}</span>
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Draft — not exported yet
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
              Up to date
            </span>
          )}
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

          {/* ---- History dropdown ---- */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-violet-400 hover:text-violet-700"
              aria-haspopup="true"
              aria-expanded={historyOpen}
            >
              🕘 History ({versions.length})
            </button>
            {historyOpen ? (
              <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-semibold text-gray-500">
                  Version history — latest first, max 10 kept
                </p>
                {versions.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-gray-500">
                    No versions yet. Accepting an AI edit saves a snapshot
                    here automatically.
                  </p>
                ) : (
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
                    {[...versions].reverse().map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-800">
                            {v.label}
                          </span>
                          <span className="block text-[11px] text-gray-400">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => restore(v.id)}
                          className="shrink-0 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700"
                        >
                          Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {notice ? (
          <div className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
            {notice}
          </div>
        ) : null}

        {/* ---- staged AI edit: proposed preview ---- */}
        {pending ? (
          <div
            className="mb-3 rounded-xl border-2 border-violet-400 bg-violet-50 p-3"
            role="group"
            aria-label="Proposed AI edit"
          >
            <p className="text-sm font-bold text-violet-900">
              AI edit proposed — review before it applies
            </p>
            <ul className="mt-1 list-disc pl-5 text-sm text-violet-900">
              {pending.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            {pending.before.title !== pending.section.title ? (
              <p className="mt-1 text-sm text-gray-700">
                Title: “{pending.before.title || "(empty)"}” → “
                {pending.section.title || "(empty)"}”
              </p>
            ) : null}
            <div className="mt-2 overflow-hidden rounded-lg border border-violet-200 bg-white">
              <SectionRenderer
                section={pending.section}
                theme={theme}
                editMode={false}
                selectedElement={null}
                onSelectElement={() => undefined}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={acceptProposal}
                className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                ✓ Accept — snapshot &amp; apply
              </button>
              <button
                type="button"
                onClick={discardProposal}
                className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Discard — keep current section
              </button>
            </div>
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
                    onRegenerate={handleRegenerate}
                    onLayoutChange={(sec, layout) => ed.patchSection(sec.id, { layout })}
                    onAskAi={(sec) => {
                      setScopedId(sec.id);
                      ed.select(sec.id, "section");
                      setNotice(`AI chat scoped to "${sec.title || sec.type}" — neeche chat me sawal likho.`);
                    }}
                  />
                ) : null}
                <SectionRenderer
                  section={s}
                  theme={theme}
                  editMode={ed.editMode}
                  selectedElement={active ? ed.selectedElement : null}
                  onSelectElement={(el) => ed.select(s.id, el)}
                />
                {/* Cut B #16 — quick AI chips on the selected section. */}
                {active ? (
                  <div
                    className="flex flex-wrap items-center gap-1.5 border-t border-violet-100 bg-violet-50/70 px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="self-center text-[11px] font-semibold text-violet-700">
                      Quick AI:
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        proposeNewSection("faq", "Write FAQ content for this store — delivery, returns and checkout questions.")
                      }
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:text-violet-700"
                    >
                      + Add FAQ
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        proposeNewSection("testimonials", "Write customer testimonial content for this store.")
                      }
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:text-violet-700"
                    >
                      + Add testimonials
                    </button>
                    <button
                      type="button"
                      onClick={() => rewriteHeadline(s)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:text-violet-700"
                    >
                      ✦ Rewrite headline
                    </button>
                    <button
                      type="button"
                      onClick={() => makeBolder(s)}
                      className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:text-violet-700"
                    >
                      ▲ Make bolder
                    </button>
                    {/* Cut C #28 — "Make global": edit once, updates everywhere. */}
                    <button
                      type="button"
                      onClick={() => {
                        if (s.global) {
                          ed.patchSection(s.id, { global: false, globalKey: undefined });
                          setNotice(`"${s.title || s.type}" is no longer global.`);
                        } else {
                          ed.patchSection(s.id, {
                            global: true,
                            globalKey: `global-${s.type}-${Date.now().toString(36)}`,
                          });
                          setNotice(
                            `"${s.title || s.type}" is now global — it is shared across pages and exported once.`,
                          );
                        }
                      }}
                      aria-pressed={!!s.global}
                      title={
                        s.global
                          ? `Global section (${s.globalKey ?? "no key yet"}) — click to unmark`
                          : "Mark this section global: shared across pages, exported once"
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
                        s.global
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "bg-white text-gray-700 hover:text-emerald-700"
                      }`}
                    >
                      {s.global ? "🌐 Global ✓" : "🌐 Make global"}
                    </button>
                  </div>
                ) : null}
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

        {/* Cut B #16 — "Add section with AI" (staged like any AI edit). */}
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50/50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="block text-xs font-semibold text-gray-700">
              Add section with AI
            </span>
            {/* Cut C #21 — Custom block (quiz / calculator / countdown / timeline). */}
            <button
              type="button"
              onClick={() => setCustomOpen(true)}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-100"
            >
              🧩 Custom block
            </button>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addSectionWithAi(aiPrompt);
              setAiPrompt("");
            }}
          >
            <input
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={aiBusy}
              placeholder="Add a section about…"
              aria-label="Add a section with AI"
              className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!aiPrompt.trim() || aiBusy}
              className="shrink-0 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              ✦ Generate section
            </button>
          </form>
          <p className="mt-1.5 text-[11px] text-gray-500">
            Misal: “Add a FAQ section about delivery” — naya section review ke
            baad add hoga (Accept/Discard).
          </p>
          {aiBusy ? <p className="mt-1 text-xs text-gray-500">AI section bana raha hai…</p> : null}
        </div>

        {/* Cut C #21 — custom block modal; insert goes through the staged
            Accept/Discard flow like every other AI-proposed section. */}
        {customOpen ? (
          <CustomBlockModal
            theme={theme ?? { name: "Default", colors: { primary: "#7c3aed", secondary: "#111827", background: "#ffffff", text: "#111827", accent: "#ec4899" }, font: "Inter", style: "modern" }}
            onClose={() => setCustomOpen(false)}
            onInsert={(section) => {
              setCustomOpen(false);
              setPending({
                section,
                changes: [`New ${section.title} ready to review`],
                before: section,
                isNew: true,
              });
            }}
          />
        ) : null}
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
          theme={theme}
          onThemeChange={onThemeChange}
        />
        <AiEditChat
          section={ed.selectedSection}
          scopedSection={scopedSection}
          onClearScope={() => setScopedId(null)}
          mentionTargets={mentionTargets}
          onMentionSelect={handleMentionSelect}
          onSectionUpdated={(next, changes) => {
            // Staged, not applied: AiEditChat only PROPOSES (see above).
            handleAiProposed(next, changes);
          }}
        />
      </aside>
    </div>
  );
}
