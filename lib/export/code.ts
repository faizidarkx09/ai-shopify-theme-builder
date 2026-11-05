// lib/export/code.ts — Export to Code (Agent 4).
// Har page ko ek standalone HTML file bana kar zip karta hai.
// CSS inline hoti hai, taake file ko browser me seedha khola ja sake.
// NOTE: ye sirf design/content ka export hai — is me koi Shopify
// Liquid, backend ya real products nahi hote (placeholder content).

import { PLACEHOLDER_DISCLAIMER, type Page, type Project, type Section } from "./types";
import type { ThemeFiles } from "./shopify";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "page";
}

/** Theme colors se chhota sa inline CSS banao (Shopify theme.css ka chhota bhai). */
export function inlineCss(project: Project): string {
  const c = project.theme.colors;
  return [
    `body{margin:0;background:${c.background};color:${c.text};font-family:${project.theme.font},system-ui,sans-serif;line-height:1.6}`,
    `img{max-width:100%;display:block}`,
    `a{color:${c.primary};text-decoration:none}`,
    `.container{max-width:1200px;margin:0 auto;padding:0 20px}`,
    `header{background:${c.background};border-bottom:1px solid #eee;padding:16px 0}`,
    `header .container{display:flex;justify-content:space-between;align-items:center}`,
    `.logo{font-weight:800;font-size:1.25rem;color:${c.text}}`,
    `.btn{display:inline-block;background:${c.primary};color:#fff;padding:12px 28px;border-radius:999px;font-weight:700;margin-top:16px}`,
    `.hero{text-align:center;padding:48px 0}`,
    `.hero h1{font-size:2.5rem;margin:24px 0 8px}`,
    `.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}`,
    `.card{background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden}`,
    `.card img{width:100%;height:220px;object-fit:cover}`,
    `.card-body{padding:16px}`,
    `.price{color:${c.primary};font-weight:700}`,
    `.note{font-size:.8rem;opacity:.7}`,
    `footer{margin-top:48px;padding:32px 0;border-top:1px solid #eee}`,
    `section{padding:40px 0}`,
  ].join("\n");
}

function renderSection(section: Section, project: Project): string {
  const style = `background:${section.bgColor || project.theme.colors.background};color:${section.textColor || project.theme.colors.text};text-align:${section.align || "left"};padding:${section.padding ?? 40}px 0`;
  const img = section.image
    ? `<img src="${esc(section.image)}" alt="${esc(section.title)}">`
    : "";
  const heading = section.title ? `<h2>${esc(section.title)}</h2>` : "";
  const sub = section.subtitle ? `<p>${esc(section.subtitle)}</p>` : "";
  const text = section.text ? `<p>${esc(section.text)}</p>` : "";
  switch (section.type) {
    case "header":
      return `<header><div class="container"><a class="logo" href="index.html">${esc(project.name)}</a><nav><a href="index.html">Home</a> &nbsp; <a href="#">Shop</a> &nbsp; <a href="#">Cart (0)</a></nav></div></header>`;
    case "footer":
      return `<footer><div class="container"><strong>${esc(project.name)}</strong>${text}<p>&copy; ${new Date().getFullYear()} ${esc(project.name)}</p></div></footer>`;
    case "hero":
      return `<section class="hero" style="${style}"><div class="container">${img}<h1>${esc(section.title)}</h1>${sub}${text}<a class="btn" href="#">Shop now</a></div></section>`;
    case "product":
      return `<section style="${style}"><div class="container">${heading}${text}<div class="grid">${[1, 2, 3, 4]
        .map(
          (n) =>
            `<div class="card"><img src="https://picsum.photos/seed/placeholder-product-${n}/600/600" alt="Placeholder product ${n}"><div class="card-body"><h3>Placeholder product ${n}</h3><p class="price">$19.99</p><p class="note">Add a real product in Shopify.</p></div></div>`,
        )
        .join("")}</div><p class="note">${PLACEHOLDER_DISCLAIMER}</p></div></section>`;
    case "category":
      return `<section style="${style}"><div class="container">${heading}${text}<div class="grid">${[1, 2, 3]
        .map(
          (n) =>
            `<div class="card"><img src="https://picsum.photos/seed/placeholder-category-${n}/600/400" alt="Placeholder category ${n}"><div class="card-body"><h3>Placeholder category ${n}</h3></div></div>`,
        )
        .join("")}</div></div></section>`;
    case "features":
      return `<section style="${style}"><div class="container">${heading}<div class="grid"><div><h3>Free shipping</h3>${text}</div><div><h3>Easy returns</h3><p>30-day returns on every order.</p></div><div><h3>Secure checkout</h3><p>Safe payments with Shopify checkout.</p></div></div></div></section>`;
    case "banner":
    case "cta":
    default:
      return `<section style="${style}"><div class="container">${heading}${sub}${text}<a class="btn" href="#">Shop now</a></div></section>`;
  }
}

/** Ek page ko poori standalone HTML file me badlo. */
export function renderPageHtml(page: Page, project: Project): string {
  const hasHeader = page.sections.some((s) => s.type === "header");
  const hasFooter = page.sections.some((s) => s.type === "footer");
  const header = hasHeader ? "" : renderSection(
    { id: "auto-header", type: "header", title: project.name, subtitle: "", text: "", image: "", bgColor: project.theme.colors.background, textColor: project.theme.colors.text, align: "left", padding: 16 },
    project,
  );
  const footer = hasFooter ? "" : renderSection(
    { id: "auto-footer", type: "footer", title: project.name, subtitle: "", text: "Thanks for visiting our store.", image: "", bgColor: project.theme.colors.background, textColor: project.theme.colors.text, align: "left", padding: 32 },
    project,
  );
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)} — ${esc(project.name)}</title>
<!-- ${PLACEHOLDER_DISCLAIMER} -->
<style>
${inlineCss(project)}
</style>
</head>
<body>
${header}
<main>
${page.sections.map((s) => renderSection(s, project)).join("\n")}
</main>
${footer}
</body>
</html>
`;
}

/** Saare pages -> file path -> HTML content. Home page index.html banta hai. */
export function buildCodeFiles(project: Project): ThemeFiles {
  if (!project.pages || project.pages.length === 0) {
    throw new Error("Export ke liye project me kam se kam ek page chahiye.");
  }
  const files: ThemeFiles = {};
  for (const page of project.pages) {
    const name = page.slug === "home" || page.slug === "index" ? "index.html" : `${slugify(page.slug)}.html`;
    files[name] = renderPageHtml(page, project);
  }
  files["README.txt"] =
    `${project.name} — standalone HTML export (generated by AI Shopify Theme Builder)\n\n${PLACEHOLDER_DISCLAIMER}\n` +
    `Kholne ka tareeqa: index.html ko browser me kholein. Koi server zaroori nahi.\n`;
  return files;
}

export function codeZipName(project: Project): string {
  return `${slugify(project.name)}-code.zip`;
}
