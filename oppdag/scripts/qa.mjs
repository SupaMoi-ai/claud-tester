/**
 * End-to-end visual QA.
 *
 * Drives the whole primary flow in a real browser on an iPad viewport and
 * screenshots every screen, so the build can be *looked at* rather than
 * assumed to work. Every button the child would press is actually pressed,
 * including the hint ladder, the drawing canvas and the 3-second parent gate.
 *
 *   node scripts/qa.mjs [--out DIR] [--width 1024] [--height 768] [--label tablet]
 *
 * Screenshots are written outside the repo by default — they are a QA artefact,
 * not a deliverable.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/* Chromium is preinstalled in this environment at a revision path Playwright
   does not guess; point at it explicitly and fall back to the bundled one. */
const CHROMIUM = process.env.OPPDAG_CHROMIUM
  ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const OUT = flag('out', '/tmp/claude-0/oppdag-qa');
const WIDTH = Number(flag('width', 1024));
const HEIGHT = Number(flag('height', 768));
const LABEL = flag('label', 'tablet');
const PORT = Number(flag('port', 5177));

mkdirSync(OUT, { recursive: true });

let shotIndex = 0;
const notes = [];

/* -------------------------------------------------------------------------- */

async function main() {
  const server = spawn(
    'npx',
    ['vite', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { cwd: root, stdio: 'pipe' },
  );
  server.stdout.on('data', () => {});
  server.stderr.on('data', (d) => process.stderr.write(d));

  await waitForServer(`http://127.0.0.1:${PORT}/`);

  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
    hasTouch: true,
    locale: 'nb-NO',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => notes.push(`PAGE ERROR: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') notes.push(`CONSOLE: ${m.text()}`);
  });

  try {
    await runFlow(page, `http://127.0.0.1:${PORT}`);
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }

  console.log(`\nScreenshots → ${OUT}`);
  if (notes.length) {
    console.log('\nBrowser messages:');
    for (const note of [...new Set(notes)]) console.log(`  - ${note}`);
  } else {
    console.log('\nNo page errors or console errors.');
  }
}

/* --------------------------------------------------------------- helpers */

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`dev server never came up at ${url}`);
}

const settle = (page, ms = 900) => page.waitForTimeout(ms);

async function shot(page, name) {
  shotIndex += 1;
  const file = join(OUT, `${String(shotIndex).padStart(2, '0')}-${LABEL}-${name}.png`);
  await page.screenshot({ path: file });
  console.log(`  ✓ ${name}`);
}

/**
 * Clicks the first *enabled* button whose visible text contains every fragment.
 *
 * Skipping `[disabled]` matters: once a question is answered its choices stay
 * on screen but go disabled, and matching one of those would otherwise hang
 * until Playwright's default 30s timeout. Clicks use a short timeout so a miss
 * fails fast instead of silently eating half a minute.
 */
async function press(page, ...fragments) {
  const buttons = page.locator('button:visible:not([disabled])');
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    const button = buttons.nth(i);
    const text = (await button.textContent()) ?? '';
    if (!fragments.every((f) => text.includes(f))) continue;
    try {
      await button.click({ timeout: 4000 });
      await settle(page, 650);
      return true;
    } catch {
      continue; // covered by something, or vanished — try the next match
    }
  }
  throw new Error(`no clickable button matching ${JSON.stringify(fragments)}`);
}

/** Like press(), but returns false instead of throwing. */
async function tryPress(page, ...fragments) {
  try {
    await press(page, ...fragments);
    return true;
  } catch {
    return false;
  }
}

/**
 * Dismisses any world-growth modals that are open.
 *
 * These legitimately fire mid-flow — the island grows the moment a concept
 * lands, not only at the end of an adventure — so anything driving the UI has
 * to expect them rather than treat them as an error.
 */
async function dismissUnlocks(page, max = 4) {
  for (let i = 0; i < max; i += 1) {
    const dialog = page.locator('[role="dialog"]');
    if (!(await dialog.isVisible().catch(() => false))) return i;
    await settle(page, 700);
    await tryPress(page, 'Se det!');
    await settle(page, 700);
  }
  return max;
}

/**
 * Advances through story bubbles and post-answer continues until the flow
 * reaches something that needs a real decision.
 *
 * Story beats say "Fortsett", a finished task says "Videre", and a story
 * stage's last line uses its own call to action — so all of them count as
 * "keep going". Tasks have no continue button until they are answered, so
 * this can never skip past one.
 */
async function advanceStory(page, max = 12) {
  const forward = ['Fortsett', 'Videre', 'Vi hjelper!', 'Se hva som skjedde!'];
  for (let i = 0; i < max; i += 1) {
    let moved = false;
    for (const label of forward) {
      if (await tryPress(page, label)) {
        moved = true;
        break;
      }
    }
    if (!moved) return i;
  }
  return max;
}

/* ------------------------------------------------------------------ flow */

async function runFlow(page, base) {
  console.log(`\n${LABEL} ${WIDTH}×${HEIGHT}`);

  /* 1 — Splash ---------------------------------------------------------- */
  await page.goto(`${base}/#/`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/#/`);
  await page.reload();
  await settle(page, 1400);
  await shot(page, 'splash');

  /* 2 — Parent setup ---------------------------------------------------- */
  await press(page, 'Start eventyret');
  await settle(page, 900);
  await shot(page, 'foreldre-oppsett');

  /* 3 — Name ------------------------------------------------------------ */
  await press(page, 'Jeg forstår');
  await settle(page, 900);
  await page.fill('#child-name', 'Mia');
  await settle(page, 400);
  await shot(page, 'navn');

  /* 4 — Age / trinn ----------------------------------------------------- */
  await press(page, 'Det er meg!');
  await settle(page, 900);
  await press(page, '8', 'år');
  await press(page, '3', 'trinn');
  await settle(page, 400);
  await shot(page, 'alder');

  /* 5 — Interests ------------------------------------------------------- */
  await press(page, 'Videre');
  await settle(page, 900);
  for (const interest of ['Dyr', 'Tegning', 'Verdensrommet', 'Bygging']) {
    await press(page, interest);
  }
  await settle(page, 600);
  await shot(page, 'interesser');

  /* 6 — Learning check -------------------------------------------------- */
  await press(page, 'Sånn, ja!');
  await settle(page, 1000);
  await shot(page, 'sjekk-intro');

  await press(page, 'Klar!');
  await settle(page, 1100);
  await shot(page, 'sjekk-telling');

  // Right answers, in item order: 7 fish, penguin, båt, 4+3, 🍄, winter.
  const checkAnswers = [
    ['7'], ['Pingvin'], ['Båt'], ['7'], ['🍄'], ['Om vinteren'],
  ];
  for (let i = 0; i < checkAnswers.length; i += 1) {
    await press(page, ...checkAnswers[i]);
    await settle(page, 800);
    if (i === 2) await shot(page, 'sjekk-lesing');
    await tryPress(page, 'Videre');
    await tryPress(page, 'Nå vet jeg nok!');
    await settle(page, 700);
  }
  await shot(page, 'sjekk-ferdig');

  /* 7 — The world ------------------------------------------------------- */
  await press(page, 'Inn i verdenen');
  await settle(page, 1800);

  // The check itself can already have grown something — capture that, then
  // clear it before carrying on.
  await shot(page, 'opplasing-etter-sjekk');
  await dismissUnlocks(page);
  await settle(page, 1400);
  await shot(page, 'verden');

  /* 8 — Adventure intro -------------------------------------------------- */
  await press(page, 'Ja!');
  await settle(page, 1300);
  await shot(page, 'eventyr-intro');

  /* 9 — Opening story ---------------------------------------------------- */
  await press(page, 'Vi hjelper!');
  await settle(page, 1100);
  await shot(page, 'eventyr-historie');
  await advanceStory(page);
  await settle(page, 900);

  /* 10 — Stage 1: distance, with the hint ladder pulled ------------------ */
  await shot(page, 'steg1-avstand');
  await tryPress(page, 'Lumi, hjelp meg');
  await settle(page, 800);
  await tryPress(page, 'Hjelp meg litt mer');
  await settle(page, 900);
  await shot(page, 'steg1-hjelp');

  // Answer it — 3 km left (base variant).
  for (const candidate of ['3', '2', '7']) {
    if (await tryPress(page, candidate)) break;
  }
  await settle(page, 900);
  await shot(page, 'steg1-riktig');
  await advanceStory(page);
  await settle(page, 900);

  /* 11 — Stage 2: the polar bear guess ----------------------------------- */
  await shot(page, 'steg2-gjett');
  await press(page, 'Nei, noe annet');
  await settle(page, 1600);
  await shot(page, 'steg2-svaret');
  await advanceStory(page);
  await settle(page, 900);

  /* 12 — Stage 3: reading the note --------------------------------------- */
  await shot(page, 'steg3-lesing');
  await press(page, 'værstasjonen');
  await settle(page, 1000);
  await shot(page, 'steg3-riktig');
  await advanceStory(page);
  await settle(page, 900);

  /* 13 — Stage 4: find Svalbard ------------------------------------------ */
  await shot(page, 'steg4-kart');
  await press(page, 'Svalbard');
  await settle(page, 1000);
  await shot(page, 'steg4-funnet');
  await advanceStory(page);
  await settle(page, 900);

  /* 14 — Stage 5: drawing ------------------------------------------------ */
  await shot(page, 'steg5-tegning-tom');
  await drawSomething(page);
  await settle(page, 700);
  await shot(page, 'steg5-tegning');
  await press(page, 'Sånn skal det se ut!');
  await advanceStory(page);
  await settle(page, 900);

  /* 15 — Stage 6: reflection --------------------------------------------- */
  await shot(page, 'steg6-refleksjon');
  await speakSomething(page);
  await settle(page, 1000);
  await shot(page, 'steg6-svar');
  await press(page, 'Sånn!');
  await settle(page, 1200);

  /* 16 — Ending + unlock -------------------------------------------------- */
  await shot(page, 'slutten');
  await advanceStory(page);
  await settle(page, 1800);
  await shot(page, 'eventyr-ferdig');

  // The unlock modal plays on top of the completion screen.
  await settle(page, 1200);
  await shot(page, 'opplasing-nordlystaarnet');
  await dismissUnlocks(page);
  await settle(page, 1000);
  await shot(page, 'ferdig-oppsummering');

  /* 17 — Back to a grown world ------------------------------------------- */
  await tryPress(page, 'Tilbake til verdenen');
  await settle(page, 1600);
  await dismissUnlocks(page);
  await settle(page, 1800);
  await shot(page, 'verden-vokst');

  /* 18 — Persistence check ------------------------------------------------ */
  await page.reload();
  await settle(page, 2000);
  await shot(page, 'verden-etter-reload');

  /* 19 — Discoveries ------------------------------------------------------ */
  await page.goto(`${base}/#/oppdagelser`);
  await settle(page, 1500);
  await shot(page, 'oppdagelser');

  /* 20 — Child profile ---------------------------------------------------- */
  await page.goto(`${base}/#/meg`);
  await settle(page, 1500);
  await shot(page, 'meg');

  /* 21 — Parent gate ------------------------------------------------------ */
  await page.goto(`${base}/#/port`);
  await settle(page, 1200);
  await shot(page, 'foreldreport');
  await holdGate(page);
  await settle(page, 1500);

  /* 22 — Parent dashboard ------------------------------------------------- */
  await shot(page, 'foreldre-dashbord');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(page, 800);
  await shot(page, 'foreldre-innstillinger');
  await page.evaluate(() => window.scrollTo(0, 0));

  /* 23 — Learning map ----------------------------------------------------- */
  await page.goto(`${base}/#/foreldre/kart`);
  await settle(page, 1800);
  await shot(page, 'laeringskart');
  await tryPress(page, 'Matematikk');
  await settle(page, 1200);
  await shot(page, 'laeringskart-matematikk');
}

/* ----------------------------------------------------------- interactions */

async function drawSomething(page) {
  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) return;

  const strokes = [
    // a hill
    { colour: 2, points: [[0.15, 0.7], [0.3, 0.45], [0.45, 0.7]] },
    // a small shelter
    { colour: 1, points: [[0.55, 0.68], [0.62, 0.45], [0.72, 0.68], [0.55, 0.68]] },
    // a sun
    { colour: 2, points: [[0.8, 0.2], [0.86, 0.26], [0.8, 0.32], [0.74, 0.26], [0.8, 0.2]] },
    // ground
    { colour: 3, points: [[0.1, 0.8], [0.9, 0.8]] },
  ];

  const swatches = page.locator('button[aria-label]');
  for (const stroke of strokes) {
    // Pick a crayon by its index among the colour swatches.
    const swatch = swatches.nth(stroke.colour);
    if (await swatch.isVisible().catch(() => false)) {
      await swatch.click().catch(() => {});
    }
    const [first, ...rest] = stroke.points;
    await page.mouse.move(box.x + box.width * first[0], box.y + box.height * first[1]);
    await page.mouse.down();
    for (const [px, py] of rest) {
      await page.mouse.move(box.x + box.width * px, box.y + box.height * py, { steps: 12 });
    }
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
}

async function speakSomething(page) {
  const mic = page.locator('button[aria-pressed]').first();
  const box = await mic.boundingBox().catch(() => null);

  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1200);
    await page.mouse.up();
    await page.waitForTimeout(900);
  }

  // If no transcript came back, fall back to the typing route.
  const hasResult = await page
    .locator('text=Mikrofonen er ikke skrudd på her')
    .isVisible()
    .catch(() => false);
  if (!hasResult) {
    if (await tryPress(page, 'Eller skriv det i stedet')) {
      await page.fill('textarea', 'At isbjørnen ikke er hvit egentlig!');
      await page.waitForTimeout(400);
    }
  }
}

async function holdGate(page) {
  const circle = page.locator('button[aria-label]').filter({ hasText: '🔒' }).first();
  const box = await circle.boundingBox().catch(() => null);
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3400);
  await page.mouse.up();
}

main()
  .then(() => process.exit(0)) // the vite child would otherwise hold the run open
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
