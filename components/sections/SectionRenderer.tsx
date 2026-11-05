// components/sections/SectionRenderer.tsx — Agent 3
// Renders ONE section from data (never a hardcoded page).
// Inner elements (title / subtitle / text / image) are clickable in edit
// mode so the toolbar/panel can target them, not only the outer section.
"use client";

import type { ElementKey, Section, Theme } from "@/lib/sections";
import { placeholderImage } from "@/lib/sections";

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

export default function SectionRenderer({
  section: s,
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

    case "hero":
      return (
        <section style={base}>
          <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2">
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

    case "product":
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
            {[
              { name: "Classic Tee", price: "$29" },
              { name: "Everyday Jacket", price: "$79" },
              { name: "Comfort Sneakers", price: "$59" },
            ].map((p) => (
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
            ))}
          </div>
        </section>
      );

    case "features":
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
          <div className="mx-auto mt-6 grid max-w-6xl grid-cols-3 gap-4 text-left">
            {[
              { t: "Fast delivery", d: "Orders ship in 24 hours." },
              { t: "Easy returns", d: "30-day no-questions returns." },
              { t: "Secure checkout", d: "Your payment stays protected." },
            ].map((f) => (
              <div key={f.t} className="rounded-xl bg-black/5 p-4">
                <div className="font-semibold">{f.t}</div>
                <div className="mt-1 text-sm opacity-70">{f.d}</div>
              </div>
            ))}
          </div>
        </section>
      );

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
  }
}
