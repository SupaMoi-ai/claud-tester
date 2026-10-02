/**
 * Test runner.
 *
 * Node's built-in TypeScript stripping requires explicit `.ts` extensions on
 * every import, which the app source deliberately does not use (Vite resolves
 * them). So we bundle each test file with esbuild — already present as a Vite
 * dependency — and hand the results to `node --test`.
 *
 * Every `tests/*.test.ts` is discovered. An earlier version named one file
 * directly, so a second suite was written, compiled, committed and silently
 * never run: the count stayed where it was and nothing said why.
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'node_modules', '.test-build');

mkdirSync(outDir, { recursive: true });

const testsDir = join(root, 'tests');
const suites = readdirSync(testsDir)
  .filter((f) => f.endsWith('.test.ts'))
  .sort();

if (suites.length === 0) {
  console.error('no tests/*.test.ts found');
  process.exit(1);
}

const outfiles = suites.map((f) => join(outDir, f.replace(/\.ts$/, '.mjs')));

await build({
  entryPoints: suites.map((f) => join(testsDir, f)),
  outdir: outDir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Keep node builtins and anything from node_modules external.
  packages: 'external',
  logLevel: 'error',
});

console.log(`running ${suites.length} suite(s): ${suites.join(', ')}`);

const result = spawnSync(process.execPath, ['--test', ...outfiles], {
  stdio: 'inherit',
});

rmSync(outDir, { recursive: true, force: true });
process.exit(result.status ?? 1);
