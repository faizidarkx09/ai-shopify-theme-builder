"use client";

// Editor SHELL ONLY (Agent 1) — state + handlers live here; layout is split
// into components/editor/EditorTopBar.tsx (top bar), EditorChat.tsx (left
// chat) and EditorPreview.tsx (right preview, incl. SectionView).
// Generation yahan /api/generate (Agent 2, SSE) ko call karta hai aur
// events ko live preview me dikhata hai; section ki asal editing
// (toolbar/panel) Cut 2 — Agent 3 — ka kaam hai, is shell me sirf
// section select/highlight hota hai.

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getProjectStore, type ProjectStore } from "@/lib/db/store";
import { derivePlan } from "@/lib/ai/plan";
import { buildPageFromTemplate } from "@/lib/templates";
import { getOrCreateDemoUser } from "@/lib/auth";
import EditorTopBar, { type ViewMode } from "@/components/editor/EditorTopBar";
import EditorChat from "@/components/editor/EditorChat";
import EditorPreview from "@/components/editor/EditorPreview";
import PlanApproval from "@/components/editor/PlanApproval";
import ExportModal from "@/components/editor/ExportModal";
import AdvancedPanel from "@/components/editor/AdvancedPanel";
import { deriveWizardStep } from "@/components/editor/WizardSteps";
import { Button, Card, EmptyState } from "@/components/ui";
import ThemeTokensPanel from "@/components/editor/ThemeTokensPanel";
import BrandKitPanel from "@/components/editor/BrandKitPanel";
import CreditMeter from "@/components/editor/CreditMeter";
import GuidedTour, {
  DEFAULT_TOUR_CHECKLIST,
  type TourChecklistItem,
} from "@/components/editor/GuidedTour";
import MediaLibrary from "@/components/editor/MediaLibrary";
import SectionLibrary from "@/components/editor/SectionLibrary";
import SeoPanel from "@/components/editor/SeoPanel";
import { LANDING_PROMPT_KEY } from "@/app/page";
import { FREE_STARTING_CREDITS, spendCredits } from "@/lib/credits";
import { saveSections } from "@/lib/sections";
import { THEME_PRESETS } from "@/lib/theme";
import type { SitePlan } from "@/lib/ai/plan";
import { applyAuditFix, auditProject, type AuditFix } from "@/lib/export/audit";
import { duplicatePageAsVariant, prePublishChecklist, type ChecklistItem } from "@/lib/variants";
import { polishPage, type PolishFix } from "@/lib/polish";
import FunnelView from "@/components/editor/FunnelView";
import CommentsPanel, { type NewCommentInput } from "@/components/editor/CommentsPanel";
import CsvImport from "@/components/editor/CsvImport";
import { canExportShopify, getBillingState } from "@/lib/billing";
import { downloadPng, exportPagesToPng } from "@/lib/export/png";
import {
  isSectionType,
  type BrandKit,
  type CsvProduct,
  type Page,
  type PageSeo,
  type Project,
  type ProjectComment,
  type Section,
  type SectionAnimation,
  type Theme,
} from "@/lib/types";

const ENTRANCES: SectionAnimation["entrance"][] = [
  "none",
  "fade",
  "slide-up",
  "zoom",
  "slide-left",
];
const HOVERS: SectionAnimation["hover"][] = ["none", "lift", "scale"];

/**
 * Fix pass — /editor/demo is a REAL demo, never a dead-end error page.
 * The demo project is built from the template generator (derivePlan +
 * buildPageFromTemplate) and reused by name on refresh, so a first-time
 * visitor always lands on a working wizard with real pages.
 */
const DEMO_PROJECT_NAME = "Demo Store";
const DEMO_PROMPT = "A skincare and beauty store with a soft pink glow theme";

function createDemoProjectFromTemplate(
  store: ProjectStore,
  ownerId: string,
): Project {
  const plan = derivePlan(DEMO_PROMPT);
  const pages = plan.pages.map((pp) =>
    buildPageFromTemplate(DEMO_PROMPT, plan.theme, pp.pageType, pp.title),
  );
  // Fix pass 2 — isDemo: the demo never counts toward the free-project
  // limit (lib/db/store count) and its preview renders photo-free.
  return store.create(
    { name: DEMO_PROJECT_NAME, prompt: DEMO_PROMPT, theme: plan.theme, pages, isDemo: true },
    ownerId,
  );
}

function normalizeAnimation(raw: unknown): SectionAnimation | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const a = raw as Record<string, unknown>;
  const entrance =
    typeof a.entrance === "string" &&
    (ENTRANCES as readonly string[]).includes(a.entrance)
      ? (a.entrance as SectionAnimation["entrance"])
      : undefined;
  const hover =
    typeof a.hover === "string" && (HOVERS as readonly string[]).includes(a.hover)
      ? (a.hover as SectionAnimation["hover"])
      : undefined;
  const delayMs = typeof a.delayMs === "number" ? a.delayMs : undefined;
  if (entrance === undefined && hover === undefined && delayMs === undefined)
    return undefined;
  return { entrance, delayMs, hover };
}

function normalizeMeta(raw: unknown): Section["meta"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function normalizeSection(raw: unknown): Section | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || typeof s.title !== "string") return null;
  if (!isSectionType(s.type)) return null;
  const padding =
    typeof s.padding === "number"
      ? s.padding
      : typeof s.padding === "string"
        ? Number.parseInt(s.padding, 10) || 48
        : 48;
  return {
    id: s.id,
    type: s.type,
    title: s.title,
    subtitle: typeof s.subtitle === "string" ? s.subtitle : undefined,
    text: typeof s.text === "string" ? s.text : undefined,
    image: typeof s.image === "string" ? s.image : undefined,
    bgColor: typeof s.bgColor === "string" ? s.bgColor : undefined,
    textColor: typeof s.textColor === "string" ? s.textColor : undefined,
    align:
      s.align === "left" || s.align === "center" || s.align === "right"
        ? s.align
        : "left",
    padding,
    animation: normalizeAnimation(s.animation),
    layout: typeof s.layout === "string" ? s.layout : undefined,
    global: typeof s.global === "boolean" ? s.global : undefined,
    customHtml: typeof s.customHtml === "string" ? s.customHtml : undefined,
    customCss: typeof s.customCss === "string" ? s.customCss : undefined,
    customJs: typeof s.customJs === "string" ? s.customJs : undefined,
    meta: normalizeMeta(s.meta),
  };
}

function normalizeSeo(raw: unknown): PageSeo | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const seo: PageSeo = {
    title: typeof o.title === "string" ? o.title : undefined,
    description: typeof o.description === "string" ? o.description : undefined,
    handle: typeof o.handle === "string" ? o.handle : undefined,
    noindex: typeof o.noindex === "boolean" ? o.noindex : undefined,
  };
  return Object.values(seo).some((v) => v !== undefined) ? seo : undefined;
}

function normalizePage(raw: unknown): Page | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  if (
    typeof p.id !== "string" ||
    typeof p.slug !== "string" ||
    typeof p.title !== "string" ||
    !Array.isArray(p.sections)
  )
    return null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    sections: p.sections
      .map(normalizeSection)
      .filter((s): s is Section => s !== null),
    seo: normalizeSeo(p.seo),
    variantOf: typeof p.variantOf === "string" ? p.variantOf : undefined,
    funnelStep:
      p.funnelStep === "landing" ||
      p.funnelStep === "product" ||
      p.funnelStep === "upsell" ||
      p.funnelStep === "thankyou"
        ? p.funnelStep
        : undefined,
  };
}

function normalizeTheme(raw: unknown): Theme | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const c = t.colors as Record<string, unknown> | undefined;
  if (
    typeof t.name !== "string" ||
    typeof t.font !== "string" ||
    typeof t.style !== "string" ||
    !c ||
    ["primary", "secondary", "background", "text", "accent"].some(
      (k) => typeof c[k] !== "string",
    )
  )
    return null;
  const tokensRaw = t.tokens as Record<string, unknown> | undefined;
  const tokens =
    tokensRaw && typeof tokensRaw === "object"
      ? {
          radius: typeof tokensRaw.radius === "number" ? tokensRaw.radius : undefined,
          spacing: typeof tokensRaw.spacing === "number" ? tokensRaw.spacing : undefined,
        }
      : undefined;
  return {
    name: t.name,
    font: t.font,
    style: t.style,
    colors: {
      primary: c.primary as string,
      secondary: c.secondary as string,
      background: c.background as string,
      text: c.text as string,
      accent: c.accent as string,
    },
    tokens:
      tokens && (tokens.radius !== undefined || tokens.spacing !== undefined)
        ? tokens
        : undefined,
    presetId: typeof t.presetId === "string" ? t.presetId : undefined,
    displayName: typeof t.displayName === "string" ? t.displayName : undefined,
    // Cut C #22 (integrator): keep the animation level across SSE theme
    // events so a regeneration does not silently reset the user's choice.
    animationLevel:
      t.animationLevel === "none" ||
      t.animationLevel === "low" ||
      t.animationLevel === "medium" ||
      t.animationLevel === "high"
        ? t.animationLevel
        : undefined,
  };
}

export default function EditorPage() {
  const params = useParams();
  const projectId = Array.isArray(params.projectId)
    ? params.projectId[0]
    : (params.projectId as string);
  const [project, setProject] = useState<Project | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewMode>("desktop");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [justDownloaded, setJustDownloaded] = useState(false);
  // Cut A #1 — plan approval gate: plan shown after a free-text prompt,
  // before any generation streams.
  const [plan, setPlan] = useState<SitePlan | null>(null);
  const [planApproved, setPlanApproved] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  // Cut A #4 — bumped after a successful export to clear the draft badge.
  const [clearDirtySignal, setClearDirtySignal] = useState(0);
  // True only when the submit came from the "+ Page" quick action, which
  // keeps the legacy direct-generate path (no plan gate).
  const quickPageRef = useRef(false);
  const [streamingSections, setStreamingSections] = useState<Section[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  // Cut B #9 — reference URL from PromptStarters (EditorChat). Kept in a
  // ref too so the plan-gate call never reads a stale closure.
  const [referenceUrl, setReferenceUrl] = useState("");
  const referenceUrlRef = useRef("");
  // Wave 2 — guided wizard + progressive disclosure (beginner mode
  // DEFAULT). `advanced` is the ONE toggle in the top bar: OFF = only
  // the current step's essentials render; ON = the Advanced drawer
  // (one tidy panel) shows every advanced feature. `manualStep` is the
  // user's clicked step; null = derive it from project state.
  const [advanced, setAdvanced] = useState(false);
  const [manualStep, setManualStep] = useState<number | null>(null);
  // Wave 2 — bump to open the Custom Block modal from the Advanced drawer.
  const [customBlockSignal, setCustomBlockSignal] = useState(0);
  // Cut C #24 — Variant B notice + pre-publish checklist.
  const [variantNotice, setVariantNotice] = useState("");
  const [variantChecklist, setVariantChecklist] = useState<ChecklistItem[] | null>(null);
  // Cut C #25 — comment mode + pins (owned here, persisted on the project).
  const [commentMode, setCommentMode] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  // One staged comment proposal at a time (shown in PageEditor's
  // Accept/Discard box); the queue advances only on Accept/Discard.
  const [commentProposal, setCommentProposal] = useState<{
    section: Section;
    changes: string[];
    commentId: string;
  } | null>(null);
  const commentQueueRef = useRef<ProjectComment[]>([]);
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");
  // Cut C #30 — Polish pass results.
  const [polishFixes, setPolishFixes] = useState<PolishFix[] | null>(null);
  const [polishing, setPolishing] = useState(false);
  // Cut C #23 — funnel page generation busy state.
  const [funnelBusy, setFunnelBusy] = useState(false);
  // Cut B #17 — guided tour after the first generation for this project.
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState<0 | 1 | 2 | 3>(0);
  const [tourChecklist, setTourChecklist] =
    useState<TourChecklistItem[]>(DEFAULT_TOUR_CHECKLIST);
  // Cut B lag fix — bumped whenever the store's sections change outside
  // PageEditor (audit fix, library insert/swap, media apply) so the
  // preview remounts and shows the new sections immediately.
  const [previewRemountKey, setPreviewRemountKey] = useState(0);
  // Cut B #18 — landing prefill must run once per mount.
  const prefillDoneRef = useRef(false);
  // Reference summary returned with the plan (title / niche / accent).
  const [planReference, setPlanReference] = useState<{
    title?: string;
    nicheHint?: string;
    accent?: string;
  } | null>(null);

  useEffect(() => {
    const store = getProjectStore();
    // Fix pass — /editor/demo auto-creates (or reuses) a real demo
    // project from the template generator and opens the wizard on it.
    // A first-time visitor never sees the "Project nahi mila" dead end.
    if (projectId === "demo") {
      const user = getOrCreateDemoUser();
      // Fix pass 2 — reuse by the isDemo flag (name fallback covers
      // demo projects stored before the flag existed).
      const existing =
        store.list(user.id).find((p) => p.isDemo === true || p.name === DEMO_PROJECT_NAME) ?? null;
      let demo = existing ?? createDemoProjectFromTemplate(store, user.id);
      // Fix pass 2 — migrate demos stored before the isDemo flag
      // existed (e.g. the QA browser's demo): flag them so they stop
      // eating a free slot.
      if (!demo.isDemo) {
        const flagged = store.update(demo.id, { isDemo: true });
        if (flagged) demo = flagged as Project;
      }
      setProject(demo);
      setActivePageId(demo.pages[0]?.id ?? null);
      // Fix pass 2 — the demo opens WITH a plan already derived (free,
      // synchronous derivePlan — no credits, no API call), so a
      // first-time visitor lands on Step 2 (Plan) with a visible plan
      // and an Approve button, never on an empty Step 3.
      setPlan(derivePlan(DEMO_PROMPT));
      setPlanApproved(false);
      setPlanReference(null);
      setPrompt(DEMO_PROMPT);
      return;
    }
    const found = store.get(projectId);
    if (!found) {
      setNotFound(true);
      return;
    }
    // Cut B #14 — free projects start at 100 test credits; initialise
    // the field when an older or landing-created project has none
    // (getCredits already defaults to 100, this makes it explicit).
    let current = found as Project;
    if (!current.credits) {
      const updated = store.update(current.id, {
        credits: { balance: FREE_STARTING_CREDITS, used: 0, history: [] },
      });
      if (updated) current = updated as Project;
    }
    setProject(current);
    setActivePageId(current.pages[0]?.id ?? null);
    // Cut B #18 — landing prefill: ?prompt= first, then sessionStorage.
    if (prefillDoneRef.current) return;
    prefillDoneRef.current = true;
    let prefill = "";
    try {
      const params = new URLSearchParams(window.location.search);
      prefill = params.get("prompt") ?? "";
      if (!prefill) {
        prefill =
          window.sessionStorage.getItem(
            `${LANDING_PROMPT_KEY}:${projectId}`,
          ) ?? "";
      }
      window.sessionStorage.removeItem(`${LANDING_PROMPT_KEY}:${projectId}`);
      // Consume the query param so a refresh does not re-run (and
      // re-charge) the plan gate.
      if (params.get("prompt")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {
      // Private mode / no storage — prompt stays empty.
    }
    const clean = prefill.trim();
    if (!clean) return;
    setPrompt(clean);
    // Fresh landing project (no pages yet) → run the plan gate with it.
    if (current.pages.length === 0) {
      setTimeout(() => {
        void runPlanGate(clean, current);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const activePage: Page | null =
    project?.pages.find((p) => p.id === activePageId) ?? null;

  // Wave 2 — wizard step: manual click wins, otherwise derive it from
  // project state (Prompt -> Plan -> Pages; Export only by clicking).
  // A state transition (plan arrives / pages are built) clears the
  // manual override so the wizard follows the project forward.
  const derivedStep = deriveWizardStep({
    hasPages: (project?.pages.length ?? 0) > 0,
    planPending: plan !== null && !planApproved,
    planLoading,
    generating,
  });
  const wizardStep = manualStep ?? derivedStep;
  useEffect(() => {
    setManualStep(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, project?.pages.length]);
  function canGoToStep(step: number): boolean {
    const hasPages = (project?.pages.length ?? 0) > 0;
    if (step === 0) return true;
    if (step === 1) return plan !== null || planLoading || hasPages;
    if (step === 2) return hasPages || generating;
    if (step === 3) return hasPages;
    return false;
  }

  function saveProject(patch: Partial<Project>) {
    if (!project) return;
    const updated = getProjectStore().update(project.id, patch);
    if (updated) setProject(updated as Project);
  }

  // Cut B #14 — persist a credit spend for any project object. Uses the
  // store directly (no stale-state risk from the `project` closure),
  // which matters for the landing prefill and the generate loop.
  function persistCredits(spentProject: Project) {
    const updated = getProjectStore().update(spentProject.id, {
      credits: spentProject.credits,
    });
    if (updated) setProject(updated as Project);
  }

  // Cut A #4 — PageEditor returns a whole project after a version push or
  // restore; persist its pages/theme/versions through the same store.
  // Cut B #14 — AI edits and regenerates are staged inside PageEditor
  // (it calls /api/edit itself and offers no pre-call hook), so their
  // 2-credit charge lands here at Accept time, when the version snapshot
  // is pushed: a new version labelled "AI edit: …" / "AI add section: …"
  // is charged as one aiEdit (2 test credits). Restores are not charged.
  function handleProjectChange(next: Project) {
    const prevVersions = project?.versions ?? [];
    const newVersion = (next.versions ?? []).find(
      (v) => !prevVersions.some((pv) => pv.id === v.id),
    );
    const patch: Partial<Project> = {
      pages: next.pages,
      theme: next.theme,
      versions: next.versions,
    };
    if (
      newVersion &&
      (newVersion.label.startsWith("AI edit:") ||
        newVersion.label.startsWith("AI add section:"))
    ) {
      const spent = spendCredits(next, "aiEdit");
      if (spent.ok) {
        patch.credits = spent.project.credits;
      } else {
        setError(
          "Not enough test credits — upgrade on the Billing page (TEST MODE ONLY)",
        );
      }
    }
    const updated = getProjectStore().update(next.id, patch);
    if (updated) setProject(updated as Project);
  }

  // Cut A #3 — audit is computed whenever a page exists, so the Step-4
  // (Export) wizard view can show its summary without opening the modal.
  const exportAudit = useMemo(() => {
    if (!project || !activePage) return null;
    return auditProject(project, activePage);
  }, [project, activePage]);

  // Cut A #3 — one-click audit fix: apply to the active page and persist.
  // Cut B lag fix — PageEditor holds its own section state AND a
  // localStorage mirror (lib/sections saveSections), so a store-only
  // update never reached the preview. The fixed sections are written to
  // both, then the preview is remounted (previewRemountKey) so the fix
  // shows immediately instead of after a page switch.
  function handleApplyFix(fix: AuditFix) {
    if (!project || !activePage) return;
    const fixed = applyAuditFix(activePage, fix);
    if (fixed === activePage) return;
    saveProject({
      pages: project.pages.map((p) =>
        p.id === activePage.id ? fixed : p,
      ),
    });
    saveSections(project.id, activePage.id, fixed.sections);
    setPreviewRemountKey((n) => n + 1);
    setExportMsg("Fix lag gaya — page update ho gaya.");
  }

  // ---- Cut C #24 — Variant B --------------------------------------------
  // Duplicate the active page as Variant B, persist, select it, and show
  // the AI suggestion + pre-publish checklist.
  function handleDuplicateVariant(pageId: string) {
    if (!project) return;
    const result = duplicatePageAsVariant(project, pageId);
    if (!result) {
      setError("Page nahi mili — Variant B nahi ban saka.");
      return;
    }
    const updated = getProjectStore().update(project.id, {
      pages: result.project.pages,
    });
    if (updated) setProject(updated as Project);
    setActivePageId(result.variantPage.id);
    setVariantNotice(result.suggestion);
    setVariantChecklist(
      prePublishChecklist(result.project, result.variantPage),
    );
    setStatus(`Variant B ready hai — “${result.variantPage.title}”.`);
  }

  // ---- Cut C #30 — Polish pass -------------------------------------------
  function handlePolish() {
    if (!project || !activePage || polishing) return;
    setPolishing(true);
    try {
      const { page, fixes } = polishPage(activePage, project.theme);
      saveProject({
        pages: project.pages.map((p) =>
          p.id === activePage.id ? page : p,
        ),
      });
      syncSectionsAndRemount(activePage.id, page.sections);
      setPolishFixes(fixes);
      setStatus(
        fixes.length > 0
          ? `Polish ho gaya — ${fixes.length} fix${fixes.length === 1 ? "" : "es"} lag gaye.`
          : "Polish ho gaya — koi fix zaroori nahi tha.",
      );
    } finally {
      setPolishing(false);
    }
  }

  // ---- Cut C #25 — Comments ----------------------------------------------
  const pageComments: ProjectComment[] = activePage
    ? (project?.comments ?? []).filter((c) => c.pageId === activePage.id)
    : [];

  function handleAddComment(input: NewCommentInput) {
    if (!project) return;
    const comment: ProjectComment = {
      id: `cmt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      ...input,
      status: "open",
      createdAt: new Date().toISOString(),
    };
    saveProject({ comments: [...(project.comments ?? []), comment] });
    setSelectedCommentId(comment.id);
  }

  function handleResolveComment(id: string) {
    if (!project) return;
    saveProject({
      comments: (project.comments ?? []).map((c) =>
        c.id === id ? { ...c, status: "done" as const } : c,
      ),
    });
  }

  /** Scope a comment to one section: explicit sectionId first, else the
   *  section nearest the pin (sections stack vertically in preview order,
   *  so the pin's y% picks the section index), else the first section. */
  function scopeSectionForComment(
    comment: ProjectComment,
    page: Page,
  ): Section | null {
    if (page.sections.length === 0) return null;
    if (comment.sectionId) {
      const byId = page.sections.find((s) => s.id === comment.sectionId);
      if (byId) return byId;
    }
    const idx = Math.min(
      page.sections.length - 1,
      Math.max(0, Math.floor((comment.yPct / 100) * page.sections.length)),
    );
    return page.sections[idx] ?? page.sections[0] ?? null;
  }

  /** One comment -> one preview-only /api/edit call -> staged proposal in
   *  PageEditor's Accept/Discard box. Resolves only on Accept. */
  async function applyComment(comment: ProjectComment) {
    if (!project) return;
    const page =
      project.pages.find((p) => p.id === comment.pageId) ?? activePage;
    const section = page ? scopeSectionForComment(comment, page) : null;
    if (!page || !section) {
      setCommentError("Comment apply nahi ho saka — koi section nahi mila.");
      advanceCommentQueue(comment.id);
      return;
    }
    setCommentBusy(true);
    setCommentError("");
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instruction: comment.text,
          section,
          preview: true,
          theme: project.theme,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as {
        section: Section;
        changes: string[];
      };
      // Switch to the comment's page so the proposal renders there.
      setActivePageId(page.id);
      setCommentProposal({
        section: data.section,
        changes: data.changes ?? ["Comment applied as a proposed edit."],
        commentId: comment.id,
      });
    } catch (err) {
      setCommentError(
        `Comment apply fail ho gaya: ${err instanceof Error ? err.message : "unknown error"}`,
      );
      advanceCommentQueue(comment.id);
    } finally {
      setCommentBusy(false);
    }
  }

  /** Move the Apply-all queue forward after Accept, Discard or failure. */
  function advanceCommentQueue(doneId: string) {
    const rest = commentQueueRef.current.filter((c) => c.id !== doneId);
    commentQueueRef.current = rest;
    if (rest.length > 0) {
      void applyComment(rest[0] as ProjectComment);
    }
  }

  /** Apply-all: open comments on the active page, one at a time, in list order. */
  function handleApplyAllComments() {
    if (!project || commentBusy || commentProposal) return;
    const open = pageComments.filter((c) => c.status === "open");
    if (open.length === 0) return;
    commentQueueRef.current = open;
    setCommentError("");
    void applyComment(open[0] as ProjectComment);
  }

  function handleCommentProposalAccept(commentId: string) {
    handleResolveComment(commentId);
    setCommentProposal(null);
    advanceCommentQueue(commentId);
  }

  function handleCommentProposalDiscard(commentId: string) {
    setCommentProposal(null);
    advanceCommentQueue(commentId);
  }

  // ---- Cut C #23 — Funnel -------------------------------------------------
  async function handleGenerateFunnelPage(step: "upsell" | "thankyou") {
    if (!project || generating || funnelBusy) return;
    const slug = step === "upsell" ? "upsell" : "thank-you";
    const title = step === "upsell" ? "Upsell" : "Thank You";
    const clean =
      step === "upsell"
        ? "Generate upsell page with bundle offer"
        : "Generate thank-you page with order confirmation";
    const spend = spendCredits(project, "generatePage");
    if (!spend.ok) {
      setError(
        "Not enough test credits — upgrade on the Billing page (TEST MODE ONLY)",
      );
      return;
    }
    persistCredits(spend.project);
    setFunnelBusy(true);
    setGenerating(true);
    setError("");
    setStreamingSections([]);
    try {
      const { page } = await streamGenerate(
        {
          prompt: clean,
          pageType: "home",
          theme: project.theme,
          projectId: project.id,
          ...(project.csvProducts ? { products: project.csvProducts } : {}),
          ...(project.brandKit ? { brandKit: project.brandKit } : {}),
        },
        { slug, title },
      );
      const funnelPage: Page = { ...page, slug, title, funnelStep: step };
      const baseOrder = project.funnelOrder ?? project.pages.map((p) => p.id);
      saveProject({
        pages: [...project.pages, funnelPage],
        funnelOrder: [...baseOrder, funnelPage.id],
      });
      setActivePageId(funnelPage.id);
      setStatus(`Ho gaya — “${title}” page ready hai.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Funnel page nahi ban saka.");
      setStatus("");
    } finally {
      setStreamingSections([]);
      setGenerating(false);
      setFunnelBusy(false);
    }
  }

  // ---- Cut C — CSV import --------------------------------------------------
  function handleCsvImport(products: CsvProduct[]) {
    if (!project) return;
    saveProject({ csvProducts: products });
    setStatus(
      `${products.length} real product${products.length === 1 ? "" : "s"} import ho gaye — next generation me demo catalog ki jagah ye use honge.`,
    );
  }

  // INTEGRATION (Agent 3 PageEditor -> Agent 5 store): sections change hone
  // par sirf tab save karo jab active page se waqai farq ho — warna
  // PageEditor ke mount-time effect se bekaar save loop ban jata.
  function handleSectionsChange(sections: Section[]) {
    if (!project || !activePage) return;
    if (JSON.stringify(sections) === JSON.stringify(activePage.sections))
      return;
    saveProject({
      pages: project.pages.map((p) =>
        p.id === activePage.id ? { ...p, sections } : p,
      ),
    });
  }

  // ---- Cut B #11/#13/#20 — side-panel actions ---------------------------
  // Store-side section changes (library insert/swap, media apply, audit
  // fix) must ALSO update PageEditor's localStorage mirror and remount
  // the preview — otherwise PageEditor rehydrates the old sections and
  // syncs them back over the change (same lag as the audit fix).
  function syncSectionsAndRemount(pageId: string, sections: Section[]) {
    saveSections(projectId, pageId, sections);
    setPreviewRemountKey((n) => n + 1);
  }

  function handleLibraryInsert(section: Section) {
    if (!project || !activePage) {
      setError("Pehle ek page generate karo, phir section insert hoga.");
      return;
    }
    const next = [...activePage.sections, section];
    saveProject({
      pages: project.pages.map((p) =>
        p.id === activePage.id ? { ...p, sections: next } : p,
      ),
    });
    syncSectionsAndRemount(activePage.id, next);
    setSelectedSectionId(section.id);
    setStatus(`Section add ho gaya: ${section.title || section.type}.`);
  }

  function handleLibrarySwap(section: Section) {
    if (!project || !activePage || !selectedSectionId) return;
    const next = activePage.sections.map((s) =>
      s.id === selectedSectionId ? section : s,
    );
    saveProject({
      pages: project.pages.map((p) =>
        p.id === activePage.id ? { ...p, sections: next } : p,
      ),
    });
    syncSectionsAndRemount(activePage.id, next);
    setSelectedSectionId(section.id);
    setStatus(`Section swap ho gaya: ${section.title || section.type}.`);
  }

  function handleSeoChange(seo: PageSeo) {
    if (!project || !activePage) return;
    saveProject({
      pages: project.pages.map((p) =>
        p.id === activePage.id ? { ...p, seo } : p,
      ),
    });
  }

  /** Patch one section's image anywhere in the project (active page or not). */
  function patchSectionImage(sectionId: string, imageUrl: string) {
    if (!project) return;
    const target = project.pages.find((p) =>
      p.sections.some((s) => s.id === sectionId),
    );
    if (!target) return;
    const nextSections = target.sections.map((s) =>
      s.id === sectionId ? { ...s, image: imageUrl } : s,
    );
    saveProject({
      pages: project.pages.map((p) =>
        p.id === target.id ? { ...p, sections: nextSections } : p,
      ),
    });
    syncSectionsAndRemount(target.id, nextSections);
  }

  function handleApplyImage(sectionId: string, imageUrl: string) {
    patchSectionImage(sectionId, imageUrl);
    setStatus("Image apply ho gayi.");
  }

  function handleRegenerateImage(imageUrl: string) {
    if (!project || !selectedSectionId) {
      setError(
        "Pehle preview me ek section select karo, phir image regenerate hogi.",
      );
      return;
    }
    // Cut B #14 — 1 test credit per regenerated image.
    const spend = spendCredits(project, "regenerateImage");
    if (!spend.ok) {
      setError(
        "Not enough test credits — upgrade on the Billing page (TEST MODE ONLY)",
      );
      return;
    }
    persistCredits(spend.project);
    patchSectionImage(selectedSectionId, imageUrl);
    setStatus("Fresh placeholder image lag gayi (picsum — AI image nahi).");
  }

  /** Cut B #10 — "Read brand from URL": POST /api/brand, partial kit back. */
  async function handleReadBrandFromUrl(
    url: string,
  ): Promise<Partial<BrandKit> | null> {
    const res = await fetch("/api/brand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      brandKit?: Partial<BrandKit>;
    } | null;
    return data?.brandKit ?? null;
  }

  /** Cut B #17 — show the guided tour after the FIRST generation, once. */
  function maybeShowTour(hadPagesBefore: boolean) {
    if (hadPagesBefore) return;
    try {
      if (window.localStorage.getItem(`stb-tour-done-${projectId}`)) return;
    } catch {
      return;
    }
    setTourStep(0);
    setTourChecklist(DEFAULT_TOUR_CHECKLIST);
    setTourOpen(true);
  }

  async function doExport(format: "shopify" | "code" | "png") {
    if (!project || !activePage || exporting) return;
    setExportMsg("");
    if (format === "shopify") {
      const gate = canExportShopify(getBillingState().planId);
      if (!gate.allowed) {
        setExportMsg(
          `${gate.reason ?? "Shopify export ke liye paid plan chahiye."} Billing page se plan upgrade karo (TEST MODE ONLY).`,
        );
        return;
      }
    }
    if (format === "png") {
      const el = document.querySelector<HTMLElement>("[data-page-preview]");
      if (!el) {
        setExportMsg("PNG ke liye pehle preview khula hona chahiye.");
        return;
      }
      setExporting(true);
      try {
        const results = await exportPagesToPng(
          { [activePage.slug]: el },
          [activePage],
        );
        if (results.length === 0) {
          setExportMsg("PNG nahi ban saka — preview element nahi mila.");
        } else {
          results.forEach(downloadPng);
          setExportMsg(`PNG download ho gaya: ${results.map((r) => r.filename).join(", ")}`);
          setClearDirtySignal((n) => n + 1);
        }
      } catch (err) {
        setExportMsg(err instanceof Error ? err.message : "PNG export fail ho gaya.");
      } finally {
        setExporting(false);
      }
      return;
    }
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project, format }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Export fail (${res.status}).`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        format === "shopify"
          ? `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-shopify-theme.zip`
          : `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-code.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportMsg(
        format === "shopify"
          ? "Shopify theme zip download ho gaya — Shopify > Online Store > Import se upload karo. Theme me placeholder products hain."
          : "Code zip download ho gaya.",
      );
      // Successful download clears the "Draft — not exported yet" badge;
      // the modal stays open so the Shopify deploy guide is visible.
      setJustDownloaded(format === "shopify");
      setClearDirtySignal((n) => n + 1);
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : "Export fail ho gaya.");
    } finally {
      setExporting(false);
    }
  }

  // One SSE generation call — shared by the legacy direct path and the
  // plan path. Streams theme + sections live, returns the finished page
  // (and the theme from the theme event, if any). `fallback` is used only
  // if the stream ends without a `done` page.
  async function streamGenerate(
    body: Record<string, unknown>,
    fallback: { slug: string; title: string },
  ): Promise<{ theme: Theme | null; page: Page }> {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Generate API failed (${res.status}).`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let nextTheme: Theme | null = null;
    let nextPage: Page | null = null;
    const streamed: Section[] = [];

    const handleEvent = (evt: unknown) => {
      if (!evt || typeof evt !== "object") return;
      const ev = evt as Record<string, unknown>;
      if (ev.type === "theme") {
        const t = normalizeTheme(ev.theme);
        if (t) {
          nextTheme = t;
          setStatus(`Theme ban gaya: ${t.name} — ab page generate ho raha hai…`);
        }
      } else if (ev.type === "section") {
        const s = normalizeSection(ev.section);
        if (s) {
          streamed.push(s);
          setStreamingSections([...streamed]);
          const total =
            typeof ev.total === "number" ? ev.total : streamed.length;
          setStatus(`Section ${streamed.length}/${total} ban raha hai…`);
        }
      } else if (ev.type === "done") {
        const p = normalizePage(ev.page);
        if (p) nextPage = p;
      } else if (ev.type === "error") {
        throw new Error(
          typeof ev.message === "string" ? ev.message : "Generation failed.",
        );
      }
    };

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        try {
          handleEvent(JSON.parse(trimmed.slice(5)));
        } catch {
          // Adhoora chunk — agle read me poora hoga.
        }
      }
    }
    if (buffer.trim().startsWith("data:")) {
      try {
        handleEvent(JSON.parse(buffer.trim().slice(5)));
      } catch {
        // ignore
      }
    }

    const page: Page =
      nextPage ??
      ({
        id: `page_${Date.now().toString(36)}`,
        slug: fallback.slug,
        title: fallback.title,
        sections: streamed,
      } as Page);
    return { theme: nextTheme, page };
  }

  // Legacy direct-generate path — one page, no plan gate. Kept for the
  // "+ Page" quick action only.
  async function generateDirect(clean: string) {
    if (!project) return;
    const hadPages = project.pages.length > 0;
    // Cut B #14 — 5 test credits per generated page.
    const spend = spendCredits(project, "generatePage");
    if (!spend.ok) {
      setError(
        "Not enough test credits — upgrade on the Billing page (TEST MODE ONLY)",
      );
      setStatus("");
      return;
    }
    persistCredits(spend.project);
    const pageType =
      /product/i.test(clean) && !/categor/i.test(clean)
        ? "product"
        : /categor/i.test(clean)
          ? "category"
          : "home";
    setStatus("Theme pehle ban raha hai…");
    const { theme, page } = await streamGenerate(
      {
        prompt: clean,
        pageType,
        theme: project.theme,
        projectId: project.id,
        // Cut B #10 — brand kit rides along so the theme carries it.
        ...(project.brandKit ? { brandKit: project.brandKit } : {}),
      },
      {
        slug: pageType,
        title: pageType === "home" ? "Home" : pageType,
      },
    );
    const nextTheme = theme ?? project.theme;
    saveProject({
      theme: nextTheme,
      pages: [...project.pages, page],
      messages: [
        ...project.messages,
        {
          id: `msg_${Date.now().toString(36)}`,
          role: "user" as const,
          text: clean,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setActivePageId(page.id);
    setStreamingSections([]);
    setStatus(`Ho gaya — “${page.title}” page ready hai.`);
    setPrompt("");
    maybeShowTour(hadPages);
  }

  // Plan path — runs the approved plan page by page, sequentially. The
  // plan theme is applied once, from the first page's theme event;
  // project.csvProducts (when present) go in every generate body.
  async function generateFromPlan(approved: SitePlan) {
    if (!project) return;
    const hadPages = project.pages.length > 0;
    const clean = approved.prompt;
    const built: Page[] = [];
    let accTheme = project.theme;
    // Credits are threaded through a local copy: spendCredits is pure,
    // and the `project` closure goes stale across the loop's saves.
    let creditProject = project;
    let first = true;
    for (let i = 0; i < approved.pages.length; i++) {
      const planPage = approved.pages[i];
      // Cut B #14 — 5 test credits per generated page; stop when the
      // balance runs out, keeping the pages already built.
      const spend = spendCredits(creditProject, "generatePage");
      if (!spend.ok) {
        setError(
          "Not enough test credits — upgrade on the Billing page (TEST MODE ONLY)",
        );
        setStatus("");
        break;
      }
      creditProject = spend.project;
      persistCredits(spend.project);
      setStatus(
        `Page ${i + 1}/${approved.pages.length} ban raha hai — “${planPage.title}”…`,
      );
      setStreamingSections([]);
      const { theme, page } = await streamGenerate(
        {
          prompt: clean,
          plan: approved,
          planPageIndex: i,
          projectId: project.id,
          ...(project.csvProducts ? { products: project.csvProducts } : {}),
          // Cut B #10 — brand kit rides along so the theme carries it.
          ...(project.brandKit ? { brandKit: project.brandKit } : {}),
        },
        { slug: planPage.slug, title: planPage.title },
      );
      if (theme) accTheme = theme;
      built.push(page);
      if (first) {
        // Theme from the plan applied once, from the first page's theme event.
        saveProject({ theme: accTheme, pages: [...project.pages, ...built] });
        setActivePageId(page.id);
        first = false;
      } else {
        saveProject({ theme: accTheme, pages: [...project.pages, ...built] });
      }
      setStreamingSections([]);
    }
    if (built.length === 0) {
      setStreamingSections([]);
      return;
    }
    saveProject({
      theme: accTheme,
      pages: [...project.pages, ...built],
      messages: [
        ...project.messages,
        {
          id: `msg_${Date.now().toString(36)}`,
          role: "user" as const,
          text: clean,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setActivePageId(built[built.length - 1]?.id ?? null);
    setStreamingSections([]);
    setStatus(`Ho gaya — ${built.length} pages ready hain.`);
    setPrompt("");
    maybeShowTour(hadPages);
  }

  // Cut A #1 — plan gate: a free-text prompt first fetches a plan from
  // POST /api/plan and shows PlanApproval; nothing streams until the user
  // approves. The "+ Page" quick action skips the gate (legacy path).
  // Cut B #9/#14 — the reference URL (when set in PromptStarters) rides
  // along as `referenceUrl`; the plan costs 10 test credits, spent before
  // the API is called. Shared by the prompt form and the landing prefill.
  async function runPlanGate(clean: string, proj: Project) {
    const spend = spendCredits(proj, "plan");
    if (!spend.ok) {
      setError(
        "Not enough test credits — upgrade on the Billing page (TEST MODE ONLY)",
      );
      setStatus("");
      return;
    }
    persistCredits(spend.project);
    setPlanLoading(true);
    setError("");
    setStatus("Plan ban raha hai — theme aur pages check karo…");
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: clean,
          ...(referenceUrlRef.current
            ? { referenceUrl: referenceUrlRef.current }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? `Plan API failed (${res.status}).`);
      }
      const data = (await res.json()) as {
        plan?: SitePlan;
        reference?: { title?: string; nicheHint?: string; accent?: string };
      };
      if (!data.plan) throw new Error("Plan nahi mila.");
      setPlan(data.plan);
      setPlanReference(data.reference ?? null);
      setPlanApproved(false);
      setStatus(
        data.reference?.title
          ? `Plan ready hai — reference: ${data.reference.title}. Approve karo ya edit karo.`
          : "Plan ready hai — approve karo ya edit karo.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plan nahi ban saka.");
      setStatus("");
    } finally {
      setPlanLoading(false);
    }
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    const clean = prompt.trim();
    if (!clean || !project || generating || planLoading) return;

    // + Page quick action → legacy direct generate, no plan gate.
    if (quickPageRef.current) {
      quickPageRef.current = false;
      setGenerating(true);
      setError("");
      setStreamingSections([]);
      try {
        await generateDirect(clean);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generate nahi ho saka.");
        setStatus("");
        setStreamingSections([]);
      } finally {
        setGenerating(false);
      }
      return;
    }

    await runPlanGate(clean, project);
  }

  // PlanApproval → "Approve & start generation": stream once per plan page.
  async function approvePlan() {
    if (!plan || !project || generating) return;
    setPlanApproved(true);
    setGenerating(true);
    setError("");
    setStreamingSections([]);
    try {
      await generateFromPlan(plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate nahi ho saka.");
      setStatus("");
      setStreamingSections([]);
    } finally {
      setGenerating(false);
      setPlan(null);
      setPlanApproved(false);
    }
  }


  if (notFound) {
    return (
      <div className="mx-auto max-w-xl flex-1 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">Project nahi mila</h1>
        <p className="mt-2 text-body">
          Ye project id localStorage me nahi hai. Dashboard se dobara kholo.
        </p>
        <div className="mt-6 flex justify-center">
          <Button href="/dashboard">Dashboard wapas jao</Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return <p className="flex-1 px-4 py-16 text-center text-body">Loading…</p>;
  }

  const hasPages = project.pages.length > 0;
  const auditErrors = exportAudit?.issues.filter((i) => i.severity === "error").length ?? 0;
  const auditWarnings = exportAudit?.issues.filter((i) => i.severity === "warning").length ?? 0;

  return (
    <div className="flex h-[calc(100vh-121px)] flex-1 flex-col bg-page">
      <EditorTopBar
        projectName={project.name}
        currentStep={wizardStep}
        canGoToStep={canGoToStep}
        onStepClick={(step) => setManualStep(step)}
        advanced={advanced}
        onAdvancedChange={setAdvanced}
        onOpenExport={() => {
          setJustDownloaded(false);
          setExportMsg("");
          setExportOpen(true);
        }}
        exporting={exporting}
        exportDisabled={!activePage}
      />

      {/* Cut C #24 — Variant B suggestion + pre-publish checklist. */}
      {variantNotice || variantChecklist ? (
        <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-indigo-900">
                Variant B ready hai
              </p>
              {variantNotice ? (
                <p className="mt-0.5 text-sm text-indigo-800">{variantNotice}</p>
              ) : null}
              {variantChecklist ? (
                <ul className="mt-2 space-y-1">
                  {variantChecklist.map((item) => (
                    <li
                      key={item.item}
                      className="flex items-center gap-2 text-sm text-indigo-900"
                    >
                      <span aria-hidden>{item.done ? "✓" : "○"}</span>
                      <span className={item.done ? "" : "opacity-70"}>
                        {item.item}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setVariantNotice("");
                setVariantChecklist(null);
              }}
              className="rounded-full border border-indigo-300 px-3 py-1 text-xs font-semibold text-indigo-800 hover:bg-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* Cut C #30 — Polish fixes applied. */}
      {polishFixes ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-900">
                Polish —{" "}
                {polishFixes.length === 0
                  ? "koi fix zaroori nahi tha"
                  : `${polishFixes.length} fix${polishFixes.length === 1 ? "" : "es"} lag gaye`}
              </p>
              {polishFixes.length > 0 ? (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-emerald-900">
                  {polishFixes.map((f) => (
                    <li key={f.id}>{f.message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setPolishFixes(null)}
              className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* Cut C #25 — comment-apply error (proposal itself is staged in PageEditor). */}
      {commentError ? (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
            <span>{commentError}</span>
            <button
              type="button"
              onClick={() => setCommentError("")}
              className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold hover:bg-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {/* ---- Step 3 only: slim page bar (page tabs + view toggle + + Page).
            The top bar stays decluttered — these belong to editing. ---- */}
        {wizardStep === 2 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-page px-4 py-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {project.pages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActivePageId(p.id);
                    setStreamingSections([]);
                  }}
                  aria-current={p.id === activePageId ? "page" : undefined}
                  className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
                    p.id === activePageId
                      ? "bg-accent-soft font-semibold text-accent-text"
                      : "text-body hover:text-ink"
                  }`}
                >
                  {p.title}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  // + Page quick action: pre-fill + legacy direct generate (no plan gate).
                  quickPageRef.current = true;
                  setPrompt("Generate product detail page");
                  inputRef.current?.focus();
                }}
                className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-body hover:border-accent hover:text-accent"
              >
                + Page
              </button>
            </div>
            <div className="ml-auto flex rounded-full border border-border text-sm">
              {(["desktop", "tablet", "mobile"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={`rounded-full px-3 py-1 capitalize ${
                    view === v ? "bg-indigo-600 text-white" : "text-body"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* ================= Step 1 — Prompt ================= */}
          {wizardStep === 0 ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-panel p-4">
              <div className="mx-auto max-w-2xl">
                {hasPages ? (
                  <p className="mb-3 text-center text-sm text-body">
                    Pehle se {project.pages.length} page
                    {project.pages.length === 1 ? "" : "s"} hain — naya prompt
                    naya plan banayega.
                  </p>
                ) : null}
                <Card padding="none" className="overflow-hidden">
                  <EditorChat
                    variant="step"
                    showIntro
                    submitLabel="Generate"
                    projectPrompt={project.prompt}
                    messages={project.messages}
                    generating={generating || planLoading}
                    status={status}
                    error={error}
                    exportMsg={exportMsg}
                    prompt={prompt}
                    onPromptChange={setPrompt}
                    onSubmit={generate}
                    inputRef={inputRef}
                    onReferenceUrl={(url) => {
                      setReferenceUrl(url);
                      referenceUrlRef.current = url;
                    }}
                  />
                </Card>
              </div>
            </div>
          ) : null}

          {/* ================= Step 2 — Plan ================= */}
          {/* Fix pass 3 — the WINDOW is the scroller on this page (see
              PlanApproval header: the editor root's 100vh height is dead
              code under flex-1, and no ancestor bounds the card), so the
              Approve bar is viewport-fixed. This container gets pb-24 so
              the last section rows can scroll fully above that bar. */}
          {wizardStep === 1 ? (
            <div className="flex min-h-0 flex-1 flex-col bg-panel p-4 pb-24">
              <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
                {plan && !planApproved ? (
                  <>
                    {planReference &&
                    (planReference.title || planReference.nicheHint) ? (
                      <p className="mb-3 shrink-0 rounded-xl bg-white px-4 py-2 text-sm text-body shadow-sm">
                        Reference: {planReference.title ?? planReference.nicheHint}
                        {planReference.accent
                          ? ` · accent ${planReference.accent}`
                          : ""}
                      </p>
                    ) : null}
                    <PlanApproval
                      plan={plan}
                      onPlanChange={setPlan}
                      onApprove={() => void approvePlan()}
                      onCancel={() => {
                        setPlan(null);
                        setPlanReference(null);
                        setStatus("");
                      }}
                      generating={generating}
                    />
                  </>
                ) : planLoading ? (
                  <Card>
                    <p className="text-lg font-semibold text-ink">
                      Plan ban raha hai…
                    </p>
                    <p className="mt-1 text-sm text-body">
                      {status ||
                        "Theme aur pages check ho rahe hain — thoda sabar karo."}
                    </p>
                  </Card>
                ) : (
                  <EmptyState
                    title="Plan yahan dikhega"
                    message="Pehle Step 1 me apna store ek jumle me likho, phir Generate dabao — AI plan banayega."
                    action={
                      <Button
                        variant="ghost"
                        onClick={() => setManualStep(0)}
                      >
                        Step 1 par jao
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          ) : null}

          {/* ================= Step 3 — Pages (core edit loop) ================= */}
          {wizardStep === 2 ? (
            <>
              <EditorChat
                projectPrompt={project.prompt}
                messages={project.messages}
                generating={generating || planLoading}
                status={status}
                error={error}
                exportMsg={exportMsg}
                prompt={prompt}
                onPromptChange={setPrompt}
                onSubmit={generate}
                inputRef={inputRef}
                onReferenceUrl={(url) => {
                  setReferenceUrl(url);
                  referenceUrlRef.current = url;
                }}
              />
              <EditorPreview
                view={view}
                theme={project.theme}
                generating={generating || funnelBusy}
                status={status}
                streamingSections={streamingSections}
                activePage={activePage}
                projectId={project.id}
                // Fix pass 2 — the demo store's preview is photo-free
                // (designed tiles, never a wrong picsum photo).
                photoFree={project.isDemo === true}
                selectedSectionId={selectedSectionId}
                onSelectSection={setSelectedSectionId}
                onSectionsChange={handleSectionsChange}
                project={project}
                onProjectChange={handleProjectChange}
                clearDirtySignal={clearDirtySignal}
                remountKey={previewRemountKey}
                onThemeChange={(theme) => saveProject({ theme })}
                // Cut C #25 — Comment Mode pins: Advanced only.
                commentMode={advanced ? commentMode : false}
                onCommentModeChange={setCommentMode}
                comments={project.comments ?? []}
                onAddComment={handleAddComment}
                selectedCommentId={selectedCommentId}
                onSelectComment={setSelectedCommentId}
                commentProposal={commentProposal}
                onCommentProposalAccept={handleCommentProposalAccept}
                onCommentProposalDiscard={handleCommentProposalDiscard}
                advanced={advanced}
                openCustomBlockSignal={customBlockSignal}
                hideCommentToggle={!advanced}
              />
            </>
          ) : null}

          {/* ================= Step 4 — Export ================= */}
          {wizardStep === 3 ? (
            <div className="min-h-0 flex-1 overflow-y-auto bg-panel p-4">
              <div className="mx-auto max-w-2xl space-y-4">
                {activePage && exportAudit ? (
                  <Card
                    title="Export karo — theme ready hai"
                    description={`${project.name} — “${activePage.title}” · ${activePage.sections.length} sections · ${project.pages.length} pages`}
                  >
                    <p className="text-sm text-body">
                      Export check score:{" "}
                      <span className="font-semibold text-ink">
                        {exportAudit.score}/100
                      </span>{" "}
                      · {auditErrors} errors · {auditWarnings} warnings
                      {exportAudit.issues.length === 0
                        ? " — koi issue nahi, seedha export karo."
                        : " — neeche issues fix karo ya seedha export karo."}
                    </p>
                    {exportAudit.issues.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {exportAudit.issues.slice(0, 5).map((issue) => (
                          <li
                            key={issue.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-panel px-3 py-2 text-sm"
                          >
                            <span className="text-body">{issue.message}</span>
                            {issue.fix ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleApplyFix(issue.fix as AuditFix)}
                              >
                                Fix
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-5">
                      <Button
                        onClick={() => {
                          setJustDownloaded(false);
                          setExportMsg("");
                          setExportOpen(true);
                        }}
                        disabled={exporting}
                      >
                        {exporting ? "Export…" : "Export Shopify Theme"}
                      </Button>
                    </div>
                    <div className="mt-5 border-t border-border pt-4">
                      <h3 className="text-sm font-semibold text-ink">
                        Shopify me import kaise karein
                      </h3>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-body">
                        <li>Shopify admin kholo → Online Store → Themes.</li>
                        <li>Add theme → Upload zip → downloaded zip file chuno.</li>
                        <li>Theme publish karo — placeholder products/images badal lo.</li>
                      </ol>
                    </div>
                    {exportMsg ? (
                      <p className="mt-3 text-sm text-body">{exportMsg}</p>
                    ) : null}
                  </Card>
                ) : (
                  <EmptyState
                    title="Abhi export karne ko kuch nahi"
                    message="Pehle Step 3 me pages banao, phir yahan se theme export karo."
                    action={
                      <Button variant="ghost" onClick={() => setManualStep(2)}>
                        Pages par jao
                      </Button>
                    }
                  />
                )}
                <div className="flex justify-center">
                  <Button variant="ghost" onClick={() => setManualStep(2)}>
                    ← Pages par wapas jao
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* ---- Wave 2 — ONE Advanced drawer: every advanced panel lives
              here, and only when the toggle is ON. Beginner mode me ye
              aside render hi nahi hota. ---- */}
          {advanced ? (
            <AdvancedPanel
              onClose={() => setAdvanced(false)}
              themeTokens={
                <ThemeTokensPanel
                  theme={project.theme}
                  onThemeChange={(theme) => saveProject({ theme })}
                  presets={THEME_PRESETS}
                />
              }
              brandKit={
                <BrandKitPanel
                  brandKit={project.brandKit}
                  onBrandKitChange={(kit) => saveProject({ brandKit: kit })}
                  onReadFromUrl={handleReadBrandFromUrl}
                />
              }
              sectionLibrary={
                <SectionLibrary
                  theme={project.theme}
                  products={project.csvProducts}
                  onInsert={handleLibraryInsert}
                  onSwap={handleLibrarySwap}
                  selectedSectionType={
                    activePage?.sections.find(
                      (s) => s.id === selectedSectionId,
                    )?.type
                  }
                />
              }
              mediaLibrary={
                <MediaLibrary
                  project={project}
                  onApplyImage={handleApplyImage}
                  onRegenerateImage={handleRegenerateImage}
                  selectedSectionId={selectedSectionId}
                />
              }
              csvImport={
                <CsvImport
                  onImport={handleCsvImport}
                  existingCount={project.csvProducts?.length ?? 0}
                />
              }
              seo={
                activePage ? (
                  <SeoPanel page={activePage} onSeoChange={handleSeoChange} />
                ) : null
              }
              funnel={
                <FunnelView
                  project={project}
                  onSelectPage={(id) => {
                    setActivePageId(id);
                    setStreamingSections([]);
                  }}
                  onGenerateFunnelPage={(step) => void handleGenerateFunnelPage(step)}
                  onReorder={(pageIds) => saveProject({ funnelOrder: pageIds })}
                />
              }
              comments={
                <div className="space-y-3">
                  <CommentsPanel
                    comments={pageComments}
                    onAddComment={handleAddComment}
                    onResolveComment={handleResolveComment}
                    onApplyAll={handleApplyAllComments}
                    pageId={activePage?.id}
                  />
                  {commentBusy ? (
                    <p className="text-xs text-body">
                      Comment apply ho raha hai — proposal review box me aayega…
                    </p>
                  ) : null}
                  {commentProposal ? (
                    <p className="rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent-text">
                      Comment proposal review box me hai — Accept karo to comment
                      resolve hoga, Discard karo to agla comment aayega.
                    </p>
                  ) : null}
                </div>
              }
              creditMeter={<CreditMeter project={project} />}
              onDuplicateVariant={
                activePageId
                  ? () => handleDuplicateVariant(activePageId)
                  : undefined
              }
              variantDisabled={!activePageId}
              onPolish={handlePolish}
              polishing={polishing}
              onOpenCustomBlock={() =>
                setCustomBlockSignal((n) => n + 1)
              }
            />
          ) : null}
        </div>
      </div>

      {exportOpen && activePage && exportAudit ? (
        <ExportModal
          project={project}
          page={activePage}
          audit={exportAudit}
          onClose={() => setExportOpen(false)}
          onExport={(format) => void doExport(format)}
          onApplyFix={handleApplyFix}
          exporting={exporting}
          exportMsg={exportMsg}
          billingAllowed={canExportShopify(getBillingState().planId).allowed}
          shopifyFileCount={27}
          justDownloaded={justDownloaded}
        />
      ) : null}

      {/* Cut B #17 — guided first run, shown once after the first generation. */}
      {tourOpen ? (
        <GuidedTour
          step={tourStep}
          onNext={() =>
            setTourStep((s) => (s < 3 ? ((s + 1) as 0 | 1 | 2 | 3) : s))
          }
          onSkip={() => setTourOpen(false)}
          onDone={() => {
            try {
              window.localStorage.setItem(`stb-tour-done-${projectId}`, "1");
            } catch {
              // Private mode — tour just closes; it may show again.
            }
            setTourOpen(false);
          }}
          checklist={tourChecklist}
          onToggleCheck={(id) =>
            setTourChecklist((items) =>
              items.map((it) =>
                it.id === id ? { ...it, done: !it.done } : it,
              ),
            )
          }
        />
      ) : null}
    </div>
  );
}
