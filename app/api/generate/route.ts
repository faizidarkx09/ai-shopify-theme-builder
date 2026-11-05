// app/api/generate/route.ts — Streaming generation API (Agent 2).
// POST /api/generate
//   body: { prompt: string, pageType?: "home"|"product"|"category",
//           pageTitle?: string, theme?: Theme, projectId?: string }
//   response: text/event-stream (SSE) — events:
//     data: {"type":"theme","theme":{...}}
//     data: {"type":"section","section":{...},"index":0,"total":8}
//     data: {"type":"done","page":{...}}
//     data: {"type":"error","message":"..."}
// GET /api/generate — health check: kaunsa mode chal raha hai (gemini/template).
// Original code.

import { NextRequest, NextResponse } from 'next/server';
import { generatePageEvents, getGenerationMode } from '../../../lib/ai/generate';
import { getGeminiModel } from '../../../lib/ai/gemini';
import type { PageType, Theme } from '../../../lib/ai/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface GenerateBody {
  prompt?: unknown;
  pageType?: unknown;
  pageTitle?: unknown;
  theme?: unknown;
  projectId?: unknown;
}

function isPageType(value: unknown): value is PageType {
  return value === 'home' || value === 'product' || value === 'category';
}

function isTheme(value: unknown): value is Theme {
  if (typeof value !== 'object' || value === null) return false;
  const t = value as { name?: unknown; colors?: unknown; font?: unknown; style?: unknown };
  const c = t.colors as Record<string, unknown> | undefined;
  return (
    typeof t.name === 'string' &&
    typeof t.font === 'string' &&
    typeof t.style === 'string' &&
    !!c &&
    ['primary', 'secondary', 'background', 'text', 'accent'].every(
      (k) => typeof c[k] === 'string',
    )
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'ai-shopify-theme-builder generate',
    mode: getGenerationMode(),
    model: getGeminiModel(),
  });
}

export async function POST(req: NextRequest) {
  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of generatePageEvents({
          prompt,
          pageType: isPageType(body.pageType) ? body.pageType : undefined,
          pageTitle: typeof body.pageTitle === 'string' ? body.pageTitle : undefined,
          theme: isTheme(body.theme) ? body.theme : undefined,
          projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
        })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation fail ho gayi.';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
