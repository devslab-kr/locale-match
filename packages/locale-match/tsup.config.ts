import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  // iife ships a `LocaleMatch` global so a plain HTML page with no build
  // step can use this straight from a CDN.
  format: ['esm', 'cjs', 'iife'],
  globalName: 'LocaleMatch',
  dts: true,
  sourcemap: true,
  clean: true,
});
