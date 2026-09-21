/**
 * Cuts individual sprites out of the delivered character sheets.
 *
 *   node scripts/extract-sprites.mjs --sheets DIR [--out public/assets/characters]
 *
 * The sheets are contact sheets — several views laid out on one cream page
 * with labels and panel borders — so two problems have to be solved.
 *
 * 1. REMOVING THE PAGE, NOT THE CHARACTER.
 *    Ellie's sweatshirt is almost exactly the same cream as the paper. A
 *    global chroma key would punch holes straight through her clothes. So the
 *    background is removed by flood-filling inward from the border: only cream
 *    that is *connected to the edge* is erased, and cream enclosed by linework
 *    survives.
 *
 * 2. FINDING THE CELLS WITHOUT HARD-CODING PIXELS.
 *    Coordinates typed in by eye rot the moment a sheet is re-exported at a
 *    different size. Instead each job names a region and how many figures to
 *    expect; the script finds them from the ink profile and trims each to its
 *    own bounding box.
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CHROMIUM =
  process.env.OPPDAG_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const SHEETS = flag(
  'sheets',
  '/root/.claude/uploads/13a94ff5-1804-5bb1-95b9-77a941697020',
);
const OUT = join(root, flag('out', 'public/assets/characters'));

/**
 * Regions are fractions of the sheet, so they survive a re-export at another
 * resolution. `count` is how many figures sit side by side in that band.
 */
const JOBS = [
  {
    sheet: 'b41304bd-image.png',
    character: 'ellie',
    // Below the title block (which otherwise merges into the BACK figure)
    // and above the FRONT/SIDE/BACK captions.
    band: { top: 0.085, bottom: 0.5, left: 0.03, right: 0.99 },
    count: 4,
    names: ['front', 'front34', 'side', 'back'],
  },
  {
    sheet: '8863585a-image.png',
    character: 'ellie',
    band: { top: 0.135, bottom: 0.345 },
    count: 6,
    names: ['noytral', 'glad', 'ler', 'nysgjerrig', 'overrasket', 'bekymret'],
    prefix: 'face-',
  },
  {
    sheet: '8863585a-image.png',
    character: 'ellie',
    band: { top: 0.42, bottom: 0.612 },
    count: 6,
    names: ['lei-seg', 'bestemt', 'irritert', 'entusiastisk', 'trott', 'tenkende'],
    prefix: 'face-',
  },
  {
    sheet: 'a0aedfdb-image.png',
    character: 'kiki',
    // Excludes the FARGEPALETT swatches on the right.
    band: { top: 0.075, bottom: 0.41, left: 0.17, right: 0.78 },
    count: 4,
    names: ['front', 'front34', 'side', 'back'],
  },
  {
    sheet: 'a0aedfdb-image.png',
    character: 'kiki',
    // Just the POSER panel — not POTER OG BEN left or STØRRELSE right.
    band: { top: 0.775, bottom: 0.915, left: 0.34, right: 0.72 },
    count: 3,
    names: ['sittende', 'gaaende', 'hale-opp'],
    prefix: 'pose-',
  },
];

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas><canvas id="o"></canvas>');

const written = [];

for (const job of JOBS) {
  const b64 = readFileSync(join(SHEETS, job.sheet)).toString('base64');
  const cuts = await page.evaluate(
    async ({ dataUrl, band, count }) => {
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
      const image = ctx.getImageData(0, 0, W, H);
      const d = image.data;

      /* ---- 1. erase only background connected to the border -------------- */
      const seed = [d[0], d[1], d[2]];
      const TOL = 26;
      const near = (i) =>
        Math.abs(d[i] - seed[0]) < TOL &&
        Math.abs(d[i + 1] - seed[1]) < TOL &&
        Math.abs(d[i + 2] - seed[2]) < TOL;

      const seen = new Uint8Array(W * H);
      const stack = [];
      for (let x = 0; x < W; x += 1) {
        stack.push(x, x + (H - 1) * W);
      }
      for (let y = 0; y < H; y += 1) {
        stack.push(y * W, W - 1 + y * W);
      }
      while (stack.length) {
        const p = stack.pop();
        if (seen[p]) continue;
        const i = p * 4;
        if (!near(i)) continue;
        seen[p] = 1;
        d[i + 3] = 0;
        const x = p % W;
        const y = (p - x) / W;
        if (x > 0) stack.push(p - 1);
        if (x < W - 1) stack.push(p + 1);
        if (y > 0) stack.push(p - W);
        if (y < H - 1) stack.push(p + W);
      }
      ctx.putImageData(image, 0, 0);

      /* ---- 2. find the figures in the band by ink density ---------------- */
      const y0 = Math.round(band.top * H);
      const y1 = Math.round(band.bottom * H);
      const x0 = Math.round((band.left ?? 0) * W);
      const x1 = Math.round((band.right ?? 1) * W);
      const colInk = new Float32Array(W);
      for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
          if (d[(y * W + x) * 4 + 3] > 24) colInk[x] += 1;
        }
      }
      const peak = Math.max(...colInk);
      const onThreshold = Math.max(2, peak * 0.06);

      const runs = [];
      let start = -1;
      for (let x = x0; x < x1; x += 1) {
        const on = colInk[x] > onThreshold;
        if (on && start === -1) start = x;
        if ((!on || x === x1 - 1) && start !== -1) {
          const end = on ? x : x - 1;
          if (end - start > W * 0.015) runs.push([start, end]);
          start = -1;
        }
      }

      // Merge the narrowest neighbours until the expected count remains —
      // a figure split by a gap (an arm away from the body) rejoins here.
      while (runs.length > count) {
        let bestGap = Infinity;
        let at = 0;
        for (let i = 0; i < runs.length - 1; i += 1) {
          const gap = runs[i + 1][0] - runs[i][1];
          if (gap < bestGap) {
            bestGap = gap;
            at = i;
          }
        }
        runs[at] = [runs[at][0], runs[at + 1][1]];
        runs.splice(at + 1, 1);
      }

      /* ---- 3. trim each to its own bounding box and export --------------- */
      const out = document.getElementById('o');
      const octx = out.getContext('2d', { willReadFrequently: true });
      const results = [];

      for (const [rx0, rx1] of runs) {
        let minX = rx1;
        let maxX = rx0;
        let minY = y1;
        let maxY = y0;
        for (let y = y0; y < y1; y += 1) {
          for (let x = rx0; x <= rx1; x += 1) {
            if (d[(y * W + x) * 4 + 3] > 24) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        if (maxX <= minX || maxY <= minY) continue;

        const pad = 4;
        const sx = Math.max(0, minX - pad);
        const sy = Math.max(0, minY - pad);
        const sw = Math.min(W - sx, maxX - minX + pad * 2);
        const sh = Math.min(H - sy, maxY - minY + pad * 2);

        out.width = sw;
        out.height = sh;
        octx.clearRect(0, 0, sw, sh);
        octx.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
        // WebP with alpha: roughly a quarter the bytes of PNG for painted
        // art with soft edges, which matters on a tablet over mobile data.
        results.push({
          dataUrl: out.toDataURL('image/webp', 0.92),
          width: sw,
          height: sh,
        });
      }
      return results;
    },
    { dataUrl: 'data:image/png;base64,' + b64, band: job.band, count: job.count },
  );

  const dir = join(OUT, job.character);
  mkdirSync(dir, { recursive: true });

  cuts.forEach((cut, i) => {
    const name = (job.prefix ?? '') + (job.names[i] ?? `part-${i}`);
    const file = join(dir, `${name}.webp`);
    const bytes = Buffer.from(cut.dataUrl.split(',')[1], 'base64');
    writeFileSync(file, bytes);
    written.push({
      file: `${job.character}/${name}.webp`,
      w: cut.width,
      h: cut.height,
      kb: Math.round(bytes.length / 1024),
    });
  });

  if (cuts.length !== job.count) {
    console.warn(
      `  ! ${job.sheet} ${job.character}: expected ${job.count} figures, found ${cuts.length}`,
    );
  }
}

await browser.close();

for (const w of written)
  console.log(
    `  ${String(w.w).padStart(4)}×${String(w.h).padEnd(4)} ${String(w.kb).padStart(4)} kB  ${w.file}`,
  );
console.log(`  total ${Math.round(written.reduce((a, w) => a + w.kb, 0))} kB`);
console.log(`\n${written.length} sprites → ${OUT}`);
process.exit(0);
