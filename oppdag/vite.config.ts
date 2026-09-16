import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// The production build is committed to ../spill so GitHub Pages can serve it at
// https://<user>.github.io/claud-tester/spill/ with no build step.
// `npm run dev` serves from / locally, which HashRouter handles either way.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/claud-tester/spill/' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../spill',
    emptyOutDir: true,
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
    port: 5173,
  },
}));
