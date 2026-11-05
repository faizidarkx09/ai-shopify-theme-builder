// app/dashboard/page.tsx
// Wave 3 — beginner-first dashboard: projects + ONE "New theme" button,
// nothing else. No prompt form (creation lives on the landing page),
// no stats pill, no templates gallery, no per-card delete/template
// actions — one quiet "Open" per card. Billing rules untouched.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOrCreateDemoUser } from "@/lib/auth";
import { FREE_PROJECT_LIMIT, getBillingState } from "@/lib/billing";
import { getProjectStore } from "@/lib/db/store";
import { seedDemoProjectIfEmpty } from "@/lib/db/seed";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import SectionRenderer from "@/components/sections/SectionRenderer";
import type { Project } from "@/lib/types";

/** Small live preview: the project's first page, cropped to a thumbnail.
 *  No pages / no sections yet → plain placeholder panel, never a broken
 *  image. Non-interactive (pointer-events-none) — it is a preview only. */
function ProjectThumbnail({ project }: { project: Project }) {
  const firstPage = project.pages[0];
  const sections = firstPage?.sections ?? [];
  if (sections.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">Abhi koi preview nahi</p>
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none h-40 overflow-hidden bg-slate-100"
    >
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          theme={project.theme}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const user = getOrCreateDemoUser();
    const store = getProjectStore();
    seedDemoProjectIfEmpty(store, user.id);
    setProjects(store.list(user.id) as Project[]);
    setLoaded(true);
  }, []);

  const plan = getBillingState();
  const atLimit =
    plan.planId === "free" && projects.length >= FREE_PROJECT_LIMIT;

  // Wave 3b — quiet per-card delete: confirm, then the store's existing
  // delete() (same behaviour for every project, templates included).
  const handleDelete = (id: string) => {
    if (!window.confirm("Is theme ko delete karna hai?")) return;
    const user = getOrCreateDemoUser();
    const store = getProjectStore();
    store.delete(id);
    setProjects(store.list(user.id) as Project[]);
  };

  return (
    <div className="stb-container flex-1 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Tumhare themes</h1>
          <p className="stb-lead mt-1">
            Apni themes dekho aur kholo — naya theme banane ke liye ek
            button hai.
          </p>
        </div>
        {loaded && projects.length > 0 && (
          <Button href="/" variant="primary">
            New theme
          </Button>
        )}
      </div>

      {atLimit && (
        <p className="mt-4 text-sm text-slate-500">
          Free plan me 2 themes ki limit poori ho gayi hai.{" "}
          <Link href="/billing">Billing par paid plan dekho</Link> — wahan
          unlimited themes aur Shopify export milta hai.
        </p>
      )}

      {!loaded && <p className="mt-8 text-slate-500">Loading…</p>}

      {loaded && projects.length === 0 && (
        <EmptyState
          title="Abhi koi theme nahi hai"
          message="Apni pehli theme banao — ek jumle me apni store batao, AI theme bana dega."
          action={
            <Button href="/" variant="primary">
              New theme
            </Button>
          }
          className="mt-8"
        />
      )}

      {loaded && projects.length > 0 && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} padding="none" className="overflow-hidden">
              <ProjectThumbnail project={p} />
              <div className="p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  {p.name}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Updated {new Date(p.updatedAt).toLocaleDateString()}
                </p>
                <Button
                  href={`/editor/${p.id}`}
                  variant="ghost"
                  className="mt-4 w-full"
                >
                  Open
                </Button>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  className="mt-3 w-full text-center text-sm text-slate-500 hover:text-slate-700"
                >
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
