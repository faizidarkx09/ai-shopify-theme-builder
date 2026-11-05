// components/editor/EditPanel.tsx — Agent 3
// Manual edit side panel: click a section (or an inner element inside it)
// and edit its fields here; every change applies instantly to the preview.
"use client";

import { useRef } from "react";
import type { Align, ElementKey, Section } from "@/lib/sections";
import type { AnimationLevel, Theme } from "@/lib/types";
import { ALLOWED_ENTRANCES, capEntrance } from "@/lib/types";
import { placeholderImage } from "@/lib/sections";
import { regenerateImageUrl, seedFromImageUrl } from "@/lib/media";

export interface EditPanelProps {
  section: Section | null;
  selectedElement: ElementKey;
  onElementChange: (el: ElementKey) => void;
  onPatch: (patch: Partial<Section>) => void;
  onClose: () => void;
  /** Cut C #22: project theme — needed for the Animation Level select. */
  theme?: Theme | null;
  /** Cut C #22: called with the new theme when Animation Level changes. */
  onThemeChange?: (theme: Theme) => void;
  /**
   * Wave 2 — animation controls (per-section entrance/hover + theme
   * Animation Level) live behind the editor's Advanced toggle. False in
   * beginner mode hides the whole Animation block; defaults true so the
   * panel keeps its old behaviour anywhere else it is used.
   */
  showAnimation?: boolean;
}

const FIELD =
  "w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500";

const ENTRANCE_OPTIONS = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade" },
  { id: "slide-up", label: "Slide up" },
  { id: "zoom", label: "Zoom" },
  { id: "slide-left", label: "Slide in from right" },
] as const;

const HOVER_OPTIONS = [
  { id: "none", label: "None" },
  { id: "lift", label: "Lift" },
  { id: "scale", label: "Scale" },
] as const;

const ANIMATION_LEVELS: { id: AnimationLevel; label: string; hint: string }[] = [
  { id: "none", label: "None", hint: "No motion anywhere" },
  { id: "low", label: "Low", hint: "Fade only" },
  { id: "medium", label: "Medium", hint: "Fade + slide up" },
  { id: "high", label: "High", hint: "All entrances" },
];

export default function EditPanel({
  section: s,
  selectedElement,
  onElementChange,
  onPatch,
  onClose,
  theme,
  onThemeChange,
  showAnimation = true,
}: EditPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (!s) {
    return (
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        <p>
          Kisi section par click karo — uske text, rang, image aur spacing yahan edit
          honge. Preview me change foran nazar aayega.
        </p>
        {theme && onThemeChange ? (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">
              Animation Level (whole theme)
            </span>
            <select
              value={theme.animationLevel ?? "medium"}
              onChange={(e) =>
                onThemeChange({
                  ...theme,
                  animationLevel: e.target.value as AnimationLevel,
                })
              }
              className={FIELD}
              aria-label="Theme animation level"
            >
              {ANIMATION_LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label} — {l.hint}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] text-gray-500">
              Low = fade only, Medium = fade + slide up, High = all entrances,
              None = no motion.
            </span>
          </label>
        ) : null}
      </div>
    );
  }

  const fieldFor = (el: ElementKey, label: string, value: string, key: "title" | "subtitle" | "text") => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-gray-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onPatch({ [key]: e.target.value } as Partial<Section>)}
        onFocus={() => onElementChange(el)}
        className={`${FIELD} ${selectedElement === el ? "ring-2 ring-violet-500" : ""}`}
      />
    </label>
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-gray-900">
          Edit: {s.type} <span className="text-xs font-normal text-gray-500">({s.id.slice(0, 8)})</span>
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
          aria-label="Close edit panel"
        >
          ✕
        </button>
      </div>

      <div className="mb-3">
        <span className="mb-1 block text-xs font-semibold text-gray-600">Selected element</span>
        <div className="flex flex-wrap gap-1">
          {(["title", "subtitle", "text", "image", "section"] as ElementKey[]).map((el) => (
            <button
              key={el}
              type="button"
              onClick={() => onElementChange(el)}
              aria-pressed={selectedElement === el}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                selectedElement === el ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {el}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {fieldFor("title", "Title", s.title, "title")}
        {fieldFor("subtitle", "Subtitle", s.subtitle ?? "", "subtitle")}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-600">Text</span>
          <textarea
            value={s.text ?? ""}
            rows={3}
            onChange={(e) => onPatch({ text: e.target.value })}
            onFocus={() => onElementChange("text")}
            className={`${FIELD} ${selectedElement === "text" ? "ring-2 ring-violet-500" : ""}`}
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-semibold text-gray-600">Image</span>
          <div className="flex gap-2">
            <input
              value={s.image ?? ""}
              onChange={(e) => onPatch({ image: e.target.value })}
              onFocus={() => onElementChange("image")}
              className={`${FIELD} ${selectedElement === "image" ? "ring-2 ring-violet-500" : ""}`}
              placeholder="https://…"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => {
                  if (typeof r.result === "string") onPatch({ image: r.result });
                };
                r.readAsDataURL(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white"
            >
              Upload
            </button>
            <button
              type="button"
              onClick={() => onPatch({ image: placeholderImage(`${s.type}-${Date.now() % 10000}`) })}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              New image
            </button>
            {s.image ? (
              <button
                type="button"
                onClick={() =>
                  onPatch({ image: regenerateImageUrl(seedFromImageUrl(s.image ?? "")) })
                }
                title="Fresh placeholder photo (picsum) — AI image nahi"
                className="rounded-md border border-violet-600 px-3 py-1.5 text-xs font-medium text-violet-700"
              >
                Regenerate image
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Regenerate se fresh placeholder photo milti hai (picsum) — AI se
            bani image nahi.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Background</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={s.bgColor ?? "#ffffff"}
                onChange={(e) => onPatch({ bgColor: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded border"
                aria-label="Background color"
              />
              <span className="text-xs text-gray-600">{s.bgColor ?? "#ffffff"}</span>
            </span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Text color</span>
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={s.textColor ?? "#111827"}
                onChange={(e) => onPatch({ textColor: e.target.value })}
                className="h-9 w-10 cursor-pointer rounded border"
                aria-label="Text color"
              />
              <span className="text-xs text-gray-600">{s.textColor ?? "#111827"}</span>
            </span>
          </label>
        </div>

        <label className="block">
          <span className="mb-1 flex justify-between text-xs font-semibold text-gray-600">
            <span>Font size</span>
            <span>{s.fontSize ?? 24}px</span>
          </span>
          <input
            type="range"
            min={12}
            max={72}
            value={s.fontSize ?? 24}
            onChange={(e) => onPatch({ fontSize: Number(e.target.value) })}
            className="w-full"
            aria-label="Font size"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex justify-between text-xs font-semibold text-gray-600">
            <span>Padding</span>
            <span>{s.padding ?? 24}px</span>
          </span>
          <input
            type="range"
            min={0}
            max={120}
            step={4}
            value={s.padding ?? 24}
            onChange={(e) => onPatch({ padding: Number(e.target.value) })}
            className="w-full"
            aria-label="Padding"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-semibold text-gray-600">Alignment</span>
          <div className="flex gap-1">
            {(["left", "center", "right"] as Align[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onPatch({ align: a })}
                aria-pressed={s.align === a}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                  s.align === a ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* ---- Cut C #22: per-section animation + theme animation level ----
            Wave 2: hidden entirely unless showAnimation (Advanced ON). */}
        {showAnimation ? (
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <span className="block text-xs font-semibold text-gray-600">Animation</span>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Entrance</span>
            <select
              value={s.animation?.entrance ?? "none"}
              onChange={(e) => {
                const entrance = e.target.value as
                  | "none"
                  | "fade"
                  | "slide-up"
                  | "zoom"
                  | "slide-left";
                onPatch({
                  animation: {
                    ...s.animation,
                    entrance: capEntrance(entrance, theme?.animationLevel),
                  },
                });
              }}
              className={FIELD}
              aria-label="Entrance animation"
            >
              {ENTRANCE_OPTIONS.map((o) => {
                const allowed = (
                  ALLOWED_ENTRANCES[theme?.animationLevel ?? "medium"] as readonly string[]
                ).includes(o.id);
                return (
                  <option key={o.id} value={o.id} disabled={!allowed}>
                    {o.label}
                    {allowed ? "" : " (blocked by Animation Level)"}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 flex justify-between text-xs font-semibold text-gray-600">
              <span>Entrance delay</span>
              <span>{s.animation?.delayMs ?? 0}ms</span>
            </span>
            <input
              type="range"
              min={0}
              max={600}
              step={50}
              value={s.animation?.delayMs ?? 0}
              onChange={(e) =>
                onPatch({ animation: { ...s.animation, delayMs: Number(e.target.value) } })
              }
              className="w-full"
              aria-label="Entrance delay in milliseconds"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-gray-600">Hover effect</span>
            <select
              value={s.animation?.hover ?? "none"}
              onChange={(e) =>
                onPatch({
                  animation: {
                    ...s.animation,
                    hover: e.target.value as "none" | "lift" | "scale",
                  },
                })
              }
              className={FIELD}
              aria-label="Hover effect"
            >
              {HOVER_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {theme && onThemeChange ? (
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-gray-600">
                Animation Level (whole theme)
              </span>
              <select
                value={theme.animationLevel ?? "medium"}
                onChange={(e) =>
                  onThemeChange({
                    ...theme,
                    animationLevel: e.target.value as AnimationLevel,
                  })
                }
                className={FIELD}
                aria-label="Theme animation level"
              >
                {ANIMATION_LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.hint}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] text-gray-500">
                Caps what renders: Low = fade only, Medium = fade + slide up,
                High = all entrances, None = no motion. Sections above the cap
                fall back to fade.
              </span>
            </label>
          ) : null}
        </div>
        ) : null}

        <div className="flex gap-4 border-t border-gray-100 pt-3 text-sm">
          <label className="flex items-center gap-1.5 text-gray-700">
            <input
              type="checkbox"
              checked={!!s.floating}
              onChange={(e) => onPatch({ floating: e.target.checked })}
            />
            Floating
          </label>
          <label className="flex items-center gap-1.5 text-gray-700">
            <input
              type="checkbox"
              checked={!!s.rounded}
              onChange={(e) => onPatch({ rounded: e.target.checked })}
            />
            Rounded
          </label>
        </div>
      </div>
    </div>
  );
}
