"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrCreateDemoUser } from "@/lib/auth";
import { FREE_PROJECT_LIMIT, getBillingState } from "@/lib/billing";
import { getProjectStore } from "@/lib/db/store";
import { seedDemoProjectIfEmpty } from "@/lib/db/seed";
import type { Project } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

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
    router.push(`/editor/${project.id}`);
  }

  function deleteProject(id: string) {
    getProjectStore().delete(id);
    refresh();
  }

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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
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
          </article>
        ))}
      </div>
    </div>
  );
}
