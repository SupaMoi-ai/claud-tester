/**
 * Brygga chapter gate.
 *
 * Plays the harbour from arrival to the open path, with real taps at real
 * on-screen positions, and asserts on what the world reports rather than on
 * what the screenshots look like.
 *
 * The standing rule from `gate.mjs` applies here and is the reason this file
 * exists at all: an assertion that cannot fail is worse than no assertion,
 * because it reports a pass. So every check below is written so that the
 * obvious way for the chapter to break makes it go red:
 *
 *   - a shell that is "collected" but still tappable fails, not passes
 *   - a dialogue that never opens fails rather than being skipped
 *   - the twigs test cannot pass before Milla has been thanked
 *
 * Run: node scripts/chapter-gate.mjs [--out DIR] [--port N]
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

const OUT = flag('out', '/tmp/claude-0/oppdag-chapter');
const PORT = Number(flag('port', 5323));
mkdirSync(OUT, { recursive: true });

const results = [];
const pass = (msg) => results.push({ ok: true, msg });
const fail = (msg) => results.push({ ok: false, msg });

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
// A phone, in portrait. The chapter is authored for 360 x 640 logical units
// and checking it at desktop proportions would check a layout nobody plays.
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
});

const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
});

const base = `http://127.0.0.1:${PORT}`;

const world = () => page.evaluate(() => window.__oppdagWorld ?? null);

/** Wait until the scene reports itself ready, or say so loudly. */
async function waitForWorld(what) {
  for (let i = 0; i < 60; i += 1) {
    const w = await world();
    if (w?.phase === 'ready') return w;
    if (w?.phase === 'failed') throw new Error(`world failed before ${what}: ${w.error}`);
    await page.waitForTimeout(250);
  }
  throw new Error(`world never became ready before ${what}`);
}

/** Wait until nobody is walking, so a measurement is of a finished journey. */
async function waitForStill(what, max = 40) {
  for (let i = 0; i < max; i += 1) {
    const w = await world();
    const moving = Object.values(w?.actors ?? {}).some((a) => a.moving);
    if (!moving && i > 2) return w;
    await page.waitForTimeout(250);
  }
  throw new Error(`nobody stopped walking during ${what}`);
}

/** Tap something by its accessibility name, at its real on-screen position. */
async function tapObject(label, nth = 0) {
  const button = page.locator(`button[aria-label="${label}"]`);
  if ((await button.count()) <= nth) return false;
  const box = await button.nth(nth).boundingBox();
  if (!box) return false;
  await page.mouse.click(
    Math.round(box.x + box.width / 2),
    Math.round(box.y + box.height / 2),
  );
  return true;
}

/**
 * Click through a dialogue until the tray closes. Returns how many lines.
 *
 * The tolerant click is not politeness. The tray leaves on a spring, so for a
 * few hundred milliseconds after the last line there is a node in the DOM that
 * matches, is visible, and is already on its way out. A plain `.click()` on it
 * waits thirty seconds for an element that is never coming back. Counting a
 * line only once the click lands keeps the returned number honest: a dialogue
 * that never opened still reads as zero.
 */
async function readDialogue(max = 6) {
  let lines = 0;
  for (let i = 0; i < max; i += 1) {
    const tray = page.locator('button[aria-label^="Milla sier"]');
    if ((await tray.count()) === 0) break;
    try {
      await tray.first().click({ timeout: 2500 });
    } catch {
      break; // it was leaving, not waiting
    }
    lines += 1;
    await page.waitForTimeout(500);
  }
  return lines;
}

const shellsLeft = (w) =>
  ['shell-1', 'shell-2', 'shell-3'].filter((id) => w?.objects?.[id]?.hidden === false).length;

/* ---- the way in -------------------------------------------------------
 *
 * Through the front door, as a child gets there: title, demo profile, the
 * island map, the harbour's marker. The harbour sits behind a profile now,
 * and going straight to /brygga would only test the redirect.
 */
await page.goto(`${base}/#/`);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByRole('button', { name: /demo-profil/ }).click();
await page.waitForTimeout(1200);
if (page.url().includes('/kart')) pass('the demo profile lands on the island map');
else fail(`the demo profile went to ${page.url().split('#')[1]}, not the island map`);

await page.locator('button[aria-label="Brygga"]').click();
await page.waitForTimeout(600);

/* ---- arrive ------------------------------------------------------------ */
await waitForWorld('the chapter start');
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, '01-arrival.png') });

const start = await world();
if (shellsLeft(start) === 3) pass('three shells are in the harbour at the start');
else fail(`${shellsLeft(start)} shells at the start — the chapter cannot be played`);

if (start?.objects?.['milla-at-twigs']?.hidden === true) {
  pass('the second Milla is not in the scene yet');
} else {
  fail('both Millas are on screen at once');
}

/* ---- the ask ----------------------------------------------------------- */
if (!(await tapObject('Milla'))) fail('Milla has no on-screen position to tap');
await waitForStill('the walk to Milla');
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, '02-milla-asks.png') });

const introLines = await readDialogue();
if (introLines >= 3) pass(`Milla's opening ran to ${introLines} lines`);
else fail(`Milla said ${introLines} lines — the ask never opened`);

/* ---- the shells -------------------------------------------------------- */
let collected = 0;
for (let i = 0; i < 3; i += 1) {
  // Always the first remaining shell: they are all called the same thing, and
  // the one that is gone must no longer be there to tap.
  const tapped = await tapObject('Et skjell');
  if (!tapped) break;
  await waitForStill(`the walk to shell ${i + 1}`);
  await page.waitForTimeout(700);
  collected += 1;
  if (i === 0) await page.screenshot({ path: join(OUT, `03-first-shell.png`) });
}

const afterShells = await world();
if (collected === 3 && shellsLeft(afterShells) === 0) {
  pass('all three shells were walked to and picked up');
} else {
  fail(`picked up ${collected} of 3; ${shellsLeft(afterShells)} still in the scene`);
}

// The oldest bug in this project, in its newest costume: an object that has
// visibly gone but still answers to a 44-pixel invisible button over the path.
const ghosts = await page.locator('button[aria-label="Et skjell"]').count();
if (ghosts === 0) pass('no collected shell is still tappable or announced');
else fail(`${ghosts} collected shells still have live accessibility buttons`);

const filled = await page
  .locator('[role="status"] img[src*="shell-full"]')
  .count();
if (filled === 3) pass('the interface shows three of three shells');
else fail(`the interface shows ${filled} filled shells, not 3`);

await page.waitForTimeout(1200);
await page.screenshot({ path: join(OUT, '04-all-three.png') });

/* ---- the thanks, and the basket ---------------------------------------- */
const thanksLines = await readDialogue();
if (thanksLines >= 2) pass(`Milla's thanks ran to ${thanksLines} lines`);
else fail(`Milla said ${thanksLines} lines after the shells — the thanks never opened`);

const panel = page.locator('section[aria-label="Milla spør"]');
if (await panel.count()) pass(`Milla's question opened (${await panel.getAttribute('data-task')})`);
else fail('the shells were found and no question followed');

// Work the answer out from the question as asked, rather than knowing it:
// the level is picked by the learning engine and may not be the base one.
const prompt = (await panel.locator('[role="status"]').textContent()) ?? '';
const g = Number(/(\d+) rom/.exec(prompt)?.[1]);
const e = Number(/(\d+) skjell i hvert/.exec(prompt)?.[1]);
const answer = g * e;
const cards = panel.locator('button').filter({ hasText: /^\s*\d+/ });
const values = await cards.allTextContents();
const numbers = values.map((v) => Number(/\d+/.exec(v)?.[0]));
if (Number.isFinite(answer) && numbers.includes(answer)) {
  pass(`asked ${g} × ${e}; the cards are ${numbers.join(', ')}`);
} else {
  fail(`could not read a groups question with its answer among the cards: "${prompt}" / ${numbers}`);
}

// A wrong card must not move the story on. This is the check that fails if
// the panel ever advances on any tap rather than on the right one.
const wrong = numbers.find((n) => n !== answer);
await cards.filter({ hasText: new RegExp(`^\\s*${wrong}(?!\\d)`) }).first().click();
await page.waitForTimeout(900);
const afterWrong = await world();
if ((await panel.count()) && afterWrong?.objects?.twigs?.hidden === false) {
  pass(`a wrong card (${wrong}) kept the question open and the twigs on the path`);
} else {
  fail('a wrong answer advanced the chapter');
}

// Pull the help ladder to the picture and check it shows the basket asked about.
await panel.getByRole('button', { name: /hjelp meg/i }).first().click();
await page.waitForTimeout(400);
await panel.getByRole('button', { name: /hjelp meg/i }).first().click();
await page.waitForTimeout(600);
const picture = panel.locator('[data-groups]').first();
const shownGroups = Number(await picture.getAttribute('data-groups'));
const shownEach = Number(await picture.getAttribute('data-each'));
if (shownGroups === g && shownEach === e) {
  pass(`the picture hint shows ${shownGroups} compartments of ${shownEach}, as asked`);
} else {
  fail(`the picture hint shows ${shownGroups} × ${shownEach} for a ${g} × ${e} question`);
}
await page.screenshot({ path: join(OUT, '05a-task-hint.png') });

await cards.filter({ hasText: new RegExp(`^\\s*${answer}(?!\\d)`) }).first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, '05b-task-right.png') });

const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('oppdag.v1') ?? '{}'));
const outcome = (saved.adventures?.brygga?.outcomes ?? []).at(-1);
if (outcome?.correct && outcome.attempts === 2 && outcome.support === 'visual') {
  pass('the answer was recorded: right on the second try, with the picture hint');
} else {
  fail(`the recorded outcome is ${JSON.stringify(outcome)}, not "right, 2 tries, visual help"`);
}

await panel.getByRole('button', { name: 'Videre' }).click();
await page.waitForTimeout(600);

const clearingLines = await readDialogue();
if (clearingLines >= 2) pass(`Milla's way north ran to ${clearingLines} lines`);
else fail(`Milla said ${clearingLines} lines after the basket`);

await page.waitForTimeout(2200);
const opened = await world();
await page.screenshot({ path: join(OUT, '05-path-open.png') });

if (opened?.objects?.twigs?.hidden === true) pass('the twigs are off the path');
else fail('the twigs are still across the path after Milla cleared them');

if (opened?.objects?.['milla-at-twigs']?.hidden === false && opened?.objects?.milla?.hidden) {
  pass('Milla is up at the twigs, and only one of her is on screen');
} else {
  fail('Milla did not move up to the twigs');
}

const basket = opened?.objects?.basket?.asset ?? '';
if (basket.includes('basket-full')) pass('the basket is full');
else fail(`the basket is still drawing ${basket}`);

/* ---- the journal ------------------------------------------------------- */
await page.locator('button[aria-label="Dagbok"]').first().click();
await page.waitForTimeout(900);
const url = page.url();
await page.screenshot({ path: join(OUT, '06-journal.png') });

if (url.includes('/dagbok')) pass('the journal button opens the journal');
else fail(`the journal button went to ${url.split('#')[1]} — the route is still dead`);

const keepsakes = await page.locator('article img[src*="journal/"]').count();
if (keepsakes >= 1) pass(`the journal shows ${keepsakes} earned keepsake(s)`);
else fail('the journal shows nothing after a finished chapter');

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
console.log(failed ? `\nCHAPTER GATE FAILED (${failed})` : '\nCHAPTER GATE PASSED');
process.exit(failed ? 1 : 0);
