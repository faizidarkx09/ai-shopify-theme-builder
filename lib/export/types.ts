// lib/export/types.ts — INTEGRATION (2026-11-05): re-exports the canonical
// types from lib/types.ts (single source of truth). Section.padding is a
// NUMBER (px); export builders convert it to CSS (e.g. "48px 0") themselves.
export * from "../types";

export type ExportFormat = "shopify" | "code" | "png";

/** Exported theme ki sab se zaroori shart — har export par saaf likhna hai. */
export const PLACEHOLDER_DISCLAIMER =
  "Exported themes carry PLACEHOLDER products/content, not a real Shopify catalog sync. " +
  "Asli products aur prices Shopify me khud lagane honge.";
