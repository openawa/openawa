import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/openawa.ts'],
  format: ['esm'],
  target: 'node22',
  sourcemap: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
  banner: {
    js: '#!/usr/bin/env node',
  },
})
