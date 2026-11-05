// app/api/plan/route.ts — Plan approval gate API (Cut A, idea #1; Cut B #9).
// POST /api/plan
//   body: { prompt: string, niche?: string, referenceUrl?: string }
//   response: { plan: SitePlan, reference?: { url, title?, nicheHint?, accent?, source } }
// Fast, no streaming, no AI call: the plan is derived from the prompt with
// the same theme derivation the generator uses (lib/theme.ts via
// lib/ai/plan.ts), so template mode works with no key — same fallback
// pattern as /api/generate.
//
// Cut B #9 — reference input: when `referenceUrl` is sent, the URL is
// fetched server-side with the strict safety limits in lib/reference.ts
// (http/https only, 5 s timeout, 200 KB cap, no redirects, no credentials,
// private hosts blocked). The summary is applied to the plan
// (accent colour → theme accent; store-name hint → Home header title;
// niche hint → plan niche when the prompt is generic) and returned as
// `reference`. When the fetch is blocked or fails, the plan still derives
// from the prompt and `reference` carries URL-derived hints with
// source: "url-fallback" — the request never fails because of the URL.

import { NextRequest, NextResponse } from 'next/server';
import { derivePlan } from '../../../lib/ai/plan';
import { fetchReferenceSummary } from '../../../lib/reference';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PlanBody {
  prompt?: unknown;
  niche?: unknown;
  referenceUrl?: unknown;
}

export async function POST(req: NextRequest) {
  let body: PlanBody;
  try {
    body = (await req.json()) as PlanBody;
  } catch {
    return NextResponse.json({ error: 'Body JSON nahi hai.' }, { status: 400 });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt || prompt.length < 3) {
    return NextResponse.json(
      { error: 'Prompt kam se kam 3 characters ka likho.' },
      { status: 400 },
    );
  }
  if (prompt.length > 500) {
    return NextResponse.json(
      { error: 'Prompt 500 characters se zyada lamba hai.' },
      { status: 400 },
    );
  }

  const niche = typeof body.niche === 'string' ? body.niche.trim() : '';
  const referenceUrl =
    typeof body.referenceUrl === 'string' ? body.referenceUrl.trim() : '';

  if (!referenceUrl) {
    return NextResponse.json({ plan: derivePlan(prompt, niche || undefined) });
  }

  // Reference present: fetch it safely (never throws), then derive the
  // plan with its hints applied. A blocked/failed fetch still returns a
  // prompt-derived plan + URL-derived hints.
  const reference = await fetchReferenceSummary(referenceUrl);
  const plan = derivePlan(prompt, niche || undefined, reference);
  return NextResponse.json({
    plan,
    reference: {
      url: reference.url,
      ...(reference.title ? { title: reference.title } : {}),
      ...(reference.nicheHint ? { nicheHint: reference.nicheHint } : {}),
      ...(reference.accent ? { accent: reference.accent } : {}),
      source: reference.ok ? 'fetched' : 'url-fallback',
      ...(reference.blockedReason ? { blockedReason: reference.blockedReason } : {}),
    },
  });
}
