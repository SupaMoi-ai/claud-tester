# invest — engineering rules

Private, single-user investment intelligence app. Norwegian investor, NOK base currency.

These rules exist because this is financial software. Breaking one produces a number that is
confidently wrong, which is worse than no number at all.

## The four hard rules

1. **`src/domain/` is pure.** It imports `decimal.js` and its own files. Nothing else — no
   `next/*`, no database, no `fetch`, no environment access. Prices and FX arrive as `PriceBook` /
   `FxBook` arguments. This is what makes the math testable and the project maintainable.

2. **Never fabricate a number.** A missing price is `{ status: 'MISSING', reason }`, never `0`,
   never `null`, never the last known value silently. Every externally-sourced value carries
   `source` + `asOf` + `staleness` *inside* the value, not beside it.

3. **No floating point in money.** `Decimal` in TypeScript, `numeric` in Postgres. Numbers cross
   the wire as **strings** — PostgREST serialises `numeric` to a JSON float and loses precision,
   which is why server reads go through `postgres.js` and `supabase-js` is used only for auth,
   session and storage.

4. **The LLM never produces a number.** It receives numbers and writes sentences. Detectors written
   in code decide *whether* something is an issue; the model only explains findings code already
   made, and `numericGuard` verifies every figure in its prose traces back to real data.

## Caching

Next's cache is the top source of "why is my portfolio value stale". Every route under
`src/app/(app)/` is dynamic. **`use cache` is banned** anywhere that reads financial data. Caching is
for the static shell and instrument metadata only.

## Database access

- `withUser(jwt)` — sets `request.jwt.claims` and `role authenticated`, so RLS applies. All user traffic.
- `adminDb()` — bypasses RLS. **Only** in `src/app/api/cron/**`, and only for `prices` / `fx_rates` /
  `quotes`. Enforced by lint.

The ledger is append-only and enforced by a trigger that raises. Corrections are new `CORRECTION`
rows pointing at `reverses_transaction_id` — never an `UPDATE`.

## Money and formatting

- Quantity `numeric(38,18)`, price `numeric(28,12)`, money `numeric(28,10)`, FX `numeric(20,10)`.
- Display is `nb-NO`: `8 378 kr`, comma decimals, non-breaking thousands separators.
- Parsing broker input uses `parseNbNumber()` — never `parseFloat`. Nordnet emits narrow no-break
  spaces, comma decimals, `kr` suffixes and Unicode minus (U+2212).
- Lead with NOK amounts; percentages are secondary. On an 89 kr position, "+0.90%" is 80 øre.

## Before every commit

`npm run verify` — Biome, `tsc --noEmit`, Vitest (100% line coverage gate on `src/domain/`), and
`next build`. All four clean. Never leave the repo broken.

## Environment constraints when working in the Claude Code sandbox

- No Docker, so no local Supabase. Migrations are executed for real against `@electric-sql/pglite`
  (Postgres in WASM) in `tests/`.
- The egress proxy blocks `api.firi.com` and `data.norges-bank.no`. Provider code is tested against
  recorded fixtures here; live verification happens on a Vercel preview deployment. Do not claim a
  provider works until it has run somewhere with network access.

## Repo neighbours — do not disturb

This app lives in `apps/invest/` inside a shared sandbox repo.

- `/index.html` is BRO CODE, served live by GitHub Pages. Do not touch.
- `/scraper.py` + `.github/workflows/weekly-plan.yml` are a working Monday cron. Do not touch.
  That workflow has no `push:` trigger, so nothing here can invoke it.
- `/.nojekyll` must exist: Pages runs Jekyll over the whole repo and it fails on `{{` / `{%` in
  TS/TSX files, which would break the live page.
