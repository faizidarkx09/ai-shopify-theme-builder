// app/api/projects/route.ts
// Projects CRUD API (Cut 1 demo).
//
// NOTE: no "next/server" import on purpose — plain Request/Response works in
// Next.js route handlers AND keeps this file type-checkable without the
// scaffold installed. The store here is per-process memory (server); the
// browser's real Cut 1 store is LocalStorageProjectStore (lib/db/store.ts)
// with the same shapes. When Neon lands, both swap to the same DB store.
//
// Billing enforcement: the demo plan comes from the `x-demo-plan` header
// (free | monthly | yearly, default free). A free user creating a 3rd
// project gets 403 + upgradeRequired — the same rule as lib/billing.ts.

import { MemoryProjectStore, type ProjectStore } from '../../../lib/db/store';
import type { NewProjectInput, ProjectPatch } from '../../../lib/db/types';
import {
  canCreateProject,
  getPlan,
  type PlanId,
} from '../../../lib/billing';

const store: ProjectStore = new MemoryProjectStore();

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function readPlan(req: Request): PlanId {
  const raw = req.headers.get('x-demo-plan')?.trim().toLowerCase();
  if (raw === 'monthly' || raw === 'yearly' || raw === 'free') return raw;
  return 'free';
}

function readId(req: Request): string | null {
  return new URL(req.url).searchParams.get('id');
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await req.json();
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** GET /api/projects — list (?ownerId=) or one project (?id=). */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (id) {
    const project = store.get(id);
    if (!project) return json({ error: 'Project nahi mila.' }, 404);
    return json({ project });
  }
  const ownerId = url.searchParams.get('ownerId') ?? undefined;
  return json({ projects: store.list(ownerId), count: store.count(ownerId) });
}

/**
 * POST /api/projects — create a project.
 * Body: { name?, prompt, theme?, pages?, ownerId }.
 * Free plan: 3rd project is blocked (403, upgradeRequired: true).
 */
export async function POST(req: Request): Promise<Response> {
  const body = await readBody(req);
  const ownerId = typeof body.ownerId === 'string' ? body.ownerId : 'demo-user';
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';

  if (!prompt.trim()) {
    return json({ error: 'Project prompt zaroori hai.' }, 400);
  }

  const planId = readPlan(req);
  const gate = canCreateProject(planId, store.count(ownerId));
  if (!gate.allowed) {
    return json(
      {
        error: gate.reason,
        upgradeRequired: true,
        plan: getPlan(planId).name,
        limit: getPlan(planId).maxProjects,
      },
      403,
    );
  }

  try {
    const input: NewProjectInput = {
      name: typeof body.name === 'string' ? body.name : undefined,
      prompt,
      theme: (body.theme as NewProjectInput['theme']) ?? undefined,
      pages: (body.pages as NewProjectInput['pages']) ?? undefined,
    };
    const project = store.create(input, ownerId);
    return json({ project }, 201);
  } catch (err) {
    return json(
      { error: err instanceof Error ? err.message : 'Project banate waqt error aaya.' },
      400,
    );
  }
}

/** PUT /api/projects?id=... — update name/prompt/theme/pages/messages. */
export async function PUT(req: Request): Promise<Response> {
  const id = readId(req);
  if (!id) return json({ error: 'Project id (?id=) zaroori hai.' }, 400);
  const body = await readBody(req);
  const patch: ProjectPatch = {};
  if (typeof body.name === 'string') patch.name = body.name;
  if (typeof body.prompt === 'string') patch.prompt = body.prompt;
  if (body.theme) patch.theme = body.theme as ProjectPatch['theme'];
  if (Array.isArray(body.pages)) patch.pages = body.pages as ProjectPatch['pages'];
  if (Array.isArray(body.messages)) {
    patch.messages = body.messages as ProjectPatch['messages'];
  }
  const updated = store.update(id, patch);
  if (!updated) return json({ error: 'Project nahi mila.' }, 404);
  return json({ project: updated });
}

/** DELETE /api/projects?id=... — delete a project. */
export async function DELETE(req: Request): Promise<Response> {
  const id = readId(req);
  if (!id) return json({ error: 'Project id (?id=) zaroori hai.' }, 400);
  const removed = store.delete(id);
  if (!removed) return json({ error: 'Project nahi mila.' }, 404);
  return json({ deleted: true, id });
}
