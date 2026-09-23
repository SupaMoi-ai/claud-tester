# claud-tester

Assorted single-file web apps, each served straight from GitHub Pages, plus one
scheduled scraper.

| What | File | Live |
| --- | --- | --- |
| REDOUBT — bunker & underground exploration map | `redoubt.html` | [/redoubt.html](https://supamoi-ai.github.io/claud-tester/redoubt.html) |
| BRO CODE | `index.html` | [/](https://supamoi-ai.github.io/claud-tester/) |
| Tic-tac-toe | `tictactoe.html` | [/tictactoe.html](https://supamoi-ai.github.io/claud-tester/tictactoe.html) |
| Weekly ukeplan notifier (2B) | `scraper.py` | GitHub Actions |

---

## REDOUBT — bunker & underground exploration map

`redoubt.html` — a field archive of bunkers, tunnels, forts, silos, shelters and
mines. Single file, vanilla JS, no build step.

**Live:** <https://supamoi-ai.github.io/claud-tester/redoubt.html>

### The idea

Satellite imagery hides this stuff. Grass and tree canopy swallow earthworks,
revetments and bunker roofs completely. A shaded elevation layer does not — the
ground shape stays legible through vegetation. So the app opens on satellite and
gives you a **reveal slider** that crossfades into hillshade over the same
camera, plus a light-angle dial, because a rectilinear earthwork disappears when
it is lit along its own axis.

Everything else — the archive, pins, visit logs, clearance tiers, share cards —
hangs off that one move.

### Launch region: Rogaland

The map opens on the Jæren coast at Sola. Rogaland is the launch region for two
reasons: Festung Norwegen left the coast from Randaberg down to Egersund dense
with Atlantic Wall works, and Kartverket publishes national LiDAR to find them
with.

17 of the seeded entries are Rogaland sites — Vigdelfortet, Fjøløy fort, the
Jæren lighthouse batteries at Obrestad and Kvassheim, the anti-tank teeth at
Sele and Hellestø, Sola flystasjon, Rott, Utsira, the Visnes copper mines on
Karmøy, Helleren under its rock overhang in Jøssingfjord. The rest of the
archive (France, Belgium, UK, US, Poland and others) is still there — filter by
country to put it aside.

### What the relief layer can and cannot do

Two kinds of relief source, because a global DEM and a national geoportal are
not the same thing:

| kind | what it is | lighting controls |
| --- | --- | --- |
| `dem` | RGB-encoded elevation tiles (terrarium/mapbox) — MapLibre shades them | light dial, method and 3D all work |
| `raster` | a hillshade someone already rendered, usually WMS | inert — the lighting is baked into the picture |

The working default is **AWS Terrain Tiles** (Terrarium, `dem`): global, free,
no API key. At roughly **30 m** it gets the Jæren moraine ridges, gun positions
cut into hillsides and quarry benches — **not** an individual bunker. That needs
sub-metre LiDAR.

**Kartverket** is the Rogaland route to sub-metre relief, and the app now points
at it rather than guessing a layer:

| Entry | Service |
| --- | --- |
| Rogaland · Kartverket terrengmodell | `https://wms.geonorge.no/skwms1/wms.terrengmodell` (WMS) |
| Norway · Kartverket NHM (ArcGIS) | `https://hoydedata.no/arcgis/rest/services/NHM_DTM_25832/ImageServer` |

Both are pre-rendered, so they are `raster` sources and the light dial goes
inert while one is selected — the app disables those controls and says why
rather than leaving them looking broken.

#### These are unconfirmed, and the earlier guess was wrong twice

An earlier version shipped
`wms.hoyde-dtm-nhm-25833` with a layer called `skyggerelieff`. Both halves were
wrong:

- That service is **"Høyde DTM skyggerelieff sømløs WMS", which Geonorge records
  as withdrawn**, replaced by "Digital terrengmodell WMS".
- **`skyggerelieff` is an ArcGIS raster function**, not a WMS layer name. The URL
  fused a WMS request with an ArcGIS concept and could never have resolved.

Every Norwegian geoportal is blocked from the sandbox this is built in, so none
of it was exercised against a live response. Rather than guess a third time,
those two registry entries are now **pointers at a service, not at a layer**.
Selecting one opens the discovery panel aimed at it, and the layer list comes
from the service's own capabilities.

Worth knowing before you pick: the terrengmodell WMS publishes dataset-coverage
outlines alongside terrain, so not every layer it lists is a hillshade. And
hillshade (*fjellskygge*) is **not** in the `cache.kartverket.no` WMTS at all —
that cache serves `topo`, `topograatone`, `toporaster` and `sjokartraster`, so
there is nothing to hunt for there.

#### Reading a service's layers

**Add a source by URL…** in the relief dock takes a *service base URL* and asks
the service what it holds:

- **WMS** → `GetCapabilities` is parsed for named layers, and the `CRS` list is
  checked for `EPSG:3857`. MapLibre cannot reproject a WMS, so a service without
  it is flagged as won't-line-up.
- **ArcGIS ImageServer** → `?f=json` is read for named raster functions.

Pick a layer and it is fetched for the ground you are looking at before anything
is swapped in. A WMS reports a bad layer as an XML `ServiceException` carrying
HTTP 200, which an image load sees only as "failed" — so the body is read where
CORS permits and the server's own words are shown.

Two honest failure modes: a service that omits CORS headers cannot have its
layer list read from a web page at all (it may still serve tiles perfectly well,
and the panel says so rather than calling it dead), and a layer that returns no
image leaves the current source untouched.

#### Wiring in a confirmed endpoint

A ready-made tile template is used as-is, without a capabilities round trip:

```
XYZ tiles:  https://host/{z}/{x}/{y}.png
WMS:        https://host/wms?...&crs=EPSG:3857&width=256&height=256&bbox={bbox-epsg-3857}
```

Append `#dem` if the endpoint serves terrarium-encoded elevation rather than a
rendered image — that routes it through the hillshade layer so the light dial
works on it.

Once a layer is confirmed, promote it into `RELIEF_SOURCES` as a `raster` or
`dem` entry with a `bbox` of `[west, south, east, north]`, and it is offered
automatically whenever the viewport centre falls inside that box. Entries that
carry `unverified` are probed before being offered and show as `no response`
until they answer; entries of kind `discover` are service pointers and open the
panel instead.

#### Lighting

`Soft (Igor)` is the default — it keeps shallow features out of crushed shadow.
`Multi-directional` lights from several azimuths at once, which is how you catch
an earthwork regardless of which way it runs. Both only apply to `dem` sources.

### Storage, and switching to a real backend

This build is **local-first**: sites, visits, notes, photographs and your
profile live in the browser's IndexedDB. Nothing is uploaded. Clearing site data
for the origin erases it — there is a JSON export under Clearance → Storage.

All data access goes through a single `Store` object. `LocalStore` implements it
over IndexedDB; `SupabaseStore` is a stub with identical signatures.
`redoubt-schema.sql` has the tables, row-level security and storage bucket. To
switch: run the schema, set `BACKEND = 'supabase'`, fill in `SB_URL` / `SB_KEY`,
add the supabase-js CDN tag, and implement the stub. No UI code changes.

**Following other explorers is deliberately not built yet.** With one local
profile it would have nothing to show, and faking it would mean inventing people
and finds. The `Store` interface and the schema carry the relations; the UI
shows it as a locked panel until there is a shared archive behind it.

### Clearance

Three tiers — FIELD, VETERAN, ELITE — earned from logged visits, filed entries,
photographs and ground covered. Sites can carry a `min_clearance`, and below it
they appear as **redacted entries**: category and era visible, title blocked
out, coordinates struck through. Being shown that something is withheld is the
point; hiding the row would just be a shorter list.

Seeded archive references are marked `origin:'seed'` and never count toward
clearance or credit you as the finder.

### The seed archive

51 publicly documented sites — 17 in Rogaland, the rest across Europe and North
America — bundled so the map is never empty and the filters have something real
to act on.

**Coordinates are archival references, not survey data.** They are good to the
site rather than the doorway, and for smaller bunker positions they may be out
by a few hundred metres. The site sheet says so on every seeded entry and
invites correction from the ground; that is the point of the thing.

Seed entries use stable slug ids (`seed-vigdelfortet`), and missing ones are
inserted on load. Adding a region later reaches browsers that were seeded before
it existed, instead of being locked out by a one-shot "already seeded" flag.

### Safety

These are real places and some of them are genuinely dangerous: collapse,
flooding, bad air, unexploded ordnance on WWI and WWII ground, and a lot of
private or restricted land. There is a first-run notice and per-site hazard
stamps. An entry in the archive records that something exists; it is not
permission to enter it.

### Attribution

Imagery © Esri, Maxar, Earthstar Geographics. Elevation from AWS Terrain Tiles
(SRTM / NED and others). Norwegian terrain and topographic data © Kartverket
(CC BY 4.0) where those layers are enabled. Map rendering by MapLibre GL JS (BSD-3-Clause), pinned
to `@5` — note that MapLibre 6 ships ESM-only and has no UMD build, so the
plain `<script src>` global this file relies on does not exist there.

---

## Rosseland 2B – weekly plan (ukeplan) notifier

Automatically fetches the weekly plan for class **2B at Rosseland skole** and
emails it to you. Runs on GitHub Actions every Monday.

## How it works

The plan is published as a Word `.docx` linked from the class section page
(`https://www.minskole.no/rosseland/seksjon/23538`). The file name embeds the
ISO week number (e.g. `...Vekeplan-veke-22-...`) but ends in a per-week random
hash, so the URL changes every week and can't be guessed.

Each run, `scraper.py`:

1. Loads the section page and finds all `Vekeplan` `.docx` links.
2. Picks the link for the **current ISO week** (Europe/Oslo).
3. Downloads and parses that `.docx` (`python-docx`).
4. Emails a formatted summary via Gmail SMTP, flagging items like gym,
   swimming, library and homework.
5. Stores a hash of the plan in `data/state.json`. If the plan changes
   mid-week, the next run sends an updated email; if nothing changed, it stays
   quiet.

> Note: this scraper must run somewhere with internet access to `minskole.no`.
> GitHub Actions runners qualify; the Claude Code web sandbox does **not** (its
> network policy blocks that host), which is why the engine is a workflow.

## Setup

### 1. Add repository secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Required | Value |
| --- | --- | --- |
| `GMAIL_USER` | yes | The Gmail address that sends the mail |
| `GMAIL_APP_PASSWORD` | yes | A Gmail **App Password** (16 chars, no spaces) |
| `RECIPIENT` | optional | Where to send it (defaults to `thomasmoi87@gmail.com`) |
| `MINSKOLE_USER` / `MINSKOLE_PASS` | only if login is required | minskole.no credentials |

**Creating a Gmail App Password:** the Google account needs 2-Step Verification
on. Go to <https://myaccount.google.com/apppasswords>, create a password named
e.g. "ukeplan", and paste the generated 16-character value into
`GMAIL_APP_PASSWORD`.

### 2. Discovery run (confirm the page is reachable / not login-gated)
Repo → **Actions → Weekly school plan (2B) → Run workflow**, tick **dump**.
This saves the section HTML and the chosen `.docx` as downloadable artifacts and
does not send email. Use it to confirm the plan was found and parsed correctly.

### 3. Go live
The Monday schedule (`cron: "0 5 * * 1"`) only fires once this workflow file is
on the repository's **default branch**. Merge the branch, and the weekly email
starts arriving. Manual **Run workflow** works from any branch for testing.

## Test it (no network, no secrets)
A sample week plan is included so you can see exactly what the email looks like:
```bash
pip install -r requirements.txt
python samples/make_sample_ukeplan.py                       # (re)build the sample
python scraper.py --file samples/ukeplan-eksempel.docx      # prints the email
```
You can also point `--file` at any real `.docx` you've downloaded to check how
it parses.

## Running against the live site
```bash
python scraper.py --no-email        # fetch + parse + print, no email
python scraper.py --dump            # also save HTML + docx to debug/
python scraper.py --force           # send email even if unchanged
python scraper.py --week 23         # override the target week
```
(These need internet access to `minskole.no`.)

## Adjusting
- **Send time:** edit the `cron` line in `.github/workflows/weekly-plan.yml`
  (it's UTC).
- **Highlighted keywords:** edit the `HIGHLIGHTS` map in `scraper.py`.
- GitHub disables scheduled workflows after ~60 days of repo inactivity; any
  push re-enables them.
