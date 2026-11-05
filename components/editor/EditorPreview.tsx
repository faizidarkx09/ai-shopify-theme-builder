// components/editor/EditorPreview.tsx — Wave 0 split of app/editor/[projectId]/page.tsx.
// Right preview pane ONLY: preview container + streaming SectionView list vs
// PageEditor switch. SectionView lives here (moved from the editor page,
// not duplicated). No state lives here — the editor page owns all state and
// passes it down as props. Behaviour-identical.

import { useState } from "react";
import PageEditor from "@/components/editor/PageEditor";
import { placeholderImage, type Page, type Project, type ProjectComment, type Section, type Theme } from "@/lib/types";
import type { NewCommentInput } from "./CommentsPanel";
import type { ViewMode } from "./EditorTopBar";

export interface EditorPreviewProps {
  view: ViewMode;
  theme: Theme;
  generating: boolean;
  status: string;
  streamingSections: Section[];
  activePage: Page | null;
  projectId: string;
  selectedSectionId: string | null;
  onSelectSection: (sectionId: string) => void;
  onSectionsChange: (sections: Section[]) => void;
  /** Full project — PageEditor needs it for version snapshots + History (Cut A #4). */
  project?: Project | null;
  /** Persist the project PageEditor returns after a version push/restore. */
  onProjectChange?: (project: Project) => void;
  /** Draft/dirty flag from PageEditor. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Bump after a successful export to clear the "Draft — not exported yet" badge. */
  clearDirtySignal?: number;
  /** Cut B #16: forwarded to PageEditor's "Add section with AI". */
  onAddSectionAi?: (prompt: string) => Promise<Section | null>;
  /**
   * Cut B lag fix: bumped whenever the store's sections change outside
   * PageEditor (audit fix, library insert/swap, media apply). PageEditor
   * holds local section state, so it is remounted to show the new
   * sections immediately instead of after a page switch.
   */
  remountKey?: number;
  /**
   * Cut C #25 — Comment Mode. When on, an overlay covers the preview:
   * clicking drops a numbered pin at the click position (xPct/yPct
   * relative to the preview frame) and opens a note input; pins render
   * as numbered dots (same numbering as CommentsPanel — both number the
   * `comments` array in the order passed). `commentMode` is controlled
   * when both it and onCommentModeChange are given; otherwise the
   * toggle keeps its own state. Without onAddComment the overlay is
   * display-only (pins visible, clicks pass through to sections).
   * Applying a comment is the integrator's job — see the apply contract
   * in CommentsPanel.tsx (comment -> /api/edit scoped edit).
   */
  commentMode?: boolean;
  onCommentModeChange?: (on: boolean) => void;
  comments?: ProjectComment[];
  onAddComment?: (comment: NewCommentInput) => void;
  selectedCommentId?: string | null;
  onSelectComment?: (id: string) => void;
  /** Cut C #22 (integrator): forwarded to PageEditor so the Animation
   *  Level select in EditPanel persists via the editor page. */
  onThemeChange?: (theme: Theme) => void;
  /**
   * Cut C #25 (integrator): a comment-apply proposal staged by the
   * editor page (one /api/edit call per comment). Forwarded to
   * PageEditor, which shows it in its Accept/Discard review box; the
   * callbacks fire only on Accept / Discard.
   */
  commentProposal?: {
    section: Section;
    changes: string[];
    commentId: string;
  } | null;
  onCommentProposalAccept?: (commentId: string) => void;
  onCommentProposalDiscard?: (commentId: string) => void;
}

function SectionView({
  section,
  theme,
  selected,
  onSelect,
}: {
  section: Section;
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
}) {
  const align =
    section.align === "center"
      ? "text-center"
      : section.align === "right"
        ? "text-right"
        : "text-left";
  return (
    <section
      onClick={onSelect}
      className={`cursor-pointer ${align} ${
        selected ? "ring-2 ring-pink-500 ring-inset" : ""
      }`}
      style={{
        backgroundColor: section.bgColor ?? theme.colors.background,
        color: section.textColor ?? theme.colors.text,
        padding: `${section.padding ?? 48}px 24px`,
      }}
    >
      <p className="text-xs font-semibold tracking-wide uppercase opacity-60">
        {section.type}
      </p>
      {section.subtitle && (
        <p className="mt-1 text-sm opacity-70">{section.subtitle}</p>
      )}
      <h3 className="mt-1 text-2xl font-bold">{section.title}</h3>
      {section.text && <p className="mt-2 text-sm opacity-80">{section.text}</p>}
      {section.image && (
        <img
          src={section.image}
          alt={section.title}
          className="mx-auto mt-4 max-h-64 w-full rounded-xl object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.includes("picsum.photos")) {
              img.src = placeholderImage(`${section.type}-${section.id}`);
            }
          }}
        />
      )}
    </section>
  );
}

export default function EditorPreview({
  view,
  theme,
  generating,
  status,
  streamingSections,
  activePage,
  projectId,
  selectedSectionId,
  onSelectSection,
  onSectionsChange,
  project,
  onProjectChange,
  onDirtyChange,
  clearDirtySignal = 0,
  onAddSectionAi,
  remountKey = 0,
  commentMode,
  onCommentModeChange,
  comments = [],
  onAddComment,
  selectedCommentId,
  onSelectComment,
  onThemeChange,
  commentProposal,
  onCommentProposalAccept,
  onCommentProposalDiscard,
}: EditorPreviewProps) {
  const previewSections =
    streamingSections.length > 0
      ? streamingSections
      : (activePage?.sections ?? []);

  // Cut C #25 — Comment Mode state (internal fallback when uncontrolled).
  const [internalMode, setInternalMode] = useState(false);
  const modeOn = commentMode ?? internalMode;
  const [pendingPin, setPendingPin] = useState<{ xPct: number; yPct: number } | null>(null);
  const [pinNote, setPinNote] = useState("");
  const pageComments = activePage
    ? comments.filter((c) => c.pageId === activePage.id)
    : [];

  function toggleCommentMode() {
    const next = !modeOn;
    if (onCommentModeChange) onCommentModeChange(next);
    else setInternalMode(next);
    if (!next) {
      setPendingPin(null);
      setPinNote("");
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onAddComment || !activePage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    setPendingPin({
      xPct: ((e.clientX - rect.left) / rect.width) * 100,
      yPct: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!onAddComment || !activePage || !pendingPin) return;
    const text = pinNote.trim();
    if (!text) return;
    onAddComment({
      pageId: activePage.id,
      xPct: pendingPin.xPct,
      yPct: pendingPin.yPct,
      text,
    });
    setPendingPin(null);
    setPinNote("");
  }

  return (
    <section className="min-h-0 flex-1 overflow-y-auto bg-zinc-100 p-4 dark:bg-zinc-900">
      {/* Cut C #25 — preview header with the Comment Mode toggle. */}
      <div className="mx-auto mb-2 flex w-full max-w-4xl items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
          Preview
        </span>
        <button
          type="button"
          onClick={toggleCommentMode}
          aria-pressed={modeOn}
          title="Comment mode: click the preview to drop a pin + note"
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            modeOn
              ? "bg-pink-600 text-white hover:bg-pink-700"
              : "border border-zinc-300 text-zinc-600 hover:border-pink-500 hover:text-pink-600 dark:border-zinc-700 dark:text-zinc-400"
          }`}
        >
          💬 Comment{modeOn ? " on" : ""}
        </button>
      </div>

      {/* Note input for a freshly dropped pin. */}
      {modeOn && pendingPin && activePage && (
        <form
          onSubmit={submitPin}
          className="mx-auto mb-2 flex w-full max-w-4xl gap-2"
        >
          <input
            value={pinNote}
            onChange={(e) => setPinNote(e.target.value)}
            placeholder={`Note at ${Math.round(pendingPin.xPct)}%, ${Math.round(pendingPin.yPct)}%…`}
            autoFocus
            className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
          >
            Add note
          </button>
          <button
            type="button"
            onClick={() => {
              setPendingPin(null);
              setPinNote("");
            }}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
          >
            Cancel
          </button>
        </form>
      )}

      <div
        className={`relative mx-auto bg-white shadow-sm transition-all dark:bg-zinc-950 ${
          // Cut B #15: desktop 100%/max-w-4xl, tablet max-w-768px, mobile 390px.
          view === "mobile"
            ? "max-w-[390px] rounded-3xl border-8 border-zinc-800"
            : view === "tablet"
              ? "max-w-[768px] rounded-2xl border-4 border-zinc-700"
              : "w-full max-w-4xl"
        }`}
        style={{
          backgroundColor: theme.colors.background,
          fontFamily: theme.font,
        }}
      >
        {generating || streamingSections.length > 0 ? (
          previewSections.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              <p className="text-lg font-semibold">Page ban raha hai…</p>
              <p className="mt-1 text-sm">{status}</p>
            </div>
          ) : (
            previewSections.map((s) => (
              <SectionView
                key={s.id}
                section={s}
                theme={theme}
                selected={s.id === selectedSectionId}
                onSelect={() => onSelectSection(s.id)}
              />
            ))
          )
        ) : activePage ? (
          <PageEditor
            key={`${activePage.id}:${remountKey}`}
            projectId={projectId}
            page={activePage}
            theme={theme}
            onSectionsChange={onSectionsChange}
            project={project}
            onProjectChange={onProjectChange}
            onDirtyChange={onDirtyChange}
            clearDirtySignal={clearDirtySignal}
            onAddSectionAi={onAddSectionAi}
            onThemeChange={onThemeChange}
            commentProposal={commentProposal}
            onCommentProposalAccept={onCommentProposalAccept}
            onCommentProposalDiscard={onCommentProposalDiscard}
          />
        ) : (
          <div className="p-12 text-center text-zinc-500">
            <p className="text-lg font-semibold">Abhi koi page nahi hai</p>
            <p className="mt-1 text-sm">
              Left chat me prompt likh kar pehla page generate karo — AI
              pehle theme, phir page-by-page preview banayega.
            </p>
          </div>
        )}
        {/* Cut C #25 — comment pins overlay. Clicks drop a pin only when
            onAddComment is wired; otherwise pins are display-only and
            clicks pass through to the sections below. */}
        {modeOn && activePage && (
          <div
            className={`absolute inset-0 z-20 ${
              onAddComment ? "cursor-crosshair" : "pointer-events-none"
            }`}
            onClick={handleOverlayClick}
            role={onAddComment ? "button" : undefined}
            aria-label={onAddComment ? "Click to add a comment pin" : undefined}
          >
            {pageComments.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectComment?.(c.id);
                }}
                title={c.text}
                style={{ left: `${c.xPct}%`, top: `${c.yPct}%` }}
                className={`pointer-events-auto absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
                  c.status === "done"
                    ? "bg-zinc-400"
                    : selectedCommentId === c.id
                      ? "bg-pink-700 ring-2 ring-white"
                      : "bg-pink-600"
                }`}
              >
                {c.status === "done" ? "✓" : i + 1}
              </button>
            ))}
            {pendingPin && (
              <span
                className="pointer-events-none absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-pink-700 text-xs font-bold text-white shadow ring-2 ring-white"
                style={{ left: `${pendingPin.xPct}%`, top: `${pendingPin.yPct}%` }}
              >
                ?
              </span>
            )}
          </div>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-zinc-500">
        Preview me placeholder images hain (picsum). Exported theme me bhi
        placeholder content hota hai.
      </p>
    </section>
  );
}
