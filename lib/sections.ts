// lib/sections.ts — Agent 3 (Inline Editor)
// Section data model + pure edit helpers + rule-based AI edit.
// Types are re-exported from the CANONICAL lib/types.ts (Agent 1) and
// extended here only with the editor's optional fields (fontSize,
// floating, rounded). Earlier this file carried its own copies — aligned
// 2026-11-05 so the editor, the store and the AI engine share one shape.
// ORIGINAL code, written from the blueprint — not copied from any source.

import type { Section as BaseSection, Page, Project, SectionType, Theme } from "@/lib/types";
import { SECTION_TYPES, placeholderImage } from "@/lib/types";
export type { Page, Project, SectionType, Theme } from "@/lib/types";
export { SECTION_TYPES, placeholderImage };

/** Editor's Section = canonical Section + editor-only optional fields. */
export interface Section extends BaseSection {
  /** font size in px (title) */
  fontSize?: number;
  /** header floating pill look ("header ko floating rounded banao") */
  floating?: boolean;
  rounded?: boolean;
}

export type Align = "left" | "center" | "right";

/** Inner element inside a section — the toolbar/panel can target these,
 *  not only the outer section (video bug #2: only outer selection worked). */
export type ElementKey = "section" | "title" | "subtitle" | "text" | "image";

export const SECTION_LABELS: Record<SectionType, string> = {
  header: "Header",
  hero: "Hero",
  banner: "Banner",
  category: "Category grid",
  product: "Product grid",
  features: "Features",
  cta: "Call to action",
  footer: "Footer",
};

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULTS: Record<
  SectionType,
  Pick<Section, "title" | "subtitle" | "text" | "bgColor" | "textColor" | "align" | "padding" | "fontSize">
> = {
  header: {
    title: "My Store",
    subtitle: "",
    text: "",
    bgColor: "#ffffff",
    textColor: "#111827",
    align: "left",
    padding: 16,
    fontSize: 20,
  },
  hero: {
    title: "New Collection Is Here",
    subtitle: "Premium quality, honest prices",
    text: "Shop the latest styles made for everyday life. Free shipping on orders over $50.",
    bgColor: "#111827",
    textColor: "#f9fafb",
    align: "center",
    padding: 64,
    fontSize: 44,
  },
  banner: {
    title: "Summer Sale — Up to 40% Off",
    subtitle: "",
    text: "Limited time offer on selected items. No code needed.",
    bgColor: "#7c3aed",
    textColor: "#ffffff",
    align: "center",
    padding: 32,
    fontSize: 28,
  },
  category: {
    title: "Shop by Category",
    subtitle: "",
    text: "Find what you need, faster.",
    bgColor: "#ffffff",
    textColor: "#111827",
    align: "center",
    padding: 48,
    fontSize: 28,
  },
  product: {
    title: "Best Sellers",
    subtitle: "",
    text: "Our customers' favourites this week.",
    bgColor: "#f9fafb",
    textColor: "#111827",
    align: "center",
    padding: 48,
    fontSize: 28,
  },
  features: {
    title: "Why Shop With Us",
    subtitle: "",
    text: "Fast delivery, easy returns, secure checkout.",
    bgColor: "#ffffff",
    textColor: "#111827",
    align: "center",
    padding: 48,
    fontSize: 28,
  },
  cta: {
    title: "Ready to Start?",
    subtitle: "",
    text: "Join thousands of happy customers today.",
    bgColor: "#111827",
    textColor: "#f9fafb",
    align: "center",
    padding: 56,
    fontSize: 32,
  },
  footer: {
    title: "My Store",
    subtitle: "",
    text: "© 2026 My Store. All rights reserved. Placeholder content — replace with your real store details.",
    bgColor: "#1f2937",
    textColor: "#d1d5db",
    align: "left",
    padding: 40,
    fontSize: 16,
  },
};

export function createSection(
  type: SectionType,
  overrides: Partial<Section> = {},
): Section {
  const d = DEFAULTS[type];
  return {
    id: uid(),
    type,
    title: d.title,
    subtitle: d.subtitle,
    text: d.text,
    image: placeholderImage(`${type}-hero`),
    bgColor: d.bgColor,
    textColor: d.textColor,
    align: d.align,
    padding: d.padding,
    fontSize: d.fontSize,
    ...overrides,
  };
}

/** Starter page: header + hero + category + product + features + cta + footer. */
export function defaultPageSections(): Section[] {
  return (["header", "hero", "category", "product", "features", "cta", "footer"] as SectionType[]).map(
    (t) => createSection(t),
  );
}

// ---------------------------------------------------------------------------
// Pure list operations (used by the editor UI and the API route)
// ---------------------------------------------------------------------------

export function updateSection(
  sections: Section[],
  id: string,
  patch: Partial<Section>,
): Section[] {
  return sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

export function duplicateSection(sections: Section[], id: string): Section[] {
  const out: Section[] = [];
  for (const s of sections) {
    out.push(s);
    if (s.id === id) out.push({ ...s, id: uid(), title: `${s.title} (copy)` });
  }
  return out;
}

export function moveSection(sections: Section[], id: string, dir: -1 | 1): Section[] {
  const i = sections.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sections.length) return sections;
  const out = [...sections];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

export function deleteSection(sections: Section[], id: string): Section[] {
  return sections.filter((s) => s.id !== id);
}

export function addSection(sections: Section[], type: SectionType): Section[] {
  return [...sections, createSection(type)];
}

// ---------------------------------------------------------------------------
// localStorage persistence (Cut 1/2 fallback — lib/db from Agent 5 replaces
// this later; the editor keeps React state as source of truth and mirrors
// it to localStorage so edits survive a reload without a backend).
// ---------------------------------------------------------------------------

export function storageKey(projectId: string, pageId: string): string {
  return `stb:project:${projectId}:page:${pageId}:sections`;
}

export function saveSections(projectId: string, pageId: string, sections: Section[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(projectId, pageId), JSON.stringify(sections));
  } catch {
    // storage full / private mode — edits still live in React state
  }
}

export function loadSections(projectId: string, pageId: string): Section[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(projectId, pageId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as Section[];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rule-based AI edit (offline fallback for /api/edit and for the chat panel
// when the API is unreachable). Understands English + Roman Urdu phrasing.
// ONLY the given section is changed — never the whole page.
// ---------------------------------------------------------------------------

const COLOR_WORDS: Record<string, string> = {
  black: "#111827",
  kala: "#111827",
  dark: "#111827",
  white: "#ffffff",
  safed: "#ffffff",
  pink: "#ec4899",
  gulabi: "#ec4899",
  blue: "#2563eb",
  neela: "#2563eb",
  green: "#16a34a",
  hara: "#16a34a",
  red: "#dc2626",
  lal: "#dc2626",
  purple: "#7c3aed",
  jamni: "#7c3aed",
  yellow: "#eab308",
  peela: "#eab308",
  orange: "#ea580c",
  narangi: "#ea580c",
  grey: "#6b7280",
  gray: "#6b7280",
};

function quotedText(instruction: string): string | null {
  const m = instruction.match(/["“]([^"”]+)["”]/) || instruction.match(/'([^']+)'/);
  return m ? m[1].trim() : null;
}

/** Text after "… rakho / kar do / bana do / set karo" (Roman Urdu + English). */
function textAfterVerb(instruction: string, verbs: string[]): string | null {
  const lower = instruction.toLowerCase();
  for (const v of verbs) {
    const i = lower.indexOf(v);
    if (i >= 0) {
      const rest = instruction
        .slice(i + v.length)
        .replace(/^(ko|ka|ke|to|as|the)\s+/i, "")
        .replace(/\s*(kar do|kardo|bana do|rakh do|rakho|set karo|change kar do|badal do)\s*$/i, "")
        .trim();
      if (rest.length > 1) return rest;
    }
  }
  return null;
}

export function applyAiEdit(
  section: Section,
  instruction: string,
): { section: Section; changes: string[] } {
  const lower = instruction.toLowerCase();
  const changes: string[] = [];
  let s: Section = { ...section };
  const quoted = quotedText(instruction);

  const set = (patch: Partial<Section>, note: string) => {
    s = { ...s, ...patch };
    changes.push(note);
  };

  // --- title ---------------------------------------------------------------
  if (lower.includes("title")) {
    const value =
      quoted ?? textAfterVerb(instruction, ["title"]) ?? textAfterVerb(instruction, ["heading"]);
    if (value) set({ title: value }, `Title badal diya: "${value}"`);
  }

  // --- subtitle ------------------------------------------------------------
  if (lower.includes("subtitle")) {
    const value = quoted ?? textAfterVerb(instruction, ["subtitle"]);
    if (value) set({ subtitle: value }, `Subtitle badal diya: "${value}"`);
  }

  // --- body text -----------------------------------------------------------
  if (lower.includes("text") || lower.includes("description") || lower.includes("paragraph")) {
    const value =
      quoted ?? textAfterVerb(instruction, ["text"]) ?? textAfterVerb(instruction, ["description"]);
    if (value) set({ text: value }, "Text badal diya");
  }

  // --- floating + rounded (header example) ---------------------------------
  if (lower.includes("floating")) {
    set({ floating: true }, "Header floating bana diya");
  }
  if (lower.includes("rounded") || lower.includes("gol")) {
    set({ rounded: true }, "Rounded corners laga diye");
  }
  if (lower.includes("normal") && lower.includes("header")) {
    set({ floating: false, rounded: false }, "Header normal kar diya");
  }

  // --- colors --------------------------------------------------------------
  for (const [word, hex] of Object.entries(COLOR_WORDS)) {
    if (!lower.includes(word)) continue;
    if (lower.includes("background") || lower.includes("bg") || lower.includes("pichla rang") || lower.includes("peeche")) {
      set({ bgColor: hex }, `Background ${word} kar diya`);
    } else if (lower.includes("text") || lower.includes("likhai") || lower.includes("font color")) {
      set({ textColor: hex }, `Text color ${word} kar diya`);
    } else if (lower.includes("dark") || lower.includes("kala")) {
      set({ bgColor: hex, textColor: "#f9fafb" }, "Dark theme laga diya");
    } else {
      set({ bgColor: hex }, `Background ${word} kar diya`);
    }
    break; // one color per instruction
  }

  // --- font size -----------------------------------------------------------
  const sizeMatch = lower.match(/(?:font|size)\s*(?:size)?\s*(\d{2})/);
  if (sizeMatch) {
    set({ fontSize: Number(sizeMatch[1]) }, `Font size ${sizeMatch[1]}px kar diya`);
  } else if (lower.includes("bara") || lower.includes("bigger") || lower.includes("increase")) {
    set({ fontSize: (s.fontSize ?? 24) + 4 }, "Font size barha diya");
  } else if (lower.includes("chhota") || lower.includes("chota") || lower.includes("smaller") || lower.includes("decrease")) {
    set({ fontSize: Math.max(12, (s.fontSize ?? 24) - 4) }, "Font size chhota kar diya");
  }

  // --- alignment -----------------------------------------------------------
  if (lower.includes("center") || lower.includes("beech") || lower.includes("middle")) {
    set({ align: "center" }, "Alignment center kar diya");
  } else if (lower.includes("left") || lower.includes("bayein") || lower.includes("baayein")) {
    set({ align: "left" }, "Alignment left kar diya");
  } else if (lower.includes("right") || lower.includes("dayein") || lower.includes("daayein")) {
    set({ align: "right" }, "Alignment right kar diya");
  }

  // --- padding / spacing ----------------------------------------------------
  if (lower.includes("padding") || lower.includes("space") || lower.includes("spacing")) {
    if (lower.includes("barhao") || lower.includes("zyada") || lower.includes("increase") || lower.includes("more")) {
      set({ padding: (s.padding ?? 24) + 16 }, "Padding barha diya");
    } else if (lower.includes("kam") || lower.includes("decrease") || lower.includes("less")) {
      set({ padding: Math.max(0, (s.padding ?? 24) - 16) }, "Padding kam kar diya");
    }
  }

  // --- image ---------------------------------------------------------------
  if (lower.includes("image") || lower.includes("tasveer") || lower.includes("photo")) {
    const seedWord = lower.includes("sunset")
      ? "sunset"
      : lower.includes("fashion")
        ? "fashion"
        : lower.includes("food")
          ? "food"
          : lower.includes("cosmetic") || lower.includes("beauty")
            ? "cosmetics"
            : `${s.type}-${Date.now() % 1000}`;
    set(
      { image: placeholderImage(seedWord) },
      "Image nayi generate kar di (placeholder)",
    );
  }

  if (changes.length === 0) {
    changes.push(
      "Samajh nahi aaya — sirf is section ka title, text, color, font size, alignment, padding ya image badal sakta hoon. Misal: 'hero title Summer Sale rakho'.",
    );
  }
  return { section: s, changes };
}
