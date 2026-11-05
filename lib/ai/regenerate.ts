// lib/ai/regenerate.ts — Cut B #7 (per-section Regenerate).
// Template-mode regeneration: a fresh variation of the SAME section type —
// new title / subtitle / text and a new placeholder-image seed — with no
// external calls and no API key. Deterministic-ish: the variant is picked
// from a hash of the section id + title plus an explicit `seed` counter, so
// repeated regenerates cycle through distinct variants instead of
// returning the same copy. All wording is original copy written for this
// builder; nothing is fetched from anywhere.
// The section id, type, colours, alignment, padding and font size are
// always kept — only the copy (and image seed) changes.

import type { CsvProduct, Section, Theme } from "@/lib/types";
import { placeholderImage } from "@/lib/types";

interface Variant {
  title: string;
  subtitle?: string;
  text?: string;
}

const VARIANTS: Record<string, Variant[]> = {
  hero: [
    {
      title: "Fresh Styles, Honest Prices",
      subtitle: "New season essentials, made to last",
      text: "Browse the latest drop — everyday pieces in colours you'll actually wear. Free shipping on orders over $50.",
    },
    {
      title: "Your Everyday Upgrade",
      subtitle: "Small details, big difference",
      text: "Carefully picked pieces for work, weekends and everything between. Shop the new collection today.",
    },
    {
      title: "Made for Real Life",
      subtitle: "Comfort first, style always",
      text: "Quality you can feel, prices you can justify. Discover this season's favourites — before they sell out.",
    },
  ],
  product: [
    {
      title: "This Week's Favourites",
      subtitle: "",
      text: "The pieces our customers keep coming back for — restocked and ready to ship.",
    },
    {
      title: "Most Loved Right Now",
      subtitle: "",
      text: "Top-rated by real buyers. Limited stock on the best sellers, so don't wait too long.",
    },
    {
      title: "Handpicked For You",
      subtitle: "",
      text: "Our team's shortlist of the season — quality-checked, fairly priced, ready to go.",
    },
  ],
  features: [
    {
      title: "Shopping, Without the Hassle",
      subtitle: "",
      text: "Fast delivery, easy returns and secure checkout — the basics, done properly.",
    },
    {
      title: "Why Customers Stay With Us",
      subtitle: "",
      text: "Real support, honest prices and delivery you can track from door to door.",
    },
    {
      title: "Good Service Is the Product",
      subtitle: "",
      text: "Quick shipping, simple returns and a team that actually replies. That's the whole promise.",
    },
  ],
  testimonials: [
    {
      title: "Loved by Real Customers",
      subtitle: "",
      text: "Rated 4.9 out of 5 across hundreds of verified orders.",
    },
    {
      title: "Don't Take Our Word For It",
      subtitle: "",
      text: "See what buyers say after their order arrives — unfiltered and recent.",
    },
    {
      title: "Word of Mouth, In Writing",
      subtitle: "",
      text: "Most of our new customers arrive because a friend told them to. Here's why.",
    },
  ],
  faq: [
    {
      title: "Questions? Answered.",
      subtitle: "",
      text: "Delivery, returns and checkout — the answers most shoppers ask for, in one place.",
    },
    {
      title: "Before You Order",
      subtitle: "",
      text: "Everything worth knowing about shipping, returns and payment — no fine print.",
    },
    {
      title: "Good to Know",
      subtitle: "",
      text: "How fast is delivery? How do returns work? Is checkout safe? All covered below.",
    },
  ],
  banner: [
    {
      title: "Flash Sale — Up to 30% Off",
      subtitle: "",
      text: "This weekend only. Selected lines, no code needed.",
    },
    {
      title: "Members Get More",
      subtitle: "",
      text: "Join the list and unlock an extra 10% off your first order.",
    },
  ],
  category: [
    {
      title: "Browse by Category",
      subtitle: "",
      text: "Jump straight to what you're looking for.",
    },
    {
      title: "Find Your Corner",
      subtitle: "",
      text: "From everyday basics to statement pieces — start here.",
    },
  ],
  cta: [
    {
      title: "Start Shopping Today",
      subtitle: "",
      text: "Your next favourite is one click away.",
    },
    {
      title: "Ready When You Are",
      subtitle: "",
      text: "Join thousands of happy customers — your first order ships fast.",
    },
  ],
  newsletter: [
    {
      title: "Get 10% Off — Join the List",
      subtitle: "",
      text: "New drops, member-only offers and zero spam. Unsubscribe anytime.",
    },
    {
      title: "Be First to Know",
      subtitle: "",
      text: "Early access to sales and new collections, straight to your inbox.",
    },
  ],
  countdown: [
    {
      title: "Sale Ends Soon — Don't Miss Out",
      subtitle: "",
      text: "Prices go back up when the timer hits zero.",
    },
    {
      title: "Last Chance for This Deal",
      subtitle: "",
      text: "The clock is running — grab the discount while it lasts.",
    },
  ],
  header: [
    { title: "My Store", subtitle: "", text: "" },
    { title: "Shop Fresh", subtitle: "", text: "" },
  ],
  footer: [
    {
      title: "My Store",
      subtitle: "",
      text: "© 2026 My Store. All rights reserved. Placeholder content — replace with your real store details.",
    },
  ],
  announcement: [
    { title: "Free shipping on orders over $50", subtitle: "", text: "" },
    { title: "New collection just landed — shop now", subtitle: "", text: "" },
  ],
  "trust-badges": [
    {
      title: "Shop With Confidence",
      subtitle: "",
      text: "Secure checkout · 30-day returns · Fast delivery · Real support.",
    },
  ],
  bundle: [
    {
      title: "Better Together — Bundle & Save",
      subtitle: "",
      text: "Buy the set together and save more than buying each piece alone.",
    },
  ],
  "sticky-atc": [
    {
      title: "Classic Tee — $29",
      subtitle: "",
      text: "In stock — ships within 24 hours.",
    },
  ],
  delivery: [
    {
      title: "Fast, Tracked Delivery",
      subtitle: "",
      text: "Order today and get it in 2–4 working days. Free shipping over $50.",
    },
  ],
  custom: [
    {
      title: "Custom Block",
      subtitle: "",
      text: "Add your own HTML, CSS and JavaScript here.",
    },
  ],
};

/** Small string hash (djb2) — stable across runs for the same section. */
function hashSeed(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Regenerate one section: same id/type/style, fresh copy + image seed.
 * `seed` cycles the variant (the edit route passes a per-click counter);
 * `products` lets product sections name a real demo product when one is
 * available. Never mutates the input section.
 */
export function regenerateSection(
  section: Section,
  theme?: Theme | null,
  products?: CsvProduct[],
  seed = 0,
): Section {
  void theme; // Theme is accepted for the API contract; copy does not depend on it yet.
  const variants = VARIANTS[section.type] ?? VARIANTS.custom ?? [];
  if (variants.length === 0) return { ...section };
  const base = hashSeed(`${section.id}:${section.title ?? ""}`);
  // Pick a variant different from the current title when possible.
  let pick = (base + seed) % variants.length;
  if (variants.length > 1 && variants[pick]?.title === section.title) {
    pick = (pick + 1) % variants.length;
  }
  const v = variants[pick] ?? variants[0];
  if (!v) return { ...section };
  const next: Section = {
    ...section,
    title: v.title,
    subtitle: v.subtitle ?? section.subtitle ?? "",
    text: v.text ?? section.text ?? "",
    image: placeholderImage(`${section.type}-regen-${base % 997}-${seed}`),
  };
  // Product sections: name a real demo product when one is supplied.
  if (section.type === "product" && products && products.length > 0) {
    const p = products[(base + seed) % products.length];
    if (p) {
      next.text = `${next.text ?? ""} Featuring ${p.name} — $${p.price}.`.trim();
    }
  }
  return next;
}

/** Change notes for the staged Accept/Discard preview. */
export function describeRegeneration(before: Section, after: Section): string[] {
  const out: string[] = ["Section regenerate kar diya — naya version tayyar hai"];
  if (before.title !== after.title) {
    out.push(`Title: "${before.title || "(empty)"}" → "${after.title || "(empty)"}"`);
  }
  if (before.text !== after.text) out.push("Text update kar diya");
  if (before.image !== after.image) out.push("Image seed badal diya");
  return out;
}
