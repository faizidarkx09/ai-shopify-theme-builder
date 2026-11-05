// lib/export/png.ts — Export to PNG (Agent 4, CLIENT-SIDE ONLY).
// NOTE: is file me "use client" directive JAAN BOOJH KAR NAHI hai —
// ye ek helper module hai, component nahi. Is ke functions sirf
// browser me call karne hain (client component se), kyun ke in ko
// page ka live DOM aur `document` chahiye hota hai. Agar in ko server
// par call kiya to fail honge — is liye route.ts in ko kabhi call
// nahi karta. Server bundle me aane se koi nuksan nahi, jab tak
// call browser se ho.
//
// Dependency: `html-to-image` (package.json me add kar di gayi hai:
// `npm install html-to-image`). Ye library DOM node ko PNG data URL me
// badalti hai. Ise dynamic import kiya gaya hai taake sirf PNG export
// karte waqt load ho, baaki app ka bundle bhaari na ho.
//
// LIMIT: Server (app/api/export) PNG nahi bana sakta — us ke paas koi
// rendered page nahi hota. Is liye format 'png' par API 400 deti hai
// aur UI ko ye helper use karna chahiye. Exported PNGs me bhi wahi
// placeholder products/content hote hain jo preview me dikhte hain.

"use client";

import type { Page } from "./types";

export interface PngExportResult {
  slug: string;
  filename: string;
  dataUrl: string;
}

/**
 * Har page ke rendered element ko PNG banao.
 * @param elements - page slug -> us page ka rendered DOM element
 *   (editor preview me har page ka root element).
 * @param pages - wohi pages, naam/file ke liye.
 * @param pixelRatio - 2 = retina quality (default), 1 = chhota file.
 */
export async function exportPagesToPng(
  elements: Record<string, HTMLElement>,
  pages: Page[],
  pixelRatio = 2,
): Promise<PngExportResult[]> {
  const { toPng } = await import("html-to-image");
  const results: PngExportResult[] = [];
  for (const page of pages) {
    const el = elements[page.slug];
    if (!el) continue;
    const dataUrl = await toPng(el, {
      pixelRatio,
      cacheBust: true,
      // Picsum jaisi cross-origin images ke liye; agar koi image CORS
      // block kare to woh jagah khaali reh sakti hai — ye html-to-image
      // ki mashhoor limit hai, is liye placeholder images CORS-friendly
      // hone chahiye.
      skipFonts: false,
    });
    results.push({
      slug: page.slug,
      filename: `${page.slug === "home" ? "index" : page.slug}.png`,
      dataUrl,
    });
  }
  return results;
}

/** Ek PNG data URL ko browser se download karwao. */
export function downloadPng(result: PngExportResult): void {
  const link = document.createElement("a");
  link.href = result.dataUrl;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Saare PNGs ek baad ek download karo (browser ek waqt me ek download behtar sambhalta hai). */
export async function exportAndDownloadAllPngs(
  elements: Record<string, HTMLElement>,
  pages: Page[],
): Promise<PngExportResult[]> {
  const results = await exportPagesToPng(elements, pages);
  for (const result of results) downloadPng(result);
  return results;
}
