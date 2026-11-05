// components/editor/CommentsPanel.tsx — Comment Mode panel, Cut C #25.
// Lists the comment pins dropped on the preview (EditorPreview renders
// the pins; this panel lists them). Pins and list share numbering: both
// number comments in the order of the `comments` array passed in, so
// pass the active page's comments (or all comments — the order you pass
// is the numbering both sides use).
//
// APPLY CONTRACT (for the integrator — this panel does NOT call /api/edit
// itself): each open comment becomes ONE scoped edit through the existing
// staged flow:
//   1. Find the section: comment.sectionId if set, else the section whose
//      pin is nearest the comment's (xPct, yPct) on that page — or, when
//      no section can be scoped, the page's first section.
//   2. POST /api/edit { instruction: comment.text, section } —
//      preview-only by design (Cut A #4): the route returns a PROPOSED
//      section and never applies anything.
//   3. Show the proposal in the PageEditor review box; the user clicks
//      Accept (applies + snapshots a version) or Discard.
//   4. Mark the comment done (onResolveComment) only after Accept.
// "Apply all comments" fires onApplyAll, which the integrator wires to
// steps 1–4 one comment at a time, in list order — never as one bulk
// call, so each edit stays scoped and reviewable.

"use client";

import { useState } from "react";
import type { ProjectComment } from "@/lib/types";

/** A comment before it has an id — what onAddComment receives. */
export interface NewCommentInput {
  pageId: string;
  sectionId?: string;
  xPct: number;
  yPct: number;
  text: string;
}

export interface CommentsPanelProps {
  /** Comments to list, in pin-number order (see header note). */
  comments: ProjectComment[];
  /** Add a comment (id/createdAt are assigned by the caller/store). */
  onAddComment: (comment: NewCommentInput) => void;
  /** Mark one comment done (status -> 'done'). */
  onResolveComment: (id: string) => void;
  /**
   * "Apply all comments" — wired by the integrator to the /api/edit
   * staged flow (see header note). Hidden when absent.
   */
  onApplyAll?: () => void;
  /**
   * Page the panel belongs to. When set, a small "Add a note" box is
   * shown (pins are the main way to add — this is the fallback).
   */
  pageId?: string;
}

export default function CommentsPanel({
  comments,
  onAddComment,
  onResolveComment,
  onApplyAll,
  pageId,
}: CommentsPanelProps) {
  const [note, setNote] = useState("");
  const open = comments.filter((c) => c.status === 'open');
  const doneCount = comments.length - open.length;

  function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!pageId) return;
    const text = note.trim();
    if (!text) return;
    // Panel notes have no pin position — centre of the preview.
    onAddComment({ pageId, xPct: 50, yPct: 50, text });
    setNote("");
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">
          💬 Comments ({open.length} open
          {doneCount > 0 ? ` · ${doneCount} done` : ''})
        </h3>
        {onApplyAll && open.length > 0 && (
          <button
            type="button"
            onClick={onApplyAll}
            className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Apply all comments
          </button>
        )}
      </div>

      {comments.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500">
          No comments yet. Turn on Comment mode above the preview, click
          anywhere on the page, and leave a note on that spot.
        </p>
      )}

      <ol className="mt-3 space-y-2">
        {comments.map((comment, i) => (
          <li
            key={comment.id}
            className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${
              comment.status === 'done'
                ? 'border-zinc-100 opacity-60 dark:border-zinc-900'
                : 'border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <span
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                comment.status === 'done' ? 'bg-zinc-400' : 'bg-indigo-600'
              }`}
            >
              {comment.status === 'done' ? '✓' : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm break-words">{comment.text}</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                {Math.round(comment.xPct)}%, {Math.round(comment.yPct)}%
                {comment.sectionId ? ` · section ${comment.sectionId}` : ''}
                {' · '}
                {new Date(comment.createdAt).toLocaleString()}
              </p>
            </div>
            {comment.status === 'open' && (
              <button
                type="button"
                onClick={() => onResolveComment(comment.id)}
                className="shrink-0 rounded-full border border-zinc-300 px-3 py-1 text-xs hover:border-green-600 hover:text-green-700 dark:border-zinc-700"
              >
                Resolve
              </button>
            )}
          </li>
        ))}
      </ol>

      {pageId && (
        <form onSubmit={addNote} className="mt-3 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note on this page…"
            className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}
