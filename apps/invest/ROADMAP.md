# Roadmap

Living document. Updated as phases land.

---

## Done

### Phase 0 — Foundation

Next.js 16 · TypeScript strict · Tailwind 4 · Supabase · Biome · Vitest.

- Pure calculation core in `src/domain/` — imports `decimal.js` and nothing else.
- `Lookup<T>` discriminated union makes "missing price treated as zero" a **type error**.
- Postgres schema with append-only ledger, corporate actions, RLS on every table.
- Migrations executed against pglite (Postgres in WASM) in CI, since Docker is unavailable.
- `withUser` / `adminDb` split, with the boundary enforced by lint.
- Norwegian number parsing and formatting, with a test table of real broker formats.

### Phase 1 — The usable app

- Magic-link auth, middleware-gated routes, RLS as the independent second line.
- Four tabs: Portefølje · Innsikt · Analyse · Journal.
- Portfolio home: total NOK, unrealised return, ≤3 ranked findings, allocation, holdings.
- Deterministic detectors — code decides what is a finding and writes the sentence.
- Holding detail with cost-basis confidence, price provenance, and a versioned thesis.
- Structured thesis invalidation conditions, so "has my case changed?" is checkable.
- Transaction entry, corrections through the append-only ledger, manual price entry.
- Journal with `DECIDED_NOT_TO_BUY` as a first-class kind. Watchlist.
- Every read query executed against the real schema in tests.

---

## Next

### Phase 2 — Live market data

Dependency: none. **Norges Bank (FX) and Firi (crypto) need no API key**, and together
they price ~99% of the current portfolio — so this can go live before any signup.

1. `MarketDataProvider` interface + registry routing by `(kind, mic)`.
2. Norges Bank SDMX for FX. Handle `UNIT_MULT` — SEK and DKK are quoted **per 100 units**,
   and hardcoding 1:1 misvalues Swedish and Danish holdings by 100×.
3. Firi public ticker for BTC/XRP in NOK; CoinGecko as fallback.
4. Yahoo (unofficial, expected to break) then EODHD for OTOVO.OL.
5. EOD cron via GitHub Actions → `/api/cron/eod`. Not Vercel Cron: its hobby tier fires
   "somewhere within the hour", which is useless when the job must run *after* Oslo close.
6. Daily `portfolio_snapshots`, which unlock:
   - **daily change** (labelled by which "today" — crypto is 24/7, Oslo Børs is not)
   - the value chart
   - time-weighted return
7. CSV import (Nordnet + Firi exports). No AI dependency, so it can land here.

### Phase 3 — Intelligence and scenarios

Dependency: price history from Phase 2.

- Correlation and beta estimated from actual returns, **gated on n ≥ 60** — a correlation
  from twelve points is noise wearing a suit.
- Scenario engine: asset shock, asset-class shock, FX shock, cash deployment. Returns
  `assumptions[]` and `unmodelled[]` so an unpropagated shock is never mistaken for a full one.
- Exposure overlap as a weighted set intersection across dimensions.
- XIRR (money-weighted, the headline) and TWR (for benchmark comparison).
- **A benchmark.** "How am I doing?" is unanswerable in isolation.

### Phase 4 — AI

Dependency: an Anthropic API key.

- Deterministic `PortfolioContext` builder with a `limits[]` field stating what the data
  cannot support — that is how the model learns what it must not claim.
- Read-only tools; `draft_journal_entry` and `propose_transaction` write to staging only.
  The model's maximum authority is a row a human approves.
- Structured research output with per-claim `FACT | ESTIMATE | INTERPRETATION` tagging.
- `numericGuard`: every figure in generated prose must trace to tool output or context.
- Detector narration — the LLM writes the sentence for findings code already made.

### Phase 5 — Imports

- Screenshot extraction → confidence scoring → `import_candidates` → Confirm/Edit/Ignore.
- Three deterministic confidence signals independent of the model's self-report:
  reconciliation (`qty × price ≈ value`), Norwegian number parsing in code, and a match
  ladder (ISIN → ticker+MIC → ticker → name similarity).
- Quantity reconciliation for crypto drift from staking and fees.

### Phase 6 — Polish

Discover, "what changed since I last checked", dark mode, PWA icons and offline shell.

---

## Deliberately not building

- **Tax calculations.** Account wrappers are modelled because they change how a return
  should be read; the app makes no tax claims.
- A "hot stocks" feed. Discover only means something relative to what you already own.
- Realtime streaming prices, multi-user, native apps.
- Materialised tax lots before they are needed — the schema is ready, the code derives.

## Known constraints

- This build sandbox blocks `api.firi.com` and `data.norges-bank.no`, and has no Docker.
  Provider code is therefore tested against recorded fixtures here; live verification
  happens on a Vercel preview.
- Yahoo Finance is unofficial and will break without notice. The provider abstraction is
  the mitigation; a paid key is the real fix when the portfolio justifies it.
