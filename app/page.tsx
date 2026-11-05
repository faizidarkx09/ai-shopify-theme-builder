"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrCreateDemoUser } from "@/lib/auth";
import { FREE_PROJECT_LIMIT } from "@/lib/billing";
import { getProjectStore } from "@/lib/db/store";
import { DEMO_NICHES } from "@/lib/demoCatalog";

/** Cut B #18 — landing niche tabs: one tap pre-fills the prompt box. */
const LANDING_NICHES = ["fashion", "beauty", "electronics"] as const;

/**
 * Key the landing prompt is ALSO saved under (sessionStorage) so the
 * editor can pre-fill it even if the query param is lost. The editor
 * (integrator) reads `?prompt=` first, this key second, then runs the
 * plan gate with the prefilled prompt. No login wall, no signup step —
 * the guest/demo auth stub stays as-is (deferred signup).
 */
export const LANDING_PROMPT_KEY = "ai-shopify-builder:landing-prompt";

const STEPS = [
  {
    n: "1",
    title: "Prompt likho",
    text: "Apni store ek jumle me batao — jaise “cosmetic e-commerce website, pink shade me” ya “modern fashion store, premium dark theme”.",
  },
  {
    n: "2",
    title: "Theme pehle, pages baad me",
    text: "AI pehle ek consistent theme banata hai (colors, font, style), taake har page ek jaisa lage. Theme ke baghair page nahi banta.",
  },
  {
    n: "3",
    title: "Page-by-page streaming preview",
    text: "AI ek turn me ek page banata hai aur tumko live banta hua nazar aata hai. Har naya page browser jaisi tab ban jata hai.",
  },
  {
    n: "4",
    title: "Section-wise edit",
    text: "Kisi bhi section ko click kar ke text, image, color ya spacing badlo — ya chat me AI se kaho ke sirf woh section badal de.",
  },
  {
    n: "5",
    title: "Export to Shopify",
    text: "Website ready ho to Shopify theme zip, code zip ya PNG export karo, aur zip ko Shopify > Online Store > Import se upload karo.",
  },
];

const EXAMPLES = [
  "cosmetic e-commerce website, pink shade me",
  "modern fashion store, premium dark theme",
  "grocery store landing page, fresh green style",
];

/**
 * Cut C #26 — "One app instead of six" comparison. Market figures are
 * TYPICAL / estimated costs from the research plan (theme $180+,
 * designer $500+) — never quotes, never what anyone will actually pay.
 * Our price stays "$9.99/month · TEST MODE ONLY — not a real price".
 */
const COMPARISON = [
  {
    item: "Premium Shopify theme",
    typical: "Typically $180+",
    us: "Included — AI generates it",
  },
  {
    item: "Freelance designer",
    typical: "Typically $500+",
    us: "Included — theme + pages in one prompt",
  },
  {
    item: "Copywriter for store copy",
    typical: "Typically varies — often $100s",
    us: "AI draft included",
  },
  {
    item: "Product photos",
    typical: "Typically varies — often $100s",
    us: "Placeholder images included",
  },
];

/** Cut C #26 — the product loop as numbered CSS mock browser frames (no screenshots). */
const LOOP_FRAMES = [
  {
    n: "1",
    title: "Prompt",
    url: "theme-builder.app/new",
    body: "Apni store ek jumle me batao — niche, vibe, colors.",
  },
  {
    n: "2",
    title: "Theme",
    url: "theme-builder.app/theme",
    body: "AI pehle ek named theme banata hai — colors, font, style — jo har page pe same rehta hai.",
  },
  {
    n: "3",
    title: "Pages",
    url: "theme-builder.app/pages",
    body: "Home, Product, Category — page-by-page live preview, section-wise edit.",
  },
  {
    n: "4",
    title: "Export",
    url: "theme-builder.app/export",
    body: "Shopify theme zip download karo aur Shopify me import karo — theme tumhara hai, hamare baghair bhi chalta hai.",
  },
];

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [niche, setNiche] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pickNiche(id: string) {
    const found = DEMO_NICHES.find((n) => n.id === id);
    if (!found) return;
    setNiche(id);
    setPrompt(found.prefillPrompt);
  }

  function startBuilding(e: React.FormEvent) {
    e.preventDefault();
    const clean = prompt.trim();
    if (!clean) {
      setError("Pehle apni store ka prompt likho.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = getOrCreateDemoUser();
      const store = getProjectStore();
      if (store.count(user.id) >= FREE_PROJECT_LIMIT) {
        setError(
          `Free plan me maximum ${FREE_PROJECT_LIMIT} projects hain. Naya project banane ke liye upgrade karo ya purana delete karo.`,
        );
        setBusy(false);
        return;
      }
      const project = store.create({ prompt: clean }, user.id);
      // Deferred signup: guest project is created immediately, no login
      // wall. The prompt travels two ways so the editor can pre-fill it
      // and run the plan gate: ?prompt= in the URL + sessionStorage.
      try {
        sessionStorage.setItem(`${LANDING_PROMPT_KEY}:${project.id}`, clean);
      } catch {
        // Private mode: the ?prompt= param still carries it.
      }
      router.push(`/editor/${project.id}?prompt=${encodeURIComponent(clean)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Project nahi ban saka.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12">
      <section className="text-center">
        <p className="text-sm font-semibold tracking-wide text-pink-600 uppercase">
          Prompt → Theme → Pages → Edit → Export
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Prompt se apni Shopify theme banao — bina design ya coding jaane
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          The only AI builder that exports a real Shopify theme zip — your
          theme works without us. AI pehle tumhari store ka theme banata
          hai, phir page-by-page website generate karta hai. Live preview
          me edit karo aur aakhir me Shopify theme zip export karo.
        </p>

        {/* Cut B #18 — niche tabs above the prompt box */}
        <div
          className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2"
          role="tablist"
          aria-label="Store type"
        >
          {LANDING_NICHES.map((id) => {
            const n = DEMO_NICHES.find((d) => d.id === id);
            if (!n) return null;
            return (
              <button
                key={n.id}
                type="button"
                role="tab"
                aria-selected={niche === n.id}
                onClick={() => pickNiche(n.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
                  niche === n.id
                    ? "bg-pink-600 text-white"
                    : "border border-zinc-300 text-zinc-600 hover:border-pink-500 hover:text-pink-600 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                {n.label}
              </button>
            );
          })}
        </div>

        <form
          onSubmit={startBuilding}
          className="mx-auto mt-4 flex max-w-2xl flex-col gap-3 sm:flex-row"
        >
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Apni store batao… jaise “fashion store, premium dark theme”"
            className="flex-1 rounded-full border border-zinc-300 px-5 py-3 text-base outline-none focus:border-pink-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-pink-600 px-6 py-3 font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
          >
            {busy ? "Ban raha hai…" : "Generate karo →"}
          </button>
        </form>
        {error && (
          <p className="mx-auto mt-3 max-w-2xl rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}{" "}
            <Link href="/billing" className="font-semibold underline">
              Billing dekho
            </Link>
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          No signup needed — pehle theme banao, account baad me.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:border-pink-500 hover:text-pink-600 dark:border-zinc-700 dark:text-zinc-400"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">Core loop kaise kaam karta hai</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Cut C #26 — "One app instead of six" comparison table. */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">One app instead of six</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-600 dark:text-zinc-400">
          Alag-alag khareedo to har cheez ka apna bill hota hai. Yahan ek
          hi flow me sab kuch milta hai.
        </p>
        <div className="mx-auto mt-8 max-w-3xl overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="px-4 py-3 font-semibold">Kya chahiye</th>
                <th className="px-4 py-3 font-semibold">Alag se khareedo to</th>
                <th className="px-4 py-3 font-semibold">Is app me</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr
                  key={row.item}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-4 py-3 font-medium">{row.item}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.typical}
                  </td>
                  <td className="px-4 py-3 font-semibold text-pink-600">
                    {row.us}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="px-4 py-3 font-medium">Total</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  Typically $680+ — sirf theme + designer mila kar; copy aur
                  photos is ke upar (all typical/estimated, not quotes)
                </td>
                <td className="px-4 py-3 font-semibold text-pink-600">
                  $9.99/month · TEST MODE ONLY — not a real price
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Cut C #26 — Prompt → Theme → Pages → Export loop (CSS mock
          browser frames, no screenshots, no fake product images). */}
      <section className="mt-16">
        <h2 className="text-center text-2xl font-bold">
          Prompt → Theme → Pages → Export — phir dobara
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-zinc-600 dark:text-zinc-400">
          Ye loop hai, one-way street nahi: export ke baad wapas edit karo,
          dobara export karo — har round theme aur behtar hota hai.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP_FRAMES.map((f) => (
            <div
              key={f.n}
              className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-1 truncate rounded-full bg-white px-2 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800">
                  {f.url}
                </span>
              </div>
              <div className="p-4">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pink-600 text-sm font-bold text-white">
                  {f.n}
                </span>
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">
          ↻ Loop wapas: Export → Edit → Export — jab tak theme perfect na ho.
        </p>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900">
          <h3 className="font-semibold">Free plan</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Maximum {FREE_PROJECT_LIMIT} projects. Dekh aur edit kar sakte ho —
            Shopify export paid plan me hai.
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900">
          <h3 className="font-semibold">Placeholder content</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Exported theme me products aur text placeholder hote hain. Asli
            products Shopify me khud lagane honge — ye real catalog sync nahi
            hai.
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-6 dark:bg-zinc-900">
          <h3 className="font-semibold">Bina key ke demo</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            GEMINI_API_KEY na ho to built-in template generator se demo chalta
            hai. Koi key, account ya payment zaroori nahi.
          </p>
        </div>
      </section>

      <div className="mt-12 text-center">
        <Link
          href="/dashboard"
          className="rounded-full bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          Dashboard kholo →
        </Link>
      </div>
    </div>
  );
}
