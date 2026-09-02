// Generates everything the app stores ask for, from the REAL app, in headless Chromium.
//   npm run store-assets
// Outputs:
//   icons/maskable-192.png, icons/maskable-512.png   — PWA maskable icons (padded to the safe zone)
//   icons/apple-touch-icon-180.png                     — iOS home-screen icon
//   store/ios/AppIcon-1024.png                         — App Store icon (opaque, no alpha)
//   store/android/icon-512.png                         — Play Store icon
//   store/ios/screenshots/6.7/*.png  (1290x2796)       — App Store iPhone screenshots, EN
//   store/android/screenshots/*.png  (1080x1920)       — Play phone screenshots, 9:16
//   store/android/feature-graphic.png (1024x500)       — Play feature graphic, EN
//   store/android/feature-graphic-no.png               — same, Norwegian
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXEC = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const out = (...p) => { const f = path.join(ROOT, ...p); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };

const freePort = () => new Promise((res, rej) => {
  const s = createServer(); s.unref(); s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});
const port = await freePort();
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 700));
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ executablePath: fs.existsSync(EXEC) ? EXEC : undefined });

const render = async (url, w, h, file, dsf = 1) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts && document.fonts.ready);
  await p.waitForTimeout(150);
  await p.screenshot({ path: file, fullPage: false });
  await ctx.close();
  console.log('  ✓', path.relative(ROOT, file));
};

try {
  // ---- icons ----
  await render(`${base}/tools/icon.html?size=512&pad=0.12`, 512, 512, out('icons', 'maskable-512.png'));
  await render(`${base}/tools/icon.html?size=192&pad=0.12`, 192, 192, out('icons', 'maskable-192.png'));
  await render(`${base}/tools/icon.html?size=180&pad=0`,    180, 180, out('icons', 'apple-touch-icon-180.png'));
  await render(`${base}/tools/icon.html?size=1024&pad=0`,   1024, 1024, out('store', 'ios', 'AppIcon-1024.png'));
  await render(`${base}/tools/icon.html?size=512&pad=0`,    512, 512, out('store', 'android', 'icon-512.png'));

  // ---- feature graphics ----
  await render(`${base}/tools/feature-graphic.html`,         1024, 500, out('store', 'android', 'feature-graphic.png'));
  await render(`${base}/tools/feature-graphic.html?lang=no`, 1024, 500, out('store', 'android', 'feature-graphic-no.png'));

  // ---- app screenshots at store sizes ----
  const captureSet = async (viewport, dsf, dir) => {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, colorScheme: 'dark', reducedMotion: 'reduce', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(`${base}/app.html?demo=1`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => typeof state !== 'undefined' && !!state.profile && !!document.querySelector('#app .hero'), null, { timeout: 15000 });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.evaluate(() => { try { dismissDemoBanner(); } catch {} try { dismissNotifNudge(); } catch {} try { if (state.showWelcome) dismissWelcome(); } catch {} });
    await page.waitForTimeout(150);
    const scrollToCard = (t) => page.evaluate((t) => {
      const label = [...document.querySelectorAll('main .label')].find(l => l.textContent.toLowerCase().includes(t));
      const card = label && (label.closest('.card') || label.closest('.move-card') || label.parentElement);
      if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 124, behavior: 'instant' });
    }, t);
    const shot = async (name, prep) => { await prep(); await page.waitForTimeout(250); await page.screenshot({ path: out(...dir, name), fullPage: false }); console.log('  ✓', path.join(...dir, name)); };
    await shot('1-dashboard.png', async () => page.evaluate(() => window.scrollTo(0, 0)));
    await shot('2-weather.png',   async () => { await page.evaluate(() => { if (!state.weatherOpen) toggleWeather(); }); await page.waitForTimeout(150); await scrollToCard('her weather'); });
    await shot('3-quiz.png',      async () => scrollToCard('pop quiz'));
    await shot('4-trophies.png',  async () => { await page.evaluate(() => go('toolbox')); await page.waitForTimeout(200); await page.evaluate(() => window.scrollTo(0, 0)); });
    await shot('5-archive.png',   async () => { await page.evaluate(() => { go('archive'); setArchiveQuery('iron'); }); await page.waitForTimeout(200); await page.evaluate(() => window.scrollTo(0, 0)); });
    await ctx.close();
  };
  await captureSet({ width: 430, height: 932 }, 3, ['store', 'ios', 'screenshots', '6.7']);   // 1290x2796
  await captureSet({ width: 360, height: 640 }, 3, ['store', 'android', 'screenshots']);      // 1080x1920 (9:16)
} finally {
  await browser.close();
  server.kill();
}
