import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// package.json "version" is the app version everywhere (Settings screen + App Store, via codemagic.yaml).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Relative paths so the built game also loads inside the iOS app (Capacitor).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    // Capacitor 8 supports iOS 15+, so target Safari 15.
    target: ['es2020', 'safari15'],
    outDir: 'dist',
  },
});
