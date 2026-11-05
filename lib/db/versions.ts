// lib/db/versions.ts — Version snapshots (Wave 0 foundation for Cut A #4:
// staged AI edits + version history + restore).
// A snapshot is a deep copy of { pages, theme } at a point in time.
// Cap: max 10 versions per project; the oldest is dropped when exceeded.

import type { Project, ProjectVersion } from "@/lib/types";

export const MAX_VERSIONS = 10;

function versionUid(): string {
  return `ver_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Append a snapshot of the project's current pages + theme.
 * Returns a NEW project object (does not mutate the input).
 * Keeps at most MAX_VERSIONS snapshots — oldest dropped first.
 */
export function pushVersion(project: Project, label: string): Project {
  const snapshot: ProjectVersion = {
    id: versionUid(),
    label,
    createdAt: new Date().toISOString(),
    // Deep copy so later edits never mutate the snapshot.
    pages: JSON.parse(JSON.stringify(project.pages)) as Project["pages"],
    theme: JSON.parse(JSON.stringify(project.theme)) as Project["theme"],
  };
  const versions = [...(project.versions ?? []), snapshot];
  while (versions.length > MAX_VERSIONS) versions.shift();
  return { ...project, versions, updatedAt: new Date().toISOString() };
}

/** Restore a snapshot's pages + theme onto the project (history kept). */
export function restoreVersion(project: Project, versionId: string): Project | null {
  const found = (project.versions ?? []).find((v) => v.id === versionId);
  if (!found) return null;
  return {
    ...project,
    pages: JSON.parse(JSON.stringify(found.pages)) as Project["pages"],
    theme: JSON.parse(JSON.stringify(found.theme)) as Project["theme"],
    updatedAt: new Date().toISOString(),
  };
}
