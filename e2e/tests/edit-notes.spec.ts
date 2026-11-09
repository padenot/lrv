import { test, expect } from '@playwright/test';
import { spawn, execFileSync, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isolateConfig } from '../test-config';

const binary = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');

for (const stacked of [false, true]) {
  test(`edited acceptance survives restore, recovery and Finish in ${stacked ? 'stacked' : 'Monaco'} view`, async ({
    page,
  }) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lrv-edit-notes-'));
    const env = {
      ...process.env,
      LRV_SERVER_DIR: path.join(root, 'servers'),
      LRV_COMMENT_DB: path.join(root, 'comments.db'),
      XDG_CONFIG_HOME: path.join(root, 'config'),
    };
    let child: ChildProcess | undefined;
    try {
      fs.writeFileSync(path.join(root, 'a.txt'), 'new\n');
      fs.writeFileSync(
        path.join(root, 'review.diff'),
        'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n',
      );
      fs.writeFileSync(
        path.join(root, 'notes.json'),
        JSON.stringify([
          { id: 'agent', file: 'a.txt', line: 1, side: 'new', body: 'Original finding' },
          {
            id: 'host',
            origin: 'host',
            file: 'a.txt',
            line: 1,
            side: 'new',
            body: 'Human finding',
          },
        ]),
      );
      child = spawn(
        binary,
        ['--file', 'review.diff', '--review-notes-file', 'notes.json', '--no-open', '--port', '0'],
        { cwd: root, env },
      );
      const server = child;
      let stdout = '';
      server.stdout!.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      const url = await new Promise<string>((resolve, reject) => {
        let output = '';
        const timer = setTimeout(() => reject(new Error(`Startup timeout: ${output}`)), 15000);
        server.stderr!.on('data', (data: Buffer) => {
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
      await isolateConfig(page);
      await page.goto(url);
      await expect(page.locator('.monaco-diff-editor')).toBeVisible();
      if (stacked) {
        await page.evaluate(() => window.__APP!.showStackedView());
      }
      const note = page.locator('.review-note').filter({ hasText: 'Original finding' });
      const host = page.locator('.review-note').filter({ hasText: 'Human finding' });
      await expect(host.locator('button', { hasText: /^Edit$/ })).toHaveCount(0);
      await note.locator('button', { hasText: /^Edit$/ }).click();
      const textarea = note.locator('textarea');
      await expect(textarea).toHaveValue('Original finding');
      await textarea.fill('   ');
      await textarea.press('ControlOrMeta+Enter');
      await expect(textarea).toBeVisible();
      await textarea.fill('First edit');
      await textarea.press('ControlOrMeta+Enter');
      // Select by status while the original text is hidden.
      const accepted = page.locator('.review-note-accepted');
      await expect(accepted.locator('.review-note-status')).toHaveText('Accepted (edited)');
      await expect(accepted.locator('.review-note-body').first()).toHaveText('First edit');
      await accepted.locator('button', { hasText: /^Show original$/ }).click();
      await expect(accepted.locator('.review-note-original')).toHaveText('Original finding');
      await expect(accepted.locator('.review-note-original')).toBeVisible();
      await accepted.locator('button', { hasText: /^Edit$/ }).click();
      await expect(accepted.locator('textarea')).toHaveValue('First edit');
      await accepted.locator('textarea').fill('Canceled edit');
      await accepted.locator('button', { hasText: /^Cancel$/ }).click();
      await expect(accepted.locator('.review-note-body').first()).toHaveText('First edit');
      await accepted.locator('button', { hasText: /^Undo$/ }).click();
      await expect(note.locator('.review-note-body')).toHaveText('Original finding');
      await expect(note.locator('button', { hasText: /^Show original$/ })).toHaveCount(0);
      await note.locator('button', { hasText: /^Edit$/ }).click();
      await expect(note.locator('textarea')).toHaveValue('Original finding');
      await note.locator('textarea').fill('Edited finding for Finish');
      await note.locator('textarea').press('ControlOrMeta+Enter');
      // Wait for the serialized draft write before navigating away.
      await expect
        .poll(() =>
          page.evaluate(async () => {
            const app = window.__APP!;
            await app.commentDraftWrite;
            return app.reviewNoteManager.getEdits();
          }),
        )
        .toEqual({ agent: 'Edited finding for Finish' });
      await page.reload();
      await page.locator('#restore-yes-btn').click();
      await expect(page.locator('.review-note-status-accepted')).toHaveText('Accepted (edited)');
      await expect(page.locator('.review-note-accepted .review-note-body').first()).toHaveText(
        'Edited finding for Finish',
      );
      // Exercise the actual recovery CLI while the session remains unfinished.
      await expect
        .poll(() => {
          const result = execFileSync(binary, ['--recover'], { cwd: root, env, encoding: 'utf8' });
          return JSON.parse(result).comments?.[0]?.in_reply_to?.body;
        })
        .toBe('Edited finding for Finish');
      await page.locator('#submit-review').click();
      await page.locator('.confirm-submit-btn').click();
      await expect.poll(() => server.exitCode).toBe(0);
      const result = JSON.parse(stdout);
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0]).toMatchObject({
        body: '',
        in_reply_to: { id: 'agent', body: 'Edited finding for Finish' },
      });
    } finally {
      if (child && child.exitCode === null) {
        child.kill('SIGKILL');
      }
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
