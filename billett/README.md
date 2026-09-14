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
| Inspection | Full-screen pass with a large mark that blinks once a second in the same green as the *Valid* banner, plus a per-second seal strip — a screenshot of it is visibly frozen |
| Buy | Ticket type → travellers → zones → confirm → payment → an activated ticket |
| City Bike | Docking stations with availability that drifts like a live feed |
| More | Profile, payment methods, travel history, language, appearance, notifications |

Fares use real Norwegian transport arithmetic: an adult single in one zone is
kr 49.00, of which 12 % VAT is kr 5.25.

The **control code** (`C8`, `T9`, …) is derived from the clock and rolls over on
the hour, so every phone running the app shows the same code at the same time.

The inspection blink is driven off the same clock rather than a local timer:
green for the first ~0.56 s of every second, clear for the rest. Two phones held
side by side blink together, and a photograph of the screen is caught either
mid-blink or blank.

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
