// lib/templates.ts — Built-in template generator / demo mode (Agent 2).
// Jab GEMINI_API_KEY set nahi hai to Cut 1 bina kisi key ke isi se chalta
// hai. 3 demo themes poori tarah: pink cosmetic, dark fashion, green
// grocery — baaki niches ke liye generic fallback. Images: picsum.photos
// seeded placeholders + fallback, koi ImageKit key nahi. Original code.

import type { CsvProduct, Page, PageType, Section, SectionType, Theme } from './ai/types';
import { detectNiche, slugify, uid, type Niche } from './theme';

export const FALLBACK_IMAGE = 'https://picsum.photos/seed/fallback/1200/800';

/** Seeded placeholder image — har section ki image stable rehti hai. */
export function imageUrl(seed: string, width = 1200, height = 800): string {
  const safe = slugify(seed) || 'store';
  return `https://picsum.photos/seed/${safe}/${width}/${height}`;
}

interface NicheContent {
  storeName: string;
  heroTitle: string;
  heroSubtitle: string;
  bannerTitle: string;
  categories: string[];
  products: string[];
  features: string[];
  ctaTitle: string;
}

const CONTENT: Record<Niche, NicheContent> = {
  cosmetic: {
    storeName: 'Glow Studio',
    heroTitle: 'Glow Like Never Before',
    heroSubtitle: 'Premium skincare and makeup, made for your everyday glow.',
    bannerTitle: 'Flat 20% off on your first order',
    categories: ['Skincare', 'Makeup', 'Fragrance'],
    products: [
      'Rose Lipstick — $18',
      'Vitamin C Serum — $24',
      'Silk Foundation — $32',
      'Blush Palette — $21',
    ],
    features: ['Cruelty-free formulas', 'Free shipping over $40', 'Easy 7-day returns'],
    ctaTitle: 'Join the Glow Club',
  },
  fashion: {
    storeName: 'Noir Atelier',
    heroTitle: 'Wear The Night',
    heroSubtitle: 'Premium dark fashion — bold cuts, quiet luxury, made to last.',
    bannerTitle: 'New season drop — limited pieces',
    categories: ['Jackets', 'Dresses', 'Accessories'],
    products: [
      'Leather Jacket — $149',
      'Silk Evening Dress — $189',
      'Minimal Watch — $99',
      'Tailored Blazer — $169',
    ],
    features: ['Premium fabrics only', 'Free worldwide shipping', 'Designed to last'],
    ctaTitle: 'Shop The Collection',
  },
  grocery: {
    storeName: 'Fresh Mart',
    heroTitle: 'Fresh, Delivered Daily',
    heroSubtitle: 'Farm-fresh vegetables, fruits and daily essentials at your door.',
    bannerTitle: 'Free delivery on orders over $30',
    categories: ['Vegetables', 'Fruits', 'Daily Essentials'],
    products: [
      'Organic Tomatoes 1kg — $3',
      'Fresh Avocados — $5',
      'Farm Eggs 12 pcs — $4',
      'Whole Wheat Bread — $2',
    ],
    features: ['Farm fresh every morning', 'Same-day delivery', 'No minimum fuss'],
    ctaTitle: 'Start Your Fresh Order',
  },
  tech: {
    storeName: 'Nova Gadgets',
    heroTitle: 'Tech That Keeps Up With You',
    heroSubtitle: 'Latest gadgets, honest prices, and fast delivery.',
    bannerTitle: 'Launch offer — up to 25% off',
    categories: ['Phones', 'Laptops', 'Accessories'],
    products: [
      'Wireless Earbuds — $49',
      'Smart Watch — $129',
      'Laptop Stand — $39',
      'Fast Charger 65W — $29',
    ],
    features: ['1-year warranty', 'Free fast shipping', '30-day returns'],
    ctaTitle: 'Explore New Tech',
  },
  food: {
    storeName: 'Saffron Kitchen',
    heroTitle: 'Made Fresh, Served Warm',
    heroSubtitle: 'Your favourite dishes, cooked fresh and delivered hot.',
    bannerTitle: 'Weekend special — buy 1 get 1',
    categories: ['Mains', 'Desserts', 'Drinks'],
    products: [
      'Signature Biryani — $12',
      'Wood-fired Pizza — $14',
      'Chocolate Cake — $8',
      'Fresh Lemonade — $4',
    ],
    features: ['Cooked to order', 'Hot delivery in 30 min', 'Fresh ingredients daily'],
    ctaTitle: 'Order Your Favourite',
  },
  general: {
    storeName: 'Modern Store',
    heroTitle: 'Everything You Need, In One Place',
    heroSubtitle: 'Quality products, fair prices, and delivery you can trust.',
    bannerTitle: 'New arrivals just landed',
    categories: ['New Arrivals', 'Best Sellers', 'Sale'],
    products: [
      'Featured Product 1 — $29',
      'Featured Product 2 — $39',
      'Featured Product 3 — $49',
      'Featured Product 4 — $19',
    ],
    features: ['Quality checked', 'Fast delivery', 'Easy returns'],
    ctaTitle: 'Start Shopping',
  },
};

function makeSection(
  type: SectionType,
  pageSlug: string,
  index: number,
  theme: Theme,
  partial: Omit<Partial<Omit<Section, 'id' | 'type'>>, 'padding'> & {
    padding?: number | string;
  },
): Section {
  return {
    id: `sec_${pageSlug}_${type}_${index}`,
    type,
    title: '',
    subtitle: '',
    text: '',
    image: imageUrl(
      `${slugify(theme.name)}-${pageSlug}-${type}`,
      1200,
      800,
    ),
    bgColor: theme.colors.background,
    textColor: theme.colors.text,
    align: type === 'hero' ? 'center' : 'left',
    ...partial,
    // Call sites may still pass CSS-style strings ("48px 24px") — normalise
    // to the canonical number (px) here, single place.
    padding:
      typeof partial.padding === 'number'
        ? partial.padding
        : typeof partial.padding === 'string'
          ? Number.parseInt(partial.padding, 10) || 48
          : 48,
  };
}

/**
 * Product lines for a "product" section.
 * When real products are passed (project csvProducts, or the demo catalog
 * when none exist — see lib/ai/generate.ts) they replace the built-in
 * niche placeholder lines. No products passed = existing placeholder
 * behaviour, unchanged.
 */
export function productLines(
  products: CsvProduct[] | undefined,
  fallback: string[],
): string[] {
  if (!products || products.length === 0) return fallback;
  return products
    .slice(0, 4)
    .map((p) => `${p.name} — $${p.price}`);
}

// ---------------------------------------------------------------------------
// CRO section pack (Cut B #12) — sensible defaults for conversion sections.
// When the template builder (or the section library) encounters one of
// these types, buildCroSection fills it in: countdown target = now + 48h
// in meta.countdownTarget; bundle uses the passed products; sticky-atc
// uses the first product's price; delivery states the 2–4 business day
// window. All other template behaviour is byte-identical — the existing
// home/product/category builders below are untouched.
// ---------------------------------------------------------------------------

/** CRO section types with filled-in defaults. */
export type CroSectionType =
  | 'countdown'
  | 'bundle'
  | 'sticky-atc'
  | 'trust-badges'
  | 'delivery';

/** Countdown target = now + 48h, ISO string. */
export function countdownTarget48h(from: Date = new Date()): string {
  return new Date(from.getTime() + 48 * 3600 * 1000).toISOString();
}

/**
 * Build one CRO section with sensible defaults. `products` (optional):
 * the project's csvProducts / demo catalog — bundle lists the first
 * three, sticky-atc prices the first one. No products = placeholder
 * copy, same as the rest of the template builder.
 */
export function buildCroSection(
  type: CroSectionType,
  theme: Theme,
  pageSlug: string,
  index: number,
  products?: CsvProduct[],
): Section {
  switch (type) {
    case 'countdown':
      return makeSection('countdown', pageSlug, index, theme, {
        title: 'Sale Ends Soon',
        subtitle: '',
        text: 'Up to 40% off — when the timer hits zero, prices go back up.',
        align: 'center',
        meta: { countdownTarget: countdownTarget48h() },
      });
    case 'bundle': {
      const lines = productLines(products, [
        'Bundle item 1 — $19',
        'Bundle item 2 — $24',
        'Bundle item 3 — $29',
      ]);
      const total = (products?.slice(0, 3) ?? []).reduce((n, p) => n + p.price, 0);
      return makeSection('bundle', pageSlug, index, theme, {
        title: 'Bundle & Save',
        subtitle: '',
        text:
          lines.slice(0, 3).join('\n') +
          (total > 0
            ? `\nBundle total: $${total} — buying the set together saves more.`
            : '\nBundle total: $59.97 — buying the set together saves more.'),
        align: 'center',
      });
    }
    case 'sticky-atc': {
      const first = products?.[0];
      return makeSection('sticky-atc', pageSlug, index, theme, {
        title: first ? `${first.name} — $${first.price}` : 'Featured Product — $29',
        subtitle: '',
        text: 'In stock — ships within 24 hours.',
        image: '',
        align: 'left',
        padding: '16px 24px',
      });
    }
    case 'trust-badges':
      return makeSection('trust-badges', pageSlug, index, theme, {
        title: 'Shop With Confidence',
        subtitle: '',
        text: 'Secure checkout · 30-day returns · Fast delivery · Real support.',
        align: 'center',
        padding: '32px 24px',
      });
    case 'delivery':
      return makeSection('delivery', pageSlug, index, theme, {
        title: 'Fast, Tracked Delivery',
        subtitle: '',
        text: 'Estimated delivery: 2–4 business days. Free shipping over $50.',
        align: 'left',
        padding: '32px 24px',
      });
  }
}

/** Homepage (8 sections) — Cut 1 ka pehla page. */
function homeSections(
  theme: Theme,
  niche: Niche,
  pageSlug: string,
  products?: CsvProduct[],
): Section[] {
  const c = CONTENT[niche];
  const productText = productLines(products, c.products);
  return [
    makeSection('header', pageSlug, 0, theme, {
      title: c.storeName,
      subtitle: 'Home  •  Shop  •  About  •  Contact',
      text: '',
      image: '',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
      align: 'left',
      padding: '16px 24px',
    }),
    makeSection('hero', pageSlug, 1, theme, {
      title: c.heroTitle,
      subtitle: c.heroSubtitle,
      text: 'Shop now',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
    }),
    makeSection('banner', pageSlug, 2, theme, {
      title: c.bannerTitle,
      subtitle: 'Limited time — shop before it ends.',
      text: '',
      bgColor: theme.colors.accent,
      textColor: '#ffffff',
      align: 'center',
      padding: '24px',
    }),
    makeSection('category', pageSlug, 3, theme, {
      title: 'Shop by Category',
      subtitle: 'Find what you love, faster.',
      text: c.categories.join('  •  '),
    }),
    makeSection('product', pageSlug, 4, theme, {
      title: 'Best Sellers',
      subtitle: 'Loved by our customers.',
      text: productText.join('\n'),
    }),
    makeSection('features', pageSlug, 5, theme, {
      title: 'Why Shop With Us',
      subtitle: '',
      text: c.features.join('  •  '),
      align: 'center',
    }),
    makeSection('cta', pageSlug, 6, theme, {
      title: c.ctaTitle,
      subtitle: 'Sign up and get 10% off your first order.',
      text: 'Get started',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
      align: 'center',
    }),
    makeSection('footer', pageSlug, 7, theme, {
      title: c.storeName,
      subtitle: 'About  •  Shipping  •  Returns  •  Privacy',
      text: '© 2026 — demo store. Placeholder products and content.',
      bgColor: theme.colors.text,
      textColor: '#ffffff',
      align: 'center',
      padding: '32px 24px',
    }),
  ];
}

function productSections(
  theme: Theme,
  niche: Niche,
  pageSlug: string,
  products?: CsvProduct[],
): Section[] {
  const c = CONTENT[niche];
  const productText = productLines(products, c.products);
  return [
    makeSection('header', pageSlug, 0, theme, {
      title: c.storeName,
      subtitle: 'Home  •  Shop  •  About  •  Contact',
      text: '',
      image: '',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
      align: 'left',
      padding: '16px 24px',
    }),
    makeSection('hero', pageSlug, 1, theme, {
      title: productText[0],
      subtitle: 'In stock — ships within 24 hours.',
      text: 'Add to cart',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
    }),
    makeSection('features', pageSlug, 2, theme, {
      title: 'Product Details',
      subtitle: '',
      text: c.features.join('  •  '),
      align: 'center',
    }),
    makeSection('cta', pageSlug, 3, theme, {
      title: 'Love it? Take it home.',
      subtitle: 'Free returns within 7 days.',
      text: 'Buy now',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
      align: 'center',
    }),
    makeSection('footer', pageSlug, 4, theme, {
      title: c.storeName,
      subtitle: 'About  •  Shipping  •  Returns  •  Privacy',
      text: '© 2026 — demo store. Placeholder products and content.',
      bgColor: theme.colors.text,
      textColor: '#ffffff',
      align: 'center',
      padding: '32px 24px',
    }),
  ];
}

function categorySections(
  theme: Theme,
  niche: Niche,
  pageSlug: string,
  products?: CsvProduct[],
): Section[] {
  const c = CONTENT[niche];
  const productText = productLines(products, c.products);
  return [
    makeSection('header', pageSlug, 0, theme, {
      title: c.storeName,
      subtitle: 'Home  •  Shop  •  About  •  Contact',
      text: '',
      image: '',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
      align: 'left',
      padding: '16px 24px',
    }),
    makeSection('hero', pageSlug, 1, theme, {
      title: `Shop ${c.categories[0]}`,
      subtitle: 'Hand-picked for you.',
      text: 'Browse all',
      bgColor: theme.colors.primary,
      textColor: '#ffffff',
    }),
    makeSection('category', pageSlug, 2, theme, {
      title: 'All Categories',
      subtitle: '',
      text: c.categories.join('  •  '),
    }),
    makeSection('product', pageSlug, 3, theme, {
      title: `Best in ${c.categories[0]}`,
      subtitle: '',
      text: productText.join('\n'),
    }),
    makeSection('footer', pageSlug, 4, theme, {
      title: c.storeName,
      subtitle: 'About  •  Shipping  •  Returns  •  Privacy',
      text: '© 2026 — demo store. Placeholder products and content.',
      bgColor: theme.colors.text,
      textColor: '#ffffff',
      align: 'center',
      padding: '32px 24px',
    }),
  ];
}

const PAGE_TITLES: Record<PageType, string> = {
  home: 'Home',
  product: 'Product Detail',
  category: 'Category',
};

/**
 * Demo-mode page builder — bina AI key ke. Page type ke hisab se
 * homepage / product detail / category page banata hai.
 * `products` (optional): real products for the product sections — the
 * project's csvProducts when they exist, else the demo catalog. Omitted =
 * the built-in niche placeholder lines (existing behaviour).
 */
export function buildPageFromTemplate(
  prompt: string,
  theme: Theme,
  pageType: PageType = 'home',
  pageTitle?: string,
  products?: CsvProduct[],
): Page {
  const niche = detectNiche(prompt);
  const title = pageTitle?.trim() || PAGE_TITLES[pageType];
  const pageSlug = slugify(title) || pageType;
  const sections =
    pageType === 'product'
      ? productSections(theme, niche, pageSlug, products)
      : pageType === 'category'
        ? categorySections(theme, niche, pageSlug, products)
        : homeSections(theme, niche, pageSlug, products);
  return { id: uid('page'), slug: pageSlug, title, sections };
}

/** Prompt se page type andaza lagao: "product detail" / "category" / warna home. */
export function detectPageType(prompt: string): PageType {
  const lower = prompt.toLowerCase();
  if (lower.includes('product detail') || lower.includes('product page')) return 'product';
  if (lower.includes('category')) return 'category';
  return 'home';
}
