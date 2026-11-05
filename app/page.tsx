"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrCreateDemoUser } from "@/lib/auth";
import { FREE_PROJECT_LIMIT } from "@/lib/billing";
import { getProjectStore } from "@/lib/db/store";

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

export default function Home() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      router.push(`/editor/${project.id}`);
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
          AI pehle tumhari store ka theme banata hai, phir page-by-page
          website generate karta hai. Live preview me edit karo aur aakhir me
          Shopify theme zip export karo.
        </p>

        <form
          onSubmit={startBuilding}
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
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
