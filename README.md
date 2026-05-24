# FARÉ

The vintage operator's brain. Past, present, future — one piece at a time.

This branch (`claude/fare-phase-1-piece-os-o6Jbc`) holds **Sprint 1 — Foundation**: a Next.js PWA scaffold with the FARÉ design system, the `Piece` schema, and local IndexedDB persistence. No backend, no auth, no intake form yet — those land in later sprints per the master plan.

## Run it

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. You should see:

- FARÉ wordmark rendered in Cormorant Garamond
- Six palette swatches (ink, cream, ochre, sage, cognac, gold)
- Three typography specimens (Cormorant display, EB Garamond body, Barlow Condensed label)
- An "Insert sample piece" button that writes a Versace SS92 silk shirt to IndexedDB and renders it. Reload to confirm persistence.

## Verify

```bash
pnpm tsc --noEmit   # zero errors
pnpm build          # production build succeeds
pnpm lint           # zero errors
```

In the browser: DevTools → Application → IndexedDB → `FareDB` → `pieces` shows the inserted row. DevTools → Application → Manifest shows `name: FARÉ — Vintage Operator OS`. Lighthouse → PWA reports the app as installable.

## What's here

```
src/
├── app/
│   ├── layout.tsx         Loads 3 Google Fonts, mounts service worker registrar
│   ├── page.tsx           Proof-of-vibe landing (client component)
│   ├── manifest.ts        PWA manifest (cream/ink colors, SVG icons)
│   ├── sw-register.tsx    Registers /sw.js in production
│   └── globals.css        Tailwind v4 + @theme palette + font tokens
└── lib/
    ├── types/piece.ts     Section 3 schema: Piece, Comp, ListingChannel, Photo + unions
    ├── design/tokens.ts   Palette + font constants (mirror of Tailwind tokens)
    └── db/
        ├── dexie.ts       FareDB Dexie instance (single `pieces` table for now)
        ├── pieces.ts      CRUD: createPiece, getPiece, listPieces, updatePiece, deletePiece, clearAllPieces
        └── sample.ts      Hardcoded Versace SS92 sample for the smoke test
public/
├── sw.js                  Install-only service worker (no caching yet)
└── icons/                 SVG app icons (placeholders until a real wordmark lands)
```

## What's intentionally NOT here

- Intake form & photo capture → Sprint 2
- Authentication checklist & per-brand templates → Sprint 3
- Comp entry + valuation rule engine → Sprint 4
- Listing tracking + sold archive → Sprints 5–6
- Reference Library port → Sprints 7–10
- Trend Oracle → Sprint 11+
- Supabase backend, real auth, multi-device sync → reopens at Sprint 2/3
- Tests → land with intake forms in Sprint 2

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript strict
- Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config.ts`)
- Dexie 4 (IndexedDB)
- pnpm

## Design tokens

| Token  | Hex       | Role                          |
|--------|-----------|-------------------------------|
| ink    | `#0f0d0b` | Text + UI chrome              |
| cream  | `#f4f0e8` | Page background               |
| ochre  | `#8a6840` | Warm accent                   |
| sage   | `#5a7858` | Verification / positive state |
| cognac | `#6a4a3a` | Secondary accent              |
| gold   | `#c8a050` | Premium / hype marker         |

| Tailwind class | Family             | Role                         |
|----------------|--------------------|------------------------------|
| `font-display` | Cormorant Garamond | Editorial display            |
| `font-body`    | EB Garamond        | Body prose                   |
| `font-label`   | Barlow Condensed   | Small-caps UI labels         |

## Deviation from the plan

The plan called for separate Dexie tables for `comps`, `listingChannels`, and `photos`. The Section 3 schema embeds those as arrays on `Piece`, which is how Sprint 1 stores them — single `pieces` table, nested arrays. If Sprint 2 needs to index across comps or photos directly, we'll normalize then.
