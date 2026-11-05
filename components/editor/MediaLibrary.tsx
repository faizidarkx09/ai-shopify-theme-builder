// components/editor/MediaLibrary.tsx — Per-image regenerate + Media Library
// (Cut B, idea #20). Every image used across the project's pages, in one
// reusable panel. Click an image to apply it to the currently selected
// section; "Regenerate image" swaps in a fresh placeholder photo.
//   <MediaLibrary project={project}
//     selectedSectionId={selectedSectionId}
//     onApplyImage={(sectionId, url) => patchSection(sectionId, { image: url })}
//     onRegenerateImage={(newUrl) => patchSelectedSection({ image: newUrl })} />
// TARGET RULE (both callbacks): the URL is applied to the currently
// selected section — the parent knows which section that is. `sectionId`
// in onApplyImage is the selected section's id when `selectedSectionId`
// is passed, otherwise the source section the image came from.
// HONEST LABEL: regenerated images are fresh picsum placeholders, NOT
// AI-generated images — there is no image-generation key in template mode.

"use client";

import { useMemo } from "react";
import type { Project } from "@/lib/types";
import { regenerateImageUrl, seedFromImageUrl } from "@/lib/media";

export interface MediaLibraryImage {
  url: string;
  pageId: string;
  pageTitle: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: string;
}

export interface MediaLibraryProps {
  project: Project;
  /**
   * Apply an image to a section: (sectionId, imageUrl). sectionId is the
   * currently selected section when `selectedSectionId` is passed, else
   * the source section the image came from.
   */
  onApplyImage: (sectionId: string, imageUrl: string) => void;
  /**
   * A fresh placeholder URL was generated for an image. The parent
   * applies it to the currently selected section (same target rule as
   * onApplyImage). Omit to hide the regenerate buttons.
   */
  onRegenerateImage?: (imageUrl: string) => void;
  /** Id of the section the library should apply images to, when known. */
  selectedSectionId?: string | null;
}

/** All images across the project's pages, deduplicated by URL. */
export function collectProjectImages(project: Project): MediaLibraryImage[] {
  const seen = new Set<string>();
  const out: MediaLibraryImage[] = [];
  for (const page of project.pages) {
    for (const section of page.sections) {
      const url = section.image;
      if (!url || !url.startsWith("http") || seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        pageId: page.id,
        pageTitle: page.title,
        sectionId: section.id,
        sectionTitle: section.title || section.type,
        sectionType: section.type,
      });
    }
  }
  return out;
}

export default function MediaLibrary({
  project,
  onApplyImage,
  onRegenerateImage,
  selectedSectionId,
}: MediaLibraryProps) {
  const images = useMemo(() => collectProjectImages(project), [project]);

  if (images.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
        Abhi koi image nahi hai — pehle ek page generate karo, phir uski
        images yahan nazar aayengi.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm font-semibold">Media Library</p>
      <p className="mt-0.5 text-xs text-zinc-500">
        Kisi image par click karo — wo selected section par lag jayegi.
        Regenerate se fresh placeholder photo milti hai (picsum, AI image
        nahi).
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <figure
            key={img.url}
            className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
          >
            <button
              type="button"
              onClick={() =>
                onApplyImage(selectedSectionId ?? img.sectionId, img.url)
              }
              className="block w-full text-left"
              title={`Apply to ${selectedSectionId ? "selected section" : img.sectionTitle}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.sectionTitle}
                loading="lazy"
                className="aspect-[3/2] w-full object-cover"
              />
            </button>
            <figcaption className="p-2">
              <span className="block truncate text-xs font-semibold">
                {img.sectionTitle}
              </span>
              <span className="block truncate text-[11px] text-zinc-500">
                {img.pageTitle} · {img.sectionType}
              </span>
              {onRegenerateImage ? (
                <button
                  type="button"
                  onClick={() =>
                    onRegenerateImage(
                      regenerateImageUrl(seedFromImageUrl(img.url)),
                    )
                  }
                  className="mt-1.5 rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
                >
                  Regenerate image
                </button>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
