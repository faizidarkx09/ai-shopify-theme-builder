// app/page.tsx — Wave 1 landing rebuild (beginner-first).
// Sirf 5 blocks: Hero (prompt box + ASLI mini store preview), 3 steps,
// template gallery (3 live previews), FAQ (3 sawal), chhota footer.
// Hata diya gaya: 5 dense loop cards, comparison table, loop mock
// frames, "PROMPT → THEME → PAGES → EDIT → EXPORT" eyebrow, aur koi bhi
// price / TEST MODE line. Generate flow waisa hi hai jaisa pehle tha:
// project banta hai, prompt ?prompt= + sessionStorage se editor ko
// milta hai, plan gate wahan chalta hai.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getOrCreateDemoUser } from "@/lib/auth";
import { FREE_PROJECT_LIMIT } from "@/lib/billing";
import { getProjectStore } from "@/lib/db/store";
import { DEMO_NICHES } from "@/lib/demoCatalog";
import { THEME_PRESETS } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MiniStorePreview } from "@/components/landing/MiniStorePreview";

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

/** 3 visual steps — Prompt → Theme → Export. Bas itna hi. */
const STEPS = [
  {
    n: "1",
    title: "Prompt",
    text: "Apni store ek jumle me batao — niche, vibe, colors.",
  },
  {
    n: "2",
    title: "Theme",
    text: "AI pehle ek consistent theme banata hai, phir usi theme me tumhare pages bante hain.",
  },
  {
    n: "3",
    title: "Export",
    text: "Theme ready ho to Shopify zip download karo aur apni store me import karo.",
  },
];

/**
 * Template gallery — 3 named themes (lib/theme.ts presets).
 * Har theme ka apna sample prompt hai; "Use this theme" usi prompt se
 * generation start karta hai, to deriveTheme wahi preset chunta hai.
 */
const GALLERY_THEMES = [
  {
    presetId: "rose-glow",
    prompt: "A skincare and beauty store with a soft pink glow theme",
    line: "Soft pink beauty — skincare aur makeup stores ke liye.",
  },
  {
    presetId: "noir-luxe",
    prompt: "A modern fashion boutique, premium dark theme",
    line: "Premium dark boutique — fashion aur luxury stores ke liye.",
  },
  {
    presetId: "fresh-mart",
    prompt: "A grocery store with fresh green style",
    line: "Clean green grocery — fresh aur organic stores ke liye.",
  },
] as const;

/** Hero preview — Rose Glow theme ka asli mini storefront. */
const HERO_THEME = THEME_PRESETS.find((t) => t.presetId === "rose-glow")!;
const HERO_PROMPT = "A skincare and beauty store with a soft pink glow theme";

const FAQS = [
  {
    q: "Kya mujhe design ya coding aani chahiye?",
    a: "Nahi. Bas apni store ek jumle me likho — design, colors aur pages AI banata hai.",
  },
  {
    q: "Theme Shopify me kaise lagti hai?",
    a: "Theme ready ho to Shopify theme zip download karo, phir Shopify > Online Store > Themes > Import se upload karo.",
  },
  {
    q: "Kya try karna free hai?",
    a: "Haan — pehle theme banao, account baad me. Export aur limits billing page par hain.",
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

  function startBuilding(e: React.FormEvent, givenPrompt?: string) {
    e.preventDefault();
    const clean = (givenPrompt ?? prompt).trim();
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
    <div className="stb-container flex-1">
      {/* ---------- 1. Hero: prompt box + asli mini store preview ---------- */}
      <section className="stb-section">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <h1 className="text-hero">
              Apni Shopify theme ek prompt me banao
            </h1>
            <p className="stb-lead mx-auto mt-4 lg:mx-0">
              Prompt likho, theme dekho, Shopify me export karo — bina design
              ya coding jaane.
            </p>

            {/* Moat line: 50-site research me 0/50 competitors ye karte hain. */}
            <p className="mt-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              The only AI builder that exports a real Shopify theme zip
            </p>

            {/* Niche text-chips — tap karte hi prompt bhar jata hai. */}
            <div
              className="mt-6 flex flex-wrap justify-center gap-2 lg:justify-start"
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
                        ? "bg-accent text-white"
                        : "border border-border bg-white text-body hover:border-accent hover:text-accent"
                    }`}
                  >
                    {n.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={startBuilding}
              className="mt-4 flex flex-col gap-3 sm:flex-row"
            >
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Apni store batao… jaise “fashion store, premium look”"
                aria-label="Apni store ka prompt likho"
                className="min-w-0 flex-1 rounded-lg border border-border bg-white px-4 py-3 text-base text-ink outline-none placeholder:text-muted focus:border-accent"
              />
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Ban raha hai…" : "Generate karo"}
              </Button>
            </form>
            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                {error}{" "}
                <Link href="/billing" className="font-semibold underline">
                  Billing dekho
                </Link>
              </p>
            )}
            <p className="mt-3 text-sm text-muted">Free to try</p>
          </div>

          {/* Phone-width framed preview — asli storefront, mock nahi. */}
          <div className="mx-auto w-full max-w-[420px]">
            <MiniStorePreview
              theme={HERO_THEME}
              prompt={HERO_PROMPT}
              label="Rose Glow theme ka sample store preview"
            />
            <p className="mt-3 text-center text-sm text-muted">
              Aisa dikhega tumhara store — ye ek asli generated preview hai.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- 2. 3 steps: Prompt → Theme → Export ---------- */}
      <section className="stb-section border-t border-border">
        <h2 className="text-h2 text-center">Kaise kaam karta hai</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <Card key={s.n}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-base font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-3 text-h3">{s.title}</h3>
              <p className="mt-1 text-sm text-body">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- 3. Template gallery: 3 live mini-previews ---------- */}
      <section className="stb-section border-t border-border">
        <h2 className="text-h2 text-center">Ready-made themes</h2>
        <p className="stb-lead mx-auto mt-2 text-center">
          Koi ek chuno — usi theme se tumhari store banna shuru hogi.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_THEMES.map((g) => {
            const theme = THEME_PRESETS.find(
              (t) => t.presetId === g.presetId,
            );
            if (!theme) return null;
            return (
              <Card key={g.presetId} padding="compact">
                {/* Peek-height preview — header + hero nazar aate hain,
                    baaki sections neeche scroll jaisi jhalak dete hain. */}
                <div className="max-h-[380px] overflow-hidden rounded-xl">
                  <MiniStorePreview
                    theme={theme}
                    prompt={g.prompt}
                    label={`${theme.name} theme ka sample store preview`}
                  />
                </div>
                <h3 className="mt-4 text-h3">{theme.name}</h3>
                <p className="mt-1 text-sm text-body">{g.line}</p>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={(e) => startBuilding(e, g.prompt)}
                  className="mt-4 w-full"
                >
                  Use this theme
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ---------- 4. FAQ — sirf 3 sawal ---------- */}
      <section className="stb-section border-t border-border">
        <h2 className="text-h2 text-center">Aksar pooche gaye sawal</h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-4">
          {FAQS.map((f) => (
            <Card key={f.q} padding="compact">
              <h3 className="text-h3">{f.q}</h3>
              <p className="mt-1 text-sm text-body">{f.a}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------- 5. Minimal footer ---------- */}
      <footer className="flex flex-col items-center justify-between gap-2 border-t border-border py-6 text-sm text-muted sm:flex-row">
        <p>AI Shopify Theme Builder — prompt se theme, theme se store.</p>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-muted hover:text-accent">
            Dashboard
          </Link>
          <Link href="/billing" className="text-muted hover:text-accent">
            Billing
          </Link>
        </div>
      </footer>
    </div>
  );
}
