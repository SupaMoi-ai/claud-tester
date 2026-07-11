# Hjemmet

**"Ta et skjermbilde. Få en familieplan."** — a Norwegian family logistics app
for shared-custody (delt bosted) families. React Native + Expo Router,
Supabase (Postgres/Auth/Realtime/Storage), and a Claude-powered capture flow
that turns a screenshot or pasted message into concrete, home-routed actions.

This app lives at the repo root alongside the unrelated `scraper.py` project
(a separate weekly school-plan emailer) — the two are independent, nothing
here touches the scraper's files.

## What's built

All 10 build-order steps from the original spec, plus the `/kalender` screen
and basic navigation between screens (neither of which had an explicit build
step assigned):

1. Expo Router app, strict TypeScript, design tokens/typography (Lora + Sora),
   navigation shell.
2. Supabase schema (`supabase/migrations/0001_init_schema.sql`), RLS policies
   (`0002_rls_policies.sql`), a private `captures` storage bucket for
   screenshots (`0003_storage_bucket.sql`), and a seed script/fixtures for the
   demo family (Thomas, Sisilie, Ellie, Eliyah).
3. `resolveHome`/`nextHandover` — the custody resolver, the app's core "moat"
   logic — with a full test matrix, and the Kommandosentralen (command
   center) screen.
4. Kid mode (`/barn/[id]`) with a custody-aware chore checklist and the
   reward unlock (Skjermtid / Lek ute).
5. The `/fang` capture flow (screenshot picker, paste-text, source chips,
   staged Norwegian processing states) and the `/fang/[id]/gjennomgang`
   review screen.
6. `supabase/functions/analyze-capture` — a real Deno Edge Function that
   calls the Anthropic Messages API (vision-capable), grounding
   `home_suggestion` in the actual bytteplan via the same tested
   `resolveHome` logic used everywhere else in the app.
7. Reisesekken auto-populate (`lib/reisesekken/deriveBagItems.ts`): due dates
   default to the next handover, `travels_to` is inferred from a related
   event's home.
8. Local push-notification scheduling (night-before-handover reisesekken
   reminder, per-event reminders, Vipps due-date morning reminder) plus push
   token registration.
9. Money items / Vipps 50-50 splits (`lib/money/splitAmount.ts`), with a
   "Penger" widget on the command center to mark each parent's half paid.
10. `/innstillinger`: members, the 14-day custody pattern editor (with a live
    preview reusing `resolveHome` so the editor and the runtime resolver can
    never drift), overrides ("byttehelg"), and recurring bag-item templates.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values, see below
```

### Environment variables (`.env`)

| Variable | Used by | Notes |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | client app, seed script | not secret |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | client app | not secret, RLS-protected |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | push notification registration | needed for a real push token |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase/seed/seed.ts` only | never ships in the app bundle |
| `ANTHROPIC_API_KEY` | Edge Function only | set via `supabase secrets set`, **not** in `.env` for deployment |

## Verified in this build (no live credentials needed)

- `npm run typecheck` — clean across the whole app.
- `npm run lint` — clean.
- `npm test` — 67 Jest tests, all pure logic: the full `resolveHome` matrix
  (overrides, handover-time boundary, pattern cycling, generic pattern
  length), `nextHandover`, timezone math (`osloTime.ts`, CET/CEST-safe),
  `choresForToday`, `deriveBagItems`, `splitAmount`, notification-scheduling
  math, and render smoke tests for the presentational components.
- SQL migrations (`0001`-`0004`) were applied to a **real local Postgres 16**
  instance (not just syntax-reviewed) with a minimal `auth`/`storage` schema
  stub standing in for Supabase's platform schemas. RLS was exercised for
  real: cross-family read/write isolation, child-only self-writes on
  `chore_completions`/`reward_claims`, parent-only writes on `chores`, and the
  `bag_items` "children may only toggle `packed`" trigger — all confirmed
  working and cross-family-blocked as designed. Same for the storage bucket's
  family-scoped upload policy.
- The Edge Function (`supabase/functions/analyze-capture`) was verified with
  the **real Deno CLI** (`npx deno check`, `npx deno lint`,
  `npx deno test`), including its `npm:zod` / `npm:@supabase/supabase-js`
  imports resolving through `deno.json`'s import map — 9 passing tests for
  prompt construction and response parsing/validation.

## Blocked on live credentials (written correctly, not exercised)

- Applying the migrations to your actual Supabase project: `supabase db push`
  (after `supabase link`).
- `npm run seed` — inserts the demo family; needs `EXPO_PUBLIC_SUPABASE_URL`
  and `SUPABASE_SERVICE_ROLE_KEY`.
- Deploying the Edge Function: `supabase functions deploy analyze-capture`,
  then `supabase secrets set ANTHROPIC_API_KEY=...`.
- Any real Anthropic completion (the client calls
  `supabase.functions.invoke("analyze-capture", ...)` — it will fail with a
  clear Norwegian error message until the function above is deployed and
  secreted).
- Real push token registration/delivery — needs `EXPO_PUBLIC_EAS_PROJECT_ID`
  and a physical device or dev build (Expo Go dropped remote push support).
- Any on-device/simulator visual check — this sandbox has neither.

## Known simplifications

- Local notification scheduling has no dedup/persistence of notification ids
  yet, so re-fetching the same handover/event data re-schedules it — fine for
  this build, called out rather than silently glossed over.
- The custody pattern editor's anchor date and handover time are plain text
  inputs (`ÅÅÅÅ-MM-DD` / `TT:MM`) rather than native date/time pickers, to
  avoid adding a new native dependency that can't be exercised without a
  device in this sandbox.
- No login/auth screen was built — the spec's screen list doesn't include
  one; the app assumes a Supabase Auth session already exists and resolves
  the current family via `members.user_id = auth.uid()`.

## Commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm test             # jest
npm run seed          # seed the demo family (needs real Supabase creds)
npm start             # expo start
```

Edge Function (from `supabase/functions/analyze-capture`, needs Deno or the
Supabase CLI):

```bash
npx deno check *.ts
npx deno test --allow-read *.test.ts
```
