"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrCreateDemoUser } from "@/lib/auth";
import { FREE_PROJECT_LIMIT, getBillingState } from "@/lib/billing";
import { FREE_STARTING_CREDITS } from "@/lib/credits";
import { getProjectStore } from "@/lib/db/store";
import { seedDemoProjectIfEmpty } from "@/lib/db/seed";
import PromptStarters from "@/components/editor/PromptStarters";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  // Cut C #27 — inline template naming: which card is being named + the name.
  const [templateNamingId, setTemplateNamingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateMsg, setTemplateMsg] = useState("");

  function refresh() {
    const user = getOrCreateDemoUser();
    const store = getProjectStore();
    seedDemoProjectIfEmpty(store, user.id);
    setProjects(store.list(user.id) as Project[]);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = getBillingState();
  const limit =
    plan.planId === "free" ? FREE_PROJECT_LIMIT : Number.POSITIVE_INFINITY;
  const atLimit = projects.length >= limit;

  function createProject(e: React.FormEvent) {
    e.preventDefault();
    const clean = prompt.trim();
    if (!clean) {
      setError("Pehle prompt likho.");
      return;
    }
    if (atLimit) {
      setError(
        `Free plan me maximum ${FREE_PROJECT_LIMIT} projects hain. Upgrade karo ya purana project delete karo.`,
      );
      return;
    }
    const user = getOrCreateDemoUser();
    const project = getProjectStore().create({ prompt: clean }, user.id);
    // Cut B #14 — free projects start at 100 test credits.
    getProjectStore().update(project.id, {
      credits: { balance: FREE_STARTING_CREDITS, used: 0, history: [] },
    });
    router.push(`/editor/${project.id}`);
  }

  function deleteProject(id: string) {
    getProjectStore().delete(id);
    refresh();
  }

  // Cut C #27 — save a project as a reusable named template (duplicates
  // it with isTemplate=true; pages/theme/brandKit kept, versions +
  // comments reset — see lib/db/store.ts duplicateProject).
  function saveAsTemplate(id: string) {
    const clean = templateName.trim();
    if (!clean) {
      setTemplateMsg("Template ka naam likho.");
      return;
    }
    const made = getProjectStore().saveAsTemplate(id, clean);
    if (!made) {
      setTemplateMsg("Template nahi ban saka — project nahi mila.");
      return;
    }
    setTemplateNamingId(null);
    setTemplateName("");
    setTemplateMsg(`"${clean}" template gallery me save ho gaya.`);
    refresh();
  }

  // Cut C #27 — use a template: duplicate it into a fresh editable
  // project (isTemplate=false) and open it in the editor.
  function useTemplate(id: string) {
    if (atLimit) {
      setError(
        `Free plan me maximum ${FREE_PROJECT_LIMIT} projects hain. Template use karne ke liye upgrade karo ya purana project delete karo.`,
      );
      return;
    }
    const copy = getProjectStore().duplicateProject(id);
    if (!copy) {
      setError("Template nahi mila.");
      return;
    }
    router.push(`/editor/${copy.id}`);
  }

  const templates = projects.filter((p) => p.isTemplate);
  const regularProjects = projects.filter((p) => !p.isTemplate);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Tumhare projects — localStorage me save hote hain, bina database
            ke.
          </p>
        </div>
        <div className="rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700">
          Plan: <strong>{plan.planId}</strong> ·{" "}
          {limit === Number.POSITIVE_INFINITY
            ? `${projects.length} projects (unlimited)`
            : `${projects.length} / ${limit} projects`}
          {plan.planId === "free" && (
            <>
              {" · "}
              <Link href="/billing" className="font-semibold text-pink-600 underline">
                Upgrade
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-6">
        <PromptStarters onPick={setPrompt} />
      </div>

      <form
        onSubmit={createProject}
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 sm:flex-row dark:border-zinc-800"
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Naya project: apni store ek jumle me batao…"
          className="flex-1 rounded-full border border-zinc-300 px-5 py-3 outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={atLimit}
          className="rounded-full bg-pink-600 px-6 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
        >
          Naya project banao
        </button>
      </form>
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!loaded && <p className="mt-8 text-zinc-500">Loading…</p>}

      {loaded && projects.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          Abhi koi project nahi hai. Upar prompt likh kar pehla project banao.
        </p>
      )}

      {templateMsg && (
        <p className="mt-6 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          {templateMsg}
        </p>
      )}

      {/* Cut C #27 — Templates gallery: reusable named templates. */}
      {templates.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold">Templates</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Save kiye hue winners — kisi bhi template ko ek click me naye
            editable project me badlo. Template khud kabhi edit nahi hota.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((p) => (
              <article
                key={p.id}
                className="flex flex-col rounded-2xl border border-pink-200 bg-pink-50/50 p-5 dark:border-pink-900 dark:bg-pink-950/20"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-4 w-4 rounded-full border border-zinc-300"
                    style={{ backgroundColor: p.theme.colors.primary }}
                    title={p.theme.name}
                  />
                  <span className="text-xs text-zinc-500">
                    {p.theme.displayName ?? p.theme.name}
                  </span>
                  <span className="ml-auto rounded-full bg-pink-600 px-2 py-0.5 text-xs font-semibold text-white">
                    Template
                  </span>
                </div>
                <h3 className="mt-3 font-semibold">
                  {p.templateName ?? p.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {p.prompt}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {p.pages.length} page{p.pages.length === 1 ? "" : "s"} ·{" "}
                  {p.pages.reduce((n, pg) => n + pg.sections.length, 0)} sections
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => useTemplate(p.id)}
                    className="flex-1 rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                  >
                    Use template
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProject(p.id)}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-red-500 hover:text-red-600 dark:border-zinc-700"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <h2 className="mt-10 text-xl font-bold">Tumhare projects</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {regularProjects.map((p) => (
          <article
            key={p.id}
            className="flex flex-col rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-zinc-300"
                style={{ backgroundColor: p.theme.colors.primary }}
                title={p.theme.name}
              />
              <span className="text-xs text-zinc-500">{p.theme.name}</span>
              <span className="ml-auto text-xs text-zinc-400">
                {new Date(p.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h2 className="mt-3 font-semibold">{p.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
              {p.prompt}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {p.pages.length} page{p.pages.length === 1 ? "" : "s"} ·{" "}
              {p.pages.reduce((n, pg) => n + pg.sections.length, 0)} sections
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/editor/${p.id}`}
                className="flex-1 rounded-full bg-zinc-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
              >
                Editor kholo
              </Link>
              <button
                type="button"
                onClick={() => deleteProject(p.id)}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-red-500 hover:text-red-600 dark:border-zinc-700"
              >
                Delete
              </button>
            </div>
            {/* Cut C #27 — Save as template (inline name input). */}
            {templateNamingId === p.id ? (
              <div className="mt-3 flex gap-2">
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template ka naam…"
                  autoFocus
                  className="min-w-0 flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
                />
                <button
                  type="button"
                  onClick={() => saveAsTemplate(p.id)}
                  className="shrink-0 rounded-full bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateNamingId(null);
                    setTemplateName("");
                  }}
                  className="shrink-0 rounded-full border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTemplateNamingId(p.id);
                  setTemplateName(p.templateName ?? p.name);
                  setTemplateMsg("");
                }}
                className="mt-3 rounded-full border border-pink-300 px-4 py-2 text-sm font-semibold text-pink-600 hover:border-pink-500 dark:border-pink-800"
              >
                Save as template
              </button>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
