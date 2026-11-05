// lib/ai/types.ts — INTEGRATION (2026-11-05): re-exports the canonical
// types from lib/types.ts (single source of truth). Section.padding is a
// NUMBER (px) everywhere now; string paddings from Gemini/raw input are
// normalised to a number in lib/ai/generate.ts completeSections().
export * from "../types";
import type { Page, PageType, Section, Theme } from "../types";

export interface GenerateInput {
  prompt: string;
  pageType?: PageType;
  pageTitle?: string;
  /** Agar caller ke paas pehle se theme hai (theme-first flow), to wahi use ho. */
  theme?: Theme;
  projectId?: string;
}

export type GenerateEvent =
  | { type: "theme"; theme: Theme }
  | { type: "section"; section: Section; index: number; total: number }
  | { type: "done"; page: Page }
  | { type: "error"; message: string };
