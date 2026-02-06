import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

let serverProcess: ChildProcess | null = null;
let testRepoPath: string | null = null;

/**
 * Start the lrv server with a test diff
 */
async function startServer(port: number = 9999): Promise<void> {
  if (!testRepoPath) {
    throw new Error('Test repo not initialized');
  }

  return new Promise((resolve, reject) => {
    // Run cargo from the main repo, but execute git diff from the test repo
    const cargoPath = path.resolve(__dirname, '../../target/debug/lrv');
    const cmd = `cd "${testRepoPath}" && git diff HEAD | "${cargoPath}" --port ${port} --no-open`;

    serverProcess = spawn('bash', ['-c', cmd], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    const checkForReady = (data: Buffer) => {
      const text = data.toString();
      output += text;
      // Server is ready when we see the "Available at:" message
      if (output.includes('Available at:')) {
        // Give it a moment to fully initialize
        setTimeout(resolve, 500);
      }
    };

    serverProcess.stdout?.on('data', checkForReady);
    serverProcess.stderr?.on('data', (data: Buffer) => {
      errorOutput += data.toString();
      checkForReady(data);
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
      output += data.toString();
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

    // Also kill by name to be sure
    try {
      await execAsync('pkill -f "lrv --port"');
    } catch (e) {
      // Might not find any processes
    }

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
  test.beforeAll(async () => {
    // Build the project first
    await execAsync('cargo build', { cwd: '..' });
  });

  test.beforeEach(async () => {
    // Create isolated test repository
    testRepoPath = path.join(os.tmpdir(), `lrv-test-${Date.now()}`);
    const setupScript = path.resolve(__dirname, '../setup-test-repo.sh');
    await execAsync(`"${setupScript}" "${testRepoPath}"`);

    await startServer(9999);
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
    await page.goto('/');

    // Check that Monaco editor loaded (there are 2 editors in diff view)
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 10000 });

    // Check that file list is visible
    await expect(page.locator('#file-list')).toBeVisible();

    // Check that we have multiple files in the list
    await expect(page.locator('#file-list li')).toHaveCount(3);
  });

  test('should display diff content in both panels', async ({ page }) => {
    await page.goto('/');

    // Wait for Monaco to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

    // Click on test.txt to view it
    await page.locator('#file-list li').filter({ hasText: 'test.txt' }).click();

    // Wait a moment for the file to load
    await page.waitForTimeout(500);

    // Check that diff content is visible (look for our modified line)
    await expect(page.locator('text=line 2 modified')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=line 4 added')).toBeVisible();
  });

  test('should add a comment via line number click', async ({ page }) => {
    await page.goto('/');

    // Wait for editor to be ready
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

    // Click on a line number to add a comment
    // Note: This is tricky with Monaco - we might need to click on the gutter
    const lineNumbers = page.locator('.line-numbers');
    await lineNumbers.first().click();

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
    await page.goto('/');

    // Wait for page to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

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
    await page.goto('/');

    // Wait for editor to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

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
    await page.goto('/');

    // Wait for editor
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

    // Add a comment by clicking line number
    const lineNumbers = page.locator('.line-numbers');
    await lineNumbers.first().click();

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
    await page.goto('/');

    // Wait for page to load
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

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

    await page.goto('/');
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

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

    await page.goto('/');
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

    // Check that deleted file shows actual filename (not /dev/null)
    const fileListItem = page.locator('#file-list li:has-text("file2.txt")');
    await expect(fileListItem).toBeVisible();

    // Verify it doesn't show /dev/null
    await expect(page.locator('#file-list li:has-text("/dev/null")')).not.toBeVisible();

    // Check that status badge shows "D" for deleted
    await expect(fileListItem.locator('.file-status.deleted')).toBeVisible();
  });

  test('should display added files correctly', async ({ page }) => {
    // Create a new file
    if (!testRepoPath) throw new Error('Test repo not initialized');

    await execAsync(`cd "${testRepoPath}" && echo "new content" > new-file.txt && git add new-file.txt`);

    // Restart server with new file
    await stopServer();
    await startServer();

    await page.goto('/');
    await page.locator('.monaco-editor').first().waitFor({ timeout: 10000 });

    // Check that new file is shown
    const fileListItem = page.locator('#file-list li:has-text("new-file.txt")');
    await expect(fileListItem).toBeVisible();

    // Verify it doesn't show /dev/null
    await expect(page.locator('#file-list li:has-text("/dev/null")')).not.toBeVisible();

    // Check that status badge shows "A" for added
    await expect(fileListItem.locator('.file-status.added')).toBeVisible();
  });
});
