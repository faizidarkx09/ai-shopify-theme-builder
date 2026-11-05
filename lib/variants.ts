// lib/variants.ts — Cut C #24: Variant B + AI suggestions (seed of A/B).
// Pure functions, no network: duplicate a page as Variant B with one
// AI-suggested headline/CTA change, plus a pre-publish checklist that
// reuses the export audit. The "AI suggestion" is the existing template
// regenerator (lib/ai/regenerate.ts) — same helper the editor's
// Regenerate button uses — never a fresh invention.

import type { Page, Project, Section } from "./types";
import { regenerateSection } from "./ai/regenerate";
import { auditProject } from "./export/audit";

function variantUid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface DuplicateVariantResult {
  /** New project with the variant page appended (input is not mutated). */
  project: Project;
  variantPage: Page;
  /** The one AI-suggested change applied to the variant, in plain words. */
  suggestion: string;
}

/**
 * Duplicate a page as Variant B: deep copy, variantOf set to the source
 * id, title + " (Variant B)", slug suffixed "-variant-b", then ONE
 * AI-suggested change — regenerate the hero title if the page has a hero,
 * otherwise the cta text. Returns the new project, the variant page and
 * the suggestion text. Returns null when the source page does not exist.
 */
export function duplicatePageAsVariant(
  project: Project,
  pageId: string,
): DuplicateVariantResult | null {
  const source = project.pages.find((p) => p.id === pageId);
  if (!source) return null;
  const variantPage: Page = deepCopy(source);
  variantPage.id = variantUid();
  variantPage.variantOf = source.id;
  variantPage.title = `${source.title} (Variant B)`;
  variantPage.slug = `${source.slug}-variant-b`;

  // One AI-suggested change: hero title first, cta text as the fallback.
  let suggestion = "";
  const heroIdx = variantPage.sections.findIndex((s) => s.type === "hero");
  const ctaIdx = variantPage.sections.findIndex((s) => s.type === "cta");
  const targetIdx = heroIdx >= 0 ? heroIdx : ctaIdx;
  if (targetIdx >= 0) {
    const before: Section = variantPage.sections[targetIdx] as Section;
    const after = regenerateSection(before, project.theme ?? null, undefined, 1);
    variantPage.sections[targetIdx] = after;
    suggestion =
      before.type === "hero"
        ? `AI suggestion: hero headline changed from "${before.title}" to "${after.title}".`
        : `AI suggestion: call-to-action text changed from "${before.title}" to "${after.title}".`;
  } else {
    suggestion =
      "AI suggestion: no hero or call-to-action section on this page, so no headline change was applied — add one to test a variant.";
  }

  const nextProject: Project = {
    ...project,
    pages: [...project.pages, variantPage],
    updatedAt: new Date().toISOString(),
  };
  return { project: nextProject, variantPage, suggestion };
}

export interface ChecklistItem {
  item: string;
  done: boolean;
}

/**
 * Pre-publish checklist for a page (used for Variant B before it ships).
 * Reuses auditProject's score + issues — no second opinion, no invented
 * checks: SEO set, no placeholder products, at least one page, no
 * blocking audit errors, no empty sections, audit score 70+.
 */
export function prePublishChecklist(project: Project, page: Page): ChecklistItem[] {
  const audit = auditProject(project, page);
  const hasIssue = (needle: string) =>
    audit.issues.some((i) => i.message.includes(needle));
  const hasPlaceholderProducts = audit.issues.some(
    (i) => i.message.includes("placeholder image") || i.message.includes("demo products"),
  );
  return [
    { item: "SEO title set", done: !!page.seo?.title?.trim() },
    { item: "Meta description set", done: !!page.seo?.description?.trim() },
    {
      item: "No placeholder products on this page",
      done: !hasPlaceholderProducts,
    },
    {
      item: "At least one page in the project",
      done: project.pages.length >= 1,
    },
    {
      item: "No empty sections",
      done: !hasIssue("is empty (no title"),
    },
    {
      item: "No blocking audit errors",
      done: !audit.issues.some((i) => i.severity === "error"),
    },
    {
      item: `Audit score 70 or higher (now ${audit.score})`,
      done: audit.score >= 70,
    },
  ];
}
