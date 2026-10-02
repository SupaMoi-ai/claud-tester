/**
 * Turns delivered art sheets into game assets.
 *
 *   node scripts/ingest-art.mjs --in DIR [--out public/assets] [--dry]
 *
 * The art arrives as flat PNG sheets from an image model: one painted
 * background plate, and several sheets of props laid out on a saturated
 * magenta field. This cuts the sheets into individually named, alpha-trimmed
 * files the scene config can name directly.
 *
 * Three problems, each of which quietly ruins a sprite if ignored.
 *
 * 1. MAGENTA SURVIVES THE OBVIOUS KEY.
 *    A plain "delete pixels near #FF00FF" leaves a bright fringe on every
 *    antialiased edge, because edge pixels are a *blend* of magenta and paint.
 *    At gameplay scale that fringe reads as a pink halo around everything. So
 *    the background is flood-filled from the border (never a global key, which
 *    would punch through any legitimately pink paint), and then only pixels
 *    bordering the erased region get despilled and feathered.
 *
 * 2. A GRID IS NOT A ROW.
 *    The character sheets were one row of figures; prop sheets are a grid.
 *    Rows are found first from the horizontal ink profile, then cells within
 *    each row — so uneven spacing and a tall prop beside a short one survive.
 *
 * 3. MISCOUNTING IS WORSE THAN FAILING.
 *    If a sheet yields eight props where nine were expected, every file after
 *    the gap is silently given the wrong name, and the wrong artwork appears
 *    in the wrong place in the game. Counts are therefore asserted per sheet
 *    and a mismatch is a hard failure that writes nothing.
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const has = (name) => process.argv.includes(`--${name}`);

// resolve, not join: an absolute --out must land where it says, not be
// appended to the repo root.
const IN = resolve(root, flag('in', 'art-in'));
const OUT = resolve(root, flag('out', 'public/assets'));
const DRY = has('dry');

/**
 * What each delivered sheet contains.
 *
 * `rows` × `cols` is the expected layout; `names` is in reading order, left to
 * right then top to bottom. `dir` is relative to the assets root.
 *
 * Kept as data so a re-delivered sheet with a different arrangement is a
 * one-line edit rather than a rewrite.
 */
const SHEETS = [
  {
    file: 'brygga-background.png',
    kind: 'plate',
    dir: 'worlds/brygga',
    name: 'ground',
  },
  {
    file: 'brygga-props.png',
    kind: 'grid',
    rows: 3,
    cols: 3,
    dir: 'worlds/brygga/props',
    names: [
      'boathouse', 'post', 'basket-empty',
      'basket-full', 'shells', 'cup',
      'twigs', 'birch', 'boat',
    ],
  },
  {
    file: 'kiki-views.png',
    kind: 'grid',
    rows: 1,
    cols: 4,
    dir: 'characters/kiki',
    names: ['front', 'back', 'side', 'front34'],
  },
  {
    file: 'milla-views.png',
    kind: 'grid',
    rows: 1,
    cols: 3,
    dir: 'characters/milla',
    names: ['front', 'talk', 'clear'],
  },
  {
    file: 'ui-icons.png',
    kind: 'grid',
    rows: 1,
    cols: 6,
    dir: 'ui',
    names: ['journal', 'pause', 'shell-empty', 'shell-full', 'speech', 'home'],
  },
  // Milla's talking heads. Section 5.6 puts an 80 LU portrait at the left of
  // every dialogue tray, and the world poses are far too small to crop one
  // from — a 30 LU gull enlarged to 80 is a blur.
  {
    file: 'milla-portraits.png',
    kind: 'grid',
    rows: 1,
    cols: 3,
    dir: 'characters/milla',
    names: ['portrait-calm', 'portrait-talk', 'portrait-pleased'],
  },
  // The chapter's keepsakes, drawn as pictures rather than as cards: the game
  // draws the card, so the art must not bring its own border.
  {
    file: 'journal-cards.png',
    kind: 'grid',
    rows: 1,
    cols: 2,
    dir: 'worlds/brygga/journal',
    names: ['milla', 'skjell'],
  },
  // The near layer. Drawn in front of everything, including the characters.
  {
    file: 'brygga-fore.png',
    kind: 'grid',
    rows: 1,
    cols: 2,
    dir: 'worlds/brygga/fore',
    names: ['birch-branch', 'grass-stone'],
  },
];

/* -------------------------------------------------------------------------- */

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas><canvas id="o"></canvas>');

const written = [];
const problems = [];

for (const sheet of SHEETS) {
  const src = join(IN, sheet.file);
  if (!existsSync(src)) {
    console.log(`  – ${sheet.file} not delivered yet, skipping`);
    continue;
  }

  const b64 = readFileSync(src).toString('base64');
  const result = await page.evaluate(
    async ({ dataUrl, spec }) => {
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

      /* A painted plate keeps its background; it *is* the background. */
      if (spec.kind === 'plate') {
        const out = document.getElementById('o');
        out.width = W;
        out.height = H;
        const octx = out.getContext('2d');
        octx.drawImage(c, 0, 0);
        return {
          cells: [{ dataUrl: out.toDataURL('image/webp', 0.9), width: W, height: H }],
          rows: 1,
        };
      }

      /* ---- 1. key out the magenta ---------------------------------------- *
       * Globally, not by flood fill from the border. An earlier version only
       * erased key that was reachable from the edge, on the theory that this
       * protects paint which happens to be pink. It does — and it also keeps
       * every scrap of background trapped inside the artwork: the gaps between
       * a bundle of twigs, the holes in a basket's weave, the sky through a
       * birch canopy, the space between a gull's legs. Those came out as solid
       * magenta blobs, on seven of the first twelve real cut-outs, while a
       * fixture of plain filled circles passed perfectly.
       *
       * The protection was never needed here. Magenta-ness — how far red and
       * blue sit above green — is 1.0 for the key and at most about 0.13 for
       * anything in this palette, including terracotta and the nose pink.
       * A global cut at 0.45 sits in the middle of that gulf.
       */
      const magenta = (i) => {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        return ((r + b) / 2 - g) / 255;
      };

      const keyed = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p += 1) {
        if (magenta(p * 4) >= 0.45) {
          keyed[p] = 1;
          d[p * 4 + 3] = 0;
        }
      }

      /* ---- 2. despill and feather the rim -------------------------------- */
      // Edge pixels are a blend of paint and key. Touching anything further in
      // would desaturate legitimate pink paint, so the treatment is confined
      // to pixels within two of a keyed one — which now includes the inside
      // edges of every hole, not just the outer silhouette.
      const rim = new Uint8Array(W * H);
      for (let y = 0; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const p = y * W + x;
          if (keyed[p] || d[p * 4 + 3] === 0) continue;
          let near = false;
          for (let dy = -2; dy <= 2 && !near; dy += 1) {
            for (let dx = -2; dx <= 2; dx += 1) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
              if (keyed[ny * W + nx]) { near = true; break; }
            }
          }
          if (near) rim[p] = 1;
        }
      }
      let despilled = 0;
      for (let p = 0; p < W * H; p += 1) {
        if (!rim[p]) continue;
        const i = p * 4;
        const m = magenta(i);
        if (m <= 0.1) continue;
        despilled += 1;
        // Pull red and blue back down toward green, which is what the paint
        // under the blend actually was.
        const g = d[i + 1];
        d[i] = Math.min(d[i], g + 30);
        d[i + 2] = Math.min(d[i + 2], g + 30);
        // The more key was in the blend, the less of this pixel is real.
        d[i + 3] = Math.round(d[i + 3] * Math.max(0, 1 - m * 1.6));
      }

      /* ---- 2b. flecks of key *inside* the paint --------------------------- *
       * The rim pass only reaches two pixels in from an erased region, which
       * is right for an antialiased edge and useless against a pink strand the
       * model painted among the grass blades: those pixels are fully opaque,
       * nowhere near a keyed one, and survive untouched. Thirty of them came
       * through the near layer at full alpha.
       *
       * The threshold is what makes this safe. Measured across every sheet
       * delivered so far, real paint reaches 0.165 magenta-ness at its very
       * pinkest — terracotta, the gull's beak shadow, Kiki's nose. A cut at
       * 0.25 sits above all of it and below anything that is really key.
       */
      let flecks = 0;
      for (let p = 0; p < W * H; p += 1) {
        const i = p * 4;
        if (d[i + 3] <= 24) continue;
        if (magenta(i) < 0.25) continue;
        flecks += 1;
        const g = d[i + 1];
        d[i] = Math.min(d[i], g + 20);
        d[i + 2] = Math.min(d[i + 2], g + 20);
      }
      ctx.putImageData(image, 0, 0);

      /* ---- 3. find rows, then cells within each row ---------------------- */
      const opaque = (x, y) => d[(y * W + x) * 4 + 3] > 24;

      const runsOf = (profile, from, to, minRun) => {
        const peak = Math.max(...profile.slice(from, to));
        if (peak <= 0) return [];
        const on = Math.max(1, peak * 0.04);
        const runs = [];
        let start = -1;
        for (let i = from; i < to; i += 1) {
          const lit = profile[i] > on;
          if (lit && start === -1) start = i;
          if ((!lit || i === to - 1) && start !== -1) {
            const end = lit ? i : i - 1;
            if (end - start >= minRun) runs.push([start, end]);
            start = -1;
          }
        }
        return runs;
      };

      // Merge the closest neighbours until the expected count remains. A prop
      // split by an internal gap (a mooring post's rope away from the post)
      // rejoins; genuinely missing props cannot be invented, and the count
      // check below catches that.
      const mergeTo = (runs, want) => {
        while (runs.length > want) {
          let best = Infinity;
          let at = 0;
          for (let i = 0; i < runs.length - 1; i += 1) {
            const gap = runs[i + 1][0] - runs[i][1];
            if (gap < best) { best = gap; at = i; }
          }
          runs[at] = [runs[at][0], runs[at + 1][1]];
          runs.splice(at + 1, 1);
        }
        return runs;
      };

      const rowInk = new Float32Array(H);
      for (let y = 0; y < H; y += 1) {
        let n = 0;
        for (let x = 0; x < W; x += 1) if (opaque(x, y)) n += 1;
        rowInk[y] = n;
      }
      let rowRuns = runsOf(rowInk, 0, H, Math.round(H * 0.02));
      const foundRows = rowRuns.length;
      rowRuns = mergeTo(rowRuns, spec.rows);

      const cells = [];
      const out = document.getElementById('o');
      const octx = out.getContext('2d', { willReadFrequently: true });
      let foundCells = 0;

      for (const [ry0, ry1] of rowRuns) {
        const colInk = new Float32Array(W);
        for (let x = 0; x < W; x += 1) {
          let n = 0;
          for (let y = ry0; y <= ry1; y += 1) if (opaque(x, y)) n += 1;
          colInk[x] = n;
        }
        let colRuns = runsOf(colInk, 0, W, Math.round(W * 0.012));
        foundCells += colRuns.length;
        colRuns = mergeTo(colRuns, spec.cols);

        for (const [cx0, cx1] of colRuns) {
          /* Drop contamination from the neighbouring cell. A band's edge can
           * clip the top of whatever is drawn below it, and that scrap then
           * rides along inside this cell's bounding box — a few pixels of
           * birch canopy sitting under the shells. Anything under a hundredth
           * of the cell's own ink is not part of the subject: the three
           * separate shells and every individual twig are each far larger
           * than that, so nothing real is at risk. */
          const seen = new Uint8Array((cx1 - cx0 + 1) * (ry1 - ry0 + 1));
          const cw = cx1 - cx0 + 1;
          const at = (x, y) => (y - ry0) * cw + (x - cx0);
          const groups = [];
          let totalInk = 0;
          for (let y = ry0; y <= ry1; y += 1) {
            for (let x = cx0; x <= cx1; x += 1) {
              if (!opaque(x, y) || seen[at(x, y)]) continue;
              const cells = [];
              const stack = [[x, y]];
              seen[at(x, y)] = 1;
              while (stack.length) {
                const [px, py] = stack.pop();
                cells.push([px, py]);
                for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                  const nx = px + dx;
                  const ny = py + dy;
                  if (nx < cx0 || nx > cx1 || ny < ry0 || ny > ry1) continue;
                  if (seen[at(nx, ny)] || !opaque(nx, ny)) continue;
                  seen[at(nx, ny)] = 1;
                  stack.push([nx, ny]);
                }
              }
              totalInk += cells.length;
              groups.push(cells);
            }
          }
          for (const g of groups) {
            if (g.length >= totalInk * 0.01) continue;
            for (const [px, py] of g) d[(py * W + px) * 4 + 3] = 0;
          }

          let minX = cx1, maxX = cx0, minY = ry1, maxY = ry0;
          for (let y = ry0; y <= ry1; y += 1) {
            for (let x = cx0; x <= cx1; x += 1) {
              if (opaque(x, y)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX <= minX || maxY <= minY) continue;

          const pad = 2;
          const sx = Math.max(0, minX - pad);
          const sy = Math.max(0, minY - pad);
          const sw = Math.min(W - sx, maxX - minX + 1 + pad * 2);
          const sh = Math.min(H - sy, maxY - minY + 1 + pad * 2);

          out.width = sw;
          out.height = sh;
          octx.clearRect(0, 0, sw, sh);
          octx.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh);
          // PNG RGBA for cutouts, as the spec's export contract requires:
          // genuine transparency, never a drawn checkerboard.
          cells.push({ dataUrl: out.toDataURL('image/png'), width: sw, height: sh });
        }
      }

      return { cells, foundRows, foundCells, despilled, flecks };
    },
    { dataUrl: 'data:image/png;base64,' + b64, spec: sheet },
  );

  if (result.flecks) {
    console.log(`  · ${sheet.file}: ${result.flecks} key flecks cleaned inside the paint`);
  }

  const expect = sheet.kind === 'plate' ? 1 : sheet.rows * sheet.cols;
  if (result.cells.length !== expect) {
    problems.push(
      `${sheet.file}: expected ${expect} pieces (${sheet.rows ?? 1}x${sheet.cols ?? 1}), ` +
        `cut ${result.cells.length}. Rows found ${result.foundRows}, cells found ` +
        `${result.foundCells}. Nothing written for this sheet — check the props are ` +
        `fully separated by background and none touch.`,
    );
    continue;
  }

  const dir = join(OUT, sheet.dir);
  if (!DRY) mkdirSync(dir, { recursive: true });

  result.cells.forEach((cell, i) => {
    const base = sheet.kind === 'plate' ? sheet.name : sheet.names[i];
    const ext = sheet.kind === 'plate' ? 'webp' : 'png';
    const file = join(dir, `${base}.${ext}`);
    const bytes = Buffer.from(cell.dataUrl.split(',')[1], 'base64');
    if (!DRY) writeFileSync(file, bytes);
    written.push({
      file: `${sheet.dir}/${base}.${ext}`,
      w: cell.width,
      h: cell.height,
      kb: Math.round(bytes.length / 1024),
    });
  });
}

await browser.close();

for (const w of written) {
  console.log(
    `  ${String(w.w).padStart(5)}x${String(w.h).padEnd(5)} ${String(w.kb).padStart(5)} kB  ${w.file}`,
  );
}

if (problems.length) {
  console.log('');
  for (const p of problems) console.log(`  ! ${p}`);
}

console.log(
  `\n${written.length} assets ${DRY ? 'would be written' : 'written'} → ${OUT}` +
    (problems.length ? `\n${problems.length} sheet(s) FAILED` : ''),
);
process.exit(problems.length ? 1 : 0);
