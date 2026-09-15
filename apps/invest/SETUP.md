# Setup

Getting from this repository to the app running on your phone. About 15 minutes,
all of it on free tiers.

You need no market-data or AI keys to start. The app is built to run correctly
without them — it shows "no data" where a source is missing rather than
inventing a number — and Phase 1 works entirely on prices you enter yourself.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Region: **EU North (Stockholm)** — closest to you, and keeps the data in the EU.
3. Save the database password somewhere safe; you need it in step 3.

### Apply the schema

In the Supabase dashboard → **SQL Editor** → **New query**, paste and run each
file from `supabase/migrations/` **in filename order**:

```
0001_core.sql
0002_ledger.sql
0003_marketdata.sql
0004_research.sql
0005_imports_ai.sql
0006_rls.sql
```

Run them one at a time and check each succeeds before the next. `0006_rls.sql`
is the one that makes your data private; don't skip it.

> These migrations are executed on every CI run against Postgres compiled to
> WASM (`tests/db/schema.test.ts`), so they are known to apply cleanly — but
> that runs them in order, and so should you.

### Lock down sign-ups

**Authentication → Sign In / Providers**:

- Enable **Email**.
- Turn **"Allow new users to sign up"** OFF *after* you create your own account
  in step 5.
- Turn **Anonymous sign-ins** OFF.

Row-level security protects rows; it does not stop a stranger creating an
account on your instance. Both matter.

---

## 2. Collect your keys

**Project Settings → API**

| Value | Goes to |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` / secret key | `SUPABASE_SECRET_KEY` — server only, never in a browser |

**Project Settings → Database → Connection string → Transaction pooler**

Copy it into `DATABASE_URL` and replace `[YOUR-PASSWORD]` with the password from
step 1. Append `?sslmode=require`.

> Why a direct Postgres connection rather than the Supabase client: PostgREST
> serialises `numeric` as a JSON number, which is a float64, which silently
> destroys the precision of an 18-decimal crypto quantity. `postgres.js` returns
> `numeric` as a string. `supabase-js` is still used for auth and Storage — just
> never for money.

---

## 3. Run it locally

```bash
cd apps/invest
cp .env.example .env.local     # fill in the four Supabase values
npm install
npm run dev
```

Open <http://localhost:3000>.

Before committing anything, run the full gate:

```bash
npm run verify    # biome + tsc + vitest (with coverage) + next build
```

---

## 4. Deploy to Vercel

1. [vercel.com](https://vercel.com) → **Add New → Project** → import
   `SupaMoi-ai/claud-tester`.
2. **Root Directory: `apps/invest`** ← this is the setting people miss.
3. Framework preset: Next.js. Node 22.
4. Add every variable from `.env.local` under **Settings → Environment Variables**.
5. **Settings → Git → Ignored Build Step**, set to:
   ```
   git diff --quiet HEAD^ HEAD -- .
   ```
   so pushes that only touch `scraper.py` don't burn a deployment.

Pushing the feature branch gives you a preview URL. That is the one to open on
your phone first.

### Add it to your home screen

Safari → Share → **Add to Home Screen**. It then runs full-screen with no
browser chrome, and updates instantly whenever you deploy — no App Store.

---

## 5. Create your account and seed your holdings

1. Open the deployed app, sign in with your email (magic link).
2. Go back to Supabase and turn **"Allow new users to sign up"** off.
3. Run `supabase/seed.sql` in the SQL Editor to load your four real positions.

The seed records what is actually known and flags what isn't:

| Holding | Quantity | Cost basis |
|---|---|---|
| BTC (Firi) | 0.01022079 | **UNKNOWN** — no purchase history on record |
| XRP (Firi) | 60.950208 | **UNKNOWN** |
| NOK cash (Firi) | 0.01 | known |
| OTOVO (Nordnet) | 8 | **ESTIMATED** — derived, needs your confirmation |

The Otovo row is entered as 80 pre-split shares at 14.406 NOK, which the app's
corporate-action engine restates to 8 shares at 144.06 NOK using the real
10-for-1 reverse split of 2026-02-03. That cost is *derived* from the −92.26%
Nordnet displayed, not something you told it — so confirm or correct it in the
app before trusting any return figure.

---

## 6. Later: scheduled price updates

Once market-data providers are wired in (Phase 2), add these repository secrets
under **Settings → Secrets and variables → Actions**:

- `INVEST_APP_URL` — your Vercel production URL
- `INVEST_CRON_SECRET` — must match `CRON_SECRET` in Vercel

The EOD workflow runs on GitHub Actions rather than Vercel Cron: Vercel's hobby
tier fires "somewhere within the hour", which is useless when the job needs to
run *after* the Oslo close. A daily hit also keeps the free Supabase project
from auto-pausing after 7 idle days.

---

## Troubleshooting

**"DATABASE_URL is not configured"** — expected until step 2 is done. The app
fails loudly at startup rather than returning a wrong number later.

**Invalid environment configuration** — `src/lib/env.ts` validates everything at
module load, so a missing variable fails the build instead of producing a 500
at 23:15 on a Tuesday. The message names the variable.

**Migration fails on `auth.users`** — you're running against something other
than Supabase. The schema depends on Supabase's `auth` schema.

**Numbers look subtly wrong** — check you're reading through `postgres.js` and
not `supabase-js`. See the note in step 2.
