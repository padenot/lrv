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
    test.setTimeout(60000);
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
      await expect(page.locator('#connect-agent')).toBeVisible();
      const first = listen(30);
      await expect(button).toBeVisible();
      await expect(textarea).toHaveValue('First discussion');
      await button.click();
      await expect(textarea).toHaveCount(0);
      await expect(page.locator('.discussion')).toContainText('First discussion');
      const result = await first;
      expect(result.status).toBe('events');
      await expect(page.locator('#agent-status')).toHaveClass(/busy/);
      await expect(page.locator('#agent-status')).toHaveText('Connected');
      await expect(page.locator('#connect-agent')).toBeHidden();
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
      const rootDiscussion = result.events[0].discussion;
      const addReply = async (body: string) => {
        const command = execFileAsync(binary, ['--add-notes', '-'], { cwd: root, env });
        command.child.stdin!.end(
          JSON.stringify([
            {
              file: rootDiscussion.file,
              line: rootDiscussion.line,
              side: rootDiscussion.side,
              body,
              discussion_id: rootDiscussion.id,
              author: 'Test agent',
            },
          ]),
        );
        await command;
      };
      await addReply('Agent answer');
      await expect(page.locator('.discussion-entry-agent')).toHaveText(/Test agent.*Agent answer/s);
      await expect(page.locator('.review-note')).toHaveCount(0);
      await expect(page.locator('#comment-count')).toHaveText('0');
      expect(await page.evaluate(() => window.__APP!.commentCountFor(0))).toBe(0);
      const followUp = listen(30);
      await expect(page.locator('#agent-status')).not.toHaveClass(/busy/);
      await expect(page.locator('#agent-status')).toHaveText('Connected');
      const thread = page.locator('.discussion');
      await thread.locator('.discussion-reply-btn').click();
      const replyText = thread.locator('.discussion-reply-text');
      await expect(replyText).toBeVisible();
      if (!stacked) {
        const formBounds = await thread.locator('.discussion-reply').boundingBox();
        const zoneBounds = await page.locator('.review-note-zone:has(.discussion)').boundingBox();
        expect(formBounds!.y).toBeGreaterThanOrEqual(zoneBounds!.y);
        expect(formBounds!.y + formBounds!.height).toBeLessThanOrEqual(
          zoneBounds!.y + zoneBounds!.height,
        );
      }
      await replyText.fill('User follow-up');
      await replyText.press('ControlOrMeta+Enter');
      const followResult = await followUp;
      expect(followResult.events[0].discussion).toMatchObject({
        thread_id: rootDiscussion.id,
        body: 'User follow-up',
        file: rootDiscussion.file,
        line: rootDiscussion.line,
        side: rootDiscussion.side,
      });
      await expect(thread.locator('.discussion-body')).toHaveText([
        'First discussion',
        'Agent answer',
        'User follow-up',
      ]);
      const keepAttached = listen(2);
      await expect(thread.locator('.discussion-reply-btn')).toBeVisible();
      await thread.locator('.discussion-reply-btn').click();
      await replyText.fill('Unfinished follow-up');
      await addReply('Incoming while typing');
      await expect
        .poll(async () =>
          (await page.request.get(`${url}/api/review-notes`)).json().then((notes) => notes.length),
        )
        .toBe(2);
      await page.waitForTimeout(750);
      await expect(replyText).toHaveValue('Unfinished follow-up');
      await expect(thread).not.toContainText('Incoming while typing');
      await replyText.press('Escape');
      await expect(thread).toContainText('Incoming while typing');
      expect((await keepAttached).status).toBe('timeout');
      await page.reload();
      await expect(page.locator('.discussion')).toContainText('First discussion', {
        timeout: 15000,
      });
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
      await expect(
        page.locator(`${stacked ? '.stacked-comment-form' : '.inline-comment-box'} .comment-error`),
      ).toHaveText('No agent is listening any more');
      await expect(textarea).toHaveValue('Keep this text');
      expect((await idle).status).toBe('timeout');
      await expect(button).toBeHidden({ timeout: 10000 });
      await expect(textarea).toHaveValue('Keep this text');
      const firstThread = page.locator('.discussion').filter({ hasText: 'First discussion' });
      await expect(firstThread.locator('.discussion-delete-btn')).toBeVisible();
      // A failed deletion keeps the complete thread and allows retrying.
      await page.route(`**/api/discussions/${rootDiscussion.id}`, (route) =>
        route.fulfill({ status: 500 }),
      );
      await firstThread.locator('.discussion-delete-btn').click();
      await expect(firstThread.locator('.comment-error')).toContainText('500');
      await expect(firstThread.locator('.discussion-delete-btn')).toBeEnabled();
      await expect(firstThread).toContainText('Agent answer');
      await page.unroute(`**/api/discussions/${rootDiscussion.id}`);
      // Delete remains available after the agent lease expires.
      await firstThread.locator('.discussion-delete-btn').click();
      await expect(firstThread).toHaveCount(0);
      expect((await listen(30)).events).toEqual([
        expect.objectContaining({ type: 'discussion_deleted', id: rootDiscussion.id }),
      ]);
      await page.reload();
      await expect(page.locator('.discussion')).toHaveCount(1, { timeout: 15000 });
      if (!stacked) {
        // Clicking before the diff settles hits the loading overlay or races
        // the initial hunk reveal, which scrolls the comment widget away.
        await expect(page.locator('#editor-container')).not.toHaveClass(/diff-loading/);
        await expect(page.locator('.focused-line')).not.toHaveCount(0);
      }
      await expect(page.locator('.discussion')).toContainText('Second discussion');
      await expect(page.locator('.discussion-entry-agent')).toHaveCount(0);

      await page.unroute('**/api/discussions');
      // Convert reuses the comment form; saving replaces the thread with a comment.
      const remaining = page.locator('.discussion');
      const form = page.locator(stacked ? '.stacked-comment-form' : '.inline-comment-box');
      const summarize = form.locator('.summarize-btn');
      const save = form.locator(stacked ? '.stacked-comment-save' : '.save-btn');
      await remaining.locator('.discussion-convert-btn').click();
      await expect(form).toBeVisible();
      await expect(form.locator('.discuss-btn')).toHaveCount(0);
      await expect(summarize).toBeHidden();
      await textarea.fill('Cancelled conversion');
      await textarea.press('Escape');
      await expect(form).toHaveCount(0);
      await expect(remaining).toContainText('Second discussion');
      await expect(page.locator('#comment-count')).toHaveText('0');
      await remaining.locator('.discussion-convert-btn').click();
      await textarea.fill('Typed review comment');
      const remainingId = await page.evaluate(
        async () => (await fetch('/api/discussions').then((r) => r.json()))[0].id,
      );
      // A failed deletion keeps the form and adds no comment.
      await page.route(`**/api/discussions/${remainingId}`, (route) =>
        route.fulfill({ status: 500 }),
      );
      await save.click();
      await expect(form.locator('.comment-error')).toContainText('500');
      await expect(textarea).toHaveValue('Typed review comment');
      await expect(page.locator('#comment-count')).toHaveText('0');
      await page.unroute(`**/api/discussions/${remainingId}`);
      await textarea.press('ControlOrMeta+Enter');
      await expect(remaining).toHaveCount(0);
      await expect(form).toHaveCount(0);
      await expect(page.locator('#comment-count')).toHaveText('1');
      expect(await page.evaluate(() => window.__APP!.commentManager.getComments())).toEqual([
        { file: 'a.txt', line: 1, side: 'new', body: 'Typed review comment' },
      ]);

      const serverInfo = JSON.parse(
        fs.readFileSync(
          path.join(
            env.LRV_SERVER_DIR,
            fs.readdirSync(env.LRV_SERVER_DIR).find((file) => file.endsWith('.json'))!,
          ),
          'utf8',
        ),
      );
      const postNote = async (note: Record<string, unknown>) => {
        const response = await page.request.post(`${url}/api/review-notes`, {
          headers: { Authorization: `Bearer ${serverInfo.token}` },
          data: [note],
        });
        expect(response.ok()).toBe(true);
      };
      // Authenticated note writes keep the one-second agent lease alive.
      const stayAttached = (body: string) =>
        postNote({ file: 'a.txt', line: 1, side: 'new', body });
      await stayAttached('Unrelated note');
      await expect(page.locator('body')).toHaveClass(/agent-attached/);
      const summaryRoot = await page.evaluate(() =>
        window.__APP!.discussionManager.send({
          file: 'a.txt',
          line: 1,
          side: 'old',
          commit_idx: 0,
          body: 'Thread to summarize',
        }),
      );
      await remaining.locator('.discussion-convert-btn').click();
      await textarea.fill('Draft before summary');
      await stayAttached('Keep attached 1');
      await summarize.click();
      await expect(summarize).toHaveText('Summarizing…');
      await expect(summarize).toBeDisabled();
      await textarea.fill('Still editable while waiting');
      const requests = await (await page.request.get(`${url}/api/discussions`)).json();
      expect(requests[1]).toMatchObject({ thread_id: summaryRoot.id, summarize: true });
      await expect(remaining.locator('.discussion-body')).toHaveText(['Thread to summarize']);
      await stayAttached('Unrelated while converting');
      await page.waitForTimeout(750);
      await expect(textarea).toHaveValue('Still editable while waiting');
      await postNote({
        file: 'a.txt',
        line: 1,
        side: 'new',
        body: 'Agent summary',
        discussion_id: summaryRoot.id,
        summary: true,
      });
      await expect(textarea).toHaveValue('Agent summary');
      await expect(summarize).toHaveText('Summarize');
      await expect(remaining.locator('.discussion-body')).toHaveText(['Thread to summarize']);
      await expect(remaining.locator('.discussion-entry-agent')).toHaveCount(0);
      // A second request must not reuse the previous summary.
      await stayAttached('Keep attached 2');
      await summarize.click();
      await expect(summarize).toHaveText('Summarizing…');
      await expect(textarea).toHaveValue('Agent summary');
      await postNote({
        file: 'a.txt',
        line: 1,
        side: 'new',
        body: 'Fresh summary',
        discussion_id: summaryRoot.id,
        summary: true,
      });
      await expect(textarea).toHaveValue('Fresh summary');
      await textarea.fill('Edited summary');
      await save.click();
      await expect(remaining).toHaveCount(0);
      await expect(page.locator('#comment-count')).toHaveText('2');
      expect(await page.evaluate(() => window.__APP!.commentManager.getComments())).toEqual([
        { file: 'a.txt', line: 1, side: 'new', body: 'Typed review comment' },
        { file: 'a.txt', line: 1, side: 'old', body: 'Edited summary' },
      ]);
      expect(await (await page.request.get(`${url}/api/discussions`)).json()).toEqual([]);
      const notes = await (await page.request.get(`${url}/api/review-notes`)).json();
      expect(notes.every((note: { discussion_id?: string }) => !note.discussion_id)).toBe(true);
      await page.locator('#submit-review').click();
      await page.locator('.confirm-submit-btn').click();
      await expect.poll(() => server.exitCode).toBe(0);
      const submitted = JSON.parse(stdout);
      expect(submitted.comments).toEqual([
        { file: 'a.txt', line: 1, side: 'new', body: 'Typed review comment' },
        { file: 'a.txt', line: 1, side: 'old', body: 'Edited summary' },
      ]);
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
