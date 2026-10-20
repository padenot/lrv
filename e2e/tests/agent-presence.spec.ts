import { test, expect } from '@playwright/test';
import { spawn, execFile, execFileSync, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isolateConfig } from '../test-config';

const execFileAsync = promisify(execFile);
const binary = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');

test('agent presence follows the listen poll and lease expiry', async ({ page }) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lrv-agent-presence-'));
  const diffPath = path.join(root, 'review.diff');
  const env = {
    ...process.env,
    LRV_SERVER_DIR: path.join(root, 'servers'),
    LRV_COMMENT_DB: path.join(root, 'comments.db'),
    XDG_CONFIG_HOME: path.join(root, 'config'),
    LRV_AGENT_LEASE_SECS: '1',
  };
  let child: ChildProcess | null = null;
  try {
    execFileSync('git', ['init', '-q', root]);
    fs.writeFileSync(path.join(root, 'a.txt'), 'new\n');
    fs.writeFileSync(
      diffPath,
      'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n',
    );
    await isolateConfig(page);
    child = spawn(binary, ['--file', diffPath, '--no-open'], { cwd: root, env });
    const server = child;
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`Server startup timeout: ${output}`)), 15000);
      server.stderr?.on('data', (data: Buffer) => {
        output += data.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      server.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      server.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exited ${code}: ${output}`));
      });
    });
    await page.goto(url);
    await expect(page.locator('.monaco-diff-editor')).toBeVisible();
    const badge = page.locator('#agent-status');
    await expect(badge).toBeHidden();
    const listening = execFileAsync(binary, ['--listen', '--listen-timeout', '2'], {
      cwd: root,
      env,
      timeout: 10000,
    });
    await expect(badge).toBeVisible();
    const result = await listening;
    expect(JSON.parse(result.stdout).status).toBe('timeout');
    await expect(badge).toBeHidden({ timeout: 10000 });
    child.kill('SIGINT');
    await expect.poll(() => child?.exitCode).toBe(130);
  } finally {
    if (child && child.exitCode === null) {
      child.kill('SIGKILL');
    }
    fs.rmSync(root, { recursive: true, force: true });
  }
});
