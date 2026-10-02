/**
 * Reads where a child may stand straight out of the painted background.
 *
 *   node scripts/trace-walkable.mjs --plate public/assets/worlds/brygga/ground.webp
 *
 * The specification authored Brygga's anchors before the art existed, so its
 * coordinates describe a harbour nobody had painted: in the delivered plate the
 * jetty sits around x = 231 LU, not the x = 350 the anchors assume, and a
 * character spawned at the authored point stands in open water.
 *
 * Rather than nudge numbers until a screenshot looks right, this classifies
 * every pixel of the plate as walkable or not and emits the result as scene
 * data. The walkable area then cannot disagree with the picture, which matters
 * more here than in most games: section 3.2 requires that "art contrast and
 * shape must identify interactivity", so if the two drift apart the painting is
 * telling the child one thing and the game another.
 *
 * Classification is by paint, not by guesswork about shapes:
 *   path/sand  very bright warm cream
 *   jetty      mid warm timber, clearly redder than it is green
 *   water      blue, excluded
 *   grass      yellow-green, excluded — its red and green are nearly equal,
 *              which is what separates it from timber
 *   rock       grey-brown, excluded — too little red-to-blue spread for timber
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const CHROMIUM =
  process.env.OPPDAG_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const PLATE = resolve(root, flag('plate', 'public/assets/worlds/brygga/ground.webp'));
/** Pixels per logical unit in the authored art (specification section 2.1). */
const PX_PER_LU = Number(flag('ppu', 2));
/** The navigation grid in section 2.2, and the band height used here. */
const GRID = Number(flag('grid', 12));
/** Narrower than this and it is a painted detail, not a route. */
const MIN_SPAN_LU = Number(flag('min', 20));

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const b64 = readFileSync(PLATE).toString('base64');
const mime = PLATE.endsWith('.webp') ? 'image/webp' : 'image/png';

const result = await page.evaluate(
  async ({ dataUrl, ppu, grid, minSpan }) => {
    const img = new Image();
    await new Promise((r) => {
      img.onload = r;
      img.src = dataUrl;
    });

    const c = document.getElementById('c');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const W = img.width;
    const H = img.height;
    const d = ctx.getImageData(0, 0, W, H).data;

    const walkable = (i) => {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // Bright warm sand and the cream path.
      if (r > 215 && g > 190 && b > 135) return true;
      // Timber: warm, mid-toned, and distinctly redder than green — the test
      // that keeps yellow-green grass out, since grass has r and g nearly equal.
      if (r > 140 && r < 235 && g > 95 && g < 185 && b < 140 && r - g > 32 && r - b > 55) {
        return true;
      }
      return false;
    };

    const mask = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p += 1) if (walkable(p * 4)) mask[p] = 1;

    // Close the plank seams and ink outlines: a dark line drawn across the
    // jetty is still jetty. Bridge horizontal gaps up to 6 px.
    const BRIDGE = 6;
    for (let y = 0; y < H; y += 1) {
      let lastOn = -1;
      for (let x = 0; x < W; x += 1) {
        if (mask[y * W + x]) {
          if (lastOn >= 0 && x - lastOn <= BRIDGE + 1) {
            for (let f = lastOn + 1; f < x; f += 1) mask[y * W + f] = 1;
          }
          lastOn = x;
        }
      }
    }

    const bandPx = grid * ppu;
    const bands = [];
    for (let top = 0; top < H; top += bandPx) {
      const bottom = Math.min(H, top + bandPx);
      // A column counts for the band only if it is walkable through most of it,
      // so a band straddling the shoreline does not inherit the whole beach.
      const need = (bottom - top) * 0.6;
      const colOn = new Uint8Array(W);
      for (let x = 0; x < W; x += 1) {
        let n = 0;
        for (let y = top; y < bottom; y += 1) if (mask[y * W + x]) n += 1;
        if (n >= need) colOn[x] = 1;
      }
      // Widest contiguous run in this band.
      let best = null;
      let start = -1;
      for (let x = 0; x <= W; x += 1) {
        const on = x < W && colOn[x];
        if (on && start === -1) start = x;
        if ((!on || x === W) && start !== -1) {
          const run = { x0: start, x1: x - 1 };
          if (!best || run.x1 - run.x0 > best.x1 - best.x0) best = run;
          start = -1;
        }
      }
      if (!best) continue;
      const widthLu = (best.x1 - best.x0 + 1) / ppu;
      if (widthLu < minSpan) continue;
      bands.push({
        y: top / ppu,
        height: (bottom - top) / ppu,
        x: best.x0 / ppu,
        width: widthLu,
      });
    }

    return { bands, size: { w: W / ppu, h: H / ppu } };
  },
  { dataUrl: `data:${mime};base64,` + b64, ppu: PX_PER_LU, grid: GRID, minSpan: MIN_SPAN_LU },
);

await browser.close();

const { bands, size } = result;

/* Merge vertically adjacent bands whose spans are close, so the output is a
 * handful of readable rectangles rather than seventy. */
const merged = [];
for (const b of bands) {
  const last = merged[merged.length - 1];
  const near =
    last &&
    Math.abs(last.x - b.x) <= 10 &&
    Math.abs(last.x + last.width - (b.x + b.width)) <= 10 &&
    Math.abs(last.y + last.height - b.y) < 0.5;
  if (near) {
    last.height += b.height;
    last.x = Math.min(last.x, b.x);
    last.width = Math.max(last.width, b.width);
  } else {
    merged.push({ ...b });
  }
}

const r1 = (n) => Math.round(n);
console.log(`plate ${size.w} x ${size.h} LU, ${bands.length} bands -> ${merged.length} rects\n`);
console.log('const WALKABLE = [');
for (const m of merged) {
  console.log(
    `  { x: ${r1(m.x)}, y: ${r1(m.y)}, width: ${r1(m.width)}, height: ${r1(m.height)} },`,
  );
}
console.log('];\n');

const mid = (y) => {
  const b = bands.find((n) => y >= n.y && y < n.y + n.height);
  return b ? r1(b.x + b.width / 2) : null;
};
console.log('centre of the walkable span, for anchoring:');
for (const y of [size.h - 30, size.h - 90, size.h - 160, size.h / 2, 300, 200, 120, 60]) {
  console.log(`  y ${r1(y)} -> x ${mid(y)}`);
}
