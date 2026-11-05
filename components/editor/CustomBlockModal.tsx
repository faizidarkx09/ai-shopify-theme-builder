// components/editor/CustomBlockModal.tsx — Cut C #21: AI custom block.
// Prompt + kind picker -> template-built interactive block (quiz,
// calculator, countdown, timeline) with a live sandboxed preview.
// Insert hands a ready Section (type 'custom') to the caller; the caller
// (PageEditor) routes it through the staged Accept/Discard flow.
"use client";

import { useMemo, useState } from "react";
import type { Section, Theme } from "@/lib/sections";
import { createSection } from "@/lib/sections";
import {
  CUSTOM_BLOCK_KINDS,
  CUSTOM_BLOCK_LABELS,
  buildCustomBlock,
  detectCustomKind,
  type CustomBlockKind,
} from "@/lib/customBlocks";

export interface CustomBlockModalProps {
  theme: Theme;
  /** Called with the finished Section — caller decides how to insert it. */
  onInsert: (section: Section) => void;
  onClose: () => void;
}

export default function CustomBlockModal({ theme, onInsert, onClose }: CustomBlockModalProps) {
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<CustomBlockKind>("countdown");
  const [kindTouched, setKindTouched] = useState(false);

  // Live preview rebuilds from the current prompt + kind. Prompt words
  // are escaped inside buildCustomBlock — the iframe is sandboxed anyway.
  const block = useMemo(
    () => buildCustomBlock(kind, prompt.trim() || "Your store offer", theme),
    [kind, prompt, theme],
  );
  const srcDoc = useMemo(
    () => `<style>${block.css}</style>${block.html}<script>${block.js}</script>`,
    [block],
  );

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    if (!kindTouched) setKind(detectCustomKind(value));
  };

  const handleInsert = () => {
    const section: Section = {
      ...createSection("custom"),
      title: `${CUSTOM_BLOCK_LABELS[kind]} — ${prompt.trim().slice(0, 40) || "Custom block"}`,
      text: prompt.trim() || "Interactive custom block.",
      customHtml: block.html,
      customCss: block.css,
      customJs: block.js,
      meta: { ...(createSection("custom").meta ?? {}), customKind: kind },
    };
    onInsert(section);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add a custom block"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Add a custom block</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
            aria-label="Close custom block dialog"
          >
            ✕
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          Describe the block — a quiz, calculator, countdown or timeline —
          and it is built as an interactive section you can edit afterwards.
        </p>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">
            What should the block be about?
          </span>
          <input
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="e.g. Summer sale countdown for our skincare range"
            aria-label="Custom block prompt"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </label>

        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold text-gray-600">Block type</span>
          <div className="flex flex-wrap gap-1.5">
            {CUSTOM_BLOCK_KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setKind(k);
                  setKindTouched(true);
                }}
                aria-pressed={kind === k}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  kind === k
                    ? "bg-violet-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {CUSTOM_BLOCK_LABELS[k]}
              </button>
            ))}
          </div>
          {!kindTouched && prompt.trim() ? (
            <p className="mt-1 text-[11px] text-gray-500">
              Type auto-detected from your prompt — tap another type to change it.
            </p>
          ) : null}
        </div>

        <div className="mt-4">
          <span className="mb-1 block text-xs font-semibold text-gray-600">Live preview</span>
          <iframe
            title="Custom block preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="w-full rounded-xl border border-gray-200 bg-white"
            style={{ minHeight: 260 }}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleInsert}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            Insert block — review first
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          The block is proposed for review first (Accept / Discard) — nothing
          is added to the page until you accept it.
        </p>
      </div>
    </div>
  );
}
