// Ensure every code-split chunk referenced by the bundle is shipped to crates.io.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = new Set(execFileSync('cargo', ['package', '--list', '--allow-dirty'], { encoding: 'utf8' }).split('\n'));
const bundle = readFileSync('web/assets/app/main.js', 'utf8');
const chunks = [...bundle.matchAll(/chunks\/[\w.-]+\.js/g)].map((match) => `web/assets/app/${match[0]}`);
if (chunks.length === 0) throw new Error('No code-split chunks found in main.js; build the frontend first');
for (const chunk of chunks) {
  if (!files.has(chunk)) throw new Error(`Package is missing ${chunk}`);
}
