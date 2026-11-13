import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig({
  // Relative paths so the built app works from any folder or sub-path (e.g. GitHub Pages).
  base: './',
  define: { __VERSION__: JSON.stringify(pkg.version) },
  server: { port: 5173, open: true },
  build: { target: 'es2022', sourcemap: true },
});
