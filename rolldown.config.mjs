import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'web/src/main.ts',
  output: {
    file: 'web/assets/app/main.js',
    format: 'esm',
    sourcemap: false,
  },
  platform: 'browser',
});
