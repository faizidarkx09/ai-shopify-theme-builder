// components/editor/EditorChat.tsx — Wave 2 rewrite (beginner-first).
// Left chat column ONLY: prompt echo + message list + status/error/export
// messages + prompt form (+ starters above the input). No state lives
// here — the editor page owns all state and passes it down as props.
//
// Wave 2 moves the old advanced slots OUT of this column — Theme Tokens,
// Brand Kit and Credit Meter now live in the Advanced drawer only, so a
// beginner never sees them here. Two layouts: "sidebar" (Step 3, next to
// the preview) and "step" (Step 1, centred prompt step with a
// plain-language EmptyState telling the beginner what to do next).
// Light chrome only (Wave 0): white/slate + ONE indigo accent.
"use client";

import type { FormEvent, RefObject } from "react";
import Link from "next/link";
import type { ProjectMessage } from "@/lib/types";
import { EmptyState } from "@/components/ui";
import PromptStarters, { buildPromptFromFields } from "./PromptStarters";

export interface EditorChatProps {
  projectPrompt: string;
  messages: ProjectMessage[];
  generating: boolean;
  status: string;
  error: string;
  exportMsg: string;
  prompt: string;
  onPromptChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  /** "sidebar" = Step 3 next to the preview; "step" = Step 1 centred. */
  variant?: "sidebar" | "step";
  /** Submit button label — "Generate" on Step 1, "Send" while editing. */
  submitLabel?: string;
  /** Step 1 only: show the plain-language "what do I do next" empty state. */
  showIntro?: boolean;
  /** Cut B #9 — a reference URL was entered in PromptStarters. */
  onReferenceUrl?: (url: string) => void;
}

export default function EditorChat({
  projectPrompt,
  messages,
  generating,
  status,
  error,
  exportMsg,
  prompt,
  onPromptChange,
  onSubmit,
  inputRef,
  variant = "sidebar",
  submitLabel = "Send",
  showIntro = false,
  onReferenceUrl,
}: EditorChatProps) {
  return (
    <aside
      className={
        variant === "step"
          ? "flex w-full min-w-0 flex-col"
          : "flex w-full min-w-0 flex-col border-b border-border md:w-96 md:border-r md:border-b-0"
      }
    >
      <div className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto p-4">
        {showIntro ? (
          <EmptyState
            title="Apna store ek jumle me likho"
            message="Apna store ek jumle me likho, phir Generate dabao — AI pehle plan banayega, phir theme aur pages."
          />
        ) : null}
        <p className="break-words text-xs text-muted">
          Prompt: <span className="text-body">{projectPrompt}</span>
        </p>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`break-words rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-8 bg-accent-soft text-accent-text"
                : "mr-8 bg-panel"
            }`}
          >
            {m.text}
          </div>
        ))}
        {generating && status && (
          <p className="animate-pulse text-sm text-accent">{status}</p>
        )}
        {exportMsg && (
          <p className="break-words rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {exportMsg}{" "}
            <Link href="/billing" className="font-semibold underline">
              Billing dekho
            </Link>
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} className="min-w-0 border-t border-border p-3">
        {/* Cut A #2 — prompt starters sit directly above the prompt input. */}
        <div className="mb-3 max-h-72 min-w-0 overflow-x-hidden overflow-y-auto">
          <PromptStarters
            onPick={(picked) => onPromptChange(picked)}
            onPickStructured={(fields) =>
              onPromptChange(buildPromptFromFields(fields))
            }
            onReferenceUrl={onReferenceUrl}
          />
        </div>
        <div className="flex min-w-0 gap-2">
          <input
            ref={inputRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder="Naya page ya edit likho… jaise “grocery store landing page”"
            className="min-w-0 flex-1 rounded-full border border-border px-4 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={generating}
            className="shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? "…" : submitLabel}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {!generating && status && (
          <p className="mt-2 text-xs text-green-700">{status}</p>
        )}
      </form>
    </aside>
  );
}
