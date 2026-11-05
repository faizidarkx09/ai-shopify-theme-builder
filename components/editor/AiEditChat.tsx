// components/editor/AiEditChat.tsx — Agent 3 + Cut B #8 (section scoping).
// AI-chat edit: user types an instruction, ONLY the selected section is
// updated (the API never regenerates the whole page). If /api/edit is
// unreachable, falls back to the local rule-based edit in lib/sections.
//
// Cut B #8 — section scoping:
//   - `scopedSection` (set by the toolbar "✦ Ask AI" button or an
//     @-mention) overrides `section` as the edit target; the header shows
//     "Editing: <title> — ask…" with a × to clear the scope.
//   - Typing "@" in the input shows a dropdown of page + section titles
//     (from `mentionTargets`); picking one calls `onMentionSelect` and the
//     parent scopes the chat to that section.
// The staged Accept/Discard flow (Cut A #4) is NOT re-implemented here:
// this component only PROPOSES via onSectionUpdated; PageEditor shows the
// review box and applies on Accept.
"use client";

import { useMemo, useState } from "react";
import type { Section } from "@/lib/sections";
import { applyAiEdit } from "@/lib/sections";

/** One @-mentionable target: the current page or one of its sections. */
export interface MentionTarget {
  id: string;
  kind: "page" | "section";
  /** Display title, e.g. page title or section title. */
  label: string;
  /** The section to scope the chat to (page targets map to a section). */
  section: Section | null;
}

export interface AiEditChatProps {
  section: Section | null;
  onSectionUpdated: (section: Section, changes: string[]) => void;
  /** Cut B #8: section the chat is explicitly scoped to (toolbar / @-mention). */
  scopedSection?: Section | null;
  /** Clear the scope — back to following the editor selection. */
  onClearScope?: () => void;
  /** @-mention targets: current page + its sections (built by PageEditor). */
  mentionTargets?: MentionTarget[];
  /** Fired when the user picks an @-mention target. */
  onMentionSelect?: (target: MentionTarget) => void;
}

interface Msg {
  role: "user" | "ai";
  text: string;
}

const EXAMPLES = [
  "hero title Summer Sale rakho",
  "header ko floating rounded banao",
  "background dark kar do",
  "font size barha do",
];

export default function AiEditChat({
  section,
  onSectionUpdated,
  scopedSection,
  onClearScope,
  mentionTargets = [],
  onMentionSelect,
}: AiEditChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("");

  // Scoped section wins; otherwise the editor's current selection.
  const target = scopedSection ?? section;
  const isScoped = scopedSection != null;

  // "@" mention: text after the last "@" at the end of the input.
  const mentionQuery = useMemo(() => {
    const m = input.match(/@([\w\s-]*)$/);
    return m ? m[1] : null;
  }, [input]);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null || mentionTargets.length === 0) return [];
    const q = mentionQuery.trim().toLowerCase();
    return mentionTargets
      .filter((t) => t.label.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionQuery, mentionTargets]);

  const pickMention = (t: MentionTarget) => {
    // Drop the "@..." fragment from the input, keep the rest.
    setInput((prev) => prev.replace(/@[\w\s-]*$/, "").trim());
    onMentionSelect?.(t);
    if (t.section) {
      setMessages((m) => [
        ...m,
        { role: "ai", text: `Scoped to ${t.kind === "page" ? "page" : "section"} "${t.label}". Ab is par sawal poochho.` },
      ]);
    }
  };

  const send = async (instruction: string) => {
    const text = instruction.trim();
    if (!text || !target || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, section: target }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data: { section: Section; changes: string[]; mode?: string } = await res.json();
      setMode(data.mode ?? "api");
      setMessages((m) => [
        ...m,
        { role: "ai", text: data.changes.join(" · ") || "Section update kar diya." },
      ]);
      onSectionUpdated(data.section, data.changes);
    } catch {
      // offline fallback — same rule-based edit the API uses without a key
      const { section: next, changes } = applyAiEdit(target, text);
      setMode("rules (offline)");
      setMessages((m) => [
        ...m,
        { role: "ai", text: `${changes.join(" · ")} (offline mode — API nahi mili)` },
      ]);
      onSectionUpdated(next, changes);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-bold text-gray-900">
        {isScoped && scopedSection
          ? `Editing: ${scopedSection.title || scopedSection.type} — ask…`
          : "AI edit — sirf is section par"}
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">
        {target
          ? `${isScoped ? "Scoped to" : "Selected"}: ${target.type} — "${target.title || "(no title)"}". Poora page dobara nahi banega.`
          : "Pehle koi section select karo."}
        {mode ? ` · Mode: ${mode}` : ""}
        {isScoped && onClearScope ? (
          <button
            type="button"
            onClick={onClearScope}
            className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-200"
            title="Clear scope — back to the selected section"
          >
            × Clear scope
          </button>
        ) : null}
      </p>

      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-gray-400">
            Misal: “hero title badal do” ya “header ko floating rounded banao”. Kisi
            section ko scope karne ke liye @ likh kar uska naam chuno.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 ${
                m.role === "user" ? "ml-6 bg-violet-100 text-violet-900" : "mr-6 bg-white text-gray-800 shadow-sm"
              }`}
            >
              {m.text}
            </div>
          ))
        )}
        {busy ? <p className="text-xs text-gray-400">AI soch raha hai…</p> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={!target || busy}
            onClick={() => send(ex)}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <form
        className="relative mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!target || busy}
          placeholder="Is section me kya badalna hai? (@ se section chuno)"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          aria-label="AI edit instruction"
        />
        <button
          type="submit"
          disabled={!target || busy || !input.trim()}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Apply
        </button>
        {mentionMatches.length > 0 ? (
          <ul
            className="absolute bottom-full left-0 z-30 mb-1 w-full max-w-sm rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            role="listbox"
            aria-label="Mention a page or section"
          >
            {mentionMatches.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => pickMention(t)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-800 hover:bg-violet-50"
                  role="option"
                  aria-selected="false"
                >
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                    {t.kind}
                  </span>
                  <span className="truncate">{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </form>
    </div>
  );
}
