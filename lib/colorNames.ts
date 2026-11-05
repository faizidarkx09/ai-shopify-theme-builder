// lib/colorNames.ts — plain colour names for hex codes.
// The plan summary must never show a bare hex code as the only label:
// every swatch shows a plain name ("Rose") with the hex beside it
// ("Rose #E11D48"). Nearest match by RGB distance over a curated list.

const NAMED_COLORS: Array<{ name: string; rgb: [number, number, number] }> = [
  { name: "White", rgb: [255, 255, 255] },
  { name: "Ivory", rgb: [255, 255, 240] },
  { name: "Black", rgb: [0, 0, 0] },
  { name: "Charcoal", rgb: [31, 41, 55] },
  { name: "Slate", rgb: [100, 116, 139] },
  { name: "Grey", rgb: [128, 128, 128] },
  { name: "Silver", rgb: [192, 192, 192] },
  { name: "Rose", rgb: [225, 29, 72] },
  { name: "Pink", rgb: [236, 72, 153] },
  { name: "Blush pink", rgb: [249, 168, 212] },
  { name: "Crimson", rgb: [190, 18, 60] },
  { name: "Red", rgb: [220, 38, 38] },
  { name: "Coral", rgb: [255, 127, 80] },
  { name: "Orange", rgb: [249, 115, 22] },
  { name: "Peach", rgb: [253, 186, 116] },
  { name: "Amber", rgb: [245, 158, 11] },
  { name: "Gold", rgb: [217, 119, 6] },
  { name: "Yellow", rgb: [250, 204, 21] },
  { name: "Lime", rgb: [132, 204, 22] },
  { name: "Green", rgb: [34, 197, 94] },
  { name: "Emerald", rgb: [16, 185, 129] },
  { name: "Mint", rgb: [167, 243, 208] },
  { name: "Teal", rgb: [20, 184, 166] },
  { name: "Cyan", rgb: [6, 182, 212] },
  { name: "Sky blue", rgb: [56, 189, 248] },
  { name: "Blue", rgb: [59, 130, 246] },
  { name: "Navy", rgb: [30, 58, 138] },
  { name: "Indigo", rgb: [79, 70, 229] },
  { name: "Violet", rgb: [139, 92, 246] },
  { name: "Purple", rgb: [168, 85, 247] },
  { name: "Lavender", rgb: [196, 181, 253] },
  { name: "Brown", rgb: [120, 53, 15] },
  { name: "Beige", rgb: [245, 245, 220] },
  { name: "Maroon", rgb: [127, 29, 29] },
  { name: "Olive", rgb: [101, 163, 13] },
];

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Plain English name for a hex colour ("#E11D48" -> "Rose"). */
export function colorName(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "Colour";
  let best = NAMED_COLORS[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const c of NAMED_COLORS) {
    const d =
      (rgb[0] - c.rgb[0]) ** 2 +
      (rgb[1] - c.rgb[1]) ** 2 +
      (rgb[2] - c.rgb[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.name;
}
