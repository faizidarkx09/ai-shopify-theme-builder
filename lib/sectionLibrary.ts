// lib/sectionLibrary.ts — Curated Shopify section library (Cut B #11).
//
// 12 named, theme-matched blocks a merchant can insert in one click.
// Each block's build() returns a fully-formed Section: theme colours
// applied, sensible original copy, and demo products from the passed
// products array when given (CsvProduct[] — the project's own csvProducts
// first, else the demo catalog; no products = placeholder copy, unchanged
// behaviour). All copy here is original; product names/prices come only
// from the passed products array, never invented.
//
// One-click Swap is a UI concern — this module only BUILDS sections.
// The integrator wires insert/swap in the editor via onSectionsChange
// (see components/editor/SectionLibrary.tsx): Insert appends the built
// section, Swap replaces the currently selected section with it.
// No store writes happen here — pure builders only.

import type { CsvProduct, Section, SectionType, Theme } from './types';
import { placeholderImage } from './types';

export interface LibraryBlock {
  id: string;
  name: string;
  type: SectionType;
  description: string;
  /** Build a fully-formed Section from the theme (+ optional products). */
  build: (theme: Theme, products?: CsvProduct[]) => Section;
}

function libId(type: SectionType): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `lib_${type}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `lib_${type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function base(
  type: SectionType,
  theme: Theme,
  partial: Partial<Section> & { meta?: Record<string, string | number | boolean> },
): Section {
  return {
    id: libId(type),
    type,
    title: '',
    subtitle: '',
    text: '',
    image: placeholderImage(`${type}-library`),
    bgColor: theme.colors.background,
    textColor: theme.colors.text,
    align: 'center',
    padding: 48,
    ...partial,
  };
}

/** "Name — $price" lines from real/demo products, max 4. */
function productLines(products: CsvProduct[] | undefined, fallback: string[]): string[] {
  if (!products || products.length === 0) return fallback;
  return products.slice(0, 4).map((p) => `${p.name} — $${p.price}`);
}

/** Countdown target = now + 48h, ISO string (shared with lib/templates.ts). */
export function countdownTarget48h(from: Date = new Date()): string {
  return new Date(from.getTime() + 48 * 3600 * 1000).toISOString();
}

const FIRST_PRODUCT_FALLBACK = 'Featured Product — $29';

export const SECTION_LIBRARY: LibraryBlock[] = [
  {
    id: 'hero-split',
    name: 'Hero Split',
    type: 'hero',
    description: 'Headline on one side, product photo on the other.',
    build: (theme, products) => {
      const first = products?.[0];
      return base('hero', theme, {
        title: 'Your Next Favourite, Found',
        subtitle: 'New arrivals, honest prices, and delivery you can trust.',
        text: first ? `${first.name} — $${first.price}` : 'Shop the new collection',
        image: first?.image ?? placeholderImage('hero-split'),
        bgColor: theme.colors.primary,
        textColor: '#ffffff',
        align: 'left',
        layout: 'split',
        padding: 64,
      });
    },
  },
  {
    id: 'collection-grid',
    name: 'Collection Grid',
    type: 'category',
    description: 'Shop-by-category cards for the homepage.',
    build: (theme) =>
      base('category', theme, {
        title: 'Shop by Collection',
        subtitle: 'Find what you love, faster.',
        text: 'New Arrivals  •  Best Sellers  •  Sale',
        align: 'center',
      }),
  },
  {
    id: 'product-feature',
    name: 'Product Feature',
    type: 'product',
    description: 'Best-seller grid with names and prices.',
    build: (theme, products) =>
      base('product', theme, {
        title: 'Featured This Week',
        subtitle: 'Our customers’ favourites, back in stock.',
        text: productLines(products, [
          'Featured Product 1 — $29',
          'Featured Product 2 — $39',
          'Featured Product 3 — $49',
          'Featured Product 4 — $19',
        ]).join('\n'),
        align: 'center',
      }),
  },
  {
    id: 'testimonials',
    name: 'Testimonials',
    type: 'testimonials',
    description: 'Customer quotes with names and star ratings.',
    build: (theme) =>
      base('testimonials', theme, {
        title: 'What Customers Say',
        subtitle: '',
        text: 'Rated 4.9 out of 5 by happy customers.',
        align: 'center',
      }),
  },
  {
    id: 'faq',
    name: 'FAQ',
    type: 'faq',
    description: 'Answers to delivery, returns and checkout questions.',
    build: (theme) =>
      base('faq', theme, {
        title: 'Frequently Asked Questions',
        subtitle: '',
        text: 'How fast is delivery? Orders ship within 24 hours. Can I return an item? Yes, within 30 days.',
        align: 'left',
      }),
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    type: 'newsletter',
    description: 'Email signup with a first-order discount.',
    build: (theme) =>
      base('newsletter', theme, {
        title: 'Get 10% Off Your First Order',
        subtitle: 'Join the list for new drops and member-only offers. No spam.',
        text: 'Subscribe',
        bgColor: theme.colors.primary,
        textColor: '#ffffff',
        align: 'center',
      }),
  },
  {
    id: 'announcement-bar',
    name: 'Announcement Bar',
    type: 'announcement',
    description: 'Slim top bar for a store-wide offer or notice.',
    build: (theme) =>
      base('announcement', theme, {
        title: 'Free shipping on orders over $50',
        subtitle: '',
        text: '',
        image: '',
        bgColor: theme.colors.primary,
        textColor: '#ffffff',
        align: 'center',
        padding: 12,
      }),
  },
  {
    id: 'trust-badges',
    name: 'Trust Badges',
    type: 'trust-badges',
    description: 'Secure checkout, returns, delivery and support signals.',
    build: (theme) =>
      base('trust-badges', theme, {
        title: 'Shop With Confidence',
        subtitle: '',
        text: 'Secure checkout · 30-day returns · Fast delivery · Real support.',
        align: 'center',
        padding: 32,
      }),
  },
  {
    id: 'countdown-deal',
    name: 'Countdown Deal',
    type: 'countdown',
    description: 'Limited-time offer with a 48-hour countdown timer.',
    build: (theme) =>
      base('countdown', theme, {
        title: 'Sale Ends Soon',
        subtitle: '',
        text: 'Up to 40% off — when the timer hits zero, prices go back up.',
        align: 'center',
        meta: { countdownTarget: countdownTarget48h() },
      }),
  },
  {
    id: 'bundle-save',
    name: 'Bundle & Save',
    type: 'bundle',
    description: 'Three products sold as one set at a bundle price.',
    build: (theme, products) => {
      const lines = productLines(products, [
        'Bundle item 1 — $19',
        'Bundle item 2 — $24',
        'Bundle item 3 — $29',
      ]);
      const total = (products?.slice(0, 3) ?? []).reduce((n, p) => n + p.price, 0);
      return base('bundle', theme, {
        title: 'Bundle & Save',
        subtitle: '',
        text:
          lines.slice(0, 3).join('\n') +
          (total > 0
            ? `\nBundle total: $${total} — buying the set together saves more.`
            : '\nBundle total: $59.97 — buying the set together saves more.'),
        align: 'center',
      });
    },
  },
  {
    id: 'sticky-atc',
    name: 'Sticky Add-to-Cart',
    type: 'sticky-atc',
    description: 'Bottom bar with the product price and an Add to Cart button.',
    build: (theme, products) => {
      const first = products?.[0];
      return base('sticky-atc', theme, {
        title: first ? `${first.name} — $${first.price}` : FIRST_PRODUCT_FALLBACK,
        subtitle: '',
        text: 'In stock — ships within 24 hours.',
        image: '',
        align: 'left',
        padding: 16,
      });
    },
  },
  {
    id: 'delivery-estimate',
    name: 'Delivery Estimate',
    type: 'delivery',
    description: 'Estimated delivery window shown before checkout.',
    build: (theme) =>
      base('delivery', theme, {
        title: 'Fast, Tracked Delivery',
        subtitle: '',
        text: 'Estimated delivery: 2–4 business days. Free shipping over $50.',
        align: 'left',
        padding: 32,
      }),
  },
];

/** Look a library block up by id; null for unknown ids. */
export function getLibraryBlock(id: string): LibraryBlock | null {
  return SECTION_LIBRARY.find((b) => b.id === id) ?? null;
}
