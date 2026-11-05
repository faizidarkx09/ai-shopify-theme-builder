// components/editor/AiEditChat.tsx — Agent 3
// AI-chat edit: user types an instruction, ONLY the selected section is
// updated (the API never regenerates the whole page). If /api/edit is
// unreachable, falls back to the local rule-based edit in lib/sections.
"use client";

import { useState } from "react";
import type { Section } from "@/lib/sections";
import { applyAiEdit } from "@/lib/sections";

export interface AiEditChatProps {
  section: Section | null;
  onSectionUpdated: (section: Section, changes: string[]) => void;
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

export default function AiEditChat({ section, onSectionUpdated }: AiEditChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("");

  const send = async (instruction: string) => {
    const text = instruction.trim();
    if (!text || !section || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, section }),
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
      const { section: next, changes } = applyAiEdit(section, text);
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
      <h3 className="font-bold text-gray-900">AI edit — sirf is section par</h3>
      <p className="mt-0.5 text-xs text-gray-500">
        {section
          ? `Selected: ${section.type} — "${section.title || "(no title)"}". Poora page dobara nahi banega.`
          : "Pehle koi section select karo."}
        {mode ? ` · Mode: ${mode}` : ""}
      </p>

      <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-gray-400">Misal: “hero title badal do” ya “header ko floating rounded banao”.</p>
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
            disabled={!section || busy}
            onClick={() => send(ex)}
            className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!section || busy}
          placeholder="Is section me kya badalna hai?"
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          aria-label="AI edit instruction"
        />
        <button
          type="submit"
          disabled={!section || busy || !input.trim()}
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
