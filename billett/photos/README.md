# Photos for the inspection screen

Drop real photographs in this folder as `.jpg`, then list their filenames in
`PHOTOS` near the top of the photo section in `app.js`:

```js
const PHOTOS = ["bird.jpg", "fjord.jpg", "coast.jpg"];
```

Currently in the list: `bird.jpg`, and that is the only photograph the app
uses. One photograph shows without shifting; the cycle only starts if a
second is added.

The first name in the list is the one an inspector sees first.

- The app shifts to the next photo every 15 seconds (`SHIFT_MS`) with a
  900 ms cross-fade (`FADE_MS`), and washes them green on its own cycle.
- The shift is driven by the clock, so two phones show the same photograph
  at the same moment.
- Roughly square works best — the panel is 1 : 1.04 and crops to fill.
- Around 900 px on the long edge is plenty; keep each file under ~300 KB so
  the whole app still caches for offline use.
- With the list empty the panel falls back to a flat grey ground, so a
  missing file cannot break the screen.
