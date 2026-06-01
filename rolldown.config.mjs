import { readFileSync } from 'node:fs';
import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'web/src/main.ts',
  plugins: [
    {
      name: 'lrv-diffs-worker-asset',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'diffs-worker.js',
          source: readFileSync('node_modules/@pierre/diffs/dist/worker/worker-portable.js', 'utf8'),
        });
      },
    },
  ],
  output: {
    dir: 'web/assets/app',
    entryFileNames: 'main.js',
    chunkFileNames: 'chunks/[name]-[hash].js',
    format: 'esm',
    sourcemap: false,
    cleanDir: true,
    manualChunks(id) {
      if (
        id.includes('node_modules/@pierre/diffs') ||
        id.includes('node_modules/@pierre/theme') ||
        id.includes('node_modules/@shikijs') ||
        id.includes('node_modules/shiki') ||
        id.includes('node_modules/hast-util-to-html') ||
        id.includes('node_modules/lru_map') ||
        id.includes('node_modules/diff/')
      ) {
        return 'stacked-diff';
      }
      return undefined;
    },
  },
  platform: 'browser',
});
