// Builds dist-native/ — the web bundle Capacitor wraps for the App Store / Play builds.
//   npm run native:prep && npx cap sync
// The app is a single HTML file, so this just copies it (as index.html) plus the assets it
// references. No bundler, no transform — what you test in the browser is what ships.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist-native');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const copy = (from, to = from) => {
  const src = path.join(ROOT, from), dst = path.join(OUT, to);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.cpSync(src, dst, { recursive: true });
  console.log('  ✓', to);
};

copy('app.html', 'index.html');   // the app becomes the native entry point
copy('privacy.html');
copy('personvern.html');
copy('manifest.json');
copy('icon-192.png');
copy('icon-512.png');
copy('icons');
copy('fonts');
copy('share-qr.png');
copy('og-image.png');

// Inside the shell, relative links to app.html should resolve to index.html.
const idx = path.join(OUT, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replaceAll('href="app.html"', 'href="index.html"'));
console.log('\ndist-native/ ready →', OUT);
