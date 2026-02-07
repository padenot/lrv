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

/**
 * Start the lrv server with a test diff
 */
async function startServer(port: number = 0, options?: { title?: string }): Promise<void> {
  if (!testRepoPath) {
    throw new Error('Test repo not initialized');
  }

  return new Promise((resolve, reject) => {
    // Run cargo from the main repo, but execute git diff from the test repo
    const cargoPath = path.resolve(__dirname, '../../target/debug/lrv');
    const extraFlags = options?.title ? ` --title \"${options.title}\"` : '';
    const cmd = `cd "${testRepoPath}" && git diff HEAD | "${cargoPath}" --port ${port} --no-open${extraFlags}`;

    // Reset state for new instance
    serverUrl = null;
    const resultsDir = path.resolve(__dirname, '../test-results');
    try { fs.mkdirSync(resultsDir, { recursive: true }); } catch {}
    serverLogPath = path.join(resultsDir, `server-${Date.now()}.log`);

    serverProcess = spawn('bash', ['-c', cmd], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    const appendLog = (chunk: string) => {
      try { if (serverLogPath) fs.appendFileSync(serverLogPath, chunk); } catch {}
    };

    const checkForReady = (data: Buffer) => {
      const text = data.toString();
      output += text;
      appendLog(text);
      // Capture first URL for dynamic base
      const urlMatch = text.match(/http:\/\/[^\s]+:\d+/);
      if (urlMatch && !serverUrl) {
        serverUrl = urlMatch[0];
      }
      // Server is ready when we see the "Available at:" message
      if (output.includes('Available at:')) {
        // Give it a moment to fully initialize
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

    serverProcess.on('error', reject);

    serverProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Server exited with code ${code}. Error: ${errorOutput}`));
      }
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      reject(new Error(`Server startup timeout. Output: ${output}. Error: ${errorOutput}`));
    }, 10000);
  });
}

async function openApp(page: Page) {
  const url = (serverUrl ?? 'http://localhost:9999') + '/';
  await page.goto(url);
  await page.waitForFunction(() => (window as any).require !== undefined, { timeout: 3000 });
  const editorVisible = await page.locator('.monaco-editor').first().isVisible();
  if (!editorVisible) {
    const items = await page.locator('#file-list li').count();
    if (items > 0) {
      await page.locator('#file-list li').first().click();
    }
  }
  await page.waitForSelector('.monaco-editor', { timeout: 5000 });
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
      try { if (serverLogPath) fs.appendFileSync(serverLogPath, text); } catch {}
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
    console.log('[e2e] Starting tests');
  });

  test.beforeEach(async () => {
    // Create isolated test repository with unique suffix for parallel runs
    const suffix = `${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    testRepoPath = path.join(os.tmpdir(), `lrv-test-${suffix}`);
    const setupScript = path.resolve(__dirname, '../setup-test-repo.sh');
    await execAsync(`"${setupScript}" "${testRepoPath}"`);

    await startServer(0);
    if (serverLogPath) {
      console.log(`[e2e] Server log at: ${serverLogPath}`);
    }
  });

  test.afterEach(async () => {
    await stopServer();

    // Wait for port to be fully released
    await new Promise(resolve => setTimeout(resolve, 2000));

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
    await expect(page.locator('#file-list')).toBeVisible();

    // Check that we have multiple files in the list
    await expect(page.locator('#file-list li')).toHaveCount(3);
  });

  test('should display diff content in both panels', async ({ page }) => {
    await openApp(page);

    // Wait for Monaco to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Click on test.txt to view it
    await page.locator('#file-list li').filter({ hasText: 'test.txt' }).click();

    // Wait a moment for the file to load
    await page.waitForTimeout(500);

    // Check that diff content is visible (look for our modified line)
    await expect(page.locator('text=line 2 modified')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=line 4 added')).toBeVisible();
  });

  test('should add a comment via line number click', async ({ page }) => {
    await openApp(page);

    // Wait for editor to be ready
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Click on a line number to add a comment
    // Note: This is tricky with Monaco - we might need to click on the gutter
    const gutter1 = page.locator('.margin .line-numbers').first();
    await gutter1.click({ position: { x: 4, y: 4 }, force: true });

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

  test('should show keyboard shortcuts help', async ({ page }) => {
    await openApp(page);

    // Wait for page to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 5000 });

    // Press ? to show help
    await page.keyboard.press('?');

    // Help modal should appear (use more specific selector for the heading)
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
    await expect(page.locator('#file-list li.active')).toHaveCount(1);

    // Get the currently active file index
    const firstActiveIndex = await page.locator('#file-list li.active').getAttribute('data-index');

    // Press Shift+J to go to next file
    await page.keyboard.press('Shift+J');
    await page.waitForTimeout(500);

    // Verify a different file is now active
    const secondActiveIndex = await page.locator('#file-list li.active').getAttribute('data-index');
    expect(parseInt(secondActiveIndex!)).toBe(parseInt(firstActiveIndex!) + 1);

    // Press Shift+K to go back to previous file
    await page.keyboard.press('Shift+K');
    await page.waitForTimeout(500);

    // Should be back to first file
    const thirdActiveIndex = await page.locator('#file-list li.active').getAttribute('data-index');
    expect(parseInt(thirdActiveIndex!)).toBe(parseInt(firstActiveIndex!));
  });

  test('complete review workflow: add comment and submit', async ({ page }) => {
    await openApp(page);

    // Wait for editor
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

    // Add a comment by clicking line number (click gutter to avoid overlay)
    const gutter = page.locator('.margin .line-numbers').first();
    await gutter.click({ position: { x: 4, y: 4 }, force: true });

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
    if (!testRepoPath) throw new Error('Test repo not initialized');

    // Stage current changes first, then rename a file
    await execAsync(`cd "${testRepoPath}" && git add -A && git commit -m "changes" && mv test.txt renamed-test.txt && git add -A`);

    // Restart server with renamed file
    await stopServer();
    await startServer();

    await openApp(page);

    // Check that renamed file shows "old.txt → new.txt" format
    const fileListItem = page.locator('#file-list li:has-text("test.txt → renamed-test.txt")');
    await expect(fileListItem).toBeVisible();

    // Check that status badge shows "R" for renamed
    await expect(fileListItem.locator('.file-status.renamed')).toBeVisible();
  });

  test('should display deleted files correctly', async ({ page }) => {
    // Create a deleted file diff
    if (!testRepoPath) throw new Error('Test repo not initialized');

    // Stage current changes first, then delete a file
    await execAsync(`cd "${testRepoPath}" && git add -A && git commit -m "changes" && git rm file2.txt`);

    // Restart server with deleted file
    await stopServer();
    await startServer();

    await openApp(page);
    // Verify deleted file is present in the list and shows deleted badge
    const deletedItem = page.locator('#file-list li').filter({ hasText: 'file2.txt' });
    await expect(deletedItem).toBeVisible({ timeout: 5000 });
    await expect(deletedItem.locator('.file-status.deleted')).toBeVisible();

    // Select the deleted file and verify the diff renders old content
    await deletedItem.click();
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Old content should be visible in the diff view
    await expect(page.locator('text=function foo() {')).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=console.log('debug');")).toBeVisible();
  });

  test('should display added files and content', async ({ page }) => {
    // Create a new file
    if (!testRepoPath) throw new Error('Test repo not initialized');

    await execAsync(`cd "${testRepoPath}" && echo "new content" > new-file.txt && git add new-file.txt`);

    // Restart server with new file
    await stopServer();
    await startServer();

    await openApp(page);

    // Check that new file is shown
    const fileListItem = page.locator('#file-list li:has-text("new-file.txt")');
    await expect(fileListItem).toBeVisible();

    // Select the new file and verify diff content renders
    await fileListItem.click();
    await page.locator('.monaco-editor').first().waitFor({ timeout: 7000 });

    // Verify the added content is visible in the diff view
    await expect(page.locator('text=new content')).toBeVisible({ timeout: 5000 });

    // Check that status badge shows "A" for added
    await expect(fileListItem.locator('.file-status.added')).toBeVisible();
  });

  test('should display provided title in header', async ({ page }) => {
    // Restart server with a custom title
    await stopServer();
    await startServer(0, { title: 'E2E Review Title' });

    await openApp(page);

    // Verify title appears in header project info
    await expect(page.locator('#project-info')).toContainText('E2E Review Title');
  });
});
