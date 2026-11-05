// components/editor/SectionToolbar.tsx — Agent 3
// Hover toolbar ANCHORED INSIDE its section (absolute, inset inside the
// relative section wrapper). It never floats above the section or overlaps
// the section above it — that was video bug #1, deliberately not repeated.
// Parent (PageEditor) renders this as a child of the section wrapper.
"use client";

import { useEffect, useRef, useState } from "react";
import type { Align, Section } from "@/lib/sections";
import { placeholderImage } from "@/lib/sections";

export interface SectionToolbarProps {
  section: Section;
  onPatch: (patch: Partial<Section>) => void;
  onDuplicate: () => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  /** open the side panel focused on text editing */
  onEditInPanel: () => void;
}

const BTN =
  "rounded-md px-2 py-1 text-xs font-medium hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500";

export default function SectionToolbar({
  section: s,
  onPatch,
  onDuplicate,
  onMove,
  onDelete,
  onEditInPanel,
}: SectionToolbarProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // delete confirmation auto-disarms after 3s
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const align = (a: Align) => onPatch({ align: a });
  const fontSize = (d: number) =>
    onPatch({ fontSize: Math.max(12, Math.min(96, (s.fontSize ?? 24) + d)) });
  const padding = (d: number) =>
    onPatch({ padding: Math.max(0, Math.min(120, (s.padding ?? 24) + d)) });

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPatch({ image: reader.result });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      className="absolute inset-x-2 top-2 z-20 rounded-xl border border-violet-300 bg-white/95 text-gray-900 shadow-lg backdrop-blur"
      role="toolbar"
      aria-label={`${s.type} section toolbar`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
        <span className="mr-1 rounded bg-violet-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-700">
          {s.type}
        </span>
        <button type="button" className={BTN} onClick={onEditInPanel} title="Edit text in side panel">
          ✏️ Text
        </button>
        <button
          type="button"
          className={BTN}
          onClick={() => setShowImage((v) => !v)}
          title="Change image — upload or generate from a prompt"
        >
          🖼️ Image
        </button>
        <label className="flex items-center gap-1 px-1 text-xs" title="Background color">
          BG
          <input
            type="color"
            value={s.bgColor ?? "#ffffff"}
            onChange={(e) => onPatch({ bgColor: e.target.value })}
            className="h-6 w-7 cursor-pointer rounded border"
            aria-label="Background color"
          />
        </label>
        <label className="flex items-center gap-1 px-1 text-xs" title="Text color">
          Text
          <input
            type="color"
            value={s.textColor ?? "#111827"}
            onChange={(e) => onPatch({ textColor: e.target.value })}
            className="h-6 w-7 cursor-pointer rounded border"
            aria-label="Text color"
          />
        </label>
        <span className="flex items-center gap-0.5" title="Font size">
          <button type="button" className={BTN} onClick={() => fontSize(-2)} aria-label="Decrease font size">
            A−
          </button>
          <span className="w-8 text-center text-xs">{s.fontSize ?? 24}px</span>
          <button type="button" className={BTN} onClick={() => fontSize(2)} aria-label="Increase font size">
            A+
          </button>
        </span>
        <span className="flex items-center gap-0.5" title="Alignment">
          {(["left", "center", "right"] as Align[]).map((a) => (
            <button
              key={a}
              type="button"
              className={`${BTN} ${s.align === a ? "bg-violet-200" : ""}`}
              onClick={() => align(a)}
              aria-label={`Align ${a}`}
              aria-pressed={s.align === a}
            >
              {a === "left" ? "⬅" : a === "center" ? "↔" : "➡"}
            </button>
          ))}
        </span>
        <span className="flex items-center gap-0.5" title="Padding">
          <button type="button" className={BTN} onClick={() => padding(-8)} aria-label="Decrease padding">
            −Pad
          </button>
          <span className="w-9 text-center text-xs">{s.padding ?? 24}px</span>
          <button type="button" className={BTN} onClick={() => padding(8)} aria-label="Increase padding">
            +Pad
          </button>
        </span>
        <button type="button" className={BTN} onClick={onDuplicate} title="Duplicate this section">
          ⧉ Duplicate
        </button>
        <button type="button" className={BTN} onClick={() => onMove(-1)} title="Move section up" aria-label="Move section up">
          ↑
        </button>
        <button type="button" className={BTN} onClick={() => onMove(1)} title="Move section down" aria-label="Move section down">
          ↓
        </button>
        <button
          type="button"
          className={`${BTN} ${confirmDelete ? "bg-red-600 text-white hover:bg-red-700" : "text-red-600"}`}
          onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
          title="Delete this section (click twice to confirm)"
        >
          {confirmDelete ? "Confirm delete?" : "🗑 Delete"}
        </button>
      </div>

      {showImage ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 px-3 py-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
          <button
            type="button"
            className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
            onClick={() => fileRef.current?.click()}
          >
            Upload image
          </button>
          <input
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Image prompt, e.g. sunset fashion"
            className="min-w-40 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs"
            aria-label="Image prompt"
          />
          <button
            type="button"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white"
            onClick={() => {
              if (imagePrompt.trim()) onPatch({ image: placeholderImage(imagePrompt.trim()) });
            }}
          >
            Generate
          </button>
          <span className="text-[11px] text-gray-500">
            Demo mode: generated images are placeholders, no ImageKit key needed.
          </span>
        </div>
      ) : null}
    </div>
  );
}
