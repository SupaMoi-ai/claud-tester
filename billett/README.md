# Vestbillett — a transit ticket app for the school play

A working mobile ticketing app, built as a **stage prop**. It behaves like the
real thing — live countdown, rotating control code, an animated inspection
screen, a purchase flow that ends in a ticket — but the operator, `Vestbillett`,
is fictional, and its tickets are not valid on any real service.

**Live:** https://supamoi-ai.github.io/claud-tester/billett/

## Putting it on a phone

Open the link in Safari (iOS) or Chrome (Android) → Share → **Add to Home
Screen**. It then launches full-screen with its own icon, no browser chrome,
and works with no signal — everything runs on the device and the service worker
caches the whole app. Tickets are stored on the phone and survive a restart.

On a desktop browser the same page renders inside a phone frame, which is handy
for rehearsing cues on a laptop.

## What's in it

| Screen | What it does |
| --- | --- |
| Tickets | Active and expired tickets, each counting down live |
| Ticket detail | Green *Valid* banner, clock, control code, min/sec counter, fare breakdown, receipt |
| Inspection | Full-screen pass: a scannable QR code carrying the ticket, and a photograph that washes green and back on a ~3.3 s cycle — a screenshot is caught at one point in a wash it can't reproduce |
| Buy | Ticket type → travellers → zones → confirm → payment → an activated ticket |
| City Bike | Docking stations with availability that drifts like a live feed |
| More | Profile, payment methods, travel history, language, appearance, notifications |

Fares use real Norwegian transport arithmetic: an adult single in one zone is
kr 49.00, of which 12 % VAT is kr 5.25.

The **control code** (`C8`, `T9`, …) is derived from the clock and rolls over on
the hour, so every phone running the app shows the same code at the same time.

The inspection screen's green wash runs off the same clock rather than a local
timer — in over ~1.1 s, a short hold, out over ~1.2 s, then a rest — so two
phones held side by side pulse together.

The QR code is real, not decoration: `qr.js` is a byte-mode encoder (error
correction level M, versions 1-10, verified against a reference decoder) and the
code scans off the screen to a string like

```
VB1|1064750170|2026-09-14T13:34|DE|1 Adult|Nord-Jaeren
```

It is rebuilt every minute, so the timestamp inside it is always current.

The photo panel shows real photographs that **shift** — each one holds for 15
seconds, cross-fades into the next over 900 ms, and the green wash runs over the
top. The shift is clock-driven, so two phones show the same photograph at the
same moment.

Put the photographs in `billett/photos/` and list them in `PHOTOS` in `app.js`;
the first in the list is the one an inspector sees first. See
`billett/photos/README.md`. Until that folder has photographs in it, the app
paints its own landscape so nothing breaks.

The set currently holds one photograph, `bird.jpg`. Add a second and the panel
starts shifting between them.

Language switches between English and Norwegian in More → Language.

## Stage controls

Backstage cueing, hidden from the audience: **More → About → tap the version
number five times**. It unlocks a panel that can

- shift the app's clock by any number of minutes, so a scene plays at 14:23
- freeze the countdown for a long scene
- hand the actor a fresh ticket with an exact number of minutes left
- expire the active ticket on cue
- reset everything before the next performance

Nothing from this panel appears on the ticket screens.

## Files

```
index.html     page shell + service worker registration
artifact.html  same app, published as a Claude artifact
app.css        design tokens and all component styles
app.js         state, screens, navigation, realtime tick
sw.js          offline cache
manifest.json  installable-app metadata
```

No build step and no dependencies — edit and reload.
