import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const execAsync = promisify(exec);

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
      env: {
        ...process.env,
        XDG_CONFIG_HOME: path.join(testRepoPath, '.config'),
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
  if (!(await page.locator('.monaco-editor').first().isVisible())) {
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
  await page.waitForSelector('.monaco-editor', { timeout: 20000 });
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

async function readCommentDraftRecords(page: Page): Promise<Array<{ comments?: unknown[] }>> {
  return page.evaluate(() => {
    return new Promise<Array<{ comments?: unknown[] }>>((resolve, reject) => {
      const request = indexedDB.open('lrv-comment-drafts', 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'key' });
        }
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to open draft DB'));
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('drafts', 'readonly');
        let records: Array<{ comments?: unknown[] }> = [];

        tx.oncomplete = () => {
          db.close();
          resolve(records);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('Failed to read draft DB'));
        };

        const getAll = tx.objectStore('drafts').getAll();
        getAll.onsuccess = () => {
          records = getAll.result as Array<{ comments?: unknown[] }>;
        };
        getAll.onerror = () => reject(getAll.error ?? new Error('Failed to read draft records'));
      };
    });
  });
}

async function commentDraftCount(page: Page): Promise<number> {
  const records = await readCommentDraftRecords(page);
  return records.reduce(
    (count, record) => count + (Array.isArray(record.comments) ? record.comments.length : 0),
    0,
  );
}

/**
 * Stop the server and capture output
 */
async function stopServer(): Promise<string> {
  return new Promise(async (resolve) => {
    if (!serverProcess) {
      resolve('');
      return;
    }

    let output = '';

    serverProcess.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      try {
        if (serverLogPath) {
          fs.appendFileSync(serverLogPath, text);
        }
      } catch {}
    });

    serverProcess.on('close', () => {
      serverProcess = null;
      resolve(output);
    });

    // Kill the entire process group to ensure child processes are killed
    if (serverProcess.pid) {
      try {
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch (e) {
        // Process might already be dead
      }
    }

    // Avoid aggressive pkill; rely on process group kill for speed and safety

    // Force kill after timeout
    setTimeout(() => {
      if (serverProcess) {
        try {
          if (serverProcess.pid) {
            process.kill(-serverProcess.pid, 'SIGKILL');
          }
        } catch (e) {
          // Ignore
        }
        serverProcess = null;
      }
      resolve(output);
    }, 2000);
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
    await openApp(page);

    // Wait for editor to be ready
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Wait a bit for Monaco handlers to be fully registered
    await page.waitForTimeout(500);

    // Click on a line number to add a comment
    const lineNumber = page.locator('.modified .line-numbers').first();
    await lineNumber.click({ position: { x: 10, y: 10 } });

    // Comment dialog should appear
    await expect(page.locator('.inline-comment-box')).toBeVisible({ timeout: 2000 });

    // Fill in comment
    await page.locator('.comment-textarea').fill('This is a test comment');

    // Save comment
    await page.locator('.save-btn').click();

    // Comment dialog should close
    await expect(page.locator('.inline-comment-box')).not.toBeVisible();

    // Comment count should update
    await expect(page.locator('#comment-count')).toHaveText('1');
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

    await page
      .locator('.modified .line-numbers')
      .nth(2)
      .click({ position: { x: 10, y: 10 } }); // line 3
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
    await expect(page.locator('text=Review Comments')).toBeVisible();
    await expect(page.locator('.comment-preview-header')).toContainText(':2-4 (new)');

    const highlighted = await page.locator('.comment-preview-code-line.target').count();
    expect(highlighted).toBe(3);
  });

  test('should show keyboard shortcuts help', async ({ page }) => {
    await openApp(page);

    // Wait for page to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 5000 });

    // Click on the header to focus the page without triggering Monaco
    await page.locator('.header').click();

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
    await page.locator('.header').click();

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
    await lineNumber.click({ position: { x: 10, y: 10 } });

    await page.locator('.comment-textarea').fill('Please fix this');
    await page.locator('.save-btn').click();

    // Verify comment was added
    await expect(page.locator('#comment-count')).toHaveText('1');

    // Submit review
    await page.locator('#submit-review').click();

    // Confirmation modal should appear
    await expect(page.locator('text=Review Comments')).toBeVisible();
    await expect(page.locator('text=Please fix this')).toBeVisible();

    // Confirm submission
    await page.locator('.confirm-submit-btn').click();

    // Wait for submission to complete
    await expect(page.locator('text=Review Submitted')).toBeVisible({ timeout: 3000 });
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
    await expect(page.locator('text=Review Submitted')).toBeVisible({ timeout: 3000 });
    await expect.poll(() => commentDraftCount(page)).toBe(0);
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
