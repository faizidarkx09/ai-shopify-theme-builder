// lib/media.ts — Per-image regenerate helpers (Cut B, idea #20).
// Template mode has NO image-generation key: a "regenerated" image is a
// fresh picsum placeholder with a new seed. The UI must label it honestly
// as a fresh placeholder — never as AI-generated imagery.

import { placeholderImage } from './types';

/** Extract the picsum seed from a picsum URL, e.g. /seed/my-shop-hero/ → "my-shop-hero". */
export function seedFromImageUrl(imageUrl: string): string {
  try {
    const parsed = new URL(imageUrl);
    const match = parsed.pathname.match(/\/seed\/([^/]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // Not a URL — fall through to the fallback seed.
  }
  return 'store';
}

/**
 * Fresh placeholder image URL for a seed: same seed base, new timestamp
 * suffix, so the browser fetches a different placeholder photo.
 * Example: regenerateImageUrl("home-hero") →
 *   https://picsum.photos/seed/home-hero-1730832000000/1200/800
 */
export function regenerateImageUrl(seed: string): string {
  const base = (seed || 'store').trim() || 'store';
  return placeholderImage(`${base}-${Date.now()}`);
}
