// Regenerates the website's phone screenshots + OG card from the REAL app, in headless Chromium.
//   npm run shots
// Serves the repo root over HTTP (the app registers a service worker, so file:// won't do),
// opens app.html?demo=1 (seeds the fictional "Maya" profile), and captures each surface.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'screens');
const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const freePort = () => new Promise((res, rej) => {
  const s = createServer(); s.unref();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});

const port = await freePort();
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const base = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ executablePath: fs.existsSync(EXEC) ? EXEC : undefined });
try {
  fs.mkdirSync(OUT, { recursive: true });

  // ---- phone screenshots ----
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block'
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/app.html?demo=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof state !== 'undefined' && !!state.profile && !!document.querySelector('#app .hero'), null, { timeout: 15000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);

  // Drop the demo banner so the screenshots show the app, not the disclaimer.
  await page.evaluate(() => { try { dismissDemoBanner(); } catch {} try { dismissNotifNudge(); } catch {} try { if (state.showWelcome) dismissWelcome(); } catch {} });
  await page.waitForTimeout(150);

  const shoot = async (name, prep) => {
    await prep();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(OUT, name), fullPage: false });
    console.log('  ✓', name);
  };

  // Scroll so the card whose "// label" contains `text` sits at the top of the viewport.
  const scrollToCard = async (text) => {
    const found = await page.evaluate((t) => {
      const label = [...document.querySelectorAll('main .label')].find(l => l.textContent.toLowerCase().includes(t));
      const card = label && (label.closest('.card') || label.closest('.move-card') || label.parentElement);
      if (!card) return [...document.querySelectorAll('main .label')].map(l => l.textContent.trim()).slice(0, 40);
      window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 124 /* sticky header + tabs */, behavior: 'instant' });
      return true;
    }, text);
    if (found !== true) throw new Error(`card "${text}" not found; labels on page: ${JSON.stringify(found)}`);
  };

  await shoot('s1-dashboard.png', async () => { await page.evaluate(() => window.scrollTo(0, 0)); });
  await shoot('s2-weather.png', async () => {
    await page.evaluate(() => { if (!state.weatherOpen) toggleWeather(); });
    await page.waitForTimeout(150);
    await scrollToCard('her weather');
  });
  await shoot('s3-quiz.png', async () => { await scrollToCard('pop quiz'); });
  await shoot('s4-trophies.png', async () => {
    await page.evaluate(() => go('toolbox'));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, 0));
  });
  await shoot('s5-archive.png', async () => {
    await page.evaluate(() => { go('archive'); setArchiveQuery('iron'); });
    await page.waitForTimeout(200);
    await page.evaluate(() => window.scrollTo(0, 0));
  });
  await ctx.close();

  // ---- OG share card ----
  const og = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const ogPage = await og.newPage();
  await ogPage.goto(`${base}/tools/og.html`, { waitUntil: 'networkidle' });
  await ogPage.evaluate(() => document.fonts && document.fonts.ready);
  await ogPage.waitForTimeout(200);
  await ogPage.screenshot({ path: path.join(ROOT, 'og-image.png'), fullPage: false });
  console.log('  ✓ og-image.png');
  await og.close();
} finally {
  await browser.close();
  server.kill();
}
