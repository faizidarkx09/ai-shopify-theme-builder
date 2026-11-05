// components/editor/SeoPanel.tsx — Per-page SEO panel (Cut B #13).
// Fields: SEO title, meta description (live counter, ≤150 chars, warn
// over), URL handle (slug-safe), indexation toggle (noindex). Writes
// Page.seo via props only — the integrator persists the returned seo
// object onto the page (onSectionsChange / store update). No store
// writes here. Exported SEO is emitted by lib/export/shopify.ts
// (templates/*.liquid) and lib/export/code.ts (index.html head).
"use client";

import { useEffect, useState } from "react";
import type { Page, PageSeo } from "@/lib/types";

export const SEO_DESCRIPTION_MAX = 150;

export interface SeoPanelProps {
  page: Page;
  /** Called with the full new seo object whenever any field changes. */
  onSeoChange: (seo: PageSeo) => void;
}

/** Make a handle slug-safe: lowercase, dashes, no leading/trailing dash. */
export function slugifyHandle(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export default function SeoPanel({ page, onSeoChange }: SeoPanelProps) {
  const [seo, setSeo] = useState<PageSeo>(page.seo ?? {});

  // Page changes (switching pages) → reload the panel from the new page.
  useEffect(() => {
    setSeo(page.seo ?? {});
  }, [page.id, page.seo]);

  const patch = (next: PageSeo) => {
    setSeo(next);
    onSeoChange(next);
  };

  const description = seo.description ?? "";
  const overLimit = description.length > SEO_DESCRIPTION_MAX;

  return (
    <section
      aria-label="Page SEO"
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: 16,
        background: "#ffffff",
      }}
    >
      <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Page SEO</h3>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
        Search title, description and URL handle for “{page.title}”. Exported
        into the Shopify theme and the code export.
      </p>

      <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
        SEO title
        <input
          type="text"
          value={seo.title ?? ""}
          placeholder={page.title}
          onChange={(e) => patch({ ...seo, title: e.target.value })}
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />
      </label>

      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginTop: 12,
        }}
      >
        Meta description
        <textarea
          value={description}
          rows={3}
          placeholder="One or two lines about this page, for search results."
          onChange={(e) => patch({ ...seo, description: e.target.value })}
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
            resize: "vertical",
          }}
        />
      </label>
      <p
        style={{
          margin: "4px 0 0",
          fontSize: 12,
          color: overLimit ? "#b91c1c" : "#6b7280",
          fontWeight: overLimit ? 700 : 400,
        }}
        role="status"
      >
        {description.length} / {SEO_DESCRIPTION_MAX} characters
        {overLimit
          ? ` — ${description.length - SEO_DESCRIPTION_MAX} zyada hain; search results me cut ho jayegi.`
          : ""}
      </p>

      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          marginTop: 12,
        }}
      >
        URL handle
        <input
          type="text"
          value={seo.handle ?? ""}
          placeholder={page.slug}
          onChange={(e) =>
            patch({ ...seo, handle: slugifyHandle(e.target.value) })
          }
          style={{
            display: "block",
            width: "100%",
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
          }}
        />
      </label>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>
        Only lowercase letters, numbers and dashes. Empty = the page slug is
        used.
      </p>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={seo.noindex ?? false}
          onChange={(e) => patch({ ...seo, noindex: e.target.checked })}
        />
        Hide this page from search engines (noindex)
      </label>
    </section>
  );
}
