// lib/reference.ts — Safe reference-URL fetch (Cut B, idea #9).
// Shared by the plan route (lib/ai/plan.ts via app/api/plan) and the
// brand-kit reader (lib/brandKit.ts) so the fetch logic lives in ONE place.
//
// SAFETY LIMITS (mandatory, not optional):
// - Only http: / https: URLs. Anything else is rejected before fetching.
// - No credentials, no cookies, no Authorization header are ever sent.
// - Redirects are NOT followed (redirect: 'manual'): a 3xx is treated as
//   a failed fetch and the caller falls back to URL-derived hints. This
//   also blocks redirect-based SSRF to internal hosts.
// - The hostname is resolved with dns.lookup and EVERY resolved address
//   must be public: localhost, 0.0.0.0/8, 10/8, 172.16/12, 192.168/16,
//   169.254/16 (link-local, incl. cloud metadata 169.254.169.254),
//   ::1 / fe80::/10 / fc00::/7 are all blocked. A hostname that fails to
//   resolve is treated as blocked (fail closed).
// - 5-second timeout (AbortSignal.timeout) and a 200 KB response cap:
//   the body stream is aborted as soon as it exceeds the cap, so a huge
//   page cannot exhaust memory.
// - The fetched page is parsed with plain regexes only (title, meta
//   description, theme-color, og:image, h1/h2). No scripts run, nothing
//   from the page is executed or rendered as HTML.
//
// On ANY failure the caller gets a clean fallback: hints derived from the
// URL itself (domain words + path segments) — never an exception.

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { detectNiche } from './theme';

export interface ReferenceSummary {
  /** The URL as requested (trimmed). */
  url: string;
  /** True when the page was fetched and parsed; false = URL fallback. */
  ok: boolean;
  /** Why the fetch did not happen / failed (only when ok is false). */
  blockedReason?: string;
  /** <title> of the page, when fetched. */
  title?: string;
  /** meta description, when fetched. */
  description?: string;
  /** theme-color meta value, validated hex, when fetched. */
  themeColor?: string;
  /** og:image URL, when fetched. */
  ogImage?: string;
  /** First h1/h2 headings (max 5), when fetched. */
  headings?: string[];
  /** Niche hint derived from title + headings (or from the URL fallback). */
  nicheHint?: string;
  /** Accent colour hint = validated theme-color, when present. */
  accent?: string;
  /** Store-name hint: cleaned first part of the title (or domain words). */
  storeNameHint?: string;
}

const FETCH_TIMEOUT_MS = 5000;
const MAX_BODY_BYTES = 200 * 1024; // 200 KB

/** Private / reserved ranges — any resolved address in one of these blocks the fetch. */
function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 0 || a === 10) return true; // 0.0.0.0/8, 10/8
    if (a === 127) return true; // 127/8 loopback
    if (a === 169 && b === 254) return true; // 169.254/16 link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
    if (a === 192 && b === 168) return true; // 192.168/16
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 unique-local
    return false;
  }
  return true; // Not a parseable IP — fail closed.
}

/** Resolve a hostname and require every address to be public. */
async function hostnameIsPublic(hostname: string): Promise<boolean> {
  if (isIP(hostname)) return !isPrivateIp(hostname);
  const lowered = hostname.toLowerCase();
  if (lowered === 'localhost' || lowered.endsWith('.localhost')) return false;
  try {
    const addrs = await lookup(hostname, { all: true });
    if (addrs.length === 0) return false;
    return addrs.every((a) => !isPrivateIp(a.address));
  } catch {
    return false; // Unresolvable hostname — fail closed.
  }
}

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Validate a theme-color value; returns a normalised #rrggbb or undefined. */
export function validateHexColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const clean = value.trim().toLowerCase();
  if (!HEX_COLOR.test(clean)) return undefined;
  if (clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .trim();
}

function pickMeta(html: string, attr: string, value: string): string | undefined {
  // <meta name="x" content="..."> or <meta property="x" content="...">
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']+)["']|<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${value}["']`,
    'i',
  );
  const m = html.match(re);
  const raw = m?.[1] ?? m?.[2];
  return raw ? decodeEntities(raw) : undefined;
}

function pickTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([\s\S]{1,200})<\/title>/i);
  return m ? decodeEntities(m[1].replace(/<[^>]+>/g, '')) : undefined;
}

function pickHeadings(html: string): string[] {
  const out: string[] = [];
  const re = /<h[12][^>]*>([\s\S]{1,200})<\/h[12]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 5) {
    const text = decodeEntities(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
    if (text) out.push(text);
  }
  return out;
}

/** Clean a <title> into a store-name hint: first chunk before a separator. */
export function storeNameFromTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  const first = title.split(/[|–—\-•·:]/)[0]?.trim() ?? '';
  const clean = first.replace(/\s+/g, ' ').slice(0, 48);
  return clean.length >= 2 ? clean : undefined;
}

/** URL-derived hints when the fetch is blocked or fails (no network use). */
export function deriveHintsFromUrl(url: string): Pick<
  ReferenceSummary,
  'nicheHint' | 'storeNameHint'
> {
  let host = '';
  let path = '';
  try {
    const parsed = new URL(url);
    host = parsed.hostname.replace(/^www\./, '');
    path = parsed.pathname;
  } catch {
    host = url;
  }
  const words = `${host.replace(/[-_.]/g, ' ')} ${path.replace(/[-_/.]/g, ' ')}`;
  const niche = detectNiche(words);
  const domainWords = host
    .split('.')[0]
    ?.replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    nicheHint: niche === 'general' ? undefined : niche,
    storeNameHint:
      domainWords && domainWords.length >= 2
        ? domainWords
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
            .slice(0, 48)
        : undefined,
  };
}

/**
 * Fetch a reference URL safely and summarise it. Never throws: on any
 * failure it returns { ok: false, blockedReason } plus URL-derived hints.
 */
export async function fetchReferenceSummary(rawUrl: string): Promise<ReferenceSummary> {
  const url = rawUrl.trim();
  const fallback = deriveHintsFromUrl(url);
  const base: ReferenceSummary = { url, ok: false, ...fallback };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ...base, blockedReason: 'Invalid URL.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ...base, blockedReason: 'Only http and https URLs are allowed.' };
  }
  if (parsed.username || parsed.password) {
    return { ...base, blockedReason: 'URLs with credentials are not allowed.' };
  }
  if (!(await hostnameIsPublic(parsed.hostname))) {
    return { ...base, blockedReason: 'That host is private or unreachable.' };
  }

  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'manual', // never follow redirects (blocks redirect SSRF)
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'user-agent': 'ai-shopify-theme-builder reference reader',
        accept: 'text/html',
      },
    });
  } catch {
    return { ...base, blockedReason: 'Could not reach that URL.' };
  }
  if (res.status >= 300 && res.status < 400) {
    return { ...base, blockedReason: 'Redirects are not followed.' };
  }
  if (res.status !== 200) {
    return { ...base, blockedReason: `That page returned ${res.status}.` };
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType && !contentType.includes('text/html')) {
    return { ...base, blockedReason: 'That URL is not an HTML page.' };
  }

  // Stream the body with a hard 200 KB cap.
  let html = '';
  try {
    if (!res.body) return { ...base, blockedReason: 'Empty response.' };
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ...base, blockedReason: 'That page is too large (over 200 KB).' };
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
  } catch {
    return { ...base, blockedReason: 'Could not read that page.' };
  }

  const title = pickTitle(html);
  const description = pickMeta(html, 'name', 'description');
  const themeColor = validateHexColor(pickMeta(html, 'name', 'theme-color'));
  const ogImage = pickMeta(html, 'property', 'og:image');
  const headings = pickHeadings(html);
  const nicheText = [title ?? '', description ?? '', ...headings].join(' ');
  const niche = detectNiche(nicheText);

  return {
    url,
    ok: true,
    title,
    description,
    themeColor,
    ogImage,
    headings,
    nicheHint: niche === 'general' ? undefined : niche,
    accent: themeColor,
    storeNameHint: storeNameFromTitle(title) ?? fallback.storeNameHint,
  };
}
