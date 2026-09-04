# TRACK 5

A live map and community signal network for the **L5 (Jærbanen)** line between
Stavanger and Egersund.

Track 5 is a transport app first. It shows you the next train and whether it is
late, and it keeps doing that whether or not you care about anything else in
here. Layered on top is a community: people report ticket-inspection activity
they can actually see, other people confirm or reject it, and a report only
becomes trustworthy when more than one person says so.

It runs as static files. No build step, no bundler, no npm install, no
framework — open `index.html` and it works.

```
https://supamoi-ai.github.io/claud-tester/track5/
```

---

## Running it

```sh
cd track5
python3 -m http.server 8099
# then open http://127.0.0.1:8099/
```

A plain file:// open will not work: the app uses ES modules, which browsers
refuse to load from the filesystem.

**On first run it starts in LOCAL MODE.** Everything works — report, confirm,
watch a signal reach CONFIRMED, earn XP, watch it expire — but the community is
this browser and nobody else can see any of it. The top bar says `LOCAL` and
PROFILE explains it. Two seeded signals exist so the map has something to show.

## Connecting the real backend

1. Create a project at [supabase.com](https://supabase.com).
2. Run `supabase/schema.sql` in the project's SQL editor.
3. Enable anonymous sign-ins: **Authentication → Providers → Anonymous sign-ins**.
4. Paste the project URL and the **anon/public** key into `js/data/config.js`.

Do not paste the `service_role` key. It ships to every visitor in a static file
and would let anyone rewrite the whole database.

## Getting real train times

`js/transport/stations.js` ships with approximate coordinates and no NSR
StopPlace IDs, because the environment this was built in could not reach
`api.entur.io`. Without those IDs the app cannot request a real departure board
and falls back to a synthetic timetable.

Open **`tools/resolve-stations.html`** in a normal browser. It looks all 19
stations up through Entur's geocoder, shows what came back and how far each
result moved from the estimate, and prints a paste-ready replacement for the
`STATIONS` array.

That page is also the CORS check. If every row fails with a network error,
Entur is not reachable from where you are serving this — which the app already
survives, by design.

[Entur's Journey Planner](https://developer.entur.org/pages-journeyplanner-journeyplanner-v3/)
is free and needs no API key. It asks only that consumers identify themselves
with an `ET-Client-Name` header, which `js/data/config.js` sets.

---

## Tests

```sh
node tools/test.mjs      # 165 assertions, no browser or network needed
```

Everything under `js/domain/` is pure — no DOM, no fetch, no database — so the
rules the product actually depends on are testable in isolation: the confidence
state machine, expiry, the two-signal flood limit, and the requirement that
accuracy out-earns volume.

The database has its own suite in `supabase/test/`, which runs against a real
PostgreSQL instance and attacks the security model rather than trusting it. See
that directory's README — it lists the refusals a clean run should produce.

---

## How it is put together

```
index.html            shell — top bar, four tabs, mount points
css/                  tokens, base, components, map
js/
  core/               state, dom, router, bus, time
  domain/             PURE — signals, xp, geo, journeys, handles
  transport/          provider interface, entur, mock, stations
  map/                imperative SVG map — geometry, layers, sprites
  data/               backend selector, supabase, local, config
  ui/                 sheet, components, avatar, screens/
supabase/             schema.sql and its tests
tools/                test.mjs, resolve-stations.html
```

A few decisions worth knowing before changing things:

**The map is imperative.** It is patched in place and never rebuilt from a
render pass, because rebuilding throws away the pan and scroll position the
user just set with their thumb. Only panels re-render.

**There are two map views over one data set.** STRIP is a vertical chain spaced
by running time and is the default; GEO is the real corridor, aspect preserved,
framed on a neighbourhood. GEO cannot be the default because 19 stations across
58 km on a phone puts markers about 30px apart with colliding labels.

**Screens never talk to a backend directly.** They call `js/data/backend.js`,
which resolves to Supabase or the local store. Both expose the same verb-shaped
operations — `createReport`, `voteReport` — rather than table access, which is
what lets the Supabase side route every write through a database function.

**Colour is information.** Three accents, one meaning each: delay, adverse
certainty, on time. Everything else is monochrome. That single rule is most of
what keeps the interface reading as a terminal instead of a mobile game.

**Two typefaces, on purpose.** Silkscreen carries the identity on chrome and
labels; JetBrains Mono carries departure times and chat. A bitmap face at body
size fails the "large readable information" requirement, and usability wins.

---

## Things this does not solve

**Anonymous accounts are cheap.** Sign-in has no wall, which is the right call
for a commuter app nobody wants to register for — but it means one person can
make several accounts. The defences that exist are real (no self-voting, one
vote per person per report, the two-signal cap, the cooldown, rate limits, and
reputation that has to be earned) and none of them fix that.

**The server cannot verify where anyone is.** GPS is self-reported. Proximity
therefore only ever raises a vote's weight, never lowers it, and the
full-weight-plus path depends on saved journeys, which the server can see.

**Public chat has no human moderation path.** Rate limiting and message hiding
exist in the schema. That is not the same as someone being on the other end,
and it should not be opened to a real audience without one.

**iOS notifications are unreliable.** Web push needs Add to Home Screen on
iOS 16.4+. Better to be honest about that than to promise departure alerts that
silently never arrive.

**The subject matter is fare-evasion-adjacent.** Sharing what is publicly
visible from a platform is lawful and the app performs no evasion itself, but
how this is framed and positioned is a deliberate choice, and worth making on
purpose rather than by default.
