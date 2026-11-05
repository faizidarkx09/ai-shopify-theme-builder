// components/editor/ThemeTokensPanel.tsx — Theme Tokens panel + retheme
// gallery (Cut A #5).
// The theme becomes real, editable tokens: colours / font / radius /
// spacing, applied to every page at once — no regeneration needed.
// Presets are one-click re-skins; the parent owns the theme state and
// persists it (this panel only calls onThemeChange with a NEW theme).
// All preset names/colours are original; the font list is the fixed list
// already used by the app's export font stack (lib/export/shopify.ts).
"use client";

import type { Theme } from "@/lib/types";

/** Fonts the app already ships in its export stack — fixed list, no new downloads. */
export const TOKEN_FONTS: readonly string[] = [
  "Inter",
  "Poppins",
  "Playfair Display",
  "Montserrat",
  "Roboto",
  "Lora",
  "DM Sans",
];

export interface ThemeTokensPanelProps {
  theme: Theme;
  /** Called with the full new theme whenever any token changes. */
  onThemeChange: (theme: Theme) => void;
  /** Preset gallery — pass THEME_PRESETS from lib/theme.ts. */
  presets: Theme[];
}

const COLOR_FIELDS: Array<{
  key: keyof Theme["colors"];
  label: string;
}> = [
  { key: "primary", label: "Primary" },
  { key: "secondary", label: "Secondary" },
  { key: "background", label: "Background" },
  { key: "text", label: "Text" },
  { key: "accent", label: "Accent" },
];

export default function ThemeTokensPanel({
  theme,
  onThemeChange,
  presets,
}: ThemeTokensPanelProps) {
  const radius = theme.tokens?.radius ?? 12;
  const spacing = theme.tokens?.spacing ?? 48;

  const patchColors = (key: keyof Theme["colors"], value: string) =>
    onThemeChange({
      ...theme,
      colors: { ...theme.colors, [key]: value },
      presetId: undefined, // hand-edited theme is no longer a stock preset
    });

  const patchTokens = (tokens: { radius?: number; spacing?: number }) =>
    onThemeChange({
      ...theme,
      tokens: { radius, spacing, ...tokens },
      presetId: undefined,
    });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-bold text-gray-900">Theme tokens</h3>
      <p className="mt-0.5 text-xs text-gray-500">
        Change a token once — it applies to every page. No regeneration needed.
      </p>

      {/* ---- colour tokens ---- */}
      <div className="mt-3 space-y-2">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-2 text-sm text-gray-700">
            <span>{label}</span>
            <span className="flex items-center gap-2">
              <code className="text-xs text-gray-500">{theme.colors[key]}</code>
              <input
                type="color"
                value={theme.colors[key]}
                onChange={(e) => patchColors(key, e.target.value)}
                className="h-7 w-9 cursor-pointer rounded border"
                aria-label={`${label} colour`}
              />
            </span>
          </label>
        ))}
      </div>

      {/* ---- font ---- */}
      <label className="mt-4 block text-sm text-gray-700">
        <span className="mb-1 block font-medium">Font</span>
        <select
          value={theme.font}
          onChange={(e) =>
            onThemeChange({ ...theme, font: e.target.value, presetId: undefined })
          }
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          aria-label="Theme font"
        >
          {TOKEN_FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
          {!TOKEN_FONTS.includes(theme.font) ? (
            <option value={theme.font}>{theme.font} (current)</option>
          ) : null}
        </select>
      </label>

      {/* ---- radius + spacing sliders ---- */}
      <div className="mt-4 space-y-3">
        <label className="block text-sm text-gray-700">
          <span className="flex justify-between font-medium">
            <span>Corner radius</span>
            <span className="text-gray-500">{radius}px</span>
          </span>
          <input
            type="range"
            min={0}
            max={24}
            step={1}
            value={radius}
            onChange={(e) => patchTokens({ radius: Number(e.target.value) })}
            className="w-full accent-violet-600"
            aria-label="Corner radius in pixels"
          />
        </label>
        <label className="block text-sm text-gray-700">
          <span className="flex justify-between font-medium">
            <span>Section spacing</span>
            <span className="text-gray-500">{spacing}px</span>
          </span>
          <input
            type="range"
            min={0}
            max={80}
            step={4}
            value={spacing}
            onChange={(e) => patchTokens({ spacing: Number(e.target.value) })}
            className="w-full accent-violet-600"
            aria-label="Section spacing in pixels"
          />
        </label>
      </div>

      {/* ---- preset gallery ---- */}
      <h4 className="mt-5 text-sm font-bold text-gray-900">Retheme gallery</h4>
      <p className="text-xs text-gray-500">One click re-skins the whole theme.</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const active = theme.presetId
            ? theme.presetId === preset.presetId
            : theme.name === preset.name;
          return (
            <button
              key={preset.presetId ?? preset.name}
              type="button"
              onClick={() =>
                onThemeChange({
                  ...preset,
                  colors: { ...preset.colors },
                  tokens: { ...(preset.tokens ?? { radius: 12, spacing: 48 }) },
                })
              }
              className={`rounded-lg border p-2 text-left hover:border-violet-400 ${
                active ? "border-violet-600 ring-2 ring-violet-200" : "border-gray-200"
              }`}
              aria-pressed={active}
              title={preset.displayName ?? preset.name}
            >
              <span className="flex gap-1" aria-hidden="true">
                {(
                  [
                    preset.colors.primary,
                    preset.colors.secondary,
                    preset.colors.background,
                    preset.colors.accent,
                  ] as string[]
                ).map((c) => (
                  <span
                    key={c}
                    className="h-4 w-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </span>
              <span className="mt-1.5 block text-xs font-semibold text-gray-900">
                {preset.name}
              </span>
              <span className="block text-[11px] leading-tight text-gray-500">
                {preset.displayName ?? preset.style} · {preset.font}
              </span>
            </button>
          );
        })}
      </div>
      {presets.length === 0 ? (
        <p className="mt-2 text-xs text-gray-400">
          No presets passed — wire THEME_PRESETS from lib/theme.ts.
        </p>
      ) : null}
    </div>
  );
}
