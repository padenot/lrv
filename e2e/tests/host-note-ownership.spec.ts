import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isolateConfig } from '../test-config';

const binary = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');

for (const stacked of [false, true]) {
  for (const ownership of [false, true, null, undefined]) {
    test(`host note ownership ${ownership} in ${stacked ? 'stacked' : 'Monaco'} view`, async ({
      page,
    }) => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lrv-host-ownership-'));
      let child: ChildProcess | undefined;
      try {
        fs.writeFileSync(path.join(root, 'a.txt'), 'new\n');
        const diffPath = path.join(root, 'review.diff');
        fs.writeFileSync(
          diffPath,
          'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n',
        );
        const notesPath = path.join(root, 'notes.json');
        fs.writeFileSync(
          notesPath,
          JSON.stringify([
            { id: 'host', origin: 'host', file: 'a.txt', line: 1, side: 'new', body: 'Host note' },
            { id: 'agent', file: 'a.txt', line: 1, side: 'new', body: 'Agent note' },
          ]),
        );
        await isolateConfig(page);
        await page.route('**/api/context', async (route) => {
          const response = await route.fetch();
          const context = await response.json();
          if (ownership === undefined) {
            delete context.own_revisions;
          } else {
            context.own_revisions = [ownership];
          }
          await route.fulfill({ json: context });
        });
        child = spawn(binary, ['--file', diffPath, '--review-notes-file', notesPath, '--no-open'], {
          cwd: root,
          env: {
            ...process.env,
            XDG_CONFIG_HOME: path.join(root, 'config'),
            LRV_SERVER_DIR: path.join(root, 'servers'),
            LRV_COMMENT_DB: path.join(root, 'comments.db'),
          },
        });
        const server = child;
        const url = await new Promise<string>((resolve, reject) => {
          let output = '';
          const timer = setTimeout(() => reject(new Error(`Startup timeout: ${output}`)), 15000);
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
        const host = page.locator('.review-note').filter({ hasText: 'Host note' });
        const agent = page.locator('.review-note').filter({ hasText: 'Agent note' });
        await expect(host).toBeVisible();
        await expect(host.locator('button', { hasText: 'Reply' })).toBeVisible();
        for (const action of ['Accept', 'Ignore']) {
          if (ownership === false) {
            await expect(host.locator('button', { hasText: action })).toHaveCount(0);
          } else {
            await expect(host.locator('button', { hasText: action })).toBeVisible();
          }
          await expect(agent.locator('button', { hasText: action })).toBeVisible();
        }
        await page.evaluate(() => document.body.classList.add('agent-attached'));
        if (ownership === false) {
          await expect(host.locator('button', { hasText: 'Reply' })).toBeVisible();
          await expect(host.locator('button', { hasText: 'Discuss' })).toHaveCount(0);
          // Restored dispositions cannot replace Reply or leak an accept request into Finish.
          await page.evaluate(() =>
            window.__APP!.reviewNoteManager.applyDispositions({ host: 'accepted' }),
          );
          await expect(host.locator('button', { hasText: 'Reply' })).toBeVisible();
          await expect(host.locator('button', { hasText: 'Undo' })).toHaveCount(0);
          await page.locator('#submit-review').click();
          await expect(page.locator('.submit-review-modal')).not.toContainText('Host note');
          await page.locator('.cancel-submit-btn').click();
          await host.locator('button', { hasText: 'Reply' }).click();
          await host.locator('.review-note-reply-text').fill('A real reply');
          await host.locator('button', { hasText: 'Queue' }).click();
          const comments = await page.evaluate(() => window.__APP!.commentManager.getComments());
          expect(comments).toMatchObject([
            {
              file: 'a.txt',
              line: 1,
              side: 'new',
              body: 'A real reply',
              in_reply_to: { id: 'host' },
            },
          ]);
        } else {
          await expect(host.locator('button', { hasText: 'Reply' })).toBeHidden();
          await expect(host.locator('button', { hasText: 'Discuss' })).toBeVisible();
        }
        await expect(agent.locator('button', { hasText: 'Discuss' })).toBeVisible();
      } finally {
        child?.kill('SIGKILL');
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
}
