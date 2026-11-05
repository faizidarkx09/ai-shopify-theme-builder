// lib/csvImport.ts — Shopify CSV product import (Cut C, foundational).
// Pure, dependency-free parser: no network, no file access, never throws.
// Every malformed row becomes an entry in `errors` / `skipped`, never an
// exception. Maps Shopify's standard product-export columns by header name
// (case-insensitive): Handle, Title, Body (HTML), Vendor, Type, Tags,
// Variant Price, Image Src, Variant SKU.
//
// One CsvProduct per unique Handle: variant rows collapse into the first
// row's price, and the first non-empty image wins. Prices that do not
// parse fall back to 0 with an error note. Output is capped at 500
// products; extra handles count as skipped.

import type { CsvProduct } from "./types";

/** Hard cap on products returned from one import. */
export const MAX_CSV_PRODUCTS = 500;

/** Max plain-text description length (Body HTML stripped first). */
export const MAX_DESCRIPTION_LENGTH = 200;

export interface ParseShopifyCsvResult {
  products: CsvProduct[];
  /** Human-readable problems, one per bad row / missing column / bad price. */
  errors: string[];
  /** Rows dropped (blank, no Handle/Title, or past the 500-product cap). */
  skipped: number;
}

/**
 * Split raw CSV text into rows of fields. Handles quoted fields, embedded
 * commas, doubled quotes (""), embedded newlines inside quotes, and \r\n
 * line endings. An unclosed quote is tolerated: the rest of the input is
 * treated as the final field and flagged via the returned `unclosedQuote`
 * boolean instead of throwing.
 */
function parseCsvRows(text: string): {
  rows: string[][];
  unclosedQuote: boolean;
} {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;
  let unclosedQuote = false;

  // Strip a UTF-8 BOM if the export was saved with one.
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const endField = () => {
    row.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && !fieldStarted && field === "") {
      inQuotes = true;
      fieldStarted = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\r") {
      // \r\n or bare \r both end the row; skip the \n of a \r\n pair.
      if (src[i + 1] === "\n") i++;
      endRow();
    } else if (ch === "\n") {
      endRow();
    } else {
      field += ch;
      fieldStarted = true;
    }
  }
  if (inQuotes) unclosedQuote = true;
  // Trailing content without a final newline still forms a row.
  if (field !== "" || fieldStarted || row.length > 0) endRow();

  return { rows, unclosedQuote };
}

/** Strip HTML tags, decode common entities, collapse whitespace. */
function plainTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}

/** Parse a price like "19.99", "$19.99" or "1,299.00" — NaN when unusable. */
function parsePrice(raw: string): number {
  const cleaned = raw.replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return Number.NaN;
  return Number.parseFloat(cleaned);
}

function headerIndex(
  headers: string[],
  wanted: string,
): number {
  const needle = wanted.toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === needle);
}

/**
 * Parse a Shopify product-export CSV into real merchant products.
 * Never throws: any input problem is reported in `errors` / `skipped`.
 */
export function parseShopifyCsv(text: string): ParseShopifyCsvResult {
  const errors: string[] = [];
  let skipped = 0;
  const products: CsvProduct[] = [];

  try {
    if (typeof text !== "string" || text.trim() === "") {
      return {
        products,
        errors: ["CSV is empty — upload a Shopify product export (.csv)."],
        skipped,
      };
    }

    const { rows, unclosedQuote } = parseCsvRows(text);
    if (unclosedQuote) {
      errors.push(
        "Unclosed quote found in the file — the last quoted field was read to the end of the file.",
      );
    }
    if (rows.length === 0) {
      return {
        products,
        errors: ["CSV is empty — no rows found."],
        skipped,
      };
    }

    const headers = rows[0];
    const col = {
      handle: headerIndex(headers, "Handle"),
      title: headerIndex(headers, "Title"),
      body: headerIndex(headers, "Body (HTML)"),
      price: headerIndex(headers, "Variant Price"),
      image: headerIndex(headers, "Image Src"),
      // Read (not required) so future callers can use them; missing is fine.
      vendor: headerIndex(headers, "Vendor"),
      type: headerIndex(headers, "Type"),
      tags: headerIndex(headers, "Tags"),
      sku: headerIndex(headers, "Variant SKU"),
    };

    const missingRequired: string[] = [];
    if (col.handle < 0) missingRequired.push("Handle");
    if (col.title < 0) missingRequired.push("Title");
    if (missingRequired.length > 0) {
      errors.push(
        `Missing required column(s): ${missingRequired.join(", ")} — expected a Shopify product export with Handle and Title columns.`,
      );
      return { products, errors, skipped };
    }
    const missingOptional: string[] = [];
    if (col.body < 0) missingOptional.push("Body (HTML)");
    if (col.price < 0) missingOptional.push("Variant Price");
    if (col.image < 0) missingOptional.push("Image Src");
    if (missingOptional.length > 0) {
      errors.push(
        `Missing optional column(s): ${missingOptional.join(", ")} — those fields will be empty.`,
      );
    }

    const byHandle = new Map<string, CsvProduct>();

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const rowNo = r + 1; // 1-based, header is row 1
      const cell = (idx: number): string =>
        idx >= 0 && idx < row.length ? row[idx].trim() : "";

      const handle = cell(col.handle);
      const title = cell(col.title);

      // Blank separator row — common in hand-edited exports.
      if (!handle && !title) {
        skipped++;
        continue;
      }
      if (!handle) {
        errors.push(`Row ${rowNo}: no Handle — row skipped.`);
        skipped++;
        continue;
      }
      if (!title) {
        errors.push(`Row ${rowNo}: product "${handle}" has no Title — row skipped.`);
        skipped++;
        continue;
      }

      const existing = byHandle.get(handle);
      const image = cell(col.image);

      if (existing) {
        // Variant row: collapse into the first row's product. First image
        // wins — only fill the image if the product has none yet.
        if (!existing.image && image) existing.image = image;
        continue;
      }

      // New handle — past the cap, count as skipped instead of growing.
      if (products.length >= MAX_CSV_PRODUCTS) {
        skipped++;
        continue;
      }

      let price = 0;
      const rawPrice = cell(col.price);
      if (col.price >= 0 && rawPrice !== "") {
        const parsed = parsePrice(rawPrice);
        if (Number.isNaN(parsed)) {
          errors.push(
            `Row ${rowNo}: price "${rawPrice}" for "${title}" is not a number — used 0.`,
          );
        } else {
          price = parsed;
        }
      } else if (col.price >= 0) {
        errors.push(
          `Row ${rowNo}: no Variant Price for "${title}" — used 0.`,
        );
      }

      const description = truncate(
        plainTextFromHtml(cell(col.body)),
        MAX_DESCRIPTION_LENGTH,
      );

      const product: CsvProduct = { name: title, price };
      if (description) product.description = description;
      if (image) product.image = image;
      byHandle.set(handle, product);
      products.push(product);
    }

    return { products, errors, skipped };
  } catch (err) {
    // Last-resort guard: the parser must never throw on malformed input.
    errors.push(
      `CSV could not be read: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return { products, errors, skipped };
  }
}
