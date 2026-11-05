# AI Shopify Theme Builder

Prompt likho → AI pehle consistent theme banata hai → phir page-by-page
streaming preview → section-wise edit → Shopify theme zip / code zip / PNG
export → paywall. Naya alag SaaS (Option A), Kliparo se alag brand.

Idea ka source (own-words blueprint, kisi ka code copy nahi): TubeGuruji
video "Build Full Stack AI Shopify Theme Builder using NextJs, React, Jolli
AI, InsForge, Claude Code" — https://youtu.be/WmWJNSxCiZc
Blueprint: `~/workspace/ai-shopify-theme-builder-blueprint.md`
Plan: `PLAN.md` (is folder me)

## Stack

- Next.js 16 App Router + React 19 + TypeScript + Tailwind CSS v4
  (CSS-first — `tailwind.config.js` nahi hai, theme `app/globals.css` me hai)
- Node v24, npm 10.9
- Data: Cut 1 me localStorage-first project store (`lib/db`), bina DB ke
  chalta hai; baad me Neon/Postgres se replace ho sakta hai
- AI: `GEMINI_API_KEY` ho to Gemini, warna built-in template generator
  (demo mode, zero keys)
- Images: picsum placeholder URLs, koi ImageKit key nahi
- Billing: Stripe **test-mode only** stub — Free = max 2 projects, Shopify
  export nahi; Paid = unlimited + export. Demo price $9.99/month real
  price nahi hai

## Run karo

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
```

Env ke liye `.env.example` ko `.env.local` me copy karo — sab kuch optional
hai, bina keys ke bhi demo chalta hai.

## Core loop (user ka safar)

1. Landing par prompt likho ya Dashboard par naya project banao
2. Editor me AI pehle theme banata hai, phir page-by-page sections stream
   karta hai (left chat, right live preview, upar browser jaisi tabs)
3. Section par click kar ke select karo (inline editing Cut 2 me)
4. Export (Cut 3/4) aur paywall (Cut 5) alag agents ka kaam hai

## Honest limits

- Exported theme me **placeholder products/content** hote hain — asli
  products Shopify me khud lagane honge, ye real catalog sync nahi hai.
- Google sign-in Cut 1 me nahi hai (Cut 5, Clerk) — guest/demo user se
  kaam chalta hai.
- Free plan ki limit sirf demo enforcement hai; real payment nahi hoti.

## File ownership (5 agents — apne paths se bahar edit mat karo)

- Agent 1 Scaffold/Shell: `package.json`, `next.config.ts`, `tsconfig.json`,
  `app/layout.tsx`, `app/page.tsx`, `app/dashboard/page.tsx`,
  `app/editor/[projectId]/page.tsx` (shell only), `app/globals.css`,
  `.env.example`, `README.md`, `lib/types.ts` (canonical shared types)
- Agent 2 AI Engine: `lib/ai/*`, `lib/theme.ts`, `lib/templates.ts`,
  `app/api/generate/route.ts`
- Agent 3 Inline Editor: `components/editor/*`, `components/sections/*`,
  `lib/sections.ts`, `app/api/edit/route.ts`
- Agent 4 Export: `lib/export/*`, `app/api/export/route.ts`
- Agent 5 Data/Auth/Billing: `lib/db/*`, `lib/auth.ts`, `lib/billing.ts`,
  `app/api/projects/route.ts`, `app/billing/page.tsx`,
  `components/billing/*`

## Known type mismatch (parent ko fix karwana hai)

`Section` ki teen alag shapes hain: `lib/types.ts` (canonical — optional
fields, padding number, PLAN/db ke mutabiq), `lib/sections.ts` aur
`lib/ai/types.ts` (sab fields required; ai me padding string hai). Agents
2/3/5 ko apni files se `lib/types.ts` ko re-export karna chahiye; is waqt
editor shell ne is liye apna chhota inline renderer likha hai taake kisi
doosre agent ke type par depend na kare.
