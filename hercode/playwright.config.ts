import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Screenshots only. `npm run shots` starts the dev server, walks every screen
 * at phone size and writes PNGs to /screenshots.
 *
 * If a Chromium is already on the machine we use it rather than downloading
 * another one; otherwise Playwright resolves its own
 * (`npx playwright install chromium`).
 */
const PREINSTALLED_CHROMIUM = '/opt/pw-browsers/chromium';
const executablePath = existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined;

export default defineConfig({
  testDir: './e2e',
  // One long guided walk, not a suite of small tests: it visits every screen
  // and waits out the AI shimmer at each stop.
  timeout: 120_000,
  outputDir: './.playwright',
  reporter: [['list']],
  use: {
    // Chromium at phone size. The iPhone device preset runs on WebKit, which
    // this prototype does not need for looking at layout.
    ...devices['Desktop Chrome'],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    baseURL: 'http://127.0.0.1:5173',
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--force-prefers-reduced-motion'],
    },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
