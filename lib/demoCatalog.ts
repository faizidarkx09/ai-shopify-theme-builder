// lib/demoCatalog.ts — Niche quick-start + demo catalog (Cut A, idea #19).
// Six niches, each with a chip label, a prefill prompt, and 10 realistic
// DEMO products (name, price, description).
//
// IMPORTANT — DEMO DATA: every product here is invented placeholder data so
// a first preview looks like a real store. These are NOT real products,
// NOT a real catalog, and NOT real brands. Any UI that shows them must
// label them "Demo products — replace with your own" (see
// DEMO_PRODUCTS_LABEL below), and they are replaced by the project's own
// csvProducts whenever those exist (lib/ai/generate.ts).
// Prices are plausible round numbers in USD; no real brand names are used.

import { detectNiche, type Niche } from './theme';

/** The label the UI must show next to demo products. */
export const DEMO_PRODUCTS_LABEL = 'Demo products — replace with your own';

/** One invented demo product. */
export interface DemoProduct {
  name: string;
  price: number;
  description: string;
}

/** Demo-niche ids used by the quick-start chips (idea #19). */
export type DemoNicheId =
  | 'fashion'
  | 'beauty'
  | 'electronics'
  | 'home'
  | 'fitness'
  | 'food';

export interface DemoNiche {
  id: DemoNicheId;
  /** Chip label shown in the quick-start row. */
  label: string;
  /** Prompt the chip pre-fills. */
  prefillPrompt: string;
  /** 10 invented demo products for this niche. */
  products: DemoProduct[];
  /** Template niche this demo niche maps to (lib/theme.ts). */
  templateNiche: Niche;
}

export const DEMO_NICHES: readonly DemoNiche[] = [
  {
    id: 'fashion',
    label: 'Fashion',
    prefillPrompt: 'A modern fashion boutique selling everyday outfits and accessories',
    templateNiche: 'fashion',
    products: [
      { name: 'Everyday Cotton Tee', price: 24, description: 'Soft organic-cotton tee in a relaxed fit, made for daily wear.' },
      { name: 'Classic Denim Jacket', price: 89, description: 'A timeless mid-wash denim jacket with brass buttons.' },
      { name: 'Pleated Midi Skirt', price: 54, description: 'Flowy pleated midi skirt that moves from day to evening.' },
      { name: 'Linen Blend Shirt', price: 49, description: 'Breathable linen-blend shirt with a clean, tailored collar.' },
      { name: 'Wide-Leg Trousers', price: 64, description: 'High-waist wide-leg trousers in a soft, wrinkle-resistant weave.' },
      { name: 'Knit Crew Sweater', price: 59, description: 'Cosy ribbed-knit sweater in a warm neutral tone.' },
      { name: 'Canvas Tote Bag', price: 32, description: 'Sturdy everyday canvas tote with an inside pocket.' },
      { name: 'Leather Belt', price: 29, description: 'Full-grain leather belt with a brushed metal buckle.' },
      { name: 'Slip-On Sneakers', price: 74, description: 'Lightweight slip-on sneakers with cushioned soles.' },
      { name: 'Silk Scarf', price: 39, description: 'Lightweight printed silk scarf, 90 × 90 cm.' },
    ],
  },
  {
    id: 'beauty',
    label: 'Beauty',
    prefillPrompt: 'A skincare and beauty store with a soft pink glow theme',
    templateNiche: 'cosmetic',
    products: [
      { name: 'Rose Glow Lipstick', price: 18, description: 'Creamy rose-tinted lipstick with a soft satin finish.' },
      { name: 'Vitamin C Serum', price: 24, description: 'Brightening daily serum with 10% vitamin C and hyaluronic acid.' },
      { name: 'Silk Finish Foundation', price: 32, description: 'Lightweight foundation with a natural silk finish, 12 shades.' },
      { name: 'Blush & Glow Palette', price: 21, description: 'Four blendable blush and highlighter shades in one compact.' },
      { name: 'Gentle Foam Cleanser', price: 16, description: 'Mild foaming cleanser that leaves skin soft, never tight.' },
      { name: 'Hydrating Night Cream', price: 28, description: 'Rich overnight cream with shea butter and ceramides.' },
      { name: 'Rose Water Mist', price: 14, description: 'Refreshing rose-water face mist for a midday glow.' },
      { name: 'Volumising Mascara', price: 19, description: 'Clump-free volumising mascara, smudge-proof for 12 hours.' },
      { name: 'Jasmine Body Lotion', price: 17, description: 'Fast-absorbing body lotion with a light jasmine scent.' },
      { name: 'Lip Care Duo', price: 12, description: 'Sugar lip scrub and nourishing balm, sold as a pair.' },
    ],
  },
  {
    id: 'electronics',
    label: 'Electronics',
    prefillPrompt: 'An electronics store selling gadgets, phones and accessories',
    templateNiche: 'tech',
    products: [
      { name: 'Wireless Earbuds Pro', price: 49, description: 'True-wireless earbuds with noise cancelling and 24-hour case battery.' },
      { name: 'Smart Watch Series 2', price: 129, description: 'Fitness tracking, heart-rate monitor and a 7-day battery.' },
      { name: '65W Fast Charger', price: 29, description: 'GaN fast charger with two USB-C ports and a braided cable.' },
      { name: 'Laptop Stand Aluminium', price: 39, description: 'Adjustable aluminium laptop stand, folds flat for travel.' },
      { name: 'Mechanical Keyboard', price: 79, description: 'Hot-swappable mechanical keyboard with quiet tactile switches.' },
      { name: '4K Action Camera', price: 149, description: 'Waterproof 4K action camera with image stabilisation.' },
      { name: 'Portable Speaker', price: 59, description: 'Pocket Bluetooth speaker with 16 hours of playtime.' },
      { name: 'Wireless Mouse', price: 25, description: 'Silent-click wireless mouse with a 12-month battery.' },
      { name: 'USB-C Hub 7-in-1', price: 45, description: 'Seven-port USB-C hub with HDMI, SD reader and 100W pass-through.' },
      { name: 'Phone Stand Mount', price: 19, description: 'Adjustable desk mount for phones and small tablets.' },
    ],
  },
  {
    id: 'home',
    label: 'Home',
    prefillPrompt: 'A home decor store selling cosy furniture and decorations',
    templateNiche: 'general',
    products: [
      { name: 'Linen Cushion Cover', price: 22, description: 'Washed-linen cushion cover, 45 × 45 cm, hidden zip.' },
      { name: 'Ceramic Vase Set', price: 34, description: 'Set of three matte ceramic vases in graduated sizes.' },
      { name: 'Wooden Table Lamp', price: 48, description: 'Warm-glow table lamp with a solid oak base and linen shade.' },
      { name: 'Woven Throw Blanket', price: 42, description: 'Soft woven throw in a chunky knit, 130 × 170 cm.' },
      { name: 'Wall Art Print Set', price: 29, description: 'Three framed-ready botanical prints, A3 size.' },
      { name: 'Scented Candle — Amber', price: 18, description: 'Hand-poured soy candle, amber and cedar, 40-hour burn.' },
      { name: 'Storage Basket', price: 26, description: 'Handwoven seagrass basket with sturdy handles.' },
      { name: 'Ceramic Mug Duo', price: 24, description: 'Two speckled stoneware mugs, 350 ml each.' },
      { name: 'Oak Serving Board', price: 31, description: 'Solid oak serving board with a leather hanging loop.' },
      { name: 'Blackout Curtain Panel', price: 39, description: 'Thermal blackout curtain panel, 140 × 240 cm.' },
    ],
  },
  {
    id: 'fitness',
    label: 'Fitness',
    prefillPrompt: 'A fitness store selling workout gear, supplements and accessories',
    templateNiche: 'general',
    products: [
      { name: 'Pro Yoga Mat 6mm', price: 35, description: 'Non-slip 6 mm yoga mat with alignment lines and carry strap.' },
      { name: 'Adjustable Dumbbell Set', price: 119, description: 'Pair of adjustable dumbbells, 2.5–12.5 kg each.' },
      { name: 'Resistance Bands Set', price: 19, description: 'Five loop resistance bands from light to extra heavy.' },
      { name: 'Insulated Gym Bottle', price: 24, description: '750 ml stainless-steel bottle, keeps drinks cold for 24 hours.' },
      { name: 'Training Gloves', price: 21, description: 'Padded palm training gloves with wrist support.' },
      { name: 'Jump Rope — Speed', price: 14, description: 'Lightweight speed jump rope with ball-bearing handles.' },
      { name: 'Foam Roller', price: 27, description: 'High-density foam roller for muscle recovery, 45 cm.' },
      { name: 'Gym Duffel Bag', price: 49, description: 'Water-resistant duffel with a vented shoe pocket.' },
      { name: 'Whey Protein 1kg', price: 39, description: 'Vanilla whey protein, 24 g protein per serving, 33 servings.' },
      { name: 'Running Cap', price: 16, description: 'Breathable quick-dry running cap with reflective trim.' },
    ],
  },
  {
    id: 'food',
    label: 'Food',
    prefillPrompt: 'A food store selling fresh meals, snacks and desserts',
    templateNiche: 'food',
    products: [
      { name: 'Signature Biryani', price: 12, description: 'Fragrant basmati biryani with tender chicken and saffron.' },
      { name: 'Wood-Fired Pizza', price: 14, description: 'Thin-crust pizza with fresh mozzarella and basil.' },
      { name: 'Chocolate Fudge Cake', price: 8, description: 'Rich chocolate fudge cake slice with ganache.' },
      { name: 'Fresh Lemonade', price: 4, description: 'Cold-pressed lemonade with mint, made to order.' },
      { name: 'Grilled Chicken Wrap', price: 9, description: 'Char-grilled chicken wrap with garlic sauce and salad.' },
      { name: 'Veggie Pasta Bowl', price: 11, description: 'Penne pasta with roasted vegetables and parmesan.' },
      { name: 'Butter Croissant', price: 3, description: 'Flaky all-butter croissant, baked fresh every morning.' },
      { name: 'Fruit Salad Cup', price: 6, description: 'Seasonal fruit cup with honey-lime dressing.' },
      { name: 'Masala Fries', price: 5, description: 'Crispy fries tossed in house masala spice.' },
      { name: 'Iced Coffee', price: 5, description: 'Cold-brew iced coffee with a touch of vanilla.' },
    ],
  },
];

/** Look a demo niche up by id; returns null for unknown ids. */
export function getDemoNiche(id: string): DemoNiche | null {
  return DEMO_NICHES.find((n) => n.id === id) ?? null;
}

/** Demo products for a template niche (lib/theme.ts Niche). */
export function demoProductsForNiche(niche: Niche): DemoProduct[] {
  const match = DEMO_NICHES.find((n) => n.templateNiche === niche);
  // No demo niche maps to 'grocery' — fall back to the Home set (general
  // template niche), never to an unrelated niche's products.
  const fallback = DEMO_NICHES.find((n) => n.id === 'home') ?? DEMO_NICHES[0];
  return match ? [...match.products] : [...fallback.products];
}

/** Demo products for a free-text prompt — niche is detected from the words. */
export function demoProductsForPrompt(prompt: string): DemoProduct[] {
  return demoProductsForNiche(detectNiche(prompt));
}
