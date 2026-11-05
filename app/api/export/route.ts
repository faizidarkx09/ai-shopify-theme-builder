// app/api/export/route.ts — Export API (Agent 4).
// POST { project, format: 'shopify' | 'code' | 'png' } -> ZIP download.
//
// - 'shopify': valid Shopify theme zip (layout/templates/sections/
//   snippets/assets/config/locales).
// - 'code': standalone HTML files ka zip (ek file per page, inline CSS).
// - 'png': server par NAHI banta (PNG ko live preview DOM chahiye).
//   Is par 400 + hint milta hai; UI ko lib/export/png.ts use karna hai.
//
// STORAGE NOTE (Cut 1): zip sirf download ke tor par milta hai.
// Video wale "theme-export bucket" ka concept yahan local download se
// poora hota hai — koi InsForge/storage credentials zaroori nahi.
// Baad me Agent 5 / storage layer chahe to isi route me save kar sakta hai.
//
// PAYWALL NOTE: ye route khud free/paid check nahi karta — woh Agent 5
// (lib/billing.ts) ka kaam hai. UI ko export button dikhane se pehle
// billing check karna chahiye; route ko bhi baad me wahi guard lagana hai.
//
// DISCLAIMER: exported themes carry PLACEHOLDER products/content,
// not a real Shopify catalog sync.

import { NextResponse } from "next/server";
import { buildExport } from "@/lib/export";
import { zipHeaders } from "@/lib/export/zip";
import type { ExportFormat, Project } from "@/lib/export/types";

const FORMATS: ExportFormat[] = ["shopify", "code", "png"];

export async function POST(req: Request) {
  let body: { project?: Project; format?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body valid JSON hona chahiye: { project, format }" }, { status: 400 });
  }

  const { project, format } = body;
  if (!project || typeof project !== "object" || !Array.isArray(project.pages) || project.pages.length === 0) {
    return NextResponse.json(
      { error: "Valid project chahiye (kam se kam ek page ke saath)." },
      { status: 400 },
    );
  }
  if (!format || !FORMATS.includes(format as ExportFormat)) {
    return NextResponse.json(
      { error: "format 'shopify', 'code' ya 'png' me se ek hona chahiye." },
      { status: 400 },
    );
  }

  if (format === "png") {
    return NextResponse.json(
      {
        error:
          "PNG export server par nahi banta — is ko live preview DOM chahiye. Browser me lib/export/png.ts ka exportPagesToPng use karein.",
        hint: "exportPagesToPng(elements, pages)",
      },
      { status: 400 },
    );
  }

  try {
    const built = await buildExport(project, format as Exclude<ExportFormat, "png">);
    const headers = zipHeaders(built.filename);
    const res = new Response(built.bytes as unknown as BodyInit, { headers });
    res.headers.set("Content-Length", String(built.bytes.length));
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export fail ho gaya.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
