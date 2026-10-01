/**
 * World-engine risk gate.
 *
 * Answers the only question that matters before any artwork is commissioned:
 * does panning Læreøya work, stay smooth, and hit the right things?
 *
 * Measures real frame rate during a scripted drag, drives Ellie around by
 * tapping the canvas, and fails loudly if the WebGL context drops.
 *
 * STANDING RULE, learned the expensive way: an assertion that cannot fail is
 * worse than no assertion at all, because it reports a pass.
 *
 * The first version of this gate checked dragging by diffing a screenshot
 * before against one after. Clouds drift on their own, so the frames always
 * differed and the check always passed — while a transparent overlay div was
 * swallowing every pointer event and the world had never once responded to
 * touch. It also "tested" tapping a location by clicking the hidden
 * accessibility button with `force: true`, which bypasses hit-testing
 * entirely. Two green ticks, neither capable of going red.
 *
 * So: assert on state the engine reports, not on pixels, and never use `force`
 * on a check whose subject is whether input arrives.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CHROMIUM =
  process.env.OPPDAG_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};

const OUT = flag('out', '/tmp/claude-0/oppdag-gate');
const PORT = Number(flag('port', 5321));
const WIDTH = Number(flag('width', 1024));
const HEIGHT = Number(flag('height', 768));

mkdirSync(OUT, { recursive: true });

const results = [];
const fail = (msg) => results.push({ ok: false, msg });
const pass = (msg) => results.push({ ok: true, msg });

async function waitForServer(url, tries = 80) {
  for (let i = 0; i < tries; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`dev server never came up at ${url}`);
}

const server = spawn(
  'npx',
  ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  { cwd: root, stdio: 'pipe' },
);
server.stdout.on('data', () => {});

await waitForServer(`http://127.0.0.1:${PORT}/`);

const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 2,
  hasTouch: true,
});

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
});

const base = `http://127.0.0.1:${PORT}`;

/* ---- get into the world ------------------------------------------------ */
await page.goto(`${base}/#/`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}/#/`);
await page.reload();
await page.waitForTimeout(1200);

const buttons = page.locator('button:visible');
const count = await buttons.count();
for (let i = 0; i < count; i += 1) {
  const text = (await buttons.nth(i).textContent()) ?? '';
  if (text.includes('demo')) {
    await buttons.nth(i).click();
    break;
  }
}
await page.waitForTimeout(2500);

/* ---- 1. the canvas exists and has a live WebGL context ----------------- */
const canvasInfo = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { found: false };
  return { found: true, width: c.width, height: c.height };
});
if (canvasInfo.found && canvasInfo.width > 0) {
  pass(`canvas present at ${canvasInfo.width}×${canvasInfo.height} backing pixels`);
} else {
  fail('no canvas rendered');
}

await page.evaluate(() => {
  const c = document.querySelector('canvas');
  window.__contextLost = false;
  c?.addEventListener('webglcontextlost', () => {
    window.__contextLost = true;
  });
});

await page.screenshot({ path: join(OUT, '01-world-initial.png') });

/* ---- 2. frame rate -----------------------------------------------------
 *
 * IMPORTANT: absolute fps is NOT assertable in this environment. Headless
 * Chromium runs WebGL on SwiftShader (software). Measured here: a bare
 * gl.clear() of a 1888×1016 buffer manages 59 fps, but *three* large Pixi
 * rects manage 9, and an empty-ish Pixi app cannot reach 60 at all. The
 * bottleneck is the software rasteriser's shader/blend path, not the scene.
 *
 * So instead of a meaningless "≥60 fps" assertion, measure a floor — the
 * cheapest possible Pixi scene in this same browser — and check the real
 * scene is within a reasonable factor of it. That catches a genuinely
 * pathological scene while staying independent of the host's GPU.
 *
 * Real-device frame rate must be measured on an actual iPad. It is not
 * knowable from here, and pretending otherwise would be worse than useless.
 */
const floorFps = await measurePixiFloor(page);
const idleFps = await measureFps(page, 1500);
results.push({ ok: true, msg: `idle ${idleFps} fps (software floor ${floorFps} fps — see note)` });

/* ---- 3. drag-pan: smooth, and the camera actually moved ---------------- */
const cameraBefore = await worldState(page);
const fpsDuringDrag = await measureFpsDuringDrag(page);
await page.screenshot({ path: join(OUT, '02-world-panned.png') });
const cameraAfter = await worldState(page);

if (fpsDuringDrag >= Math.max(2, floorFps * 0.4)) {
  pass(`${fpsDuringDrag} fps while dragging (floor ${floorFps}) — scene is not pathological`);
} else {
  fail(
    `${fpsDuringDrag} fps while dragging vs a ${floorFps} fps floor — the scene itself is too expensive`,
  );
}

// The drag sweeps ~500px left. Anything under 100 means the input never
// arrived — which is precisely what an overlay div swallowing pointer events
// looks like, and precisely what the old screenshot diff could not see.
const panned = Math.abs((cameraAfter?.camera?.x ?? 0) - (cameraBefore?.camera?.x ?? 0));
if (panned >= 100) pass(`drag moved the camera ${Math.round(panned)} world units`);
else fail(`drag moved the camera only ${Math.round(panned)} units — input is not reaching the canvas`);

/* ---- 4. tap empty ground: Ellie walks there ---------------------------- */
await page.goto(`${base}/#/verden`);
await waitForWorld(page, 'the tap-to-walk check');

const canvasBox = await page.locator('canvas').boundingBox();
/** Tap a point given as a fraction of the canvas, like a finger. */
const tapAt = async (fx, fy) => {
  await page.mouse.click(
    Math.round(canvasBox.x + canvasBox.width * fx),
    Math.round(canvasBox.y + canvasBox.height * fy),
  );
};

const standing = await worldState(page);
await tapAt(0.22, 0.62); // empty island, well clear of every location
await waitForStill(page, 'the walk west');
const walked = await worldState(page);

const ellieMoved = Math.abs((walked?.actors?.ellie?.x ?? 0) - (standing?.actors?.ellie?.x ?? 0));
if (ellieMoved >= 80) pass(`tapping open ground walked Ellie ${Math.round(ellieMoved)} units`);
else fail(`tapping open ground moved Ellie ${Math.round(ellieMoved)} units — tap-to-walk is dead`);

await page.screenshot({ path: join(OUT, '04-walked-west.png') });

/* ---- 5. the sea refuses ------------------------------------------------ */
const beforeSea = await worldState(page);
await tapAt(0.5, 0.1); // sky/sea, far outside any walkable rectangle
await page.waitForTimeout(1400);
const afterSea = await worldState(page);
// Reading this while she is still walking would blame the sea for the
// previous tap, so the check above waits for her to come to rest first.

const seaDrift = Math.abs((afterSea?.actors?.ellie?.x ?? 0) - (beforeSea?.actors?.ellie?.x ?? 0));
if (seaDrift < 10) pass('tapping the sea left Ellie where she was');
else fail(`tapping the sea walked Ellie ${Math.round(seaDrift)} units into the water`);

/* ---- 6. Kiki keeps up -------------------------------------------------- */
const beforeTrip = await worldState(page);
await tapAt(0.85, 0.62);
await waitForStill(page, 'the walk east');
const together = await worldState(page);

// Without this, "nobody moved at all" would satisfy the distance test — the
// companion would look loyal purely by standing still next to a statue.
const trip = Math.abs(
  (together?.actors?.ellie?.x ?? 0) - (beforeTrip?.actors?.ellie?.x ?? 0),
);
const gap = Math.hypot(
  (together?.actors?.kiki?.x ?? 0) - (together?.actors?.ellie?.x ?? 0),
  (together?.actors?.kiki?.y ?? 0) - (together?.actors?.ellie?.y ?? 0),
);
if (trip < 80) {
  fail(`Ellie only travelled ${Math.round(trip)} units east — nothing was proven about Kiki`);
} else if (gap <= 110) {
  pass(`Kiki stayed ${Math.round(gap)} units from Ellie across a ${Math.round(trip)}-unit walk`);
} else {
  fail(`Kiki fell ${Math.round(gap)} units behind over a ${Math.round(trip)}-unit walk`);
}

await page.screenshot({ path: join(OUT, '05-walked-east.png') });

/* ---- 7. tapping a location opens it ------------------------------------
 *
 * Two genuinely different paths, kept apart on purpose. The old gate ran only
 * the second one, with `force: true`, and reported it as proof that tapping
 * the world worked. It was proof that the accessibility mirror worked.
 */
await page.goto(`${base}/#/verden`);
await waitForWorld(page, 'the Havna tap check');

const havna = page.locator('button[aria-label="Havna"]');
if ((await havna.count()) > 0) {
  const spot = await havna.first().boundingBox();
  // A real tap at Havna's on-screen position — no force, nothing bypassed.
  await page.mouse.click(Math.round(spot.x + spot.width / 2), Math.round(spot.y + spot.height / 2));
  // She walks there before it opens, so this waits for the walk, not a click.
  await page.waitForTimeout(6000);
  const url = page.url();
  if (url.includes('/eventyr/')) pass(`tapping Havna in the world opened ${url.split('#')[1]}`);
  else fail(`tapping Havna went nowhere (still ${url.split('#')[1]})`);
} else {
  fail('Havna has no on-screen position');
}

await page.goto(`${base}/#/verden`);
await waitForWorld(page, 'the keyboard check');
const havnaA11y = page.locator('button[aria-label="Havna"]');
if ((await havnaA11y.count()) > 0) {
  await havnaA11y.first().focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  if (page.url().includes('/eventyr/')) pass('Havna is reachable by keyboard alone');
  else fail('Havna has a focusable button but Enter does nothing');
} else {
  fail('no accessibility button for Havna — screen readers cannot reach the world');
}

/* ---- 6. context survived ----------------------------------------------- */
await page.goto(`${base}/#/verden`);
await page.waitForTimeout(1500);
const lost = await page.evaluate(() => window.__contextLost === true);
if (lost) fail('WebGL context was lost');
else pass('WebGL context stable');

await page.screenshot({ path: join(OUT, '03-world-after-nav.png') });

/* ---- report ------------------------------------------------------------ */
await browser.close();
server.kill('SIGTERM');

console.log('');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.msg}`);
if (errors.length) {
  console.log('\n  browser errors:');
  for (const e of [...new Set(errors)]) console.log(`    - ${e}`);
}
console.log(`\nScreenshots → ${OUT}`);

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\nGATE FAILED (${failed})` : '\nGATE PASSED');
process.exit(failed ? 1 : 0);

/* ------------------------------------------------------------------------ */

/**
 * The cheapest Pixi scene this browser can manage: three rectangles, animated.
 * Anything the real scene achieves has to be read against this, because in a
 * software rasteriser even an almost-empty Pixi app is nowhere near 60 fps.
 */
async function measurePixiFloor(p) {
  return p.evaluate(async () => {
    const { Application, Container, Graphics } = await import(
      '/node_modules/pixi.js/dist/pixi.mjs'
    );
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '-9999px';
    document.body.appendChild(canvas);

    const app = new Application();
    await app.init({
      canvas,
      width: 944,
      height: 508,
      resolution: 2,
      autoDensity: true,
      antialias: false,
      background: 0xd8eefa,
    });

    const root = new Container();
    app.stage.addChild(root);
    const nodes = [];
    for (let i = 0; i < 3; i += 1) {
      const g = new Graphics().roundRect(0, 0, 1700, 300, 20).fill({ color: 0x84cfa6 });
      const wrap = new Container();
      wrap.addChild(g);
      wrap.x = i * 40;
      wrap.y = i * 60;
      root.addChild(wrap);
      nodes.push(wrap);
    }

    let frames = 0;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        for (const n of nodes) n.x += 0.1;
        frames += 1;
        if (performance.now() - t0 < 1200) requestAnimationFrame(tick);
        else resolve(null);
      };
      requestAnimationFrame(tick);
    });
    const fps = Math.round((frames * 1000) / (performance.now() - t0));

    app.destroy(true, { children: true });
    canvas.remove();
    return fps;
  });
}

/**
 * What the world believes right now — camera and actor positions, published by
 * `WorldCanvas` onto `window.__oppdagWorld`.
 *
 * Asserting on this rather than on pixels is the whole point. The canvas is
 * opaque to the DOM, so the temptation is to diff screenshots; but ambient
 * motion means two frames always differ, and a diff therefore passes whether
 * or not anything the child did had any effect.
 */
async function worldState(p) {
  return p.evaluate(() => window.__oppdagWorld ?? null);
}

/**
 * Block until Ellie has stopped walking.
 *
 * Fixed waits turn into either flakes or false blame: read a position while she
 * is still moving and the *next* check inherits the motion and reports it as
 * its own failure. Waiting for the actual condition costs nothing and means a
 * red light names the right culprit.
 */
async function waitForStill(p, label) {
  try {
    await p.waitForFunction(
      () => window.__oppdagWorld?.actors?.ellie?.moving === false,
      null,
      { timeout: 12000 },
    );
    // One more sample tick, so the published position is the resting one.
    await p.waitForTimeout(150);
    return true;
  } catch {
    fail(`Ellie never stopped walking during ${label}`);
    return false;
  }
}

/**
 * Block until the world is built and the cast is on stage.
 *
 * Without this, a check that taps too early reads `undefined` for Ellie's
 * position both before and after, computes a difference of exactly zero, and
 * reports whatever that zero happens to mean — which is the same class of
 * mistake as diffing screenshots. Waiting for a named condition, and failing
 * out loud when it never arrives, is the only honest version.
 */
async function waitForWorld(p, label) {
  try {
    await p.waitForFunction(
      () => window.__oppdagWorld?.phase === 'ready' && window.__oppdagWorld?.actors?.ellie,
      null,
      { timeout: 15000 },
    );
    return true;
  } catch {
    fail(`the world never became ready before ${label}`);
    return false;
  }
}

async function measureFps(p, ms) {
  return p.evaluate(
    (duration) =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames += 1;
          if (performance.now() - start < duration) requestAnimationFrame(tick);
          else resolve(Math.round((frames * 1000) / (performance.now() - start)));
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );
}

async function measureFpsDuringDrag(p) {
  await p.evaluate(() => {
    window.__frames = 0;
    window.__start = performance.now();
    const tick = () => {
      window.__frames += 1;
      if (!window.__stop) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  // A real drag across the middle of the view, in steps, like a finger.
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  await p.mouse.move(cx + 300, cy);
  await p.mouse.down();
  for (let i = 0; i < 24; i += 1) {
    await p.mouse.move(cx + 300 - i * 22, cy + Math.sin(i / 4) * 30, { steps: 2 });
    await p.waitForTimeout(16);
  }
  await p.mouse.up();
  await p.waitForTimeout(700); // let momentum run

  return p.evaluate(() => {
    window.__stop = true;
    return Math.round((window.__frames * 1000) / (performance.now() - window.__start));
  });
}
