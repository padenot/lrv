import { commentDraftCount } from '../comment-draft-helpers';
import { test, expect, Page } from '@playwright/test';
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

    // Press ? to show help (Shift+Slash to match keyboard code detection)
    await page.keyboard.press('Shift+Slash');

    // Help modal should appear
    await expect(page.locator('.submit-modal h2:has-text("Keyboard Shortcuts")')).toBeVisible();

    // Should show some shortcuts
    await expect(page.locator('text=Next file')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('.submit-modal h2:has-text("Keyboard Shortcuts")')).not.toBeVisible();
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
    await expect(page.locator('.submit-review-modal')).toBeVisible();
  });

  test('publish dialog preserves state, retries and closes after publishing the selected revision', async ({
    page,
  }) => {
    await page.route('**/api/context', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), phabricator_available: true },
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
    await expect(page.locator('#publish-commit')).toHaveText('Published D123 ✓');
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
          json: { ...(await response.json()), phabricator_available: true },
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
      await expect(button).toHaveText('Publish D123');
      if (!own) {
        await expect(button).toBeDisabled();
        await expect(button).toHaveAttribute('title', 'Diff mismatch');
      } else {
        await button.click();
        const dialog = page.locator('.publish-dialog');
        await expect(dialog.getByRole('button', { name: 'Accept', exact: true })).toBeDisabled();
        await expect(dialog.getByRole('button', { name: 'Request Changes' })).toBeDisabled();
        await expect(dialog).toContainText('closed or abandoned');
        await expect(dialog).toContainText('You are the author of D123');
        await dialog.getByRole('textbox').fill('Own revision comment');
        await expect(dialog.locator('.publish-revision')).toBeEnabled();
      }
    });
  }

  test('publishing sends only reply bodies, leaves Address items for Finish and omits published comments', async ({
    page,
  }) => {
    await page.route('**/api/context', async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        json: { ...(await response.json()), phabricator_available: true },
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
              own: false,
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
    await expect(note.locator('button', { hasText: 'Address' })).toHaveCount(1);
    await expect(note.locator('button', { hasText: 'Ignore' })).toHaveCount(1);
    await note.locator('button', { hasText: 'Reply' }).click();
    await note.locator('.review-note-reply-text').fill('Because of the cache.');
    await note.locator('button', { hasText: 'Queue' }).click();
    await page.locator('.review-note').nth(1).locator('button', { hasText: 'Address' }).click();
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
    await expect(page.locator('.comment-preview')).toHaveCount(1);
    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('#submit-review')).toHaveText('Review finished');
    expect(sent.comments).toHaveLength(1);
    expect(sent.comments[0].body).toBe('');
    expect(sent.comments[0].in_reply_to).toEqual({
      id: `${sent.comments[0].file}-address`,
      author: 'Author',
      body: 'Please fix this.',
    });
  });

  test('undoing a queued review note removes its comment', async ({ page }) => {
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
    await note.locator('button', { hasText: 'Address' }).click();
    await expect(note).toContainText('Queued for agent');
    await expect(page.locator('#comment-count')).toHaveText('1');
    await note.locator('button', { hasText: 'Undo' }).click();
    await expect(note.locator('button', { hasText: 'Address' })).toHaveCount(1);
    await expect(page.locator('#comment-count')).toHaveText('0');
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
