# OPPDAG — *et helt univers å lære i*

A Norwegian learning world for children roughly 6–10 years old.

> The child thinks they are exploring and playing.
> The learning system knows what they are practising.

There is no subject menu, no XP counter and no streak. The reward for learning
is that the child's own island visibly grows: they work out how far is left to
walk, and a bridge appears over the river.

**Play it locally right now** — the build in `spill/` is committed, so it needs
no toolchain:

```bash
# from the repo root; the /claud-tester/ prefix matches the Pages base path
mkdir -p /tmp/oppdag/claud-tester && cp -r spill /tmp/oppdag/claud-tester/
cd /tmp/oppdag && python3 -m http.server 8099
# → http://localhost:8099/claud-tester/spill/
```

Once this branch is merged into the default branch **and** GitHub Pages is
enabled for the repository, the same build is served at
`https://supamoi-ai.github.io/claud-tester/spill/`. Pages serves the default
branch, so the URL will 404 until then — and this sandbox cannot reach
`github.io` to confirm Pages is switched on, so treat that link as "once
merged", not as live.

---

## Running it

```bash
cd oppdag
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck, then build into `../spill/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Learning-model, graph, adventure and safety tests (22) |
| `npm run qa` | Drives the whole flow in Chromium and screenshots every screen |

`npm run qa` writes to `/tmp/claude-0/oppdag-qa` by default
(`--out DIR --width 1024 --height 768 --label tablet`). It plays the entire
product — onboarding, the starting activity, all six adventure stages including
real canvas strokes and the 3-second parent gate — so the build can be looked at
rather than assumed to work.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 (CSS-first `@theme` tokens) ·
Framer Motion. Static SPA on `HashRouter`, so it works from a GitHub Pages
sub-path with no server rewrites. Fonts are self-hosted (`@fontsource-variable`),
so the build has no runtime third-party requests at all.

Designed **iPad first**, then phone, then desktop. Every touch target is at
least 64px (`--tap`).

## How it is put together

```
oppdag/src/
  styles/      tokens.css ← every colour, radius, shadow and timing
  i18n/        nb.ts      ← every string of interface copy
  learning/    the model: mastery, adaptive difficulty, graph queries
  data/        concepts, interests, discoveries, adventures/
  state/       reducer + versioned localStorage
  design/      buttons, cards, canvas, backdrops
  characters/  Lumi, Bolt, Birk, Otto — parameterised SVG
  world/       the island, its places and the rules that grow it
  adventure/   the stage engine and the six stage types
  parent/      insight generation for the dashboard
  screens/     the 16 routes
  safety/      the child-safety choke point
```

### The learning model

`Concept` is a node in a prerequisite graph — 32 seeded (12 matematikk,
9 norsk, 11 naturfag), 26 of them building on something earlier. `ChildMastery` tracks confidence 0–1 per concept, and
`masteryEngine.ts` folds each answer in: a clean first-try answer is worth far
more than one pulled out with a guided solution, harder variants count for more,
and confidence decays slowly if a concept is never revisited.

Confidence maps to `new / exploring / developing / secure`. **Those four words
never reach a child's screen.** A parent sees `● Kan godt / ◐ Holder på å lære /
○ Kommer senere`.

Support is a ladder the child *pulls*, never something pushed at them:

```
TRY → HINT → VISUAL HINT → GUIDED SOLUTION
```

The answer is never auto-revealed after N failures, and the last rung explains
the reasoning rather than just stating the number.

### The world grows from knowledge

`world/worldLayout.ts` holds the growth rules, and they are the whole product
metaphor in one file — nothing unlocks on a timer, a streak or a purchase:

```ts
{ id: 'bro',          test: (s) => knows(s, 'subtraksjon-under-20') }
{ id: 'nordlystaarn', test: (s) => completed(s, 'isbjornen') }
```

Scenery asks for `developing` rather than `exploring` on purpose: one lucky
answer should not build a bridge.

### The adventure

`data/adventures/isbjornen.ts` is *Isbjørnen som gikk seg vill* — a complete
six-stage adventure on Svalbard, written as plain data:

1. **Kart** — 4 km away, 1 km walked (subtraction, three difficulty variants)
2. **Natur** — are polar bear hairs actually white? (a guess with no wrong answer)
3. **Lesing** — find the key fact in a note from a researcher
4. **Geografi** — find Svalbard on a simplified map
5. **Tegning** — draw somewhere warm for the cub to rest (real canvas)
6. **Refleksjon** — say out loud what you learned

Note that the maths never announces itself. The child is not "doing
subtraction"; they are working out how much further they have to walk in a
snowstorm.

Adding an adventure means writing one data file and registering it in
`data/adventures/index.ts` — the engine needs no changes.

## Localisation

No component contains a literal string. `i18n/nb.ts` holds all interface copy
and `Copy` is derived from it, so a future `nn.ts` or `en.ts` that misses a key
fails to compile rather than rendering a blank. Adventures are written works
rather than chrome, so each one is its own file and localises as
`isbjornen.nn.ts`.

## Child safety

This is a children's product, and it is built accordingly:

- no advertisements, no purchases, no accounts
- no public profiles, no chat, no child-to-stranger anything
- no external links reachable from a child screen
- no infinite feed, no streak punishment, no gambling-style rewards
- settings, data and reset live behind a parent gate (hold for 3 seconds)
- **all data stays in this browser.** No network calls at runtime whatsoever.

`safety/childSafety.ts` is the single choke point that any future AI or
third-party text must pass through before reaching a child-facing component.
Nothing today strictly needs it — there is no generated text — but the seam
exists so the first AI feature does not have to invent it under pressure.

## Deploying

`npm run build` writes the production build to `../spill/`, which is committed
so GitHub Pages can serve it with no build step and without touching the
existing `index.html` at the repo root.

## What is deliberately not here

The other six places on the island are visible and teased but not yet written —
the brief asked for one adventure that is genuinely good rather than six that
are half-built. Also out of scope for this prototype: a real speech-to-text
backend (the reflection stage falls back to a clearly-labelled mock transcript),
AI-generated dialogue, accounts and sync, and LK20 mapping beyond the data
structure that will carry it.
