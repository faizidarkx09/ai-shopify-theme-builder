// lib/export/zip.ts — ZIP writer (Agent 4).
// jszip par mabni hai (package.json me dependency add kar di gayi hai:
// `npm install jszip`). Agar jszip kisi wajah se na ho to ye file
// seedha bataye gi — silent fallback nahi rakha, taake export khamoshi
// se toota hua zip na de.

import JSZip from "jszip";
import type { ThemeFiles } from "./shopify";

/** File path -> content map ko ZIP bytes (Uint8Array) me badlo. */
export async function filesToZip(files: ThemeFiles): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "uint8array" });
}

/** ZIP download ke liye HTTP headers. */
export function zipHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "X-Placeholder-Disclaimer":
      "Exported themes carry PLACEHOLDER products/content, not a real Shopify catalog sync.",
  };
}
