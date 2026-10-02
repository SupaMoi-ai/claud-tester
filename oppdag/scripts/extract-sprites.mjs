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
import { dirname, join, resolve } from 'node:path';
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
// resolve, not join: an absolute --out must land where it says.
const OUT = resolve(root, flag('out', 'public/assets/characters'));

/**
 * Regions are fractions of the sheet, so they survive a re-export at another
 * resolution. `count` is how many figures sit side by side in that band.
 */
const JOBS = [
  /* -- the production sheets, in the locked cel-animation style ----------- *
   * Bands start below each section's captions, and to the right of the guide
   * labels running down the left margin.
   */
  {
    // The full model study: six aligned views above six expressions, with
    // guide rules and a palette strip. Supersedes the five-panel sheet.
    sheet: '6f682b8d-image.png',
    character: 'ellie',
    band: { top: 0.082, bottom: 0.592, left: 0.06, right: 0.995 },
    count: 6,
    names: ['front', 'back', 'side', 'side-right', 'front34', 'back34'],
    format: 'png',
    stripGuides: true,
  },
  {
    sheet: '6f682b8d-image.png',
    character: 'ellie',
    band: { top: 0.625, bottom: 0.875, left: 0.01, right: 0.995 },
    count: 6,
    names: ['noytral', 'smil', 'nysgjerrig', 'tenkende', 'overrasket', 'fornoyd'],
    prefix: 'face-',
    format: 'png',
    stripGuides: true,
  },
  {
    // The full study. Six STANDING views, which is what the companion walks
    // on; the earlier sheet was seated throughout and could only ever rest.
    sheet: '7bce743b-image.png',
    character: 'kiki',
    band: { top: 0.105, bottom: 0.41, left: 0.05, right: 0.995 },
    count: 6,
    names: ['front', 'back', 'side', 'side-right', 'front34', 'back34'],
    format: 'png',
    stripGuides: true,
  },
  {
    // The pose row. Stops short of the scale-comparison panel on the right,
    // which is a diagram rather than artwork.
    sheet: '7bce743b-image.png',
    character: 'kiki',
    band: { top: 0.46, bottom: 0.79, left: 0.015, right: 0.76 },
    count: 4,
    names: ['rest', 'sleeping', 'tilt', 'tail-up'],
    prefix: 'pose-',
    format: 'png',
    stripGuides: true,
  },
];

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas><canvas id="o"></canvas>');

const written = [];

for (const job of JOBS) {
  const b64 = readFileSync(join(SHEETS, job.sheet)).toString('base64');
  const cuts = await page.evaluate(
    async ({ dataUrl, band, count, format, stripGuides }) => {
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
      const by0 = Math.round(band.top * H);
      const by1 = Math.round(band.bottom * H);
      const bx0 = Math.round((band.left ?? 0) * W);
      const bx1 = Math.round((band.right ?? 1) * W);

      // Seed from the band's own perimeter as well as the image's. A sheet
      // drawn inside a rounded border frame never lets its cream reach the
      // image edge, so seeding only from the edge leaves the entire page
      // opaque and every figure merges into one blob. The band edges sit in
      // clear background inside each panel, so they always reach it.
      const seedAt = Math.min(W * H - 1, Math.max(0, by0 * W + bx0 + 2));
      const seed = [d[seedAt * 4], d[seedAt * 4 + 1], d[seedAt * 4 + 2]];
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
      for (let x = bx0; x < bx1; x += 1) {
        stack.push(x + by0 * W, x + (by1 - 1) * W);
      }
      for (let y = by0; y < by1; y += 1) {
        stack.push(bx0 + y * W, bx1 - 1 + y * W);
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

      /* ---- 1b. erase the sheet's alignment guides ----------------------- *
       * A model sheet rules horizontal guides across the page — crown, chin,
       * hip, knee, ground. They pass behind the figures, so they never mark a
       * character, but they do cross the empty space beside one, and trimmed
       * to a bounding box that leaves a grey stub poking out of both
       * shoulders: invisible in a count, obvious in the game.
       *
       * Two properties together identify one, and both are needed.
       *
       * THIN. A guide is one to four pixels tall. Real drawing, even at a thin
       * edge, belongs to a taller mass of ink directly above or below it.
       * Coverage is useless here: a guide row is a row of figures PLUS the
       * guide filling the gaps, so it reads as nearly full, and erasing on
       * that basis cuts a band straight through every drawing.
       *
       * LONG AND LEVEL. Thinness alone would also erase a cat's whiskers,
       * which are thin everywhere. A whisker is a short diagonal, so at any
       * single row it spans a handful of pixels; a guide runs level across a
       * whole gap. Requiring an unbroken horizontal run keeps the whiskers.
       */
      if (stripGuides) {
        const MAX_GUIDE_PX = 4;
        const bandW = bx1 - bx0;

        // How tall the ink is through each pixel, column by column.
        const thin = new Uint8Array(W * H);
        for (let x = bx0; x < bx1; x += 1) {
          let runStart = -1;
          for (let y = by0; y <= by1; y += 1) {
            const on = y < by1 && d[(y * W + x) * 4 + 3] > 24;
            if (on && runStart === -1) runStart = y;
            if ((!on || y === by1) && runStart !== -1) {
              const runEnd = on ? y : y - 1;
              if (runEnd - runStart + 1 <= MAX_GUIDE_PX) {
                for (let f = runStart; f <= runEnd; f += 1) thin[f * W + x] = 1;
              }
              runStart = -1;
            }
          }
        }

        // A guide is thin ink that reaches across the page. Measuring the
        // row's extent rather than its longest unbroken run is what catches
        // the fragments either side of a figure: the rule is interrupted by
        // every body it passes behind, so no single piece of it is long, but
        // the first and last piece are still half a page apart. Whiskers are
        // thin too and survive, because they stay bunched around one muzzle —
        // wide extent AND substantial total ink is a combination only a ruled
        // line produces.
        for (let y = by0; y < by1; y += 1) {
          let first = -1;
          let last = -1;
          let count = 0;
          for (let x = bx0; x < bx1; x += 1) {
            if (!thin[y * W + x]) continue;
            if (first === -1) first = x;
            last = x;
            count += 1;
          }
          if (first === -1) continue;
          if (last - first < bandW * 0.5 || count < bandW * 0.25) continue;
          for (let x = bx0; x < bx1; x += 1) {
            if (thin[y * W + x]) d[(y * W + x) * 4 + 3] = 0;
          }
        }
        ctx.putImageData(image, 0, 0);
      }

      /* ---- 2. find the figures in the band by ink density ---------------- */
      const y0 = by0;
      const y1 = by1;
      const x0 = bx0;
      const x1 = bx1;
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

        /* ---- 3a. strip panel rules caught by the bounding box ------------ *
         * A model sheet draws a baseline under each figure. It is a solid row
         * spanning the full cell with a transparent gap above it, so the box
         * stretches down to the rule and the sprite's bottom edge stops being
         * the character's feet. Anchored at (0.5, 1) that floats her above the
         * ground by the height of the gap — small, consistent, and invisible
         * in any test that is not a screenshot. Measured on these sheets:
         * three rules under Ellie, six under Kiki.
         */
        const rowSpan = (y) => {
          let n = 0;
          for (let x = minX; x <= maxX; x += 1) {
            if (d[(y * W + x) * 4 + 3] > 24) n += 1;
          }
          return n;
        };
        const full = (maxX - minX + 1) * 0.95;
        for (let guard = 0; guard < 64; guard += 1) {
          const before = maxY;
          while (maxY > minY && rowSpan(maxY) >= full) maxY -= 1;
          while (maxY > minY && rowSpan(maxY) === 0) maxY -= 1;
          if (maxY === before) break;
        }
        for (let guard = 0; guard < 64; guard += 1) {
          const before = minY;
          while (minY < maxY && rowSpan(minY) >= full) minY += 1;
          while (minY < maxY && rowSpan(minY) === 0) minY += 1;
          if (minY === before) break;
        }
        if (maxY <= minY) continue;

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
          dataUrl:
            format === 'png'
              ? out.toDataURL('image/png')
              : out.toDataURL('image/webp', 0.92),
          width: sw,
          height: sh,
        });
      }
      return results;
    },
    {
      dataUrl: 'data:image/png;base64,' + b64,
      band: job.band,
      count: job.count,
      format: job.format ?? 'webp',
      stripGuides: job.stripGuides ?? false,
    },
  );

  const dir = join(OUT, job.character);
  mkdirSync(dir, { recursive: true });

  cuts.forEach((cut, i) => {
    const name = (job.prefix ?? '') + (job.names[i] ?? `part-${i}`);
    const ext = job.format ?? 'webp';
    const file = join(dir, `${name}.${ext}`);
    const bytes = Buffer.from(cut.dataUrl.split(',')[1], 'base64');
    writeFileSync(file, bytes);
    written.push({
      file: `${job.character}/${name}.${ext}`,
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
