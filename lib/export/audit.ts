// lib/export/audit.ts — Pre-export audit (Cut A #3).
// Pure functions, no network: inspects the project's own data and flags
// only what the data actually shows (placeholder content, empty sections,
// low contrast, missing SEO/alt, broken internal links).
// Nothing here is a guess — every issue cites the section/page it came from.

import type { Page, Project, Section } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditSeverity = "error" | "warning" | "info";

export type AuditFixType =
  | "replace-image"
  | "fill-text"
  | "set-alt"
  | "set-meta"
  | "remove-empty";

export interface AuditFix {
  type: AuditFixType;
  /** Section the fix targets (absent for page-level fixes such as set-meta). */
  sectionId?: string;
  /** Value to write (alt text, meta title/description, replacement text). */
  value?: string;
}

export interface AuditIssue {
  id: string;
  severity: AuditSeverity;
  message: string;
  fix?: AuditFix;
}

export interface AuditResult {
  issues: AuditIssue[];
  /** 0–100. Starts at 100; error −15, warning −5, info −2 (floored at 0).
   *  A fresh demo project scores low on purpose — every image is a
   *  placeholder and there is no SEO yet — that is the honest signal. */
  score: number;
}

// ---------------------------------------------------------------------------
// Colour helpers (WCAG-ish contrast from hex colours)
// ---------------------------------------------------------------------------

function parseHex(color: string | undefined): [number, number, number] | null {
  if (!color) return null;
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  const hex = m[1];
  if (hex.length === 3) {
    return [
      parseInt(hex[0] + hex[0], 16),
      parseInt(hex[1] + hex[1], 16),
      parseInt(hex[2] + hex[2], 16),
    ];
  }
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
  ];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours; null when unparseable. */
export function contrastRatio(fg: string | undefined, bg: string | undefined): number | null {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return null;
  const l1 = luminance(f);
  const l2 = luminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

function isPlaceholderImage(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("picsum.photos") ||
    lower.includes("placeholder") ||
    lower.includes("placehold.co") ||
    lower.includes("via.placeholder")
  );
}

function hasPlaceholderText(section: Section): boolean {
  const hay = `${section.title ?? ""} ${section.subtitle ?? ""} ${section.text ?? ""}`.toLowerCase();
  return hay.includes("placeholder");
}

function isEmptySection(section: Section): boolean {
  const text = `${section.title ?? ""}${section.subtitle ?? ""}${section.text ?? ""}`.trim();
  const custom = `${section.customHtml ?? ""}`.trim();
  return text === "" && custom === "";
}

/** href="#..." anchors found in a section's text / custom HTML. */
function internalAnchors(section: Section): string[] {
  const hay = `${section.text ?? ""} ${section.customHtml ?? ""}`;
  const out: string[] = [];
  const re = /href\s*=\s*["']#([^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(hay)) !== null) out.push(m[1]);
  return out;
}

// ---------------------------------------------------------------------------
// Main audit
// ---------------------------------------------------------------------------

/**
 * Audit one page of a project. `project` is needed for the theme fallback
 * colours and the project name (used as the suggested SEO title).
 * Only flags what the data actually shows — no invented problems.
 */
export function auditProject(project: Project, page: Page): AuditResult {
  const issues: AuditIssue[] = [];
  const theme = project.theme;
  const sectionIds = new Set(page.sections.map((s) => s.id));

  let n = 0;
  const add = (
    severity: AuditSeverity,
    message: string,
    fix?: AuditFix,
  ) => {
    n += 1;
    issues.push({ id: `audit-${n}`, severity, message, fix });
  };

  // --- placeholder images / products --------------------------------------
  for (const s of page.sections) {
    if (isPlaceholderImage(s.image)) {
      add(
        "warning",
        `“${s.title || s.type}” still uses a placeholder image (${s.image}). Swap it for a real product photo before exporting.`,
        { type: "replace-image", sectionId: s.id },
      );
    }
    if (hasPlaceholderText(s)) {
      add(
        "warning",
        `“${s.title || s.type}” still contains the word “placeholder” — replace it with real store copy.`,
        { type: "fill-text", sectionId: s.id },
      );
    }
    // Product-family sections whose only imagery is a placeholder are
    // demo-catalog sections: the store has no real products wired in.
    if (
      (s.type === "product" || s.type === "bundle" || s.type === "sticky-atc") &&
      isPlaceholderImage(s.image)
    ) {
      add(
        "warning",
        `“${s.title || s.type}” shows demo products, not your real catalog. Add real products in Shopify after import.`,
      );
    }
  }

  // --- empty sections -------------------------------------------------------
  for (const s of page.sections) {
    if (isEmptySection(s)) {
      add(
        "warning",
        `Section “${s.type}” is empty (no title, subtitle, text or custom content). Fill it in or remove it.`,
        { type: "remove-empty", sectionId: s.id },
      );
    }
  }

  // --- contrast -------------------------------------------------------------
  for (const s of page.sections) {
    const bg = s.bgColor ?? theme.colors.background;
    const fg = s.textColor ?? theme.colors.text;
    const ratio = contrastRatio(fg, bg);
    if (ratio === null) continue; // unparseable colour — do not guess
    if (ratio < 3) {
      add(
        "error",
        `“${s.title || s.type}” text is hard to read: contrast ${ratio.toFixed(2)}:1 (needs at least 3:1). Darken the text or lighten the background.`,
      );
    } else if (ratio < 4.5) {
      add(
        "warning",
        `“${s.title || s.type}” text contrast is ${ratio.toFixed(2)}:1 — below the 4.5:1 body-text target. Consider a darker text colour.`,
      );
    }
  }

  // --- page SEO ---------------------------------------------------------------
  if (!page.seo?.title?.trim()) {
    add(
      "warning",
      `Page “${page.title}” has no SEO title. Search results will show a generic title instead.`,
      { type: "set-meta", value: page.title || project.name },
    );
  } else if (page.seo.title.length > 60) {
    add(
      "info",
      `SEO title is ${page.seo.title.length} characters — search results usually cut titles after about 60 characters.`,
    );
  }
  if (!page.seo?.description?.trim()) {
    add(
      "warning",
      `Page “${page.title}” has no meta description. Add one so search results show your own summary.`,
      { type: "set-meta", value: `${project.name} — ${page.title}` },
    );
  } else if (page.seo.description.length > 160) {
    add(
      "info",
      `Meta description is ${page.seo.description.length} characters — search results usually cut descriptions after about 160 characters.`,
    );
  }

  // --- alt text ---------------------------------------------------------------
  for (const s of page.sections) {
    if (s.image && !s.title?.trim()) {
      add(
        "warning",
        `Section “${s.type}” has an image but no title to use as its alt text. Give the section a short descriptive title.`,
        { type: "set-alt", sectionId: s.id, value: `${s.type} image` },
      );
    }
  }

  // --- broken internal links --------------------------------------------------
  for (const s of page.sections) {
    for (const anchor of internalAnchors(s)) {
      if (anchor === "") {
        add(
          "info",
          `“${s.title || s.type}” links to “#” — a placeholder link with no destination. Point it at a real page or section.`,
        );
      } else if (!sectionIds.has(anchor)) {
        add(
          "warning",
          `“${s.title || s.type}” links to “#${anchor}” but no section on this page has that id. The link will go nowhere.`,
        );
      }
    }
  }

  // --- animation budget (Cut C #22) ----------------------------------------
  // Readymag's 12s-load warning: motion is cheap per section but heavy
  // in aggregate. Count entrance animations across the whole PROJECT
  // (not just this page) — the exported theme ships them all.
  const allProjectSections = project.pages.flatMap((p) => p.sections);
  const animated = allProjectSections.filter(
    (s) => s.animation?.entrance && s.animation.entrance !== "none",
  );
  const overDelay = allProjectSections.filter((s) => (s.animation?.delayMs ?? 0) > 600);
  if (animated.length > 8) {
    add(
      "warning",
      `${animated.length} sections have entrance animations — heavy motion, may slow the theme. Keep it to 8 or fewer, or lower the Animation Level.`,
    );
  }
  for (const s of overDelay) {
    add(
      "warning",
      `“${s.title || s.type}” has an entrance delay of ${s.animation?.delayMs}ms (over the 600ms budget) — heavy motion, may slow the theme.`,
    );
  }
  if (project.theme.animationLevel === "high" && animated.length > 4) {
    add(
      "info",
      `Animation Level is High with ${animated.length} animated sections — the full motion set renders on every page. Consider Medium if the theme feels slow.`,
    );
  }

  // --- score ------------------------------------------------------------------
  let score = 100;
  for (const i of issues) {
    if (i.severity === "error") score -= 15;
    else if (i.severity === "warning") score -= 5;
    else score -= 2;
  }
  return { issues, score: Math.max(0, score) };
}

// ---------------------------------------------------------------------------
// One-click fixes (pure: returns a NEW page, never mutates the input)
// ---------------------------------------------------------------------------

/**
 * Apply a single audit fix to a page. Returns a new Page object.
 * - replace-image: clears the placeholder image URL so a real one can be
 *   uploaded (we do not invent a replacement image).
 * - fill-text: writes fix.value (or a short honest prompt) into the text.
 * - set-alt: writes fix.value into the section title, which renderers use
 *   as the image alt text.
 * - set-meta: writes fix.value into the missing SEO title or description
 *   (whichever is empty; title first).
 * - remove-empty: drops the section from the page.
 * Unknown / unresolvable fixes return the page unchanged.
 */
export function applyAuditFix(page: Page, fix: AuditFix): Page {
  if (fix.type === "set-meta") {
    const seo = { ...(page.seo ?? {}) };
    if (!seo.title?.trim()) {
      seo.title = fix.value ?? page.title;
    } else if (!seo.description?.trim()) {
      seo.description = fix.value ?? page.title;
    } else {
      return page;
    }
    return { ...page, seo };
  }
  if (!fix.sectionId) return page;
  if (fix.type === "remove-empty") {
    return { ...page, sections: page.sections.filter((s) => s.id !== fix.sectionId) };
  }
  return {
    ...page,
    sections: page.sections.map((s) => {
      if (s.id !== fix.sectionId) return s;
      switch (fix.type) {
        case "replace-image":
          return { ...s, image: undefined };
        case "fill-text":
          return { ...s, text: fix.value ?? "Replace this with your own store copy." };
        case "set-alt":
          return { ...s, title: fix.value ?? s.title };
        default:
          return s;
      }
    }),
  };
}
