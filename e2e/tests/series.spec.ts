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

async function startSeriesServer(port: number = 0, range: string = 'HEAD~2..HEAD'): Promise<void> {
  if (!testRepoPath) throw new Error('Test repo not initialized');

  return new Promise((resolve, reject) => {
    const cargoPath = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
    const cmd = `cd "${testRepoPath}" && "${cargoPath}" --series "${range}" --port ${port} --no-open`;

    serverUrl = null;
    const resultsDir = path.resolve(__dirname, '../test-results');
    try { fs.mkdirSync(resultsDir, { recursive: true }); } catch {}
    serverLogPath = path.join(resultsDir, `series-server-${Date.now()}.log`);

    serverProcess = spawn('bash', ['-c', cmd], { stdio: ['inherit', 'pipe', 'pipe'] });

    let output = '';
    let errorOutput = '';

    const appendLog = (chunk: string) => {
      try { if (serverLogPath) fs.appendFileSync(serverLogPath, chunk); } catch {}
    };

    const checkForReady = (data: Buffer) => {
      const text = data.toString();
      output += text;
      appendLog(text);
      const urlMatch = text.match(/http:\/\/[^\s]+:\d+/);
      if (urlMatch && !serverUrl) {
        serverUrl = urlMatch[0];
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
      if (code !== 0 && code !== null)
        reject(new Error(`Server exited with code ${code}. Error: ${errorOutput}`));
    });
    setTimeout(() => {
      reject(new Error(`Server startup timeout. Output: ${output}. Error: ${errorOutput}`));
    }, 15000);
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) { resolve(); return; }
    serverProcess.on('close', () => { serverProcess = null; resolve(); });
    if (serverProcess.pid) {
      try { process.kill(-serverProcess.pid, 'SIGTERM'); } catch {}
    }
    setTimeout(() => {
      if (serverProcess) {
        try { if (serverProcess.pid) process.kill(-serverProcess.pid, 'SIGKILL'); } catch {}
        serverProcess = null;
      }
      resolve();
    }, 2000);
  });
}

async function openApp(page: Page) {
  const url = (serverUrl ?? 'http://localhost:9999') + '/';
  await page.goto(url);
  await page.waitForFunction(() => (window as any).require !== undefined, { timeout: 10000 });
  await page.locator('#file-list').waitFor({ state: 'attached', timeout: 10000 });
  if (!(await page.locator('.monaco-editor').first().isVisible())) {
    const firstItem = page.locator('#file-list li').first();
    if (await firstItem.count()) await firstItem.click();
  }
  await page.waitForSelector('.monaco-editor', { timeout: 20000 });
}

async function makeSeriesRepo(dir: string): Promise<void> {
  await execAsync(`
    set -e
    rm -rf "${dir}"
    mkdir -p "${dir}"
    cd "${dir}"
    git init
    git config user.name "Test User"
    git config user.email "test@example.com"

    # Commit 1: initial file
    echo "alpha content" > alpha.txt
    git add alpha.txt
    git commit -m "Add alpha"

    # Commit 2: add beta
    echo "beta content" > beta.txt
    git add beta.txt
    git commit -m "Add beta"

    # Commit 3: modify alpha
    echo "alpha modified" > alpha.txt
    git add alpha.txt
    git commit -m "Modify alpha"
  `);
}

test.describe('Series mode E2E', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    const suffix = `${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    testRepoPath = path.join(os.tmpdir(), `lrv-series-test-${suffix}`);
    await makeSeriesRepo(testRepoPath);
    await startSeriesServer(0, 'HEAD~2..HEAD');
  });

  test.afterAll(async () => {
    await stopServer();
    await new Promise((r) => setTimeout(r, 2000));
    if (testRepoPath) {
      await execAsync(`rm -rf "${testRepoPath}"`);
      testRepoPath = null;
    }
  });

  test('commit strip shows correct number of commits', async ({ page }) => {
    await openApp(page);

    const strip = page.locator('#commit-strip');
    await expect(strip).toBeVisible({ timeout: 5000 });

    // HEAD~2..HEAD is 2 commits
    const commits = strip.locator('.series-commit');
    await expect(commits).toHaveCount(2, { timeout: 5000 });
  });

  test('first commit is active on load', async ({ page }) => {
    await openApp(page);

    const strip = page.locator('#commit-strip');
    await expect(strip).toBeVisible({ timeout: 5000 });

    const activeCommit = strip.locator('.series-commit.active');
    await expect(activeCommit).toHaveCount(1, { timeout: 5000 });

    // First commit (idx 0) should be active
    const firstCommit = strip.locator('.series-commit').first();
    await expect(firstCommit).toHaveClass(/active/, { timeout: 5000 });
  });

  test('clicking second commit loads its files', async ({ page }) => {
    await openApp(page);

    const strip = page.locator('#commit-strip');
    await expect(strip).toBeVisible({ timeout: 5000 });

    const commits = strip.locator('.series-commit');
    await expect(commits).toHaveCount(2, { timeout: 5000 });

    // File items (not the commit summary row which has data-commit="1")
    const fileItems = page.locator('#file-list li[data-index]');

    // First commit ("Add beta") contains beta.txt
    await expect(fileItems.filter({ hasText: 'beta.txt' })).toBeVisible({ timeout: 5000 });

    // Click second commit ("Modify alpha")
    await commits.nth(1).click();

    // Active marker should move
    await expect(commits.nth(1)).toHaveClass(/active/, { timeout: 5000 });

    // File list should now show alpha.txt (the file modified in commit 2)
    await expect(fileItems.filter({ hasText: 'alpha.txt' })).toBeVisible({ timeout: 10000 });
    // beta.txt should no longer be listed
    await expect(fileItems.filter({ hasText: 'beta.txt' })).toHaveCount(0, { timeout: 5000 });
  });

  test('commit strip shows commit message preview', async ({ page }) => {
    await openApp(page);

    const strip = page.locator('#commit-strip');
    await expect(strip).toBeVisible({ timeout: 5000 });

    // Each commit row should display something from the commit message
    const firstMsg = strip.locator('.series-commit-msg').first();
    await expect(firstMsg).not.toBeEmpty({ timeout: 5000 });
  });
});
