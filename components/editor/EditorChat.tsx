// components/editor/EditorChat.tsx — Wave 0 split of app/editor/[projectId]/page.tsx.
// Left chat column ONLY: prompt echo + message list + status/error/export
// messages + prompt form. No state lives here — the editor page owns all
// state and passes it down as props. Behaviour-identical.

import type { FormEvent, ReactNode, RefObject } from "react";
import Link from "next/link";
import type { ProjectMessage } from "@/lib/types";
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
  /** Theme tokens panel (Cut A #5) — rendered in the left column, below the chat. */
  themeTokens?: ReactNode;
  /** Cut B #10 — Brand Kit panel, rendered below the tokens panel. */
  brandKitPanel?: ReactNode;
  /** Cut B #14 — credit meter, rendered below the brand kit. */
  creditMeter?: ReactNode;
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
  themeTokens,
  brandKitPanel,
  creditMeter,
  onReferenceUrl,
}: EditorChatProps) {
  return (
    <aside className="flex w-full min-w-0 flex-col border-b border-zinc-200 md:w-96 md:border-r md:border-b-0 dark:border-zinc-800">
      <div className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto p-4">
        <p className="break-words text-xs text-zinc-500">
          Prompt: <span className="text-zinc-700 dark:text-zinc-300">{projectPrompt}</span>
        </p>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`break-words rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-8 bg-pink-50 text-pink-900 dark:bg-pink-950 dark:text-pink-100"
                : "mr-8 bg-zinc-100 dark:bg-zinc-900"
            }`}
          >
            {m.text}
          </div>
        ))}
        {generating && status && (
          <p className="animate-pulse text-sm text-pink-600">{status}</p>
        )}
        {exportMsg && (
          <p className="break-words rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {exportMsg}{" "}
            <Link href="/billing" className="font-semibold underline">
              Billing dekho
            </Link>
          </p>
        )}
        {themeTokens}
        {brandKitPanel}
        {creditMeter}
      </div>
      <form onSubmit={onSubmit} className="min-w-0 border-t border-zinc-200 p-3 dark:border-zinc-800">
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
            className="min-w-0 flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={generating}
            className="shrink-0 rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {generating ? "…" : "Send"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        {!generating && status && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-400">{status}</p>
        )}
      </form>
    </aside>
  );
}
