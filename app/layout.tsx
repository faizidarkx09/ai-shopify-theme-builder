import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import "./mobile.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Shopify Theme Builder — Prompt se Shopify theme banao",
  description:
    "Prompt likho, AI pehle consistent theme banata hai, phir page-by-page streaming preview, section-wise edit, aur Shopify theme zip export. Original demo build — placeholder content, test-mode billing.",
};

/** Mobile viewport + brand theme-color (Cut C mobile pass). */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#db2777",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              AI Shopify Theme Builder
            </Link>
            <div className="flex items-center gap-4 text-sm font-medium">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/billing" className="hover:underline">
                Billing
              </Link>
              <Link
                href="/dashboard"
                className="rounded-full bg-zinc-900 px-4 py-2 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Start building
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
        <footer className="border-t border-zinc-200 px-4 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800">
          Demo build — exported themes carry placeholder products, not a real
          store catalog. Billing is test-mode only; $9.99/month is a demo
          price, not a real charge.
        </footer>
      </body>
    </html>
  );
}
