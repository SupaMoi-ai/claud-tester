import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // pglite migration suites boot a WASM Postgres; give them room.
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      // The calculation core is where the financial risk lives. Everything
      // else is deliberately ungated -- chasing coverage on UI is wasted time.
      include: ['src/domain/**/*.ts'],
      // Only test files and pure type declarations are exempt. There are no
      // barrel files in src/domain precisely so nothing can hide behind one.
      exclude: ['src/domain/**/*.test.ts', 'src/domain/**/types.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 95,
      },
    },
  },
})
