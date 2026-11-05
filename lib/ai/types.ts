// lib/ai/types.ts — INTEGRATION (2026-11-05): re-exports the canonical
// types from lib/types.ts (single source of truth). Section.padding is a
// NUMBER (px) everywhere now; string paddings from Gemini/raw input are
// normalised to a number in lib/ai/generate.ts completeSections().
export * from "../types";
import type { BrandKit, CsvProduct, Page, PageType, Section, Theme } from "../types";
import type { SitePlan } from "./plan";

export interface GenerateInput {
  prompt: string;
  pageType?: PageType;
  pageTitle?: string;
  /** Agar caller ke paas pehle se theme hai (theme-first flow), to wahi use ho. */
  theme?: Theme;
  projectId?: string;
  /**
   * Approved plan from the plan gate (lib/ai/plan.ts). When present, the
   * plan's theme and the plan page at `planPageIndex` (default 0) decide
   * the page structure instead of re-deriving it.
   */
  plan?: SitePlan;
  /** Index of the plan page to generate (default 0 = first page). */
  planPageIndex?: number;
  /**
   * Real products for the product sections — the project's csvProducts
   * when they exist. When omitted/empty the generator falls back to the
   * demo catalog for the prompt's niche.
   */
  products?: CsvProduct[];
  /**
   * Brand kit (Cut B #10): when present, its colours/font override the
   * theme BEFORE generation, so this page and every later page inherit
   * the kit. Applied on top of the plan theme too.
   */
  brandKit?: BrandKit;
}

export type GenerateEvent =
  | { type: "theme"; theme: Theme }
  | { type: "section"; section: Section; index: number; total: number }
  | { type: "done"; page: Page }
  | { type: "error"; message: string };
