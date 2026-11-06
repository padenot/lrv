import { test, expect } from '@playwright/test';
import { spawn, execFile, execFileSync, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isolateConfig } from '../test-config';

const execFileAsync = promisify(execFile);
const binary = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');

for (const stacked of [false, true]) {
  test(`live notes preserve replies in ${stacked ? 'stacked' : 'Monaco'} view`, async ({
    page,
  }) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lrv-live-notes-'));
    const serverDir = path.join(root, 'servers');
    const notesPath = path.join(root, 'notes.json');
    const diffPath = path.join(root, 'review.diff');
    const env = {
      ...process.env,
      LRV_SERVER_DIR: serverDir,
      LRV_COMMENT_DB: path.join(root, 'comments.db'),
      XDG_CONFIG_HOME: path.join(root, 'config'),
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
      let stdout = '';
      server.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      const url = await new Promise<string>((resolve, reject) => {
        let output = '';
        const timer = setTimeout(
          () => reject(new Error(`Server startup timeout: ${output}`)),
          15000,
        );
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
      if (stacked) {
        await page.evaluate(() => window.__APP!.showStackedView());
      }
      const add = async (notes: object[], stdin = false) => {
        fs.writeFileSync(notesPath, JSON.stringify(notes));
        if (!stdin) {
          const result = await execFileAsync(binary, ['--add-notes', notesPath], {
            cwd: root,
            env,
          });
          return JSON.parse(result.stdout);
        }
        return new Promise((resolve, reject) => {
          const command = spawn(binary, ['--add-notes', '-'], { cwd: root, env });
          let output = '';
          let error = '';
          command.stdout.on('data', (data: Buffer) => {
            output += data.toString();
          });
          command.stderr.on('data', (data: Buffer) => {
            error += data.toString();
          });
          command.on('error', reject);
          command.on('exit', (code) =>
            code === 0 ? resolve(JSON.parse(output)) : reject(new Error(error)),
          );
          command.stdin.end(JSON.stringify(notes));
        });
      };
      const first = { file: 'a.txt', line: 1, side: 'new', body: 'First live note' };
      expect(await add([first])).toEqual({ added: 1, skipped: 0 });
      await expect(page.getByText(first.body, { exact: true })).toBeVisible();
      expect(await add([first])).toEqual({ added: 0, skipped: 1 });
      await expect(page.getByText(first.body, { exact: true })).toHaveCount(1);
      await page.locator('.review-note button', { hasText: 'Reply' }).click();
      const reply = page.locator('.review-note-reply-text');
      await reply.fill('Keep this draft');
      const second = { ...first, id: 'second', body: 'Second live note' };
      expect(await add([second], true)).toEqual({ added: 1, skipped: 0 });
      await expect
        .poll(async () => (await page.request.get(`${url}/api/review-notes`)).json())
        .toHaveLength(2);
      // Allow the deferred merge to run while the reply is open.
      await page.waitForTimeout(750);
      await expect(reply).toHaveValue('Keep this draft');
      await expect(page.getByText(second.body, { exact: true })).toHaveCount(0);
      await page.locator('.review-note-reply button', { hasText: 'Queue' }).click();
      await expect(page.getByText(second.body, { exact: true })).toBeVisible();
      await expect(page.locator('#comment-count')).toHaveText('1');
      await page.locator('.review-note').first().locator('button', { hasText: 'Accept' }).click();
      await expect(page.locator('#comment-count')).toHaveText('1');
      await expect(page.locator('.review-note button', { hasText: 'Undo' })).toHaveCount(1);
      expect(await add([first, second])).toEqual({ added: 0, skipped: 2 });
      await expect(page.locator('.review-note button', { hasText: 'Undo' })).toHaveCount(1);
      await expect(page.getByText(first.body, { exact: true })).toHaveCount(1);
      child.kill('SIGINT');
      await expect.poll(() => child?.exitCode).toBe(130);
      expect(stdout).toBe('');
      await expect.poll(() => fs.readdirSync(serverDir).length).toBe(0);
    } finally {
      if (child && child.exitCode === null) {
        child.kill('SIGKILL');
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
