import { commentDraftCount } from '../comment-draft-helpers';
import { test, expect, Locator, Page } from '@playwright/test';
import { isolateConfig } from '../test-config';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

test.beforeEach(async ({ page }) => isolateConfig(page));

let serverProcess: ChildProcess | null = null;
let serverUrl: string | null = null;
let testRepoPath: string | null = null;
let serverLogPath: string | null = null;
const IS_BENCH = !!process.env.LRV_BENCH_DIFF;

/**
 * Start the lrv server with a test diff
 */
async function startServer(port: number = 0, options?: { title?: string }): Promise<void> {
  if (!testRepoPath) {
    throw new Error('Test repo not initialized');
  }

  return new Promise((resolve, reject) => {
    // Run cargo from the main repo, but execute git diff from the test repo
    const cargoPath = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
    const extraFlags = options?.title ? ` --title \"${options.title}\"` : '';
    const benchDiff = process.env.LRV_BENCH_DIFF;
    const cmd = benchDiff
      ? `cd "${testRepoPath}" && cat "${benchDiff}" | "${cargoPath}" --port ${port} --no-open${extraFlags}`
      : `cd "${testRepoPath}" && git diff HEAD | "${cargoPath}" --port ${port} --no-open${extraFlags}`;

    // Reset state for new instance
    serverUrl = null;
    const resultsDir = path.resolve(__dirname, '../test-results');
    try {
      fs.mkdirSync(resultsDir, { recursive: true });
    } catch {}
    serverLogPath = path.join(resultsDir, `server-${Date.now()}.log`);

    serverProcess = spawn('bash', ['-c', cmd], {
      stdio: ['inherit', 'pipe', 'pipe'],
      detached: true,
      env: {
        ...process.env,
        XDG_CONFIG_HOME: path.join(testRepoPath, '.config'),
        LRV_COMMENT_DB: path.join(testRepoPath, '.config', 'lrv-comments.db'),
      },
    });

    let output = '';
    let errorOutput = '';

    const appendLog = (chunk: string) => {
      try {
        if (serverLogPath) {
          fs.appendFileSync(serverLogPath, chunk);
        }
      } catch {}
    };

    let settled = false;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;

    const checkForReady = (data: Buffer) => {
      const text = data.toString();
      output += text;
      appendLog(text);
      // Capture first URL; its presence means the server is ready
      const urlMatch = output.match(/http:\/\/[^\s]+:\d+/);
      if (urlMatch && !serverUrl && !settled) {
        settled = true;
        serverUrl = urlMatch[0];
        if (startupTimer) {
          clearTimeout(startupTimer);
        }
        setTimeout(resolve, 500);
      }
    };

    serverProcess.stdout?.on('data', checkForReady);
    serverProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      errorOutput += text;
      appendLog(text);
      checkForReady(Buffer.from(text));
    });

    serverProcess.on('error', (error) => {
      if (!settled) {
        settled = true;
        if (startupTimer) {
          clearTimeout(startupTimer);
        }
        reject(error);
      }
    });

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null && !settled) {
        settled = true;
        if (startupTimer) {
          clearTimeout(startupTimer);
        }
        reject(new Error(`Server exited with code ${code}. Error: ${errorOutput}`));
      }
    });

    // Timeout if server doesn't start
    startupTimer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`Server startup timeout. Output: ${output}. Error: ${errorOutput}`));
    }, 10000);
  });
}

async function openApp(page: Page, options: { requireEditor?: boolean } = {}) {
  const url = (serverUrl ?? 'http://localhost:9999') + '/';
  const requireEditor = options.requireEditor ?? true;
  await page.goto(url);
  // AMD loader present
  await page.waitForFunction(() => (window as any).require !== undefined, { timeout: 10000 });
  // Ensure file list exists; click first item if editor not visible yet
  await page.locator('#file-list').waitFor({ state: 'attached', timeout: 10000 });
  await page.waitForFunction(
    () =>
      document.querySelector('file-tree-container.lrv-file-tree') !== null ||
      document.querySelector('#file-list li') !== null,
    { timeout: 10000 },
  );
  if (!requireEditor) {
    return;
  }
  if (!(await page.locator('.monaco-editor:visible').count())) {
    const firstItem = fileTreeRows(page).first();
    if (await firstItem.count()) {
      await firstItem.click({ force: true });
    }
    const isStacked = await page.evaluate(() => (window as any).__APP?.isStacked === true);
    if (isStacked) {
      await page.evaluate(() => (window as any).__APP?.hideStackedView?.());
    }
    await page.waitForFunction(() => (window as any).monaco !== undefined, { timeout: 10000 });
    await page.evaluate(() => (window as any).__APP?.loadFile?.(0));
  }
  await page.waitForSelector('.monaco-editor:visible', { timeout: 20000 });
}

function fileTreeRows(page: Page) {
  return page.locator(
    'file-tree-container.lrv-file-tree [data-type="item"][data-item-type="file"]',
  );
}

function fileTreeRow(page: Page, pathOrName: string) {
  const escaped = pathOrName.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return page.locator(
    `file-tree-container.lrv-file-tree [data-type="item"][data-item-type="file"][data-item-path="${escaped}"], ` +
      `file-tree-container.lrv-file-tree [data-type="item"][data-item-type="file"][data-item-path$="/${escaped}"]`,
  );
}

function selectedFileTreeRow(page: Page) {
  return page.locator(
    'file-tree-container.lrv-file-tree [data-type="item"][data-item-type="file"][data-item-selected="true"]',
  );
}

async function selectFile(page: Page, pathOrName: string) {
  await page.evaluate((target) => {
    const app = (window as any).__APP;
    const index = app?.files?.findIndex(
      (file: { path: string }) => file.path === target || file.path.endsWith(`/${target}`),
    );
    if (index >= 0) {
      return app.loadFile(index);
    }
    throw new Error(`File not found in app.files: ${target}`);
  }, pathOrName);
}

async function openStackedView(page: Page) {
  await openApp(page, { requireEditor: false });
  await page.locator('#toggle-stacked').click();
  await expect(page.locator('#toggle-stacked')).toHaveText('Mode: Stacked');
  await page.locator('.stacked-code-view diffs-container').first().waitFor({ timeout: 10000 });
}

async function addStackedComment(page: Page, body: string) {
  const lineNumber = page
    .locator('.stacked-code-view diffs-container [data-interactive-line-numbers]')
    .first();
  await lineNumber.waitFor({ state: 'visible', timeout: 10000 });
  await lineNumber.click({ position: { x: 8, y: 8 } });
  await expect(page.locator('.stacked-comment-form')).toBeVisible({ timeout: 3000 });
  await page.locator('.stacked-comment-form .stacked-comment-ta').fill(body);
  await page.locator('.stacked-comment-form .stacked-comment-save').click();
  await expect(page.locator('.stacked-comment-form')).not.toBeVisible();
}

async function recoverStoredComments(): Promise<Array<{ body: string }>> {
  const lrvBin = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
  const dbPath = path.join(testRepoPath!, '.config', 'lrv-comments.db');
  // `--recover` exits 1 until the first comment has been synced; report that
  // as "nothing stored yet" so callers can poll instead of failing outright.
  let stdout: string;
  try {
    ({ stdout } = await execAsync(`"${lrvBin}" --recover`, {
      env: { ...process.env, LRV_COMMENT_DB: dbPath },
    }));
  } catch {
    return [];
  }
  return (JSON.parse(stdout) as { comments: Array<{ body: string }> }).comments;
}

/**
 * Stop the server and capture output
 */
async function stopServer(): Promise<string> {
  return new Promise((resolve) => {
    // Capture the process: tests restart the server right after stopping it, so the fallback
    // timer must not kill whatever `serverProcess` points to by then.
    const p = serverProcess;
    if (!p) {
      resolve('');
      return;
    }
    serverProcess = null;

    let output = '';

    p.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      try {
        if (serverLogPath) {
          fs.appendFileSync(serverLogPath, text);
        }
      } catch {}
    });

    const timer = setTimeout(() => {
      try {
        if (p.pid) {
          process.kill(-p.pid, 'SIGKILL');
        }
      } catch {
        // Ignore
      }
      resolve(output);
    }, 2000);

    p.on('close', () => {
      clearTimeout(timer);
      resolve(output);
    });

    // Kill the entire process group to ensure child processes are killed
    if (p.pid) {
      try {
        process.kill(-p.pid, 'SIGTERM');
      } catch {
        // Process might already be dead
      }
    }
  });
}

test.describe('Review Workflow E2E', () => {
  // Build is handled by Justfile before invoking Playwright
  test.beforeAll(async () => {
    console.info('[e2e] Starting tests');
  });

  test.beforeEach(async () => {
    // Create isolated test repository with unique suffix for parallel runs
    const suffix = `${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    testRepoPath = path.join(os.tmpdir(), `lrv-test-${suffix}`);
    const setupScript = path.resolve(__dirname, '../setup-test-repo.sh');
    await execAsync(`"${setupScript}" "${testRepoPath}"`);

    await startServer(0);
    if (serverLogPath) {
      console.info(`[e2e] Server log at: ${serverLogPath}`);
    }
  });

  test.afterEach(async () => {
    await stopServer();

    // Wait for port to be fully released
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Clean up test repository
    if (testRepoPath) {
      await execAsync(`rm -rf "${testRepoPath}"`);
      testRepoPath = null;
    }
  });

  test('should load the diff view', async ({ page }) => {
    await openApp(page);

    // Check that Monaco editor loaded (there are 2 editors in diff view)
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 5000 });

    // Check that file list is visible
    await expect(page.locator('#file-list')).toBeAttached();

    // Check that we have multiple files in the list
    await expect(fileTreeRows(page)).toHaveCount(3);
  });

  test('editor container stays visible and shows content after file switch', async ({ page }) => {
    await openApp(page);

    const editorReady = () =>
      page.waitForFunction(
        () => {
          const el = document.getElementById('editor-container');
          if (!el) {
            return false;
          }
          if (parseFloat(getComputedStyle(el).opacity) < 0.99) {
            return false;
          }
          return document.querySelectorAll('.monaco-editor .view-line').length > 0;
        },
        { timeout: 7000 },
      );

    // Load first file and wait for content
    await selectFile(page, 'file2.txt');
    await editorReady();

    // Switch to second file and verify content appears again
    await selectFile(page, 'file3.txt');
    await editorReady();

    // Opacity must be fully restored
    const opacity = await page
      .locator('#editor-container')
      .evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.99);
  });

  for (const mode of ['file by file', 'stacked'] as const) {
    test(`switching files restores scroll position in ${mode} view`, async ({ page }) => {
      await stopServer();
      for (const file of ['file2.txt', 'file3.txt']) {
        const lines = Array.from({ length: 250 }, (_, index) => `${file} line ${index + 1}`);
        fs.writeFileSync(path.join(testRepoPath!, file), lines.join('\n') + '\n');
      }
      await startServer();

      const stacked = mode === 'stacked';
      if (stacked) {
        await openStackedView(page);
      } else {
        await openApp(page);
      }

      const scrollEditor = (top?: number) =>
        page.evaluate((offset) => {
          const editor = (window as any).__APP.editor.getModifiedEditor();
          if (offset !== undefined) {
            editor.setScrollTop(offset);
          }
          return editor.getScrollTop();
        }, top);
      const viewport = page.locator('.stacked-code-view');
      const getScrollTop = () =>
        stacked ? viewport.evaluate((element) => element.scrollTop) : scrollEditor();

      await fileTreeRow(page, 'file2.txt').click();
      if (stacked) {
        await viewport.evaluate((element) => (element.scrollTop = 1000));
      } else {
        await expect(page.locator('#editor-container')).not.toHaveClass(/diff-loading/);
        await expect(page.getByText('file2.txt line 1', { exact: true })).toBeVisible();
        await scrollEditor(1000);
      }
      await expect.poll(getScrollTop).toBe(1000);

      await fileTreeRow(page, 'file3.txt').click();
      if (stacked) {
        await expect.poll(getScrollTop).toBeGreaterThan(1000);
      } else {
        await expect(page.getByText('file3.txt line 1', { exact: true })).toBeVisible();
        await expect.poll(getScrollTop).toBe(0);
      }

      await fileTreeRow(page, 'file2.txt').click();
      await expect.poll(getScrollTop).toBe(1000);

      if (stacked) {
        const navigations = await page.evaluate(async () => {
          const app = window.__APP!;
          const navigate = app.scrollToFileInStacked;
          const targets: string[] = [];
          app.scrollToFileInStacked = (index) => {
            targets.push(app.files[index]!.path);
            return navigate.call(app, index);
          };
          try {
            app.renderFileList();
            await app.scrollToFileInStacked(
              app.files.findIndex((file) => file.path === 'file3.txt'),
            );
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            return targets;
          } finally {
            app.scrollToFileInStacked = navigate;
          }
        });
        expect(navigations).toEqual(['file3.txt']);
      }
    });
  }

  test('should display diff content in both panels', async ({ page }) => {
    await openApp(page);

    // Wait for Monaco to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Click on test.txt to view it
    await selectFile(page, 'test.txt');

    // Check that diff content is visible (look for our modified line)
    await expect(page.locator('text=line 2 modified')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=line 4 added')).toBeVisible();
  });

  test('should add a comment via line number click', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await openApp(page);

    // Wait for editor to be ready
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Wait a bit for Monaco handlers to be fully registered
    await page.waitForTimeout(500);

    // Click on a line number to add a comment
    const lineNumber = page.locator('.modified .line-numbers').first();
    await lineNumber.click();

    // Comment dialog should appear
    await expect(page.locator('.inline-comment-box')).toBeVisible({ timeout: 2000 });
    const commentBoxGeometry = await page.locator('.inline-comment-box').evaluate((box) => {
      const boxRect = box.getBoundingClientRect();
      const paneRect = box.closest('.monaco-editor')!.getBoundingClientRect();
      const probe = document.createElement('span');
      probe.style.cssText =
        'position:fixed;visibility:hidden;white-space:nowrap;width:80ch;box-sizing:border-box';
      probe.style.font = getComputedStyle(box).font;
      document.body.append(probe);
      const eightyChWidth = probe.getBoundingClientRect().width;
      probe.remove();
      return {
        boxWidth: boxRect.width,
        eightyChWidth,
        boxLeft: boxRect.left,
        boxRight: boxRect.right,
        paneLeft: paneRect.left,
        paneRight: paneRect.right,
        borderRadius: getComputedStyle(box.querySelector('textarea')!).borderRadius,
      };
    });
    expect(commentBoxGeometry.boxWidth).toBeLessThan(commentBoxGeometry.eightyChWidth);
    expect(commentBoxGeometry.boxLeft).toBeGreaterThanOrEqual(commentBoxGeometry.paneLeft);
    expect(commentBoxGeometry.boxRight).toBeLessThanOrEqual(commentBoxGeometry.paneRight);
    expect(commentBoxGeometry.borderRadius).toBe('0px');

    // Fill in comment
    await page.locator('.comment-textarea').fill('x'.repeat(500));
    const textareaSize = await page.locator('.comment-textarea').evaluate((textarea) => ({
      scrollWidth: textarea.scrollWidth,
      clientWidth: textarea.clientWidth,
    }));
    expect(textareaSize.scrollWidth).toBeLessThanOrEqual(textareaSize.clientWidth);

    // Save comment
    await page.locator('.save-btn').click();

    // Comment dialog should close
    await expect(page.locator('.inline-comment-box')).not.toBeVisible();

    // Comment count should update
    await expect(page.locator('#comment-count')).toHaveText('1');
  });

  test('should not open a comment when clicking code in Monaco mode', async ({ page }) => {
    await openApp(page);
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    await page
      .locator('.modified .view-line')
      .first()
      .click({ position: { x: 40, y: 8 } });

    await expect(page.locator('.inline-comment-box')).toHaveCount(0);
    await expect(page.locator('#comment-count')).toHaveText('0');
  });

  test('should create a Monaco range comment from a line-number drag', async ({ page }) => {
    await openApp(page);
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    const startLine = page.locator('.modified .line-numbers').nth(1);
    const endLine = page.locator('.modified .line-numbers').nth(3);
    await startLine.hover();
    await page.mouse.down();
    await expect(page.locator('.inline-comment-box')).toHaveCount(0);
    await endLine.hover();
    await page.mouse.up();

    await expect(page.locator('.inline-comment-box h3')).toContainText('Line 2-4');
    await page.locator('.comment-textarea').fill('Selected Monaco range');
    await page.locator('.save-btn').click();

    await expect(page.locator('#comment-count')).toHaveText('1');
    const line = await page.evaluate(
      () => (window as any).__APP.commentManager.getComments()[0].line,
    );
    expect(line).toEqual([2, 4]);
  });

  test('should handle range comments for decoration + edit/delete', async ({ page }) => {
    await openApp(page);
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    await page.evaluate(() => {
      const app = (window as any).__APP;
      const file = app.files[app.currentFileIndex];
      app.commentManager.addComment({
        file: file.path,
        line: [2, 4],
        side: 'new',
        body: 'Range comment',
      });
      app.updateDecorations();
    });

    await expect(page.locator('#comment-count')).toHaveText('1');

    const hasRangeDecorations = await page.evaluate(() => {
      const app = (window as any).__APP;
      const ed = app.editor.getModifiedEditor();
      const lines = [2, 3, 4];
      return lines.every((ln) =>
        (ed.getLineDecorations(ln) || []).some((d: any) => d.options?.glyphMarginClassName),
      );
    });
    expect(hasRangeDecorations).toBeTruthy();

    await page.locator('.modified .line-numbers').nth(2).click(); // line 3
    await expect(page.locator('.inline-comment-box h3')).toContainText('Line 2-4 - Edit');

    await page.locator('.delete-btn').click();
    await expect(page.locator('#comment-count')).toHaveText('0');
  });

  test('should preview full range comments in submit modal', async ({ page }) => {
    await openApp(page);
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    await page.evaluate(() => {
      const app = (window as any).__APP;
      const file = app.files[app.currentFileIndex];
      app.commentManager.addComment({
        file: file.path,
        line: [2, 4],
        side: 'new',
        body: 'Range preview comment',
      });
      app.updateDecorations();
    });

    await page.locator('#submit-review').click();
    await expect(page.locator('text=Finish review')).toBeVisible();
    await expect(page.locator('.comment-preview-header')).toContainText(':2-4 (new)');

    const highlighted = await page.locator('.comment-preview-code-line.target').count();
    expect(highlighted).toBe(3);
  });

  test('should show keyboard shortcuts help', async ({ page }) => {
    await openApp(page);

    // Wait for page to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 5000 });

    // Click on the header to focus the page without triggering Monaco
    await page.locator('.header .wordmark').click();

    await page.keyboard.press('?');

    // Help modal should appear
    await expect(page.locator('.submit-modal h2:has-text("Keyboard Shortcuts")')).toBeVisible();

    // Should show some shortcuts
    await expect(page.locator('text=Next file')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('.submit-modal h2:has-text("Keyboard Shortcuts")')).not.toBeVisible();

    const help = page.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    const header = page.locator('.header .wordmark');
    // Finnish Shift+Minus types '?', and Shift+Slash types '_'.
    await header.dispatchEvent('keydown', {
      key: '_',
      code: 'Slash',
      shiftKey: true,
      bubbles: true,
    });
    await expect(help).toBeHidden();
    await header.dispatchEvent('keydown', {
      key: '?',
      code: 'Minus',
      shiftKey: true,
      bubbles: true,
    });
    await expect(help).toBeVisible();
  });

  test('should navigate between files with keyboard', async ({ page }) => {
    await openApp(page);

    // Wait for editor to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 5000 });

    // Click on the header to focus the page without triggering Monaco
    await page.locator('.header .wordmark').click();

    // Verify first file is active
    await expect(selectedFileTreeRow(page)).toHaveCount(1);

    // Get the currently active file index
    const firstActivePath = await selectedFileTreeRow(page).getAttribute('data-item-path');

    // Press Shift+J to go to next file
    await page.keyboard.press('Shift+J');
    // Wait for active index to increment
    await expect(selectedFileTreeRow(page)).not.toHaveAttribute('data-item-path', firstActivePath!);

    // Press Shift+K to go back to previous file
    await page.keyboard.press('Shift+K');
    // Wait to return to first file
    await expect(selectedFileTreeRow(page)).toHaveAttribute('data-item-path', firstActivePath!);
  });

  test('complete review workflow: add comment and submit', async ({ page }) => {
    await openApp(page);

    // Wait for editor
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

    // Wait for Monaco handlers to be registered
    await page.waitForTimeout(500);

    // Add a comment by clicking line number
    const lineNumber = page.locator('.modified .line-numbers').first();
    await lineNumber.click();

    await page.locator('.comment-textarea').fill('Please fix this');
    await page.locator('.save-btn').click();

    // Verify comment was added
    await expect(page.locator('#comment-count')).toHaveText('1');

    // Submit review
    await page.locator('#submit-review').click();

    // Confirmation modal should appear
    await expect(page.locator('text=Finish review')).toBeVisible();
    await expect(page.locator('text=Please fix this')).toBeVisible();

    // Confirm submission
    await page.locator('.confirm-submit-btn').click();

    // Wait for submission to complete
    await expect(page.locator('text=Review finished')).toBeVisible({ timeout: 3000 });
  });

  for (const trigger of ['button', 'shortcut'] as const) {
    test(`LGTM finishes an empty review via the ${trigger}`, async ({ page }) => {
      await openApp(page);
      const request = page.waitForRequest('**/api/complete');
      if (trigger === 'shortcut') {
        await page.locator('.header .wordmark').click();
        await page.keyboard.press('ControlOrMeta+Enter');
      } else {
        await page.getByRole('button', { name: 'LGTM', exact: true }).click();
      }
      expect((await request).postDataJSON()).toEqual({
        comments: [],
        overall_comment: 'LGTM. No comments.',
      });
      await expect(page.locator('#submit-review')).toHaveText('Review finished');
      await expect(page.locator('.submit-review-modal')).toHaveCount(0);
    });
  }

  test('LGTM opens Finish when there is a pending comment', async ({ page }) => {
    await openApp(page);
    await page.locator('.modified .line-numbers').first().click();
    const comment = page.locator('.comment-textarea');
    await comment.fill('Please fix this');
    await comment.press('ControlOrMeta+Enter');
    await expect(page.locator('#comment-count')).toHaveText('1');

    await page.getByRole('button', { name: 'LGTM', exact: true }).click();
    const finish = page.getByRole('dialog', { name: 'Finish review' });
    await expect(finish).toContainText('Please fix this');
    await expect(finish.getByRole('button', { name: 'Finish', exact: true })).toBeEnabled();
  });

  test('submit failures are shown in the dialog and can be retried', async ({ page }) => {
    let attempts = 0;
    await page.route('**/api/complete', (route) => {
      attempts += 1;
      return route.fulfill(attempts === 1 ? { status: 500, body: 'boom' } : { status: 200 });
    });
    await openApp(page);
    await page.locator('#submit-review').click();
    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('.submit-error')).toHaveText('Failed to finish review: boom');
    await expect(page.locator('.confirm-submit-btn')).toBeEnabled();
    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('.submit-error')).toBeHidden();
    await expect(page.locator('#submit-review')).toHaveText('Review finished');
  });

  test('submit is a plain button without detected revisions', async ({ page }) => {
    await openApp(page);
    const submit = page.locator('#submit-review');
    await expect(submit).toHaveText('Finish');
    await expect(submit).not.toHaveAttribute('aria-haspopup');
    expect(await submit.evaluate((button) => getComputedStyle(button, '::after').content)).toBe(
      'none',
    );
    await submit.click();
    await expect(page.locator('#submit-menu')).toHaveCount(0);
    await expect(page.locator('#publish-commit')).toBeHidden();
    await expect(page.locator('#commit-bar')).toBeHidden();
    await expect(page.locator('.submit-review-modal')).toBeVisible();
  });

  test('publish dialog preserves state, retries and closes after publishing the selected revision', async ({
    page,
  }) => {
    await page.route('**/api/context', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: {
          ...(await response.json()),
          phabricator_available: true,
          phabricator_revisions: ['D123', 'D124', 'D125'],
        },
      });
    });
    await page.route('**/api/phabricator', (route) =>
      route.fulfill({
        json: {
          user: 'reviewer',
          revisions: [
            {
              id: 'D123',
              title: 'First revision',
              url: 'https://phab.example/D123',
              commit_idxs: [0],
              own: false,
              closed: false,
              publishable: true,
              published: false,
            },
            {
              id: 'D124',
              title: 'Own revision',
              url: 'https://phab.example/D124',
              commit_idxs: [1],
              own: true,
              closed: true,
              publishable: true,
              published: false,
            },
            {
              id: 'D125',
              title: '',
              url: 'https://phab.example/D125',
              commit_idxs: [2],
              own: false,
              closed: false,
              publishable: false,
              reason: 'Diff mismatch',
              published: false,
            },
          ],
        },
      }),
    );
    const bodies: any[] = [];
    await page.route('**/api/phabricator/publish', async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill(
        bodies.length === 1
          ? { status: 502, body: 'boom' }
          : { json: { url: 'https://phab.example/D123' } },
      );
    });
    await openApp(page);
    await expect(page.locator('#submit-review')).toHaveText('Finish');
    await page.locator('#publish-commit').click();
    const dialog = page.locator('.publish-dialog');
    await expect(dialog.getByRole('tab')).toHaveCount(0);
    await expect(dialog).toContainText('as @reviewer');
    await expect(dialog.locator('.publish-revision')).toBeDisabled();
    await dialog.getByRole('textbox').fill('Overall for D123');
    await dialog.getByRole('button', { name: 'Request Changes' }).click();
    await dialog
      .locator('.submit-modal-footer')
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await page.locator('#publish-commit').click();
    await expect(dialog.getByRole('textbox')).toHaveValue('Overall for D123');
    await dialog.locator('.publish-revision').click();
    await expect(dialog.locator('.submit-error')).toContainText('boom');
    await expect(dialog.locator('.publish-revision')).toBeEnabled();
    await dialog.getByRole('textbox').press('Control+Enter');
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('#publish-commit')).toHaveText('Published ✓');
    await expect(page.locator('#publish-commit')).toBeDisabled();
    expect(bodies[1].action).toBe('request-changes');
    expect(bodies[1].overall_comment).toBe('Overall for D123');
    await expect(page.locator('#submit-review')).toBeEnabled();
  });

  for (const own of [false, true]) {
    test(`publish ${own ? 'limits own revision verdicts' : 'disables mismatched revisions'}`, async ({
      page,
    }) => {
      await page.route('**/api/context', async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          json: {
            ...(await response.json()),
            phabricator_available: true,
            phabricator_revisions: ['D123'],
          },
        });
      });
      await page.route('**/api/phabricator', (route) =>
        route.fulfill({
          json: {
            user: 'reviewer',
            revisions: [
              {
                id: 'D123',
                title: 'Revision',
                url: 'https://phab.example/D123',
                commit_idxs: [0],
                own,
                closed: own,
                publishable: own,
                published: false,
                reason: own ? undefined : 'Diff mismatch',
              },
            ],
          },
        }),
      );
      await openApp(page);
      const button = page.locator('#publish-commit');
      await expect(button).toHaveText('Publish');
      if (!own) {
        await expect(button).toBeDisabled();
        await expect(button).toHaveAttribute('title', 'Diff mismatch');
      } else {
        await button.click();
        const dialog = page.locator('.publish-dialog');
        await expect(dialog.locator('button', { hasText: 'Accept' })).toBeDisabled();
        await expect(dialog.getByRole('button', { name: 'Request Changes' })).toBeDisabled();
        await expect(dialog).toContainText('closed or abandoned');
        await expect(dialog).toContainText('You are the author of D123');
        await dialog.getByRole('textbox').fill('Own revision comment');
        await expect(dialog.locator('.publish-revision')).toBeEnabled();
      }
    });
  }

  test('publish button shows while verifying, then the revision state', async ({ page }) => {
    await page.route('**/api/context', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: {
          ...(await response.json()),
          phabricator_available: true,
          phabricator_revisions: ['D123'],
        },
      });
    });
    let releaseStatus: (status: string) => void = () => {};
    const status = new Promise<string>((resolve) => (releaseStatus = resolve));
    await page.route('**/api/phabricator', async (route) => {
      const value = await status;
      if (value === 'error') {
        await route.fulfill({ status: 500, body: 'no token' });
        return;
      }
      await route.fulfill({
        json: {
          user: 'reviewer',
          revisions: [
            {
              id: 'D123',
              title: 'Revision',
              url: 'https://phab.example/D123',
              commit_idxs: [0],
              own: false,
              closed: false,
              status: value,
              status_name: value === 'accepted' ? 'Accepted' : 'Needs Review',
              publishable: true,
              published: false,
            },
          ],
        },
      });
    });
    await openApp(page);
    const button = page.locator('#publish-commit');
    await expect(button).toHaveText('Publish');
    await expect(button).toBeDisabled();
    await expect(button).toHaveClass(/verifying/);
    await expect(button).toHaveAttribute('title', 'Verifying D123…');

    releaseStatus('accepted');
    await expect(button).toHaveText('Publish');
    await expect(button).toBeEnabled();
    await expect(button).not.toHaveClass(/verifying/);
    await expect(page.locator('#commit-revision')).toHaveClass(/revision-accepted/);
    await expect(page.locator('#commit-revision')).toHaveText('D123 · Accepted');
    await expect(page.locator('#commit-revision a')).toHaveAttribute(
      'href',
      'https://phab.example/D123',
    );
  });

  test('single commit bar hides series navigation', async ({ page }) => {
    await page.route('**/api/diff*', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        json: {
          ...(await response.json()),
          commit_hash: 'abcdef123456',
          commit_message: 'Single commit',
        },
      });
    });
    await openApp(page);
    await expect(page.locator('#commit-bar')).toBeVisible();
    await expect(page.locator('#commit-bar-title')).toHaveText('Single commit');
    await expect(page.locator('#commit-bar-hash')).toHaveText('abcdef12');
    await expect(page.locator('.commit-bar-nav')).toHaveCount(0);
  });

  test('publish button reports a verification failure', async ({ page }) => {
    await page.route('**/api/context', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: {
          ...(await response.json()),
          phabricator_available: true,
          phabricator_revisions: ['D123'],
        },
      });
    });
    await page.route('**/api/phabricator', (route) =>
      route.fulfill({ status: 500, body: 'no token' }),
    );
    await openApp(page);
    const button = page.locator('#publish-commit');
    await expect(button).toHaveText('Publish');
    await expect(button).toBeDisabled();
    await expect(button).not.toHaveClass(/verifying/);
    await expect(button).toHaveAttribute('title', /Failed to verify revisions/);
  });

  test('publishing sends only reply bodies, leaves Accept items for Finish and omits published comments', async ({
    page,
  }) => {
    await page.route('**/api/context', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: {
          ...(await response.json()),
          phabricator_available: true,
          phabricator_revisions: ['D123'],
          own_revisions: [true],
        },
      });
    });
    await page.route('**/api/phabricator', (route) =>
      route.fulfill({
        json: {
          user: 'reviewer',
          revisions: [
            {
              id: 'D123',
              title: 'Revision',
              url: 'https://phab.example/D123',
              commit_idxs: [0],
              own: true,
              closed: false,
              publishable: true,
              published: false,
            },
          ],
        },
      }),
    );
    await page.route('**/api/review-notes', (route) =>
      route.fulfill({
        json: ['test.txt', 'file2.txt', 'file3.txt'].flatMap((file) => [
          {
            id: file + '-reply',
            file,
            line: 1,
            side: 'new',
            body: 'Why is this needed?',
            author: 'Author',
          },
          {
            id: file + '-address',
            origin: 'host',
            file,
            line: 2,
            side: 'new',
            body: 'Please fix this.',
            author: 'Author',
          },
        ]),
      }),
    );
    let published: any;
    await page.route('**/api/phabricator/publish', async (route) => {
      published = route.request().postDataJSON();
      await route.fulfill({ json: { url: 'https://phab.example/D123' } });
    });
    let sent: any;
    await page.route('**/api/complete', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 200, body: '' });
    });
    await openApp(page);
    const note = page.locator('.review-note').first();
    await expect(note.locator('button', { hasText: 'Accept' })).toHaveCount(1);
    await expect(note.locator('button', { hasText: 'Ignore' })).toHaveCount(1);
    await note.locator('button', { hasText: 'Reply' }).click();
    await note.locator('.review-note-reply-text').fill('Because of the cache.');
    await note.locator('button', { hasText: 'Queue' }).click();
    await page.locator('.review-note').nth(1).locator('button', { hasText: 'Accept' }).click();
    await page.locator('#publish-commit').click();
    const dialog = page.locator('.publish-dialog');
    await expect(dialog.locator('.comment-preview-text')).toHaveText('Because of the cache.');
    await expect(dialog).toContainText('1 comment stays in the review and is printed on Finish.');
    await dialog.locator('.publish-revision').click();
    await expect(dialog).toHaveCount(0);
    expect(published.comments).toHaveLength(1);
    expect(published.comments[0].body).toBe('Because of the cache.');
    await page.locator('#submit-review').click();
    await expect(page.locator('.submit-review-modal')).toContainText('Already published to D123');
    await expect(page.locator('.comment-preview')).toHaveCount(0);
    await expect(page.locator('.submit-review-modal')).toContainText(
      '1 accepted note will be sent',
    );
    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('#submit-review')).toHaveText('Review finished');
    expect(sent.comments).toHaveLength(1);
    expect(sent.comments[0].body).toBe('');
    expect(sent.comments[0].in_reply_to).toEqual({
      id: `${sent.comments[0].file}-address`,
      author: 'Author',
      origin: 'host',
      body: 'Please fix this.',
    });
  });

  for (const own of [false, true]) {
    test(`routes accepted notes on ${own ? 'own' : 'other authors’'} revisions`, async ({
      page,
    }) => {
      await page.route('**/api/context', async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          json: {
            ...(await response.json()),
            phabricator_available: true,
            phabricator_revisions: ['D123'],
            own_revisions: [own],
          },
        });
      });
      await page.route('**/api/phabricator', (route) =>
        route.fulfill({
          json: {
            user: 'reviewer',
            revisions: [
              {
                id: 'D123',
                title: 'Revision',
                url: 'https://phab.example/D123',
                commit_idxs: [0],
                own,
                closed: false,
                publishable: true,
                published: false,
              },
            ],
          },
        }),
      );
      let published: any;
      await page.route('**/api/phabricator/publish', async (route) => {
        published = route.request().postDataJSON();
        await route.fulfill({ json: { url: 'https://phab.example/D123' } });
      });
      let finished: any;
      await page.route('**/api/complete', async (route) => {
        finished = route.request().postDataJSON();
        await route.fulfill({ status: 200, body: '' });
      });
      await openApp(page);
      await page.evaluate(() => {
        const app = (window as any).__APP;
        const file = app.files[0].path;
        app.reviewNoteManager.setNotes([
          { id: 'default-agent', file, line: 1, side: 'new', body: 'Default agent finding' },
          {
            id: 'agent',
            origin: 'agent',
            file,
            line: 1,
            side: 'new',
            body: 'Explicit agent finding',
          },
          { id: 'host', origin: 'host', file, line: 1, side: 'new', body: 'Human finding' },
          { id: 'ignored', origin: 'agent', file, line: 1, side: 'new', body: 'Ignored finding' },
          { id: 'open', origin: 'agent', file, line: 1, side: 'new', body: 'Open finding' },
          {
            id: 'other-commit',
            origin: 'agent',
            file,
            line: 1,
            side: 'new',
            body: 'Other commit finding',
            commit_idx: 1,
          },
        ]);
        app.reviewNoteManager.applyDispositions({
          'default-agent': 'accepted',
          agent: 'accepted',
          host: 'accepted',
          ignored: 'ignored',
          'other-commit': 'accepted',
        });
        app.commentManager.addComment({ file, line: 1, side: 'new', body: 'User comment' });
      });
      await page.locator('#publish-commit').click();
      const dialog = page.locator('.publish-dialog');
      if (own) {
        await expect(dialog).toContainText(
          '3 comments stay in the review and are printed on Finish.',
        );
      } else {
        await expect(dialog).not.toContainText('comment stays in the review');
      }
      await expect(dialog.locator('.comment-preview')).toHaveCount(own ? 1 : 3);
      await dialog.locator('.publish-revision').click();
      await expect(dialog).toHaveCount(0);
      expect(published.comments.map((c: any) => c.body)).toEqual(
        own
          ? ['User comment']
          : ['User comment', 'Default agent finding', 'Explicit agent finding'],
      );
      expect(published.comments.every((c: any) => !c.in_reply_to)).toBe(true);
      await expect(page.locator('.review-note-status', { hasText: 'Published' })).toHaveCount(
        own ? 0 : 2,
      );
      await page.locator('#submit-review').click();
      await page.locator('.confirm-submit-btn').click();
      await expect(page.locator('#submit-review')).toHaveText('Review finished');
      expect(finished.comments.map((c: any) => c.in_reply_to.id)).toEqual(
        own ? ['default-agent', 'agent', 'host', 'other-commit'] : ['other-commit'],
      );
    });
  }

  test('restores accepted and ignored note dispositions after reload', async ({ page }) => {
    await page.route('**/api/review-notes', (route) =>
      route.fulfill({
        json: ['test.txt', 'file2.txt', 'file3.txt'].flatMap((file) =>
          [1, 2].map((line) => ({
            id: `${file}-${line}`,
            file,
            line,
            side: 'new',
            body: `Note ${line}`,
          })),
        ),
      }),
    );
    await openApp(page);
    await page.locator('.review-note').nth(0).locator('button', { hasText: 'Accept' }).click();
    await page.locator('.review-note').nth(1).locator('button', { hasText: 'Ignore' }).click();
    await expect(page.locator('.review-note-status-ignored')).toHaveCount(1);
    await page.waitForFunction(async () => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open('lrv-comment-drafts', 1);
        request.onsuccess = () => resolve(request.result);
      });
      const records: any[] = await new Promise((resolve) => {
        const request = db.transaction('drafts').objectStore('drafts').getAll();
        request.onsuccess = () => resolve(request.result);
      });
      return records.some((r) => Object.values(r.dispositions ?? {}).includes('ignored'));
    });
    await page.reload();
    await expect(page.locator('#restore-banner')).toBeVisible();
    await expect(page.locator('#restore-banner')).toContainText('2 note dispositions');
    // A live note arriving while restore is pending must not replace the saved draft.
    await page.evaluate(async () => {
      const app = (window as any).__APP;
      app.reviewNoteManager.mergeNotes([
        { id: 'incoming', file: app.files[0].path, line: 1, side: 'new', body: 'Incoming note' },
      ]);
      await app.commentDraftWrite;
    });
    await page.reload();
    await expect(page.locator('#restore-banner')).toContainText('2 note dispositions');
    await page.locator('#restore-yes-btn').click();
    await expect(page.locator('.review-note-status-accepted')).toHaveCount(1);
    await expect(page.locator('.review-note-status-ignored')).toHaveCount(1);
  });

  test('migrates legacy empty replies into accepted dispositions', async ({ page }) => {
    await page.route('**/api/review-notes', (route) =>
      route.fulfill({
        json: ['test.txt', 'file2.txt', 'file3.txt'].map((file) => ({
          id: file,
          file,
          line: 1,
          side: 'new',
          body: 'Legacy note',
        })),
      }),
    );
    await openApp(page);
    await page.evaluate(() => {
      const app = (window as any).__APP;
      const note = app.reviewNoteManager.getNotesForFile(app.files[0].path)[0];
      app.commentManager.addComment({
        file: note.file,
        line: note.line,
        side: note.side,
        body: '',
        in_reply_to: { id: note.id, body: note.body },
      });
    });
    await expect.poll(() => commentDraftCount(page)).toBe(1);
    await page.reload();
    await page.locator('#restore-yes-btn').click();
    await expect(page.locator('#comment-count')).toHaveText('0');
    await expect(page.locator('.review-note-status-accepted')).toHaveCount(1);
    await page.locator('#submit-review').click();
    await expect(page.locator('.submit-review-modal')).toContainText(
      '1 accepted note will be sent',
    );
    await expect(page.locator('.comment-preview')).toHaveCount(0);
  });

  test('accepting and undoing a note adds no comments', async ({ page }) => {
    await page.route('**/api/review-notes', (route) =>
      route.fulfill({
        json: ['test.txt', 'file2.txt', 'file3.txt'].map((file) => ({
          id: file,
          file,
          line: 2,
          side: 'new',
          body: 'Please fix this.',
        })),
      }),
    );
    await openApp(page);
    const note = page.locator('.review-note').first();
    await note.locator('button', { hasText: 'Accept' }).click();
    await expect(note).toContainText('Accepted');
    await expect(page.locator('#comment-count')).toHaveText('0');
    await note.locator('button', { hasText: 'Undo' }).click();
    await expect(note.locator('button', { hasText: 'Accept' })).toHaveCount(1);
    await expect(page.locator('#comment-count')).toHaveText('0');
  });

  test('preloader hides once the stacked view renders at startup', async ({ page }) => {
    await isolateConfig(page, { stacked_view: true });
    await page.goto((serverUrl ?? 'http://localhost:9999') + '/');
    await page.locator('.stacked-code-view diffs-container').first().waitFor({ timeout: 10000 });
    // The preloader falls back to hiding after 5 s, so this must beat it.
    await expect(page.locator('#preloader-overlay')).toHaveCount(0, { timeout: 2000 });
    expect(await page.evaluate(() => (window as any).__APP_READY)).toBe(true);
  });

  test('stacked mode should add, edit, and delete a comment', async ({ page }) => {
    await openStackedView(page);

    await addStackedComment(page, 'Stacked comment');
    await expect(page.locator('#comment-count')).toHaveText('1');
    await expect(page.locator('.stacked-comment-box')).toContainText('Stacked comment');

    const commentBox = page.locator('.stacked-comment-box').first();
    await commentBox.locator('.stacked-comment-edit').click();
    await commentBox.locator('.stacked-comment-ta').fill('Edited stacked comment');
    await commentBox.locator('button', { hasText: 'Save' }).click();
    await expect(page.locator('.stacked-comment-box')).toContainText('Edited stacked comment');

    await page.locator('.stacked-comment-box .stacked-comment-del').click();
    await expect(page.locator('#comment-count')).toHaveText('0');
    await expect(page.locator('.stacked-comment-box')).toHaveCount(0);
  });

  test('stacked mode toggles between side-by-side and inline diffs', async ({ page }) => {
    await openStackedView(page);
    const toggle = page.locator('#toggle-view');
    const diffs = page.locator('.stacked-code-view diffs-container pre[data-diff-type]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('View: Side-by-Side');
    await expect(diffs.first()).toHaveAttribute('data-diff-type', 'split');

    await addStackedComment(page, 'Comment before toggling');

    await toggle.click();
    await expect(toggle).toHaveText('View: Inline');
    await expect(page.locator('.stacked-code-view pre[data-diff-type="split"]')).toHaveCount(0);
    await expect(diffs.first()).toHaveAttribute('data-diff-type', 'single');
    await expect(page.locator('.stacked-comment-box')).toContainText('Comment before toggling');

    const testFile = page.locator('.stacked-code-view diffs-container', { hasText: 'test.txt' });
    await testFile
      .locator('[data-line-type="change-deletion"][data-column-number]')
      .first()
      .click({ position: { x: 8, y: 8 } });
    await expect(page.locator('.stacked-comment-form')).toBeVisible({ timeout: 3000 });
    await page.locator('.stacked-comment-form .stacked-comment-ta').fill('Inline deletion comment');
    await page.locator('.stacked-comment-form .stacked-comment-save').click();
    await expect(page.locator('#comment-count')).toHaveText('2');
    await expect(
      testFile.locator('.stacked-comment-box', { hasText: 'Inline deletion comment' }),
    ).toBeVisible();
    const deletionComment = await page.evaluate(() =>
      (window as any).__APP.commentManager
        .getComments()
        .find((comment: { body: string }) => comment.body === 'Inline deletion comment'),
    );
    expect(deletionComment).toMatchObject({ file: 'test.txt', line: 2, side: 'old' });

    await page.locator('body').click({ position: { x: 1, y: 1 } });
    await page.keyboard.press('s');
    await expect(toggle).toHaveText('View: Side-by-Side');
    await expect(diffs.first()).toHaveAttribute('data-diff-type', 'split');
    await expect(page.locator('.stacked-comment-box')).toHaveCount(2);

    await page.keyboard.press('s');
    await expect(toggle).toHaveText('View: Inline');
    await page.locator('#toggle-stacked').click();
    await expect(page.locator('#toggle-stacked')).toHaveText('Mode: File by file');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('View: Inline');
    await page.locator('#toggle-stacked').click();
    await expect(diffs.first()).toHaveAttribute('data-diff-type', 'single');
  });

  test('stacked comment input stays within the code area', async ({ page }) => {
    await page.setViewportSize({ width: 2560, height: 1440 });
    await openStackedView(page);
    const lineNumber = page
      .locator('.stacked-code-view diffs-container [data-interactive-line-numbers]')
      .first();
    await lineNumber.waitFor({ state: 'visible', timeout: 10000 });
    await lineNumber.click({ position: { x: 8, y: 8 } });
    const form = page.locator('.stacked-comment-form');
    await expect(form).toBeVisible({ timeout: 3000 });

    const geometry = await form.evaluate((node) => {
      const formRect = node.getBoundingClientRect();
      const cellRect = node.parentElement!.getBoundingClientRect();
      const textarea = node.querySelector('textarea')!;
      const probe = document.createElement('span');
      probe.style.cssText =
        'position:fixed;visibility:hidden;white-space:nowrap;width:80ch;box-sizing:border-box';
      probe.style.font = getComputedStyle(node).font;
      document.body.append(probe);
      const eightyChWidth = probe.getBoundingClientRect().width;
      probe.remove();
      return {
        formWidth: formRect.width,
        cellWidth: cellRect.width,
        eightyChWidth,
        borderRadius: getComputedStyle(textarea).borderRadius,
      };
    });
    expect(geometry.formWidth).toBeLessThan(geometry.eightyChWidth);
    expect(geometry.formWidth).toBeLessThanOrEqual(geometry.cellWidth);
    expect(geometry.formWidth).toBeLessThan(geometry.cellWidth);
    expect(geometry.borderRadius).toBe('0px');

    const textarea = form.locator('.stacked-comment-ta');
    await textarea.fill('x'.repeat(500));
    const scroll = await textarea.evaluate((node) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    }));
    expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
  });

  test('stacked mode should not open a comment when clicking code', async ({ page }) => {
    await openStackedView(page);

    await page
      .locator('.stacked-code-view diffs-container [data-line]')
      .first()
      .click({
        position: { x: 48, y: 8 },
      });

    await expect(page.locator('.stacked-comment-form')).toHaveCount(0);
    await expect(page.locator('#comment-count')).toHaveText('0');
  });

  test.describe('stacked searchfox clicks', () => {
    // Each line is "const <word> ...", so the second character of the word is column 7.
    const base = 'const context = 1;\nconst filler = 4;\nconst removed = 2;\n';
    const changed = 'const context = 1;\nconst filler = 4;\nconst added = 3;\n';

    async function setupSearchfoxRepo(renamedTo?: string) {
      if (!testRepoPath) {
        throw new Error('Test repo not initialized');
      }
      fs.writeFileSync(path.join(testRepoPath, 'searchfox.txt'), base);
      await execAsync(
        `cd "${testRepoPath}" && git add searchfox.txt && git commit -q -m searchfox`,
      );
      const newPath = renamedTo ?? 'searchfox.txt';
      if (renamedTo) {
        await execAsync(`cd "${testRepoPath}" && git mv searchfox.txt "${renamedTo}"`);
      }
      fs.writeFileSync(path.join(testRepoPath, newPath), changed);
      await stopServer();
      await startServer();
    }

    async function mockSearchfox(page: Page) {
      const resolves: unknown[] = [];
      await page.route('**/api/searchfox/resolve', (route) => {
        resolves.push(route.request().postDataJSON());
        return route.fulfill({ json: { query: 'id:x', pretty: null, symbols: [] } });
      });
      await page.route('**/api/searchfox/search?*', (route) =>
        route.fulfill({ json: { query: 'id:x', groups: [] } }),
      );
      return resolves;
    }

    // The mocked search is empty, so each lookup ends with a toast instead of the results panel.
    async function expectNoResultsToast(page: Page) {
      await expect(page.locator('.searchfox-toast')).toContainText('No searchfox results for');
      await expect(page.locator('.searchfox-modal')).toHaveCount(0);
    }

    // Left quarter of the second character of `word`, so the caret lands before that character.
    async function wordPosition(line: Locator, word: string) {
      return line.evaluate((element, word) => {
        const start = (element.textContent ?? '').indexOf(word) + 1;
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode() as Text;
        let offset = start;
        while (offset >= node.length) {
          offset -= node.length;
          node = walker.nextNode() as Text;
        }
        const range = document.createRange();
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const glyph = range.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return {
          x: glyph.left - box.left + glyph.width / 4,
          y: glyph.top - box.top + glyph.height / 2,
        };
      }, word);
    }

    const lineWords = [
      ['[data-line][data-line-type="change-addition"]', 'added'],
      ['[data-line][data-line-type="change-deletion"]', 'removed'],
      ['[data-line][data-line-type="context"]', 'context'],
    ] as const;

    const lookups = (oldPath: string, newPath: string) => [
      {
        path: newPath,
        line: 3,
        col: 7,
        word: 'added',
        text: 'const added = 3;',
        side: 'new',
        commit_idx: 0,
      },
      {
        path: oldPath,
        line: 3,
        col: 7,
        word: 'removed',
        text: 'const removed = 2;',
        side: 'old',
        commit_idx: 0,
      },
      {
        path: newPath,
        line: 1,
        col: 7,
        word: 'context',
        text: 'const context = 1;',
        side: 'new',
        commit_idx: 0,
      },
    ];

    for (const view of ['side-by-side', 'inline'] as const) {
      test(`Mod+click on added, deleted and context lines sends lookups in ${view} view`, async ({
        page,
      }) => {
        await setupSearchfoxRepo();
        await isolateConfig(page, { searchfox: true });
        const resolves = await mockSearchfox(page);
        await openStackedView(page);
        if (view === 'inline') {
          await page.locator('#toggle-view').click();
        }
        const file = page.locator('.stacked-code-view diffs-container', { hasText: 'searchfox' });
        for (const [selector, word] of lineWords) {
          const line = file.locator(selector).first();
          await line.click({
            modifiers: ['ControlOrMeta'],
            position: await wordPosition(line, word),
          });
          await expectNoResultsToast(page);
        }
        await expect.poll(() => resolves.length).toBe(3);
        const expected = lookups('searchfox.txt', 'searchfox.txt');
        // Side-by-side, the first context line is in the left pane, which shows the old side.
        if (view === 'side-by-side') {
          expected[2]!.side = 'old';
        }
        expect(resolves).toEqual(expected);
      });
    }

    test('Mod+click on a deleted line of a renamed file uses the old path', async ({ page }) => {
      await setupSearchfoxRepo('searchfox-renamed.txt');
      await isolateConfig(page, { searchfox: true });
      const resolves = await mockSearchfox(page);
      await openStackedView(page);
      const file = page.locator('.stacked-code-view diffs-container', { hasText: 'searchfox' });
      // Context is clicked in the additions column, so it is on the new side.
      const renamedLines = [
        ['[data-line][data-line-type="change-addition"]', 'added'],
        ['[data-line][data-line-type="change-deletion"]', 'removed'],
        ['[data-additions] [data-line][data-line-type="context"]', 'context'],
      ] as const;
      for (const [selector, word] of renamedLines) {
        const line = file.locator(selector).first();
        await line.click({
          modifiers: ['ControlOrMeta'],
          position: await wordPosition(line, word),
        });
        await expectNoResultsToast(page);
      }
      await expect.poll(() => resolves.length).toBe(3);
      expect(resolves).toEqual(lookups('searchfox.txt', 'searchfox-renamed.txt'));
    });

    test('Mod+click sends no lookup with the searchfox setting off', async ({ page }) => {
      await setupSearchfoxRepo();
      await isolateConfig(page, { searchfox: false });
      const resolves = await mockSearchfox(page);
      await openStackedView(page);
      const line = page
        .locator('.stacked-code-view diffs-container', { hasText: 'searchfox' })
        .locator('[data-line][data-line-type="change-addition"]')
        .first();
      await line.click({
        modifiers: ['ControlOrMeta'],
        position: await wordPosition(line, 'added'),
      });
      // Lookups are sent immediately, so a short wait is enough to see one.
      await page.waitForTimeout(300);
      expect(resolves).toEqual([]);
    });

    test('a plain click on a word sends no lookup', async ({ page }) => {
      await setupSearchfoxRepo();
      await isolateConfig(page, { searchfox: true });
      const resolves = await mockSearchfox(page);
      await openStackedView(page);
      const line = page
        .locator('.stacked-code-view diffs-container', { hasText: 'searchfox' })
        .locator('[data-line][data-line-type="change-addition"]')
        .first();
      const dbgPos = await wordPosition(line, 'added');
      await line.click({ position: await wordPosition(line, 'added') });
      await page.waitForTimeout(300);
      expect(resolves).toEqual([]);
      await expect(page.locator('.stacked-comment-form')).toHaveCount(0);
    });

    test('right-click on an added line opens the Searchfox menu, Find Uses sends a lookup', async ({
      page,
    }) => {
      await setupSearchfoxRepo();
      await isolateConfig(page, { searchfox: true });
      const resolves = await mockSearchfox(page);
      await openStackedView(page);
      const line = page
        .locator('.stacked-code-view diffs-container', { hasText: 'searchfox' })
        .locator('[data-line][data-line-type="change-addition"]')
        .first();
      await line.click({ button: 'right', position: await wordPosition(line, 'added') });
      const menu = page.getByRole('menu');
      await expect(
        menu.getByRole('menuitem', { name: 'Searchfox: Go to Definition' }),
      ).toBeVisible();
      await menu.getByRole('menuitem', { name: 'Searchfox: Find Uses' }).click();
      await expect(menu).toHaveCount(0);
      await expect.poll(() => resolves.length).toBe(1);
      expect(resolves).toEqual([lookups('searchfox.txt', 'searchfox.txt')[0]]);
      await expectNoResultsToast(page);
    });

    test('right-click on a deleted line of a renamed file looks up the old path', async ({
      page,
    }) => {
      await setupSearchfoxRepo('searchfox-renamed.txt');
      await isolateConfig(page, { searchfox: true });
      const resolves = await mockSearchfox(page);
      await openStackedView(page);
      const line = page
        .locator('.stacked-code-view diffs-container', { hasText: 'searchfox' })
        .locator('[data-line][data-line-type="change-deletion"]')
        .first();
      await line.click({ button: 'right', position: await wordPosition(line, 'removed') });
      await page.getByRole('menuitem', { name: 'Searchfox: Go to Definition' }).click();
      await expect.poll(() => resolves.length).toBe(1);
      expect(resolves).toEqual([lookups('searchfox.txt', 'searchfox-renamed.txt')[1]]);
      await expectNoResultsToast(page);
    });

    test('Mod+click on a definition in collapsed context expands, reveals and flashes it', async ({
      page,
    }) => {
      if (!testRepoPath) {
        throw new Error('Test repo not initialized');
      }
      const lines = Array.from({ length: 60 }, (_, i) => `const filler${i + 1} = ${i + 1};`);
      lines[49] = 'const target = 50;';
      fs.writeFileSync(path.join(testRepoPath, 'long.txt'), `${lines.join('\n')}\n`);
      await execAsync(`cd "${testRepoPath}" && git add long.txt && git commit -q -m long`);
      const changed = ['const first = target;', ...lines.slice(1)];
      fs.writeFileSync(path.join(testRepoPath, 'long.txt'), `${changed.join('\n')}\n`);
      await stopServer();
      await startServer();
      await isolateConfig(page, { searchfox: true });
      await page.route('**/api/searchfox/resolve', (route) =>
        route.fulfill({ json: { query: 'id:target', pretty: null, symbols: [] } }),
      );
      // searchfox's revision has the definition 5 lines higher than the reviewed file, so the
      // server's mapping of the hit onto the reviewed file is mocked here.
      await page.route('**/api/searchfox/line?*', (route) =>
        route.fulfill({ json: { line: 50, exact: true } }),
      );
      await page.route('**/api/searchfox/search?*', (route) =>
        route.fulfill({
          json: {
            query: 'id:target',
            revision: 'c'.repeat(40),
            groups: [
              {
                kind: 'normal',
                category: 'Definitions (target)',
                files: [
                  {
                    path: 'long.txt',
                    lines: [
                      { lno: 45, line: 'const target = 50;', bounds: [6, 12], context: null },
                    ],
                  },
                ],
              },
            ],
          },
        }),
      );
      await openStackedView(page);
      const line = page
        .locator('.stacked-code-view diffs-container', { hasText: 'long.txt' })
        .locator('[data-line][data-line-type="change-addition"]')
        .first();
      await line.click({
        modifiers: ['ControlOrMeta'],
        position: await wordPosition(line, 'target'),
      });

      const flashed = page.locator('[data-searchfox-flash]');
      await expect(flashed).toHaveAttribute('data-line', '50');
      await expect(flashed).toContainText('const target = 50;');
      await expect(flashed).toHaveCount(0);
    });

    test('the Searchfox menu moves focus with arrows and closes on Escape without a lookup', async ({
      page,
    }) => {
      await setupSearchfoxRepo();
      await isolateConfig(page, { searchfox: true });
      const resolves = await mockSearchfox(page);
      await openStackedView(page);
      const line = page
        .locator('.stacked-code-view diffs-container', { hasText: 'searchfox' })
        .locator('[data-line][data-line-type="change-addition"]')
        .first();
      await line.click({ button: 'right', position: await wordPosition(line, 'added') });
      const items = page.getByRole('menu').getByRole('menuitem');
      await expect(items.first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(items.nth(1)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('menu')).toHaveCount(0);
      // Lookups are sent immediately, so a short wait is enough to see one.
      await page.waitForTimeout(300);
      expect(resolves).toEqual([]);
      await expect(page.locator('.searchfox-modal')).toHaveCount(0);
    });

    test('right-click sends no lookup and shows no Searchfox menu with the setting off', async ({
      page,
    }) => {
      await setupSearchfoxRepo();
      await isolateConfig(page, { searchfox: false });
      const resolves = await mockSearchfox(page);
      await openStackedView(page);
      const line = page
        .locator('.stacked-code-view diffs-container', { hasText: 'searchfox' })
        .locator('[data-line][data-line-type="change-addition"]')
        .first();
      await line.click({ button: 'right', position: await wordPosition(line, 'added') });
      await expect(page.getByRole('menu')).toHaveCount(0);
      await page.waitForTimeout(300);
      expect(resolves).toEqual([]);
    });
  });

  test('stacked mode can expand unmodified lines in the last file', async ({ page }) => {
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }
    // The last file can't scroll its header to the top, so it never becomes
    // the current file.
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`);
    fs.writeFileSync(path.join(testRepoPath, 'zz-long.txt'), lines.join('\n') + '\n');
    await execAsync(`cd "${testRepoPath}" && git add zz-long.txt && git commit -q -m long`);
    lines[49] = 'changed line 50';
    fs.writeFileSync(path.join(testRepoPath, 'zz-long.txt'), lines.join('\n') + '\n');
    await stopServer();
    await startServer();

    await openStackedView(page);
    const lastFile = page.locator('.stacked-code-view diffs-container', { hasText: 'zz-long.txt' });
    await expect(lastFile.locator('[data-expand-button]').first()).toBeAttached({
      timeout: 5000,
    });
  });

  test('stacked search finds added and removed text in an off-screen file', async ({ page }) => {
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }
    fs.writeFileSync(path.join(testRepoPath, 'zz-filler.txt'), 'filler line\n'.repeat(500));
    const searchFile = path.join(testRepoPath, 'zzz-search.txt');
    fs.writeFileSync(searchFile, 'stacked-search-removed\n');
    await execAsync(
      `cd "${testRepoPath}" && git add zzz-search.txt && git commit -q -m "search fixture" && git add zz-filler.txt`,
    );
    fs.writeFileSync(searchFile, 'stacked-search-added\n');
    await stopServer();
    await startServer();

    await openStackedView(page);
    const view = page.locator('.stacked-code-view');
    await expect(view.getByText('zzz-search.txt', { exact: true })).toHaveCount(0);

    // The toolbar has focus after switching modes. Find should still open CodeView search.
    await page.keyboard.press('ControlOrMeta+f');
    const find = view.getByPlaceholder('Search', { exact: true });
    const matchCount = view.locator('[data-matches]');
    await expect(find).toBeFocused();
    await find.pressSequentially('stacked-search-added');
    await expect(find).toHaveValue('stacked-search-added');
    await expect(matchCount).toHaveText('1/1');
    await expect(view.getByText('stacked-search-added', { exact: true })).toBeInViewport();
    await find.clear();
    await expect(matchCount).toHaveText('0/0');
    await find.fill('stacked-search-removed');
    await expect(matchCount).toHaveText('1/1');
    await expect(view.getByText('stacked-search-removed', { exact: true })).toBeInViewport();
    await find.press('Escape');
    await expect(find).toHaveCount(0);
  });

  test('stacked mode should create a range comment from selected lines and a line number click', async ({
    page,
  }) => {
    await openStackedView(page);

    const startBox = await page
      .locator('.stacked-code-view diffs-container [data-additions] [data-column-number]')
      .filter({ hasText: '2' })
      .first()
      .boundingBox();
    const endBox = await page
      .locator('.stacked-code-view diffs-container [data-additions] [data-column-number]')
      .filter({ hasText: '4' })
      .first()
      .boundingBox();
    if (!startBox || !endBox) {
      throw new Error('Could not locate stacked line numbers for range selection');
    }
    await page.mouse.move(startBox.x + 8, startBox.y + startBox.height / 2);
    await page.mouse.down();
    await expect(page.locator('.stacked-comment-form')).toHaveCount(0);
    await page.mouse.move(endBox.x + 8, endBox.y + endBox.height / 2, { steps: 8 });
    await page.mouse.up();

    await expect(page.locator('.stacked-comment-form')).toBeVisible({ timeout: 3000 });
    await page.locator('.stacked-comment-form .stacked-comment-ta').fill('Selected stacked range');
    await page.locator('.stacked-comment-form .stacked-comment-save').click();

    await expect(page.locator('#comment-count')).toHaveText('1');
    const line = await page.evaluate(
      () => (window as any).__APP.commentManager.getComments()[0].line,
    );
    expect(line).toEqual([2, 4]);
  });

  test('stacked mode complete review workflow: add comment and submit', async ({ page }) => {
    await openStackedView(page);

    await addStackedComment(page, 'Please fix this from stacked mode');
    await expect(page.locator('#comment-count')).toHaveText('1');

    await page.locator('#submit-review').click();
    const modal = page.locator('.submit-modal');
    await expect(modal.locator('text=Finish review')).toBeVisible();
    await expect(modal.locator('text=Please fix this from stacked mode')).toBeVisible();

    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('text=Review finished')).toBeVisible({ timeout: 3000 });
  });

  test('persists queued comments across reload and clears drafts after submit', async ({
    page,
  }) => {
    await openApp(page, { requireEditor: false });
    await page.waitForFunction(() => {
      const app = (window as any).__APP;
      return app?.files?.length > 0 && app?.commentDraftKey;
    });

    await page.evaluate(() => {
      const app = (window as any).__APP;
      app.commentManager.addComment({
        file: app.files[0].path,
        line: 1,
        side: 'new',
        body: 'Keep this comment after reload',
      });
    });

    await expect(page.locator('#comment-count')).toHaveText('1');
    await expect.poll(() => commentDraftCount(page)).toBe(1);

    await openApp(page, { requireEditor: false });

    // The restore banner should appear — click Restore to load saved comments.
    await page.locator('#restore-yes-btn').click();

    await expect(page.locator('#comment-count')).toHaveText('1');
    await page.locator('#submit-review').click();
    await expect(page.locator('text=Keep this comment after reload')).toBeVisible();

    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('text=Review finished')).toBeVisible({ timeout: 3000 });
    await expect.poll(() => commentDraftCount(page)).toBe(0);
  });

  test('records comments in the SQLite store as they are made', async ({ page }) => {
    await openApp(page, { requireEditor: false });
    await page.waitForFunction(() => {
      const app = (window as any).__APP;
      return app?.files?.length > 0 && app?.commentDraftKey;
    });

    await page.evaluate(() => {
      const app = (window as any).__APP;
      app.commentManager.addComment({
        file: app.files[0].path,
        line: 1,
        side: 'new',
        body: 'Recoverable from sqlite',
      });
    });

    await expect
      .poll(async () => (await recoverStoredComments()).map((c) => c.body))
      .toEqual(['Recoverable from sqlite']);

    // Submitting clears the browser drafts; the SQLite record must survive.
    await page.locator('#submit-review').click();
    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('text=Review finished')).toBeVisible({ timeout: 3000 });
    await expect.poll(() => commentDraftCount(page)).toBe(0);

    const recovered = await recoverStoredComments();
    expect(recovered.map((c) => c.body)).toEqual(['Recoverable from sqlite']);
  });

  test('should open and save settings', async ({ page }) => {
    await openApp(page);

    // Open settings
    await page.locator('#settings-btn').click();

    // Settings modal should appear (check for the heading specifically)
    await expect(page.locator('.submit-modal-header h2:has-text("Settings")')).toBeVisible();

    // Change theme
    await page.locator('select[name="color_scheme"]').selectOption('github-dark');

    // Save settings
    await page.locator('.save-btn').click();

    // Should show saved confirmation
    await expect(page.locator('text=Saved!')).toBeVisible({ timeout: 2000 });
  });

  test('saving settings resets the view toggle label to the split view setting', async ({
    page,
  }) => {
    await openApp(page);
    const toggle = page.locator('#toggle-view');
    await toggle.click();
    await expect(toggle).toHaveText('View: Inline');

    await page.locator('#settings-btn').click();
    await expect(page.locator('#split-view')).toBeChecked();
    await page.locator('select[name="color_scheme"]').selectOption('github-dark');
    await page.locator('.save-btn').click();
    await expect(page.locator('text=Saved!')).toBeVisible({ timeout: 2000 });
    await expect(toggle).toHaveText('View: Side-by-Side');
  });

  test('should display renamed files correctly', async ({ page }) => {
    // Create a renamed file diff
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }

    // Stage current changes first, then rename a file
    await execAsync(
      `cd "${testRepoPath}" && git add -A && git commit -m "changes" && mv test.txt renamed-test.txt && git add -A`,
    );

    // Restart server with renamed file
    await stopServer();
    await startServer();

    await openApp(page);

    // Check that renamed file shows "old.txt → new.txt" format
    const fileListItem = fileTreeRow(page, 'renamed-test.txt');
    await expect(fileListItem).toBeVisible();

    // Check that status badge shows "R" for renamed
    await expect(fileListItem).toHaveAttribute('data-item-git-status', 'renamed');
  });

  test('should display deleted files correctly', async ({ page }) => {
    // Create a deleted file diff
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }

    // Stage current changes first, then delete a file
    await execAsync(
      `cd "${testRepoPath}" && git add -A && git commit -m "changes" && git rm file2.txt`,
    );

    // Restart server with deleted file
    await stopServer();
    await startServer();

    await openApp(page);
    // Verify deleted file is present in the list and shows deleted badge
    const deletedItem = fileTreeRow(page, 'file2.txt');
    await expect(deletedItem).toBeVisible({ timeout: 5000 });
    await expect(deletedItem).toHaveAttribute('data-item-git-status', 'deleted');

    // Select the deleted file and verify the diff renders old content
    await selectFile(page, 'file2.txt');
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Old content should be visible in the diff view
    await expect(page.locator('text=function foo() {')).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=console.log('debug');")).toBeVisible();
  });

  test('should display added files and content', async ({ page }) => {
    // Create a new file
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }

    await execAsync(
      `cd "${testRepoPath}" && echo "new content" > new-file.txt && git add new-file.txt`,
    );

    // Restart server with new file
    await stopServer();
    await startServer();

    await openApp(page);

    // Check that new file is shown
    const fileListItem = fileTreeRow(page, 'new-file.txt');
    await expect(fileListItem).toBeVisible();

    // Select the new file and verify diff content renders
    await selectFile(page, 'new-file.txt');
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Added files should force unified view (no empty original side-by-side pane)
    await expect(page.locator('.monaco-diff-editor.side-by-side')).toHaveCount(0);

    // Verify the added content is visible in the diff view
    await expect(page.locator('text=new content')).toBeVisible({ timeout: 5000 });

    // Check that status badge shows "A" for added
    await expect(fileListItem).toHaveAttribute('data-item-git-status', 'added');
  });

  test('shows and dismisses an available update', async ({ page }) => {
    await page.route('**/api/update-check', (route) => route.fulfill({ json: '9.8.7' }));
    await openApp(page);
    const banner = page.locator('#update-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('9.8.7');
    await expect(banner).toContainText('cargo binstall lrv');
    await page.locator('#update-dismiss-btn').click();
    await expect(banner).toBeHidden();
  });

  test('sidebar and editor fit the viewport while a banner is shown', async ({ page }) => {
    await page.route('**/api/context', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), claude_skill_installed: false },
      });
    });

    await openApp(page);
    await expect(page.locator('#skill-banner')).toBeVisible();

    const viewportHeight = page.viewportSize()!.height;
    for (const selector of ['#sidebar', '#editor-container']) {
      const box = (await page.locator(selector).boundingBox())!;
      expect(box.y + box.height, selector).toBeLessThanOrEqual(viewportHeight);
    }
    const lastRow = (await fileTreeRows(page).last().boundingBox())!;
    expect(lastRow.y + lastRow.height).toBeLessThanOrEqual(viewportHeight);
  });

  test('file tree scrolls down to its last row', async ({ page }) => {
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }

    await execAsync(
      `cd "${testRepoPath}" && mkdir -p many && for i in $(seq 1 40); do echo $i > many/f$i.txt; done && ` +
        `git add many`,
    );
    await stopServer();
    await startServer();
    await openApp(page);

    const tree = page.locator('file-tree-container.lrv-file-tree');
    const treeBox = (await tree.boundingBox())!;
    await page.mouse.move(treeBox.x + treeBox.width / 2, treeBox.y + treeBox.height / 2);
    const lastRow = fileTreeRow(page, 'test.txt');
    await expect
      .poll(async () => {
        await page.mouse.wheel(0, 2000);
        // The tree virtualizes rows, so the last one is only in the DOM once scrolled to.
        const box = (await lastRow.count()) ? await lastRow.boundingBox() : null;
        return box ? box.y + box.height : Infinity;
      })
      .toBeLessThanOrEqual(treeBox.y + treeBox.height);
  });

  test('stacked mode keeps manually toggled directories when selecting a file', async ({
    page,
  }) => {
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }

    await execAsync(
      `cd "${testRepoPath}" && mkdir -p aaa && for i in $(seq 1 3); do echo $i > aaa/f$i.txt; done && ` +
        `git add aaa`,
    );
    await stopServer();
    await startServer();
    await openStackedView(page);

    const folder = page.locator(
      'file-tree-container.lrv-file-tree [data-item-type="folder"][data-item-path="aaa/"]',
    );
    await page.locator('#collapse-all-dirs').click();
    await expect(folder).toHaveAttribute('aria-expanded', 'false');
    await folder.click();
    await expect(folder).toHaveAttribute('aria-expanded', 'true');

    // Selecting a file rebuilds the tree; wait for a file in the folder to be selected,
    // which only shows once the rebuilt tree has rendered its rows.
    await fileTreeRow(page, 'aaa/f2.txt').click();
    await expect(selectedFileTreeRow(page)).toHaveAttribute('data-item-path', /^aaa\/f/);
    await expect(folder).toHaveAttribute('aria-expanded', 'true');
  });

  test('arrow keys scroll the stacked view when no editor is open', async ({ page }) => {
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }

    const lines = Array.from({ length: 300 }, (_, i) => `line ${i + 1}`);
    fs.writeFileSync(path.join(testRepoPath, 'zz-long.txt'), lines.join('\n') + '\n');
    await execAsync(`cd "${testRepoPath}" && git add zz-long.txt`);
    await stopServer();
    await startServer();
    await openStackedView(page);

    const codeView = page.locator('.stacked-code-view').first();
    await codeView.click();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => codeView.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });

  // a-hunks.txt has two hunks: a line added at the top (new line 1) and line 20 deleted.
  // The first hunk's range is new 1-4, the second's new 18-23 plus the deletion on old 20.
  async function openHunksFixture(page: Page) {
    if (!testRepoPath) {
      throw new Error('Test repo not initialized');
    }
    const base = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`);
    fs.writeFileSync(path.join(testRepoPath, 'a-hunks.txt'), base.join('\n') + '\n');
    await execAsync(`cd "${testRepoPath}" && git add a-hunks.txt && git commit -q -m hunks`);
    const edited = ['top added', ...base.filter((_, i) => i !== 19)];
    fs.writeFileSync(path.join(testRepoPath, 'a-hunks.txt'), edited.join('\n') + '\n');
    await stopServer();
    await startServer();
    await openStackedView(page);
  }

  function focusedStackedRow(page: Page) {
    return page.locator('.stacked-code-view diffs-container [data-stacked-focus]');
  }

  async function expectStackedFocus(page: Page, line: number, side: 'new' | 'old') {
    const row = focusedStackedRow(page);
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute('data-line', String(line));
    const deleted = await row.evaluate(
      (element) =>
        (element as HTMLElement).dataset.lineType === 'change-deletion' ||
        element.closest('[data-deletions]') !== null,
    );
    expect(deleted).toBe(side === 'old');
  }

  test.describe('stacked keyboard focus', () => {
    test('j, k and Shift+J move the focus through the hunks', async ({ page }) => {
      await openHunksFixture(page);
      await page.locator('.header .wordmark').click();

      await page.keyboard.press('j');
      await expectStackedFocus(page, 1, 'new');
      await page.keyboard.press('j');
      await expectStackedFocus(page, 2, 'new');
      await page.keyboard.press('k');
      await expectStackedFocus(page, 1, 'new');

      await page.keyboard.press('Shift+J');
      await expectStackedFocus(page, 18, 'new');
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('j');
      }
      await expectStackedFocus(page, 23, 'new');
      await page.keyboard.press('j');
      await expectStackedFocus(page, 20, 'old');
      await page.keyboard.press('k');
      await expectStackedFocus(page, 23, 'new');
    });

    test('j keeps room below the focused line for the comment form, in both views', async ({
      page,
    }) => {
      if (!testRepoPath) {
        throw new Error('Test repo not initialized');
      }
      const added = Array.from({ length: 80 }, (_, i) => `added ${i + 1}`);
      fs.writeFileSync(path.join(testRepoPath, 'a-long.txt'), added.join('\n') + '\n');
      await execAsync(`cd "${testRepoPath}" && git add -N a-long.txt`);
      await stopServer();
      await startServer();
      await page.setViewportSize({ width: 1200, height: 600 });

      // Lines between the focused line and the bottom of the visible code.
      const roomBelow = {
        stacked: () =>
          page.evaluate(() => {
            const row = document
              .querySelector('.stacked-code-view diffs-container')
              ?.shadowRoot?.querySelector<HTMLElement>('[data-stacked-focus]');
            const view = document.querySelector<HTMLElement>('.stacked-code-view');
            if (!row || !view) {
              return -1;
            }
            const rect = row.getBoundingClientRect();
            return (view.getBoundingClientRect().bottom - rect.bottom) / rect.height;
          }),
        monaco: () =>
          page.evaluate(() => {
            const editor = monaco.editor.getDiffEditors()[0]!.getModifiedEditor();
            const app = window.__APP as unknown as { currentFocusedLine: { line: number } };
            const last = editor.getVisibleRanges().at(-1)!.endLineNumber;
            return last - app.currentFocusedLine.line;
          }),
      };

      for (const view of ['stacked', 'monaco'] as const) {
        if (view === 'stacked') {
          await openStackedView(page);
        } else {
          await page.locator('#toggle-stacked').click();
          await expect(page.locator('#toggle-stacked')).not.toHaveText('Mode: Stacked');
          await expect
            .poll(() =>
              page.evaluate(() =>
                monaco.editor
                  .getDiffEditors()[0]
                  ?.getModifiedEditor()
                  .getValue()
                  .startsWith('added 1'),
              ),
            )
            .toBe(true);
        }
        await page.locator('.header .wordmark').click();
        for (let i = 0; i < 45; i++) {
          await page.keyboard.press('j');
        }
        // The focus is far past the first screen, yet the next lines stay in view.
        await expect.poll(roomBelow[view]).toBeGreaterThanOrEqual(4);
      }
    });

    test('h and l move the focus between a replaced line and its replacement', async ({ page }) => {
      if (!testRepoPath) {
        throw new Error('Test repo not initialized');
      }
      // Old lines 10-11 become new lines 10-12; the hunk's new range starts at line 7.
      const base = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`);
      fs.writeFileSync(path.join(testRepoPath, 'a-replace.txt'), base.join('\n') + '\n');
      await execAsync(`cd "${testRepoPath}" && git add a-replace.txt && git commit -q -m replace`);
      const edited = [
        ...base.slice(0, 9),
        'changed 10',
        'changed 11',
        'changed 12',
        ...base.slice(11),
      ];
      fs.writeFileSync(path.join(testRepoPath, 'a-replace.txt'), edited.join('\n') + '\n');
      await stopServer();
      await startServer();
      const focus = () =>
        page.evaluate(
          () => (window as any).__APP.currentFocusedLine as { side: string; line: number },
        );

      for (const view of ['stacked', 'monaco'] as const) {
        if (view === 'stacked') {
          await openStackedView(page);
        } else {
          await page.locator('#toggle-stacked').click();
          await expect(page.locator('#toggle-stacked')).not.toHaveText('Mode: Stacked');
          await expect
            .poll(() =>
              page.evaluate(() =>
                monaco.editor
                  .getDiffEditors()[0]
                  ?.getModifiedEditor()
                  .getValue()
                  .includes('changed 12'),
              ),
            )
            .toBe(true);
        }
        await page.locator('.header .wordmark').click();
        await page.keyboard.press('Escape');
        for (let i = 0; i < 4; i++) {
          await page.keyboard.press('j');
        }
        await expect.poll(focus).toEqual({ side: 'new', line: 10 });
        await page.keyboard.press('h');
        await expect.poll(focus).toEqual({ side: 'old', line: 10 });
        if (view === 'stacked') {
          await expectStackedFocus(page, 10, 'old');
        }
        await page.keyboard.press('l');
        await expect.poll(focus).toEqual({ side: 'new', line: 10 });
        await page.keyboard.press('j');
        await page.keyboard.press('j');
        // New line 12 has no deleted line of its own: it faces the block's last one.
        await page.keyboard.press('h');
        await expect.poll(focus).toEqual({ side: 'old', line: 11 });
        // And back to the added line facing old line 11.
        await page.keyboard.press('l');
        await expect.poll(focus).toEqual({ side: 'new', line: 11 });
        // Unchanged lines have no opposite line: h does nothing.
        await page.keyboard.press('k');
        await page.keyboard.press('k');
        await expect.poll(focus).toEqual({ side: 'new', line: 9 });
        await page.keyboard.press('h');
        await expect.poll(focus).toEqual({ side: 'new', line: 9 });
      }
    });

    test('Shift+J past the last hunk focuses the next file', async ({ page }) => {
      await openHunksFixture(page);
      await page.locator('.header .wordmark').click();

      await page.keyboard.press('Shift+J');
      await page.keyboard.press('Shift+J');
      await expectStackedFocus(page, 20, 'old');
      await page.keyboard.press('Shift+J');
      await expect.poll(() => page.evaluate(() => (window as any).__APP.currentFileIndex)).toBe(1);
      await expectStackedFocus(page, 1, 'new');
    });

    test('Enter comments on the focused line; Escape clears the focus', async ({ page }) => {
      await openHunksFixture(page);
      await page.locator('.header .wordmark').click();

      await page.keyboard.press('Shift+J');
      await expectStackedFocus(page, 18, 'new');
      await page.keyboard.press('Enter');
      const form = page.locator('.stacked-comment-form');
      await expect(form).toBeVisible({ timeout: 3000 });
      await form.locator('.stacked-comment-ta').fill('Focused comment');
      await form.locator('.stacked-comment-save').click();
      await expect(page.locator('.stacked-comment-box')).toContainText('new line 18');

      await page.keyboard.press('Escape');
      await expect(focusedStackedRow(page)).toHaveCount(0);
      await page.keyboard.press('j');
      await expectStackedFocus(page, 18, 'new');
    });

    test('the focus mark is reapplied after the view rebuilds its rows', async ({ page }) => {
      await openHunksFixture(page);
      await page.locator('.header .wordmark').click();

      await page.keyboard.press('Shift+J');
      await expectStackedFocus(page, 18, 'new');
      const before = await page.evaluateHandle(() => {
        for (const host of document.querySelectorAll('.stacked-code-view [data-path]')) {
          const row = host.shadowRoot?.querySelector('[data-stacked-focus]');
          if (row) {
            return row;
          }
        }
        return null;
      });
      // Toggling the layout rebuilds every row.
      await page.keyboard.press('s');
      await expect.poll(() => before.evaluate((row) => row.isConnected)).toBe(false);
      await expectStackedFocus(page, 18, 'new');
    });

    test('the stacked help lists j, not the arrow, for the next changed line', async ({ page }) => {
      await openStackedView(page);
      await page.locator('.header .wordmark').click();
      await page.keyboard.press('?');

      const row = page.locator('.shortcuts-table tr', { hasText: 'Next changed line' });
      await expect(row.locator('.key-combo')).toHaveText('j');
      await expect(
        page.locator('.shortcuts-table tr', { hasText: 'Find in stacked diff' }),
      ).toHaveCount(1);
    });

    test('the editor help still lists both keys for the next changed line', async ({ page }) => {
      await openApp(page);
      await page.locator('.monaco-editor').first().waitFor({ timeout: 5000 });
      await page.locator('.header .wordmark').click();
      await page.keyboard.press('?');

      const row = page.locator('.shortcuts-table tr', { hasText: 'Next changed line' });
      await expect(row.locator('.key-combo')).toContainText('↓');
      await expect(row.locator('.key-combo')).toContainText('j');
      await expect(
        page.locator('.shortcuts-table tr', { hasText: 'Find in stacked diff' }),
      ).toHaveCount(0);
    });
  });

  test('should display provided title in header', async ({ page }) => {
    // Restart server with a custom title
    await stopServer();
    await startServer(0, { title: 'E2E Review Title' });

    await openApp(page);

    // Verify title appears in header project info
    await expect(page.locator('#project-info')).toContainText('E2E Review Title');
  });

  test('should handle rapid file switching without errors', async ({ page }) => {
    await openApp(page);

    // Fail on page errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Prepare locators for files
    const files = ['test.txt', 'file2.txt', 'file3.txt'];
    const selectors: Record<string, string> = {
      'test.txt': 'text=line 2 modified',
      'file2.txt': "text=console.log('debug');",
      'file3.txt': 'text=another',
    };

    // Cycle through files multiple times and await content visibility
    if (!IS_BENCH) {
      for (let i = 0; i < 6; i++) {
        const name = files[i % files.length];
        await selectFile(page, name);
        await expect(page.locator(selectors[name])).toBeVisible();
      }
    } else {
      const itemCount = await fileTreeRows(page).count();
      const n = Math.min(3, itemCount);
      for (let i = 0; i < 6; i++) {
        const idx = i % n;
        const path = await fileTreeRows(page).nth(idx).getAttribute('data-item-path');
        await selectFile(page, path ?? '');
        await page.locator('.monaco-editor').first().waitFor({ timeout: 5000 });
      }
    }

    // Assert no errors were captured
    expect(errors, `Console/Page errors during rapid switching: ${errors.join('\n')}`).toEqual([]);
  });
});
