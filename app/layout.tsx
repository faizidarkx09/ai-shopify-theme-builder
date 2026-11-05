import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Button } from "@/components/ui";
import "./globals.css";
import "./mobile.css";

/* Inter — the project's single font, weights 400/500/600/700.
   Variable font per next/font docs (node_modules/next/dist/docs/
   01-app/03-api-reference/02-components/font.md): weights are
   listed explicitly so every weight the system uses is preloaded. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Shopify Theme Builder — Prompt se Shopify theme banao",
  description:
    "Prompt likho, AI pehle consistent theme banata hai, phir page-by-page streaming preview, section-wise edit, aur Shopify theme zip export.",
};

/** Mobile viewport + brand theme-color (Wave 0: light indigo). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4F46E5",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-page font-sans text-body">
        <header className="border-b border-border bg-white">
          <nav className="stb-container flex items-center justify-between gap-4 py-3">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-ink hover:text-ink"
            >
              AI Shopify Theme Builder
            </Link>
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="hidden items-center gap-4 sm:flex">
                <Link
                  href="/dashboard"
                  className="text-slate-600 hover:text-accent"
                >
                  Dashboard
                </Link>
                <Link
                  href="/billing"
                  className="text-slate-600 hover:text-accent"
                >
                  Billing
                </Link>
              </div>
              <Button href="/dashboard" variant="primary" size="sm">
                Start building
              </Button>
            </div>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-border bg-white px-4 py-4 text-center text-xs text-slate-500">
          AI Shopify Theme Builder — Free to try
          <span className="mx-2">·</span>
          <Link href="/dashboard" className="text-slate-600 hover:text-accent">
            Dashboard
          </Link>
          <span className="mx-2">·</span>
          <Link href="/billing" className="text-slate-600 hover:text-accent">
            Billing
          </Link>
        </footer>
      </body>
    </html>
  );
}
