/**
 * Test runner.
 *
 * Node's built-in TypeScript stripping requires explicit `.ts` extensions on
 * every import, which the app source deliberately does not use (Vite resolves
 * them). So we bundle the test file with esbuild — already present as a Vite
 * dependency — and hand the result to `node --test`.
 */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const outDir = join(root, 'node_modules', '.test-build');

mkdirSync(outDir, { recursive: true });

const outfile = join(outDir, 'learning.test.mjs');

await build({
  entryPoints: [join(root, 'tests', 'learning.test.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  // Keep node builtins and anything from node_modules external.
  packages: 'external',
  logLevel: 'error',
});

const result = spawnSync(process.execPath, ['--test', outfile], {
  stdio: 'inherit',
});

rmSync(outDir, { recursive: true, force: true });
process.exit(result.status ?? 1);
