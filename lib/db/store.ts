// lib/db/store.ts
// Project store: a clean interface + two implementations.
//
// Cut 1: localStorage-first on the client (works with ZERO database, ZERO
// keys). On the server (API routes) localStorage does not exist, so the same
// interface is backed by an in-memory Map (per-process demo data only).
//
// Later (Neon/Postgres): write ONE new class implementing ProjectStore
// against the database and swap it in getProjectStore(). No caller changes.
// Do NOT invent Clerk/Neon credentials here — there are none.

import type { NewProjectInput, Project, ProjectPatch } from './types';

export interface ProjectStore {
  create(input: NewProjectInput, ownerId: string): Project;
  get(id: string): Project | null;
  /** All projects for one owner, newest first. Omit ownerId for all. */
  list(ownerId?: string): Project[];
  count(ownerId?: string): number;
  update(id: string, patch: ProjectPatch): Project | null;
  delete(id: string): boolean;
  clear(): void;
  /**
   * Cut C #27 — duplicate a project into a new one (new id + timestamps).
   * Keeps pages/theme/brandKit/csvProducts/funnelOrder; RESETS versions
   * and comments (a copy starts clean) and messages (single user message
   * with the original prompt). `overrides` may rename it and/or mark it
   * as a template; by default the copy is a plain project
   * (isTemplate=false, templateName cleared) named "<name> (copy)".
   */
  duplicateProject(id: string, overrides?: DuplicateOverrides): Project | null;
  /**
   * Cut C #27 — save a project as a reusable named template: duplicates
   * it with isTemplate=true + templateName. Returns null when the id
   * does not exist or the name is blank.
   */
  saveAsTemplate(id: string, templateName: string): Project | null;
}

/** Overrides for duplicateProject (Cut C #27). */
export interface DuplicateOverrides {
  /** Display name for the copy (default "<source name> (copy)"). */
  name?: string;
  /** Mark the copy as a template (default false). */
  isTemplate?: boolean;
  /** Template display name (only kept when isTemplate is true). */
  templateName?: string;
}

export function createProjectId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `proj_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createSectionId(): string {
  return `sec_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function projectNameFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/\s+/g, ' ');
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || 'Untitled project';
}

/** Default theme used when the AI engine has not generated one yet. */
export const DEFAULT_THEME = {
  name: 'Default light',
  colors: {
    primary: '#111827',
    secondary: '#6b7280',
    background: '#ffffff',
    text: '#111827',
    accent: '#ec4899',
  },
  font: 'Inter',
  style: 'modern',
} as const;

/** In-memory implementation — the base for both stores. */
export class MemoryProjectStore implements ProjectStore {
  protected items = new Map<string, Project>();

  create(input: NewProjectInput, ownerId: string): Project {
    if (!input.prompt || !input.prompt.trim()) {
      throw new Error('Project prompt is required.');
    }
    const stamp = nowIso();
    const project: Project = {
      id: createProjectId(),
      ownerId,
      name: input.name?.trim() || projectNameFromPrompt(input.prompt),
      prompt: input.prompt.trim(),
      theme: input.theme ?? { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors } },
      pages: input.pages ?? [],
      messages: [
        {
          id: createSectionId(),
          role: 'user',
          text: input.prompt.trim(),
          createdAt: stamp,
        },
      ],
      createdAt: stamp,
      updatedAt: stamp,
    };
    this.items.set(project.id, project);
    return project;
  }

  get(id: string): Project | null {
    return this.items.get(id) ?? null;
  }

  list(ownerId?: string): Project[] {
    const all = [...this.items.values()];
    const filtered = ownerId ? all.filter((p) => p.ownerId === ownerId) : all;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  count(ownerId?: string): number {
    return this.list(ownerId).length;
  }

  update(id: string, patch: ProjectPatch): Project | null {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated: Project = {
      ...existing,
      ...patch,
      id: existing.id,
      ownerId: existing.ownerId,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
    };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  duplicateProject(id: string, overrides?: DuplicateOverrides): Project | null {
    const source = this.items.get(id);
    if (!source) return null;
    const stamp = nowIso();
    const isTemplate = overrides?.isTemplate ?? false;
    const templateName = isTemplate
      ? overrides?.templateName?.trim() ||
        source.templateName?.trim() ||
        source.name
      : undefined;
    // JSON round-trip = deep clone of the kept data (pages/theme are
    // plain JSON). Versions + comments are deliberately NOT copied: a
    // duplicate starts with no history and no comment pins.
    const copy: Project = {
      id: createProjectId(),
      ownerId: source.ownerId,
      name:
        overrides?.name?.trim() ||
        (isTemplate ? (templateName ?? source.name) : `${source.name} (copy)`),
      prompt: source.prompt,
      theme: JSON.parse(JSON.stringify(source.theme)) as Project['theme'],
      pages: JSON.parse(JSON.stringify(source.pages)) as Project['pages'],
      messages: [
        {
          id: createSectionId(),
          role: 'user',
          text: source.prompt,
          createdAt: stamp,
        },
      ],
      createdAt: stamp,
      updatedAt: stamp,
      brandKit: source.brandKit
        ? (JSON.parse(JSON.stringify(source.brandKit)) as Project['brandKit'])
        : undefined,
      csvProducts: source.csvProducts
        ? (JSON.parse(JSON.stringify(source.csvProducts)) as Project['csvProducts'])
        : undefined,
      comments: [],
      funnelOrder: source.funnelOrder ? [...source.funnelOrder] : undefined,
      isTemplate,
      templateName,
    };
    this.items.set(copy.id, copy);
    return copy;
  }

  saveAsTemplate(id: string, templateName: string): Project | null {
    const name = templateName.trim();
    if (!name) return null;
    return this.duplicateProject(id, {
      isTemplate: true,
      templateName: name,
      name,
    });
  }

  clear(): void {
    this.items.clear();
  }
}

const LOCAL_STORAGE_KEY = 'ai-shopify-builder:projects:v1';

/**
 * Browser implementation: same behaviour as MemoryProjectStore, but every
 * change is persisted to localStorage so projects survive a reload.
 * Safe to construct on the server — it simply behaves like memory there
 * (no window/localStorage access until a method runs in the browser).
 */
export class LocalStorageProjectStore extends MemoryProjectStore {
  private loaded = false;

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const item of parsed as Project[]) {
        if (item && typeof item.id === 'string') this.items.set(item.id, item);
      }
    } catch {
      // Corrupt local data: start empty rather than crash the app.
      this.items.clear();
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify([...this.items.values()]),
      );
    } catch {
      // Storage full / private mode: keep working in memory.
    }
  }

  override create(input: NewProjectInput, ownerId: string): Project {
    this.load();
    const project = super.create(input, ownerId);
    this.save();
    return project;
  }

  override get(id: string): Project | null {
    this.load();
    return super.get(id);
  }

  override list(ownerId?: string): Project[] {
    this.load();
    return super.list(ownerId);
  }

  override count(ownerId?: string): number {
    this.load();
    return super.count(ownerId);
  }

  override update(id: string, patch: ProjectPatch): Project | null {
    this.load();
    const updated = super.update(id, patch);
    if (updated) this.save();
    return updated;
  }

  override delete(id: string): boolean {
    this.load();
    const removed = super.delete(id);
    if (removed) this.save();
    return removed;
  }

  override duplicateProject(id: string, overrides?: DuplicateOverrides): Project | null {
    this.load();
    const copy = super.duplicateProject(id, overrides);
    if (copy) this.save();
    return copy;
  }

  override saveAsTemplate(id: string, templateName: string): Project | null {
    this.load();
    const template = super.saveAsTemplate(id, templateName);
    if (template) this.save();
    return template;
  }

  override clear(): void {
    this.load();
    super.clear();
    this.save();
  }
}

let singleton: ProjectStore | null = null;

/**
 * The store the app should use. Browser -> localStorage (persists),
 * server -> memory (per-process demo data). Swap the server branch for a
 * Neon/Postgres implementation later; callers do not change.
 */
export function getProjectStore(): ProjectStore {
  if (!singleton) {
    singleton =
      typeof window !== 'undefined'
        ? new LocalStorageProjectStore()
        : new MemoryProjectStore();
  }
  return singleton;
}

/** Test helper: replace the singleton (used by the free-limit test script). */
export function __setProjectStoreForTests(store: ProjectStore | null): void {
  singleton = store;
}
