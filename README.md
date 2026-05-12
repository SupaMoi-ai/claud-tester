# Stavanger Parking Helper

A mobile-first web app that helps people in Rogaland, Norway find the best legal
parking based on price, free-parking windows, walking distance, enforcement
times, rules, and estimated availability — with **time-aware zone coloring** on
the map and **offline-capable prediction**.

The whole UX is **one screen**: a Rogaland-locked map with a draggable bottom
sheet that holds search, the ranked list, and parking detail. The palette is
**off-white paper + ink** for all UI chrome; the only other colors in the app
are the three zone status colors on the map (green / amber / rose).

## What's in the box

- **Next.js 14 (App Router) + TypeScript + Tailwind**
- **Prisma + PostgreSQL** schema with 7 models exactly matching the product spec
- **MapLibre GL JS** with OSM raster tiles — no Mapbox token required
- **Service worker + IndexedDB snapshot** so the map, list, and prediction work
  offline
- **Bayesian availability blend** (historical pattern + time-decayed user
  reports + event/cruise/traffic uplift) — runs identically on the server and
  in the browser
- **OSM Overpass + Statens vegvesen** ingestion scripts for legal, free,
  bulk Rogaland parking & traffic data
- **Two-color UI**: `#F7F4EC` paper, `#1C1B17` ink — zones are the only color

## Setup

```bash
cp .env.example .env
# edit DATABASE_URL to point at a local Postgres
npm install
npx prisma migrate dev --name init
npm run prisma:seed              # ~12 hand-curated Stavanger locations
npm run import:cruise            # cruise-call events
npm run import:osm               # bulk OSM parking (hundreds of locations)
npm run import:vegvesen          # optional: enrich with Vegvesen Trafikkdata
npm run dev
```

Open `http://localhost:3000` on a phone-sized viewport.

## Single-screen UX

- The whole app is `app/page.tsx` → `<AppShell />`. There are no separate routes
  for list, detail, tips, or admin — everything is in the bottom sheet.
- The sheet has three snap heights: peek (12vh), list (55vh), detail (90vh).
- Tap a parking pin or a card → sheet slides to detail in place. No route
  change, no back button confusion.
- **Long-press the "P" logo** to open the admin slide-over for CSV / JSON
  import.

## Time-aware zone coloring

Every parking location is rendered as a colored circle (or polygon, when
geometry is present) on the map. The fill color is computed from the
`zone-status` module every minute based on the wall clock:

- **`#3A8A4A` green ("Free now")** — currently inside a free window
- **`#C68A1F` amber ("Paid / time limit")** — paid hours, max-stay limited, or
  <30 minutes left in a free window
- **`#B0463C` rose ("Don't park")** — resident-only without permit,
  disabled-only, towing/loading, or estimated 100% occupancy

So at 08:59 a Mon–Sat street paid 08:00–18:00 reads "Paid until 18:00" in amber;
at 18:00 it flips to green with "Free until 08:00 tomorrow" — without a reload.

Each card and the detail panel show a live `FreeUntilCountdown` ("Free until
17:00 · 2h 14m left").

## Offline mode

- On first successful load, `/api/parking?include=patterns` returns each
  location plus a compact `Uint8Array(7*24)` historical pattern blob.
- The client caches the response into IndexedDB via `localforage`.
- The service worker (`public/sw.js`) caches the app shell, the parking API,
  and OSM tiles within the Rogaland viewbox.
- When offline, the list and map use the snapshot, and prediction uses the same
  blend function client-side via `lib/availability-offline.ts`.
- Reports submitted offline are queued and POSTed when the browser fires
  `'online'`.

## Data sources

**Bulk seed (one command):**
- `npm run import:osm` — OSM Overpass `amenity=parking` across the Rogaland
  bounding box. Upsert-by-`(sourceType, sourceId)` so re-running updates rather
  than duplicates.

**Curation (manual + admin drawer):**
- Stavanger kommune parking pages (`https://www.stavanger.kommune.no/...`)
- Operator public listings (Apcoa, EuroPark / Q-Park, OnePark) — manual only;
  always check `robots.txt`
- Stavanger soneparkering map → CSV import for resident zones
- Try the included `samples/parking.csv` via the admin drawer to see imports
  working

**Driving/traffic signal (legal, open Norwegian APIs):**
- Statens vegvesen Trafikkdata API (`https://www.vegvesen.no/trafikkdata/api/`)
  → fed into `lib/availability` as `trafficPressure`
- Statens vegvesen NVDB API → road metadata

**Events:**
- Cruise calendar seeded via `npm run import:cruise` (publicly listed dates)
- ONS, Viking Stadion, SR-Bank Arena, DNB Arena, Stavanger Konserthus — public
  calendars; iCal fetchers documented as TODO interfaces in
  `lib/availability.ts`

**Explicitly NOT used (legality):**
- Google Maps "popular times" / "live busyness" — not available in any public
  Places or Routes API; scraping it violates Google's ToS. Vegvesen Trafikkdata
  is the open, official Norwegian equivalent.

## Project structure

```
app/                  # single-page layout + API routes
  layout.tsx
  page.tsx            # <AppShell />
  offline/page.tsx
  api/parking/        # list, detail, ranking
  api/search/         # Nominatim proxy, Rogaland-bounded
  api/user-reports/   # POST occupancy / corrections
  api/traffic/        # Vegvesen point lookup
  api/admin/import/   # CSV / JSON import (ADMIN_TOKEN)
components/           # AppShell, ParkingMap, BottomSheet, cards, badges…
lib/                  # pure utilities: ranking, availability, zone-status,
                      # free-window, geo, types, offline-cache, traffic
prisma/               # schema + seed
public/data/          # rogaland.geojson (mask boundary)
public/sw.js          # service worker
samples/              # parking.csv
scripts/              # ingestion + import CLIs
```

## Verification checklist

1. `npm install && npx prisma migrate dev --name init && npm run prisma:seed`
2. `npm run import:cruise && npm run dev`
3. Phone viewport: UI is off-white + ink only; zones are green/amber/rose
4. Outside Rogaland is dimmed; pan-out snaps back
5. Search "Stavanger Domkirke" → results bounded to Rogaland
6. Wait until a zone's free-window boundary (or change device clock) → fill
   flips color in place, countdown updates
7. Tap a card → sheet expands to detail (no route change); rules in plain
   language, prices, free-until countdown, source link, verified date,
   disclaimer
8. Toggle "Free now" filter → list re-ranks
9. POST to `/api/user-reports` → `/api/parking` reflects the update on refresh
10. DevTools → Network: Offline → app, map, predictions still work; offline
    badge appears; reports queue and flush on reconnect
11. Long-press "P" logo → admin drawer → upload `samples/parking.csv`
12. `npm run build` succeeds with no type errors

## MVP scope notes

- **Auth is a single `ADMIN_TOKEN` header**, not a real auth system. Replace
  before deploying.
- **PostGIS is not required.** The `geometry` column is declared as
  `Unsupported("geometry")?` for forward compatibility; all distance/sorting
  uses lat/lng + Haversine.
- **Weather uplift** is wired through `lib/availability.ts` but the fetcher is
  a stub returning 0. Drop in a met.no Locationforecast call when ready.
- **Operator live feeds** are interface-only — `OperatorLiveProvider.fetch()`
  always returns `null` in MVP, so the blend never short-circuits to a
  third-party value.
