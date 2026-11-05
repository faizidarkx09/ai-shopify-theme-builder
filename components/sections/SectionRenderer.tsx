// components/sections/SectionRenderer.tsx — Agent 3
// Renders ONE section from data (never a hardcoded page).
// Inner elements (title / subtitle / text / image) are clickable in edit
// mode so the toolbar/panel can target them, not only the outer section.
"use client";

import type { ElementKey, Section, Theme } from "@/lib/sections";
import { placeholderImage } from "@/lib/sections";
import { capEntrance } from "@/lib/types";

export interface SectionRendererProps {
  section: Section;
  theme?: Theme | null;
  /** when true, inner elements are clickable/selectable */
  editMode?: boolean;
  selectedElement?: ElementKey | null;
  onSelectElement?: (el: ElementKey) => void;
}

function elProps(
  el: ElementKey,
  editMode: boolean | undefined,
  selected: ElementKey | null | undefined,
  onSelect: ((el: ElementKey) => void) | undefined,
): Record<string, unknown> {
  if (!editMode) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    "data-element": el,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(el);
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.stopPropagation();
        onSelect?.(el);
      }
    },
    style: {
      outline: selected === el ? "2px dashed #7c3aed" : undefined,
      outlineOffset: 2,
      cursor: "pointer",
      borderRadius: 4,
    },
  };
}

function Img({
  src,
  alt,
  className,
  style,
  el,
  editMode,
  selected,
  onSelect,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  el: ElementKey;
  editMode?: boolean;
  selected?: ElementKey | null;
  onSelect?: (el: ElementKey) => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        const t = e.currentTarget;
        if (!t.src.includes("picsum.photos")) t.src = placeholderImage("fallback");
      }}
      {...elProps(el, editMode, selected, onSelect)}
    />
  );
}

/** Countdown target (ISO date string in section.meta) -> days/hours/mins. Falls back to 48h. */
function countdownParts(meta: Section["meta"]): { days: number; hours: number; mins: number } {
  const fallback = { days: 2, hours: 0, mins: 0 };
  const raw = meta?.countdownTarget;
  if (typeof raw !== "string") return fallback;
  const target = new Date(raw).getTime();
  if (Number.isNaN(target)) return fallback;
  const diff = Math.max(0, target - Date.now());
  if (diff === 0) return fallback;
  const mins = Math.floor(diff / 60000);
  return { days: Math.floor(mins / 1440), hours: Math.floor((mins % 1440) / 60), mins: mins % 60 };
}

const ENTRANCE_CLASS: Record<string, string> = {
  fade: "stb-anim-fade",
  "slide-up": "stb-anim-slide-up",
  zoom: "stb-anim-zoom",
  "slide-left": "stb-anim-slide-left",
};

const HOVER_CLASS: Record<string, string> = {
  lift: "stb-hover-lift",
  scale: "stb-hover-scale",
};

const LAYOUT_CLASS: Record<string, string> = {
  narrow: "mx-auto max-w-3xl",
  boxed: "mx-auto max-w-6xl",
  "full-width": "w-full",
};

export default function SectionRenderer({
  section: s,
  theme,
  editMode,
  selectedElement,
  onSelectElement,
}: SectionRendererProps) {
  const base: React.CSSProperties = {
    backgroundColor: s.bgColor ?? "#ffffff",
    color: s.textColor ?? "#111827",
    textAlign: s.align ?? "left",
    padding: s.padding ?? 24,
  };
  const titleStyle: React.CSSProperties = {
    fontSize: s.fontSize ?? 24,
    fontWeight: 700,
    lineHeight: 1.15,
  };
  const ep = (el: ElementKey) => elProps(el, editMode, selectedElement, onSelectElement);

  // Inner markup per type. Animation/layout wrap below — only when set,
  // so sections without them render exactly as before.
  const inner: React.ReactNode = (() => {
  switch (s.type) {
    case "header": {
      const cls = s.floating
        ? "mx-4 mt-4 rounded-full shadow-lg"
        : s.rounded
          ? "rounded-2xl"
          : "";
      return (
        <header className={cls} style={base}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <span {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 20 }}>
              {s.title || "My Store"}
            </span>
            <nav className="flex gap-4 text-sm opacity-80">
              <span>Home</span>
              <span>Shop</span>
              <span>About</span>
              <span>Contact</span>
            </nav>
          </div>
        </header>
      );
    }

    case "hero": {
      // Cut B #7 layouts: 'default' = current rendering (unchanged);
      // 'split' = image on the left, copy on the right; 'centered' =
      // centred copy stacked above a centred image.
      const layout = s.layout ?? "default";
      const textBlock = (
        <div>
          <h1 {...ep("title")} style={titleStyle}>
            {s.title}
          </h1>
          {s.subtitle ? (
            <p {...ep("subtitle")} className="mt-3 text-lg opacity-80">
              {s.subtitle}
            </p>
          ) : null}
          {s.text ? (
            <p {...ep("text")} className="mt-3 opacity-80">
              {s.text}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-6 rounded-full bg-white px-6 py-3 font-semibold text-gray-900"
          >
            Shop Now
          </button>
        </div>
      );
      const imgBlock = (
        <Img
          src={s.image ?? placeholderImage(`${s.type}-hero`)}
          alt={s.title}
          className="h-64 w-full rounded-2xl object-cover md:h-80"
          el="image"
          editMode={editMode}
          selected={selectedElement}
          onSelect={onSelectElement}
        />
      );
      if (layout === "centered") {
        return (
          <section style={{ ...base, textAlign: "center" }}>
            <div className="mx-auto max-w-2xl text-center">{textBlock}</div>
            <div className="mx-auto mt-8 max-w-2xl">
              <Img
                src={s.image ?? placeholderImage(`${s.type}-hero`)}
                alt={s.title}
                className="h-64 w-full rounded-2xl object-cover md:h-80"
                el="image"
                editMode={editMode}
                selected={selectedElement}
                onSelect={onSelectElement}
              />
            </div>
          </section>
        );
      }
      if (layout === "split") {
        return (
          <section style={base}>
            <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
              {imgBlock}
              {textBlock}
            </div>
          </section>
        );
      }
      return (
        <section style={base}>
          <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
            {textBlock}
            {imgBlock}
          </div>
        </section>
      );
    }

    case "banner":
      return (
        <section style={base}>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-90">
              {s.text}
            </p>
          ) : null}
        </section>
      );

    case "category":
      return (
        <section style={base}>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-70">
              {s.text}
            </p>
          ) : null}
          <div className="mx-auto mt-6 grid max-w-6xl grid-cols-3 gap-4">
            {["Fashion", "Home", "Beauty"].map((c) => (
              <figure key={c} className="overflow-hidden rounded-xl bg-black/5">
                <Img
                  src={placeholderImage(`category-${c.toLowerCase()}`, 600, 400)}
                  alt={c}
                  className="h-32 w-full object-cover"
                  el="image"
                  editMode={editMode}
                  selected={selectedElement}
                  onSelect={onSelectElement}
                />
                <figcaption className="p-3 text-sm font-semibold">{c}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      );

    case "product": {
      // Cut B #7 layouts: 'default' = current 3-col grid; 'split' = intro
      // copy on the left, products in a 2-col grid on the right;
      // 'centered' = centred header above the same grid.
      const layout = s.layout ?? "default";
      const products = [
        { name: "Classic Tee", price: "$29" },
        { name: "Everyday Jacket", price: "$79" },
        { name: "Comfort Sneakers", price: "$59" },
      ];
      const card = (p: { name: string; price: string }) => (
        <article key={p.name} className="overflow-hidden rounded-xl bg-white text-gray-900 shadow">
          <Img
            src={placeholderImage(`product-${p.name.toLowerCase().replace(/\s+/g, "-")}`, 600, 500)}
            alt={p.name}
            className="h-40 w-full object-cover"
            el="image"
            editMode={editMode}
            selected={selectedElement}
            onSelect={onSelectElement}
          />
          <div className="p-3 text-left">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm opacity-70">{p.price} · placeholder product</div>
          </div>
        </article>
      );
      const header = (
        <>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-70">
              {s.text}
            </p>
          ) : null}
        </>
      );
      if (layout === "split") {
        return (
          <section style={base}>
            <div className="mx-auto grid max-w-6xl items-start gap-8 md:grid-cols-3">
              <div className="text-left">{header}</div>
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                {products.map(card)}
              </div>
            </div>
          </section>
        );
      }
      if (layout === "centered") {
        return (
          <section style={{ ...base, textAlign: "center" }}>
            <div className="mx-auto max-w-2xl text-center">{header}</div>
            <div className="mx-auto mt-6 grid max-w-6xl grid-cols-3 gap-4">
              {products.map(card)}
            </div>
          </section>
        );
      }
      return (
        <section style={base}>
          {header}
          <div className="mx-auto mt-6 grid max-w-6xl grid-cols-3 gap-4">
            {products.map(card)}
          </div>
        </section>
      );
    }

    case "features": {
      // Cut B #7 layouts: 'default' = current 3-col grid; 'split' = intro
      // copy on the left, features stacked in a list on the right;
      // 'centered' = centred header above the same grid.
      const layout = s.layout ?? "default";
      const items = [
        { t: "Fast delivery", d: "Orders ship in 24 hours." },
        { t: "Easy returns", d: "30-day no-questions returns." },
        { t: "Secure checkout", d: "Your payment stays protected." },
      ];
      const featureBox = (f: { t: string; d: string }) => (
        <div key={f.t} className="rounded-xl bg-black/5 p-4">
          <div className="font-semibold">{f.t}</div>
          <div className="mt-1 text-sm opacity-70">{f.d}</div>
        </div>
      );
      const header = (
        <>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-70">
              {s.text}
            </p>
          ) : null}
        </>
      );
      if (layout === "split") {
        return (
          <section style={base}>
            <div className="mx-auto grid max-w-6xl items-start gap-8 md:grid-cols-2">
              <div className="text-left">{header}</div>
              <div className="space-y-4 text-left">{items.map(featureBox)}</div>
            </div>
          </section>
        );
      }
      if (layout === "centered") {
        return (
          <section style={{ ...base, textAlign: "center" }}>
            <div className="mx-auto max-w-2xl text-center">{header}</div>
            <div className="mx-auto mt-6 grid max-w-6xl grid-cols-3 gap-4 text-left">
              {items.map(featureBox)}
            </div>
          </section>
        );
      }
      return (
        <section style={base}>
          {header}
          <div className="mx-auto mt-6 grid max-w-6xl grid-cols-3 gap-4 text-left">
            {items.map(featureBox)}
          </div>
        </section>
      );
    }

    case "cta":
      return (
        <section style={base}>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 32 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mx-auto mt-3 max-w-xl opacity-80">
              {s.text}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-6 rounded-full bg-white px-8 py-3 font-semibold text-gray-900"
          >
            Get Started
          </button>
        </section>
      );

    case "footer":
      return (
        <footer style={base}>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3">
            <div>
              <div {...ep("title")} style={{ fontWeight: 700, fontSize: s.fontSize ?? 16 }}>
                {s.title || "My Store"}
              </div>
              {s.text ? (
                <p {...ep("text")} className="mt-2 text-sm opacity-70">
                  {s.text}
                </p>
              ) : null}
            </div>
            <div className="text-sm opacity-80">
              <div className="font-semibold">Shop</div>
              <div>New arrivals</div>
              <div>Best sellers</div>
              <div>Sale</div>
            </div>
            <div className="text-sm opacity-80">
              <div className="font-semibold">Help</div>
              <div>Shipping</div>
              <div>Returns</div>
              <div>Contact</div>
            </div>
          </div>
        </footer>
      );

    case "testimonials": {
      // Cut B #7 layouts: 'default' = current 3-col grid; 'split' =
      // featured first quote large on the left, the rest stacked right;
      // 'centered' = centred header + centred quotes.
      const layout = s.layout ?? "default";
      const quotes = [
        { q: "Quality is excellent — delivery was fast and the product feels premium.", n: "Ayesha K.", r: "★★★★★" },
        { q: "Ordered twice already. Support answered within minutes both times.", n: "Bilal R.", r: "★★★★★" },
        { q: "Exactly as described. I recommend this store to all my friends.", n: "Sara M.", r: "★★★★☆" },
      ];
      const quote = (t: { q: string; n: string; r: string }, large = false) => (
        <blockquote key={t.n} className="rounded-xl bg-black/5 p-5">
          <div className="text-sm text-amber-500">{t.r}</div>
          <p className={`mt-2 leading-relaxed ${large ? "text-lg" : "text-sm"}`}>“{t.q}”</p>
          <footer className="mt-3 text-sm font-semibold">— {t.n}</footer>
        </blockquote>
      );
      const header = (
        <>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-70">
              {s.text}
            </p>
          ) : null}
        </>
      );
      if (layout === "split") {
        const [first, ...rest] = quotes;
        return (
          <section style={base}>
            <div className="text-left">{header}</div>
            <div className="mx-auto mt-6 grid max-w-6xl items-start gap-4 text-left md:grid-cols-2">
              {first ? quote(first, true) : null}
              <div className="space-y-4">{rest.map((t) => quote(t))}</div>
            </div>
          </section>
        );
      }
      if (layout === "centered") {
        return (
          <section style={{ ...base, textAlign: "center" }}>
            <div className="mx-auto max-w-2xl text-center">{header}</div>
            <div className="mx-auto mt-6 grid max-w-6xl gap-4 text-center md:grid-cols-3">
              {quotes.map((t) => quote(t))}
            </div>
          </section>
        );
      }
      return (
        <section style={base}>
          {header}
          <div className="mx-auto mt-6 grid max-w-6xl gap-4 text-left md:grid-cols-3">
            {quotes.map((t) => quote(t))}
          </div>
        </section>
      );
    }

    case "faq": {
      // Cut B #7 layouts: 'default' = current stacked list; 'split' =
      // intro copy on the left, questions on the right; 'centered' =
      // centred header above a centred question list.
      const layout = s.layout ?? "default";
      const items = [
        { q: "How fast is delivery?", a: "Orders ship within 24 hours and arrive in 2–4 working days." },
        { q: "Can I return an item?", a: "Yes — easy returns within 30 days, no questions asked." },
        { q: "Is checkout secure?", a: "Yes, payments go through Shopify's secure checkout." },
      ];
      const qa = (it: { q: string; a: string }) => (
        <div key={it.q} className="rounded-xl bg-black/5 p-4">
          <div className="font-semibold">{it.q}</div>
          <p className="mt-1 text-sm opacity-70">{it.a}</p>
        </div>
      );
      const header = (
        <>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-70">
              {s.text}
            </p>
          ) : null}
        </>
      );
      if (layout === "split") {
        return (
          <section style={base}>
            <div className="mx-auto grid max-w-6xl items-start gap-8 md:grid-cols-3">
              <div className="text-left">{header}</div>
              <div className="space-y-3 text-left md:col-span-2">{items.map(qa)}</div>
            </div>
          </section>
        );
      }
      if (layout === "centered") {
        return (
          <section style={{ ...base, textAlign: "center" }}>
            <div className="mx-auto max-w-2xl text-center">{header}</div>
            <div className="mx-auto mt-6 max-w-2xl space-y-3 text-left">
              {items.map(qa)}
            </div>
          </section>
        );
      }
      return (
        <section style={base}>
          {header}
          <div className="mx-auto mt-6 max-w-3xl space-y-3 text-left">
            {items.map(qa)}
          </div>
        </section>
      );
    }

    case "newsletter":
      return (
        <section style={base}>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mx-auto mt-2 max-w-xl opacity-80">
              {s.text}
            </p>
          ) : null}
          <form
            className="mx-auto mt-6 flex max-w-md gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              required
              placeholder="Your email address"
              aria-label="Email address"
              className="min-w-0 flex-1 rounded-full border border-white/40 bg-white/10 px-4 py-3 text-sm text-inherit outline-none placeholder:text-inherit placeholder:opacity-60"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-900"
            >
              Subscribe
            </button>
          </form>
          <p className="mt-3 text-xs opacity-60">Demo form — no emails are collected.</p>
        </section>
      );

    case "announcement":
      return (
        <div style={{ ...base, padding: s.padding ?? 12 }} className="text-sm font-medium">
          <p {...ep("title")} className="text-center">
            {s.title}
          </p>
        </div>
      );

    case "countdown": {
      const cd = countdownParts(s.meta);
      const box = (value: number, label: string) => (
        <div key={label} className="min-w-20 rounded-xl bg-black/5 px-4 py-3">
          <div className="text-3xl font-bold tabular-nums">{String(value).padStart(2, "0")}</div>
          <div className="mt-1 text-xs tracking-wide uppercase opacity-60">{label}</div>
        </div>
      );
      return (
        <section style={base}>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-70">
              {s.text}
            </p>
          ) : null}
          <div className="mt-6 flex justify-center gap-3">
            {box(cd.days, "Days")}
            {box(cd.hours, "Hours")}
            {box(cd.mins, "Mins")}
          </div>
        </section>
      );
    }

    case "trust-badges": {
      const badges = [
        { t: "Secure checkout", d: "Safe payments" },
        { t: "30-day returns", d: "No questions asked" },
        { t: "Fast delivery", d: "Ships in 24 hours" },
        { t: "Real support", d: "We reply within a day" },
      ];
      return (
        <section style={base}>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 24 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 text-sm opacity-70">
              {s.text}
            </p>
          ) : null}
          <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-3">
            {badges.map((b) => (
              <div key={b.t} className="rounded-full border border-current/20 px-4 py-2 text-sm">
                <span className="font-semibold">✓ {b.t}</span>
                <span className="opacity-60"> · {b.d}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "bundle": {
      const items = [
        { name: "Classic Tee", price: 29 },
        { name: "Everyday Jacket", price: 79 },
        { name: "Comfort Sneakers", price: 59 },
      ];
      const total = items.reduce((sum, p) => sum + p.price, 0);
      const stock = typeof s.meta?.stockCount === "number" ? s.meta.stockCount : null;
      return (
        <section style={base}>
          <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 28 }}>
            {s.title}
          </h2>
          {s.text ? (
            <p {...ep("text")} className="mt-2 opacity-70">
              {s.text}
            </p>
          ) : null}
          <div className="mx-auto mt-6 grid max-w-4xl grid-cols-3 gap-4">
            {items.map((p) => (
              <article key={p.name} className="overflow-hidden rounded-xl bg-white text-gray-900 shadow">
                <Img
                  src={placeholderImage(`bundle-${p.name.toLowerCase().replace(/\s+/g, "-")}`, 600, 500)}
                  alt={p.name}
                  className="h-32 w-full object-cover"
                  el="image"
                  editMode={editMode}
                  selected={selectedElement}
                  onSelect={onSelectElement}
                />
                <div className="p-3 text-left">
                  <div className="text-sm font-semibold">{p.name}</div>
                  <div className="text-sm opacity-70">${p.price}</div>
                </div>
              </article>
            ))}
          </div>
          <p className="mt-5 text-lg font-bold">
            Bundle total: ${total}
            {stock !== null ? <span className="ml-3 text-sm font-medium text-red-600">Only {stock} left in stock</span> : null}
          </p>
          <button type="button" className="mt-4 rounded-full bg-white px-8 py-3 font-semibold text-gray-900">
            Add Bundle to Cart
          </button>
        </section>
      );
    }

    case "sticky-atc":
      return (
        <div
          style={{ ...base, padding: s.padding ?? 16, position: "sticky", bottom: 0, zIndex: 10 }}
          className="shadow-[0_-4px_16px_rgba(0,0,0,0.12)]"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div>
              <div {...ep("title")} className="font-bold">
                {s.title}
              </div>
              {s.text ? (
                <p {...ep("text")} className="text-sm opacity-70">
                  {s.text}
                </p>
              ) : null}
            </div>
            <button type="button" className="rounded-full bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white">
              Add to Cart
            </button>
          </div>
        </div>
      );

    case "delivery":
      return (
        <section style={base}>
          <div className="mx-auto flex max-w-4xl items-start gap-3 text-left">
            <span aria-hidden className="text-2xl">🚚</span>
            <div>
              <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 24 }}>
                {s.title}
              </h2>
              {s.text ? (
                <p {...ep("text")} className="mt-1 text-sm opacity-70">
                  {s.text}
                </p>
              ) : null}
              <p className="mt-2 text-sm font-medium">
                Estimated delivery: 2–4 working days · Free shipping over $50
              </p>
            </div>
          </div>
        </section>
      );

    case "custom": {
      const srcDoc = `<style>${s.customCss ?? ""}</style>${s.customHtml ?? ""}<script>${s.customJs ?? ""}</script>`;
      return (
        <section style={base}>
          {s.title ? (
            <h2 {...ep("title")} style={{ ...titleStyle, fontSize: s.fontSize ?? 24 }}>
              {s.title}
            </h2>
          ) : null}
          {s.customHtml || s.customCss || s.customJs ? (
            <iframe
              title={s.title || "Custom block"}
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              className="mt-4 w-full rounded-xl border border-black/10 bg-white"
              style={{ minHeight: 200 }}
            />
          ) : (
            <p className="mt-4 rounded-xl bg-black/5 p-6 text-sm opacity-70">
              Empty custom block — add HTML, CSS or JavaScript to fill it.
            </p>
          )}
        </section>
      );
    }
  }
  return null;
  })();

  // Animation + layout wrapper — only when set, so existing sections render as before.
  // Cut C #22 (integrator): the entrance is capped by the theme's
  // animationLevel, and level 'none' adds .stb-anim-off (globals.css).
  const anim = s.animation;
  const level = theme?.animationLevel ?? "medium";
  const cappedEntrance = capEntrance(anim?.entrance ?? "none", level);
  const entranceCls =
    cappedEntrance && cappedEntrance !== "none"
      ? (ENTRANCE_CLASS[cappedEntrance] ?? "")
      : "";
  const hoverCls =
    anim?.hover && anim.hover !== "none" ? (HOVER_CLASS[anim.hover] ?? "") : "";
  const layoutCls = s.layout ? (LAYOUT_CLASS[s.layout] ?? "") : "";
  const hasDelay = (anim?.delayMs ?? 0) > 0;
  const animOff = level === "none";
  if (!entranceCls && !hoverCls && !layoutCls && !hasDelay && !animOff) return inner;
  return (
    <div
      className={
        `${animOff ? "stb-anim-off" : ""} ${entranceCls} ${hoverCls} ${layoutCls}`.trim() ||
        undefined
      }
      style={hasDelay ? { animationDelay: `${anim?.delayMs}ms` } : undefined}
      data-layout={s.layout || undefined}
    >
      {inner}
    </div>
  );
}
