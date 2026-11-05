// lib/export/index.ts — Export Engine barrel (Agent 4).
// UI ya API ko sirf yahi file import karni chahiye.

import { buildCodeFiles, codeZipName } from "./code";
import { buildShopifyThemeFiles, shopifyZipName, type ThemeFiles } from "./shopify";
import { filesToZip } from "./zip";
import { PLACEHOLDER_DISCLAIMER, type ExportFormat, type Project } from "./types";

export { buildShopifyThemeFiles, shopifyZipName } from "./shopify";
export { buildCodeFiles, codeZipName, renderPageHtml } from "./code";
export { filesToZip, zipHeaders } from "./zip";
export { exportPagesToPng, exportAndDownloadAllPngs, downloadPng } from "./png";
export { PLACEHOLDER_DISCLAIMER } from "./types";
export type { ExportFormat, Project, Page, Section, Theme } from "./types";

export interface BuiltExport {
  format: Exclude<ExportFormat, "png">;
  filename: string;
  files: ThemeFiles;
  bytes: Uint8Array;
}

/**
 * Project + format -> tayyar ZIP bytes.
 * 'png' yahan nahi banta — PNG ko live DOM chahiye, is liye woh
 * client-side helper lib/export/png.ts se hota hai. Agar koi 'png'
 * bhej de to saaf error do, khaamoshi se ghalat file mat do.
 */
export async function buildExport(
  project: Project,
  format: ExportFormat,
): Promise<BuiltExport> {
  if (!project || !Array.isArray(project.pages) || project.pages.length === 0) {
    throw new Error("Export ke liye valid project chahiye (kam se kam ek page).");
  }
  if (format === "png") {
    throw new Error(
      "PNG export server par nahi banta — browser me lib/export/png.ts ka exportPagesToPng use karein (us ko live preview DOM chahiye).",
    );
  }
  const files = format === "shopify" ? buildShopifyThemeFiles(project) : buildCodeFiles(project);
  const filename = format === "shopify" ? shopifyZipName(project) : codeZipName(project);
  const bytes = await filesToZip(files);
  return { format, filename, files, bytes };
}
