import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'rolldown';

const directory = await mkdtemp(join(tmpdir(), 'lrv-web-tests-'));
try {
  const file = join(directory, 'web-unit.test.mjs');
  await build({
    input: 'tests/web-unit.test.ts',
    platform: 'node',
    output: { file, format: 'esm' },
  });
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (result.error) {
    throw result.error;
  }
  process.exitCode = result.status ?? 1;
} finally {
  await rm(directory, { recursive: true, force: true });
}
