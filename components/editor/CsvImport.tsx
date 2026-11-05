// components/editor/CsvImport.tsx — Shopify CSV product import (Cut C).
// Client-side only: the file is read with FileReader and parsed in the
// browser by lib/csvImport — nothing is uploaded anywhere. The parsed
// products are the merchant's REAL products: importing replaces the
// project's csvProducts (the parent owns persistence via onImport) and
// the generated theme then uses them instead of the demo catalog.
// All UI text is original.

"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { parseShopifyCsv, type ParseShopifyCsvResult } from "@/lib/csvImport";
import type { CsvProduct } from "@/lib/types";

/** How many parsed products the preview table shows. */
const PREVIEW_LIMIT = 5;

export interface CsvImportProps {
  /** Called with the full parsed list when the user confirms the import. */
  onImport: (products: CsvProduct[]) => void;
  /** Products already on the project, shown so the replace is explicit. */
  existingCount?: number;
}

/** A minimal 3-row Shopify export the user can download as a format sample. */
const SAMPLE_CSV = [
  "Handle,Title,Body (HTML),Vendor,Type,Tags,Variant Price,Image Src,Variant SKU",
  'rose-glow-lipstick,Rose Glow Lipstick,"<p>Creamy rose-tinted lipstick with a soft satin finish.</p>",Glow Studio,Makeup,"lipstick, rose",18,https://example.com/lipstick.jpg,RGL-001',
  'vitamin-c-serum,Vitamin C Serum,"<p>Brightening daily serum with 10% vitamin C.</p>",Glow Studio,Skincare,"serum, vitamin c",24,https://example.com/serum.jpg,VCS-002',
  'silk-finish-foundation,Silk Finish Foundation,"<p>Lightweight foundation with a natural silk finish.</p>",Glow Studio,Makeup,"foundation, silk",32,,SFF-003',
].join("\r\n");

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export default function CsvImport({ onImport, existingCount = 0 }: CsvImportProps) {
  const [result, setResult] = useState<ParseShopifyCsvResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [readError, setReadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleText(text: string, name: string) {
    setReadError("");
    setFileName(name);
    setResult(parseShopifyCsv(text));
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleText(reader.result, file.name);
      } else {
        setReadError("File could not be read as text — try a .csv export.");
      }
    };
    reader.onerror = () => {
      setReadError("File could not be read — try again or pick another file.");
    };
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample-shopify-products.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const products = result?.products ?? [];

  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold">Import your real products</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Upload a Shopify product export (.csv). These are your real products —
        they replace the demo catalog in your theme. Nothing is uploaded to a
        server; the file is read in your browser.
      </p>
      {existingCount > 0 && (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          This project already has {existingCount} imported product
          {existingCount === 1 ? "" : "s"} — importing replaces them.
        </p>
      )}

      {/* Drop zone + file picker */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Drop a Shopify CSV here, or click to choose a file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm ${
          dragOver
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950"
            : "border-zinc-300 text-zinc-500 hover:border-indigo-400 dark:border-zinc-700 dark:text-zinc-400"
        }`}
      >
        Drop your Shopify CSV here, or click to choose a file
        <span className="mt-1 block text-xs">
          Shopify admin → Products → Export → CSV. One product per Handle;
          variants are merged automatically.
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={downloadSample}
        className="mt-2 text-xs font-semibold text-indigo-600 underline hover:text-indigo-700 dark:text-indigo-400"
      >
        Download sample CSV — see the expected format
      </button>

      {readError && (
        <p className="mt-2 text-xs text-red-600">{readError}</p>
      )}

      {/* Preview */}
      {result && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            <span className="font-semibold">{products.length}</span> product
            {products.length === 1 ? "" : "s"} found
            {fileName ? ` in ${fileName}` : ""}
            {result.skipped > 0 && (
              <span className="text-zinc-500">
                {" "}· {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped
              </span>
            )}
          </p>

          {products.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
              <table className="w-full min-w-0 text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">Price</th>
                    <th className="px-3 py-2 font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, PREVIEW_LIMIT).map((p) => (
                    <tr
                      key={`${p.name}-${p.price}`}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                    >
                      <td className="max-w-40 truncate px-3 py-2 font-medium">
                        {p.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatPrice(p.price)}
                      </td>
                      <td className="max-w-56 truncate px-3 py-2 text-zinc-500">
                        {p.description ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {products.length > PREVIEW_LIMIT && (
                <p className="px-3 py-2 text-xs text-zinc-500">
                  …and {products.length - PREVIEW_LIMIT} more.
                </p>
              )}
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-semibold">Issues in the file:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {result.errors.slice(0, 8).map((err, i) => (
                  <li key={i} className="break-words">{err}</li>
                ))}
                {result.errors.length > 8 && (
                  <li>…and {result.errors.length - 8} more.</li>
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            disabled={products.length === 0}
            onClick={() => onImport(products)}
            className="w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Import {products.length} product{products.length === 1 ? "" : "s"}
            {existingCount > 0 ? " (replaces current products)" : ""}
          </button>
        </div>
      )}
    </div>
  );
}
