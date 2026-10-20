import { test, expect } from '@playwright/test';
import { spawn, execFile, execFileSync, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isolateConfig } from '../test-config';
import { commentDraftCount } from '../comment-draft-helpers';

const execFileAsync = promisify(execFile);
const binary = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');

for (const stacked of [false, true]) {
  test(`discussions in ${stacked ? 'stacked' : 'Monaco'} view`, async ({ page }) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lrv-discussions-'));
    const diffPath = path.join(root, 'review.diff');
    const env = {
      ...process.env,
      LRV_SERVER_DIR: path.join(root, 'servers'),
      LRV_COMMENT_DB: path.join(root, 'comments.db'),
      XDG_CONFIG_HOME: path.join(root, 'config'),
      LRV_AGENT_LEASE_SECS: '1',
    };
    let child: ChildProcess | null = null;
    const listeners: ChildProcess[] = [];
    const listen = (timeout: number) => {
      const command = execFileAsync(binary, ['--listen', '--listen-timeout', String(timeout)], {
        cwd: root,
        env,
      });
      listeners.push(command.child);
      return command.then(({ stdout }) => JSON.parse(stdout));
    };
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
      const open = async () => {
        if (stacked) {
          await page
            .locator('.stacked-code-view diffs-container [data-additions] [data-column-number]')
            .last()
            .click({ position: { x: 8, y: 8 } });
        } else {
          await page.evaluate(() => window.__APP!.showCommentDialog('a.txt', 1, 1, 'new'));
        }
        await expect(
          page.locator(stacked ? '.stacked-comment-form' : '.inline-comment-box'),
        ).toBeVisible();
      };
      await page.goto(url);
      await expect(page.locator('.monaco-diff-editor')).toBeVisible();
      if (stacked) {
        await page.locator('#toggle-stacked').click();
      }
      const textarea = page.locator(stacked ? '.stacked-comment-ta' : '.comment-textarea');
      const button = page.locator('.discuss-btn');
      await open();
      await textarea.fill('First discussion');
      await expect(button).toBeHidden();
      await textarea.press('ControlOrMeta+Alt+Enter');
      await expect(page.locator('#comment-count')).toHaveText('0');
      const first = listen(30);
      await expect(button).toBeVisible();
      await expect(textarea).toHaveValue('First discussion');
      await button.click();
      await expect(textarea).toHaveCount(0);
      await expect(page.locator('.discussion')).toContainText('First discussion');
      const result = await first;
      expect(result.status).toBe('events');
      expect(result.events[0].discussion).toMatchObject({
        file: 'a.txt',
        line: 1,
        side: 'new',
        body: 'First discussion',
      });
      await expect(page.locator('#comment-count')).toHaveText('0');
      await page.locator('#submit-review').click();
      await expect(page.getByText('No comments. Submit to approve this review.')).toBeVisible();
      await expect(page.locator('.submit-review-modal')).not.toContainText('First discussion');
      await page.locator('.cancel-submit-btn').click();
      expect(await commentDraftCount(page)).toBe(0);
      await page.reload();
      await expect(page.locator('.discussion')).toContainText('First discussion');
      const second = listen(30);
      await open();
      await expect(button).toBeVisible();
      await textarea.fill('Second discussion');
      await textarea.press('ControlOrMeta+Alt+Enter');
      expect((await second).status).toBe('events');
      await expect(textarea).toHaveCount(0);
      await expect(page.locator('.discussion')).toHaveCount(2);
      await expect(page.locator('#comment-count')).toHaveText('0');
      expect(await commentDraftCount(page)).toBe(0);
      const idle = listen(10);
      await open();
      await expect(button).toBeVisible();
      await textarea.fill('Keep this text');
      await page.route('**/api/discussions', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({ status: 409, body: 'No agent' });
        } else {
          await route.continue();
        }
      });
      await button.click();
      await expect(page.locator('.comment-error')).toHaveText('No agent is listening any more');
      await expect(textarea).toHaveValue('Keep this text');
      expect((await idle).status).toBe('timeout');
      await expect(button).toBeHidden({ timeout: 10000 });
      await expect(textarea).toHaveValue('Keep this text');
    } finally {
      for (const listener of listeners) {
        if (listener.exitCode === null) {
          listener.kill('SIGKILL');
        }
      }
      if (child && child.exitCode === null) {
        child.kill('SIGKILL');
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
