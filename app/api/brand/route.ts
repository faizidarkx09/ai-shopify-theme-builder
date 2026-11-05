// app/api/brand/route.ts — Read brand from URL (Cut B, idea #10).
// POST /api/brand
//   body: { url: string }
//   response: { brandKit: Partial<BrandKit> }
// Server-side only: uses lib/brandKit.ts readBrandFromUrl, which uses the
// same safe-fetch helper as the plan route (lib/reference.ts — http/https
// only, 5 s timeout, 200 KB cap, no redirects, private hosts blocked).
// Never fails because of the URL: a blocked/unreachable URL returns an
// (almost) empty kit with sourceUrl set.

import { NextRequest, NextResponse } from 'next/server';
import { readBrandFromUrl } from '../../../lib/brandKit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { url?: unknown };
  try {
    body = (await req.json()) as { url?: unknown };
  } catch {
    return NextResponse.json({ error: 'Body JSON nahi hai.' }, { status: 400 });
  }
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) {
    return NextResponse.json({ error: 'URL likho.' }, { status: 400 });
  }
  if (url.length > 500) {
    return NextResponse.json({ error: 'URL 500 characters se zyada lambi hai.' }, { status: 400 });
  }
  const brandKit = await readBrandFromUrl(url);
  return NextResponse.json({ brandKit });
}
