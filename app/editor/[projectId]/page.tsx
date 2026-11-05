"use client";

// Editor SHELL ONLY (Agent 1) — layout: left chat box, right live preview,
// browser-like page tabs on top, mobile/desktop toggle.
// Generation yahan /api/generate (Agent 2, SSE) ko call karta hai aur
// events ko live preview me dikhata hai; section ki asal editing
// (toolbar/panel) Cut 2 — Agent 3 — ka kaam hai, is shell me sirf
// section select/highlight hota hai.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getProjectStore } from "@/lib/db/store";
import PageEditor from "@/components/editor/PageEditor";
import { canExportShopify, getBillingState } from "@/lib/billing";
import { downloadPng, exportPagesToPng } from "@/lib/export/png";
import {
  isSectionType,
  placeholderImage,
  type Page,
  type Project,
  type Section,
  type Theme,
} from "@/lib/types";

type ViewMode = "desktop" | "mobile";

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
  };
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
  };
}

function SectionView({
  section,
  theme,
  selected,
  onSelect,
}: {
  section: Section;
  theme: Theme;
  selected: boolean;
  onSelect: () => void;
}) {
  const align =
    section.align === "center"
      ? "text-center"
      : section.align === "right"
        ? "text-right"
        : "text-left";
  return (
    <section
      onClick={onSelect}
      className={`cursor-pointer ${align} ${
        selected ? "ring-2 ring-pink-500 ring-inset" : ""
      }`}
      style={{
        backgroundColor: section.bgColor ?? theme.colors.background,
        color: section.textColor ?? theme.colors.text,
        padding: `${section.padding ?? 48}px 24px`,
      }}
    >
      <p className="text-xs font-semibold tracking-wide uppercase opacity-60">
        {section.type}
      </p>
      {section.subtitle && (
        <p className="mt-1 text-sm opacity-70">{section.subtitle}</p>
      )}
      <h3 className="mt-1 text-2xl font-bold">{section.title}</h3>
      {section.text && <p className="mt-2 text-sm opacity-80">{section.text}</p>}
      {section.image && (
        <img
          src={section.image}
          alt={section.title}
          className="mx-auto mt-4 max-h-64 w-full rounded-xl object-cover"
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.includes("picsum.photos")) {
              img.src = placeholderImage(`${section.type}-${section.id}`);
            }
          }}
        />
      )}
    </section>
  );
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
  const [streamingSections, setStreamingSections] = useState<Section[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const found = getProjectStore().get(projectId);
    if (!found) {
      setNotFound(true);
      return;
    }
    setProject(found as Project);
    setActivePageId(found.pages[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const activePage: Page | null =
    project?.pages.find((p) => p.id === activePageId) ?? null;
  const previewSections =
    streamingSections.length > 0
      ? streamingSections
      : (activePage?.sections ?? []);

  function saveProject(patch: Partial<Project>) {
    if (!project) return;
    const updated = getProjectStore().update(project.id, patch);
    if (updated) setProject(updated as Project);
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
    } catch (err) {
      setExportMsg(err instanceof Error ? err.message : "Export fail ho gaya.");
    } finally {
      setExporting(false);
      setExportOpen(false);
    }
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    const clean = prompt.trim();
    if (!clean || !project || generating) return;
    setGenerating(true);
    setError("");
    setStreamingSections([]);
    setStatus("Theme pehle ban raha hai…");

    const pageType =
      /product/i.test(clean) && !/categor/i.test(clean)
        ? "product"
        : /categor/i.test(clean)
          ? "category"
          : "home";

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: clean,
          pageType,
          theme: project.theme,
          projectId: project.id,
        }),
      });
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Generate API failed (${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let nextTheme = project.theme;
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
          slug: pageType,
          title: pageType === "home" ? "Home" : pageType,
          sections: streamed,
        } as Page);

      const newPages = [...project.pages, page];
      saveProject({
        theme: nextTheme,
        pages: newPages,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generate nahi ho saka.");
      setStatus("");
      setStreamingSections([]);
    } finally {
      setGenerating(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl flex-1 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Project nahi mila</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Ye project id localStorage me nahi hai. Dashboard se dobara kholo.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white dark:bg-white dark:text-zinc-900"
        >
          Dashboard wapas jao
        </Link>
      </div>
    );
  }

  if (!project) {
    return <p className="flex-1 px-4 py-16 text-center text-zinc-500">Loading…</p>;
  }

  return (
    <div className="flex h-[calc(100vh-121px)] flex-1 flex-col">
      {/* Top bar: browser-like page tabs + view toggle + export (Cut 3/4) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <span className="max-w-48 truncate font-semibold">{project.name}</span>
        <span
          className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs dark:border-zinc-700"
          title={project.theme.style}
        >
          {project.theme.name}
        </span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {project.pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setActivePageId(p.id);
                setStreamingSections([]);
              }}
              className={`rounded-t-lg border-b-2 px-3 py-1.5 text-sm whitespace-nowrap ${
                p.id === activePageId
                  ? "border-pink-600 font-semibold text-pink-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              {p.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPrompt("Generate product detail page");
              inputRef.current?.focus();
            }}
            className="rounded-full border border-dashed border-zinc-400 px-3 py-1 text-sm text-zinc-500 hover:border-pink-500 hover:text-pink-600"
          >
            + Page
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-full border border-zinc-300 text-sm dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setView("desktop")}
              className={`rounded-full px-3 py-1 ${view === "desktop" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setView("mobile")}
              className={`rounded-full px-3 py-1 ${view === "mobile" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : ""}`}
            >
              Mobile
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              disabled={exporting || !activePage}
              className="rounded-full bg-pink-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {exporting ? "Export…" : "Export ▾"}
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => void doExport("shopify")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Shopify theme (.zip) — paid plan
                </button>
                <button
                  type="button"
                  onClick={() => void doExport("code")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Export to Code (.zip)
                </button>
                <button
                  type="button"
                  onClick={() => void doExport("png")}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Export current page as PNG
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Left: chat box */}
        <aside className="flex w-full flex-col border-b border-zinc-200 md:w-96 md:border-r md:border-b-0 dark:border-zinc-800">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <p className="text-xs text-zinc-500">
              Prompt: <span className="text-zinc-700 dark:text-zinc-300">{project.prompt}</span>
            </p>
            {project.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-8 bg-pink-50 text-pink-900 dark:bg-pink-950 dark:text-pink-100"
                    : "mr-8 bg-zinc-100 dark:bg-zinc-900"
                }`}
              >
                {m.text}
              </div>
            ))}
            {generating && status && (
              <p className="animate-pulse text-sm text-pink-600">{status}</p>
            )}
            {exportMsg && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {exportMsg}{" "}
                <Link href="/billing" className="font-semibold underline">
                  Billing dekho
                </Link>
              </p>
            )}
          </div>
          <form onSubmit={generate} className="border-t border-zinc-200 p-3 dark:border-zinc-800">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Naya page ya edit likho… jaise “grocery store landing page”"
                className="flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                disabled={generating}
                className="rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
              >
                {generating ? "…" : "Send"}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            {!generating && status && (
              <p className="mt-2 text-xs text-green-700 dark:text-green-400">{status}</p>
            )}
          </form>
        </aside>

        {/* Right: live preview */}
        <section className="min-h-0 flex-1 overflow-y-auto bg-zinc-100 p-4 dark:bg-zinc-900">
          <div
            className={`mx-auto bg-white shadow-sm transition-all dark:bg-zinc-950 ${
              view === "mobile" ? "max-w-[390px] rounded-3xl border-8 border-zinc-800" : "w-full max-w-4xl"
            }`}
            style={{
              backgroundColor: project.theme.colors.background,
              fontFamily: project.theme.font,
            }}
          >
            {generating || streamingSections.length > 0 ? (
              previewSections.length === 0 ? (
                <div className="p-12 text-center text-zinc-500">
                  <p className="text-lg font-semibold">Page ban raha hai…</p>
                  <p className="mt-1 text-sm">{status}</p>
                </div>
              ) : (
                previewSections.map((s) => (
                  <SectionView
                    key={s.id}
                    section={s}
                    theme={project.theme}
                    selected={s.id === selectedSectionId}
                    onSelect={() => setSelectedSectionId(s.id)}
                  />
                ))
              )
            ) : activePage ? (
              <PageEditor
                key={activePage.id}
                projectId={project.id}
                page={activePage}
                theme={project.theme}
                onSectionsChange={handleSectionsChange}
              />
            ) : (
              <div className="p-12 text-center text-zinc-500">
                <p className="text-lg font-semibold">Abhi koi page nahi hai</p>
                <p className="mt-1 text-sm">
                  Left chat me prompt likh kar pehla page generate karo — AI
                  pehle theme, phir page-by-page preview banayega.
                </p>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-zinc-500">
            Preview me placeholder images hain (picsum). Exported theme me bhi
            placeholder content hota hai.
          </p>
        </section>
      </div>
    </div>
  );
}
