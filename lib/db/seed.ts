// lib/db/seed.ts
// One demo project so Cut 1 has something to open without typing a prompt.
// Images are picsum placeholders (PLAN.md) — no ImageKit key needed.
// Placeholder content only; nothing here is a real store catalog.

import type { Project } from './types';
import type { ProjectStore } from './store';

/** A small cosmetic-store project: hero + category + product + footer. */
export function buildDemoProject(ownerId: string): Omit<Project, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ownerId,
    name: 'Demo: Cosmetic store (pink)',
    prompt: 'cosmetic e-commerce website, pink shade me',
    theme: {
      name: 'Blush Pink',
      colors: {
        primary: '#be185d',
        secondary: '#f9a8d4',
        background: '#fff1f2',
        text: '#3f0a24',
        accent: '#ec4899',
      },
      font: 'Inter',
      style: 'modern',
    },
    pages: [
      {
        id: 'page-home',
        slug: 'home',
        title: 'Home',
        sections: [
          {
            id: 'sec-hero',
            type: 'hero',
            title: 'Glow jo sab ko pasand aaye',
            subtitle: 'Cosmetics',
            text: 'Premium skincare aur makeup — sirf ek prompt se banayi gayi demo store.',
            image: 'https://picsum.photos/seed/cosmetic-hero/1200/800',
            bgColor: '#fff1f2',
            textColor: '#3f0a24',
            align: 'center',
            padding: 64,
          },
          {
            id: 'sec-category',
            type: 'category',
            title: 'Shop by category',
            text: 'Skincare, makeup aur hair care — apni pasand chuno.',
            image: 'https://picsum.photos/seed/cosmetic-category/1200/800',
            align: 'left',
            padding: 48,
          },
          {
            id: 'sec-product',
            type: 'product',
            title: 'Best sellers',
            text: 'Placeholder products hain — asli products Shopify me khud lagane honge.',
            image: 'https://picsum.photos/seed/cosmetic-product/1200/800',
            align: 'left',
            padding: 48,
          },
          {
            id: 'sec-footer',
            type: 'footer',
            title: 'Demo store',
            text: 'Ye demo project hai. Export ki hui theme me bhi placeholder content hota hai.',
            bgColor: '#3f0a24',
            textColor: '#ffffff',
            align: 'center',
            padding: 32,
          },
        ],
      },
    ],
    messages: [
      {
        id: 'msg-seed-1',
        role: 'user',
        text: 'cosmetic e-commerce website, pink shade me',
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Creates the demo project only when the store is empty for this owner.
 * Returns the created project, or null if one already exists.
 */
export function seedDemoProjectIfEmpty(
  store: ProjectStore,
  ownerId: string,
): Project | null {
  if (store.count(ownerId) > 0) return null;
  const demo = buildDemoProject(ownerId);
  return store.create(
    { name: demo.name, prompt: demo.prompt, theme: demo.theme, pages: demo.pages },
    ownerId,
  );
}
