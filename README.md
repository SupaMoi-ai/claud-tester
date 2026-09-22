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

### What the relief layer can and cannot do

The default source is **AWS Terrain Tiles** (Terrarium encoding): global, free,
no API key. It is roughly **30 m** ground sample. That is enough to pick out
fort ramparts, ditches, Maginot surface works, spoil heaps and quarry terraces
under tree cover.

**It will not resolve an individual bunker.** That needs 0.5–1 m LiDAR DTM,
which only exists region by region. The app says so in the relief dock rather
than letting you assume otherwise.

Lighting is tunable because it matters: `Soft (Igor)` is the default (it keeps
shallow features out of crushed shadow), and `Multi-directional` lights from
several azimuths at once, which is the standard way to catch an earthwork
regardless of which way it runs.

### Adding a regional LiDAR source

Relief sources live in a registry near the top of the script:

```js
const RELIEF_SOURCES = [
  { id:'terrarium', name:'Global · Terrarium 30 m', tiles:[...], encoding:'terrarium',
    tileSize:256, maxzoom:15, bbox:null, attribution:'...', note:'...' }
];
```

Add an entry with a `bbox` of `[west, south, east, north]` and it is offered
automatically whenever the viewport centre falls inside that box. A commented
template for the Netherlands (AHN) is in the file. Two things to get right:

- `encoding` must match the source (`terrarium` or `mapbox`) or the hillshade
  comes out as noise.
- Validate the endpoint **from a browser**. Several national geoportals are
  unreachable from CI sandboxes and from some corporate networks, so a failure
  there tells you nothing about whether it works for users.

If a tile source does go down, the dock shows a layer-status line naming it
rather than leaving you staring at an empty map.

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

34 publicly documented sites across 12 countries, bundled so the map is never
empty and the filters have something real to act on. Coordinates are archival
references — good to the site, not to the doorway, and not survey-grade. The
site sheet says so and invites correction from the ground.

### Safety

These are real places and some of them are genuinely dangerous: collapse,
flooding, bad air, unexploded ordnance on WWI and WWII ground, and a lot of
private or restricted land. There is a first-run notice and per-site hazard
stamps. An entry in the archive records that something exists; it is not
permission to enter it.

### Attribution

Imagery © Esri, Maxar, Earthstar Geographics. Elevation from AWS Terrain Tiles
(SRTM / NED and others). Map rendering by MapLibre GL JS (BSD-3-Clause), pinned
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
