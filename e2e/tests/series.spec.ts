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
  if (!testRepoPath) {
    throw new Error('Test repo not initialized');
  }

  return new Promise((resolve, reject) => {
    const cargoPath = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
    const cmd = `cd "${testRepoPath}" && "${cargoPath}" --series "${range}" --port ${port} --no-open`;

    serverUrl = null;
    const resultsDir = path.resolve(__dirname, '../test-results');
    try {
      fs.mkdirSync(resultsDir, { recursive: true });
    } catch {}
    serverLogPath = path.join(resultsDir, `series-server-${Date.now()}.log`);

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
    const startupTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error(`Server startup timeout. Output: ${output}. Error: ${errorOutput}`));
      }
    }, 15000);

    const checkForReady = (data: Buffer) => {
      const text = data.toString();
      output += text;
      appendLog(text);
      const urlMatch = output.match(/http:\/\/[^\s]+:\d+/);
      if (urlMatch && !serverUrl && !settled) {
        serverUrl = urlMatch[0];
        settled = true;
        clearTimeout(startupTimer);
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
      if (code !== 0 && code !== null && !settled) {
        settled = true;
        clearTimeout(startupTimer);
        reject(new Error(`Server exited with code ${code}. Error: ${errorOutput}`));
      }
    });
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) {
      resolve();
      return;
    }
    serverProcess.on('close', () => {
      serverProcess = null;
      resolve();
    });
    if (serverProcess.pid) {
      try {
        process.kill(-serverProcess.pid, 'SIGTERM');
      } catch {}
    }
    setTimeout(() => {
      if (serverProcess) {
        try {
          if (serverProcess.pid) {
            process.kill(-serverProcess.pid, 'SIGKILL');
          }
        } catch {}
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
  await page.waitForFunction(
    () => document.querySelector('file-tree-container.lrv-file-tree') !== null,
    { timeout: 10000 },
  );
  if (!(await page.locator('.monaco-editor').first().isVisible())) {
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
    // First commit ("Add beta") contains beta.txt
    await expect(fileTreeRow(page, 'beta.txt')).toBeVisible({ timeout: 5000 });

    // Click second commit ("Modify alpha")
    await commits.nth(1).click();

    // Active marker should move
    await expect(commits.nth(1)).toHaveClass(/active/, { timeout: 5000 });

    // File list should now show alpha.txt (the file modified in commit 2)
    await expect(fileTreeRow(page, 'alpha.txt')).toBeVisible({ timeout: 10000 });
    // beta.txt should no longer be listed
    await expect(fileTreeRow(page, 'beta.txt')).toHaveCount(0, { timeout: 5000 });
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

test.describe('Series: first commit has no file changes', () => {
  test.describe.configure({ mode: 'serial' });

  // Own isolated server state — does not touch module-level serverProcess/testRepoPath
  let repoDir: string | null = null;
  let proc: import('child_process').ChildProcess | null = null;
  let localUrl: string | null = null;

  test.beforeAll(async () => {
    const suffix = `${Date.now()}-${process.pid}`;
    repoDir = path.join(os.tmpdir(), `lrv-empty-first-${suffix}`);
    await execAsync(`
      set -e
      rm -rf "${repoDir}"
      mkdir -p "${repoDir}"
      cd "${repoDir}"
      git init
      git config user.name "Test User"
      git config user.email "test@example.com"
      echo "base" > base.txt && git add base.txt && git commit -m "Base"
      git commit --allow-empty -m "Empty: no file changes"
      echo "hello" > hello.txt && git add hello.txt && git commit -m "Add hello.txt"
    `);

    const cargoPath = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
    const cmd = `cd "${repoDir}" && "${cargoPath}" --series "HEAD~2..HEAD" --port 0 --no-open`;
    await new Promise<void>((resolve, reject) => {
      proc = spawn('bash', ['-c', cmd], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
          ...process.env,
          XDG_CONFIG_HOME: path.join(repoDir!, '.config'),
        },
      });
      let settled = false;
      let output = '';
      const startupTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('startup timeout'));
        }
      }, 15000);
      const check = (buf: Buffer) => {
        const text = buf.toString();
        output += text;
        const m = output.match(/http:\/\/[^\s]+:\d+/);
        if (m && !localUrl && !settled) {
          localUrl = m[0];
          settled = true;
          clearTimeout(startupTimer);
          setTimeout(resolve, 500);
        }
      };
      proc!.stdout?.on('data', check);
      proc!.stderr?.on('data', check);
      proc!.on('error', (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(startupTimer);
          reject(error);
        }
      });
    });
  });

  test.afterAll(async () => {
    if (proc?.pid) {
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 1500));
    if (repoDir) {
      await execAsync(`rm -rf "${repoDir}"`);
      repoDir = null;
    }
    proc = null;
    localUrl = null;
  });

  test('no crash when first commit has no changed files', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto((localUrl ?? 'http://localhost:9999') + '/');
    await page.waitForFunction(() => (window as any).require !== undefined, { timeout: 10000 });
    await page.locator('#commit-strip').waitFor({ state: 'visible', timeout: 10000 });

    expect(errors, `JS errors:\n${errors.join('\n')}`).toEqual([]);

    const commits = page.locator('#commit-strip .series-commit');
    await expect(commits).toHaveCount(2, { timeout: 5000 });
    await expect(commits.first()).toHaveClass(/active/);
  });
});

test.describe('Series: stacked-mode comments stay scoped to their own commit', () => {
  test.describe.configure({ mode: 'serial' });

  // Own isolated server state — does not touch module-level serverProcess/testRepoPath
  let repoDir: string | null = null;
  let proc: import('child_process').ChildProcess | null = null;
  let localUrl: string | null = null;

  test.beforeAll(async () => {
    const suffix = `${Date.now()}-${process.pid}`;
    repoDir = path.join(os.tmpdir(), `lrv-stacked-scope-${suffix}`);
    await execAsync(`
      set -e
      rm -rf "${repoDir}"
      mkdir -p "${repoDir}"
      cd "${repoDir}"
      git init
      git config user.name "Test User"
      git config user.email "test@example.com"
      printf 'line1\\nline2\\nline3\\nline4\\nline5\\n' > shared.txt
      git add shared.txt && git commit -m "Base"
      printf 'line1\\nline2 modified once\\nline3\\nline4\\nline5\\n' > shared.txt
      git add shared.txt && git commit -m "First patch touches line2"
      printf 'line1\\nline2 modified twice\\nline3\\nline4\\nline5\\n' > shared.txt
      git add shared.txt && git commit -m "Second patch touches line2 again"
    `);

    const cargoPath = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
    const cmd = `cd "${repoDir}" && "${cargoPath}" --series "HEAD~2..HEAD" --port 0 --no-open`;
    await new Promise<void>((resolve, reject) => {
      proc = spawn('bash', ['-c', cmd], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
          ...process.env,
          XDG_CONFIG_HOME: path.join(repoDir!, '.config'),
        },
      });
      let settled = false;
      let output = '';
      const startupTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('startup timeout'));
        }
      }, 15000);
      const check = (buf: Buffer) => {
        const text = buf.toString();
        output += text;
        const m = output.match(/http:\/\/[^\s]+:\d+/);
        if (m && !localUrl && !settled) {
          localUrl = m[0];
          settled = true;
          clearTimeout(startupTimer);
          setTimeout(resolve, 500);
        }
      };
      proc!.stdout?.on('data', check);
      proc!.stderr?.on('data', check);
      proc!.on('error', (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(startupTimer);
          reject(error);
        }
      });
    });
  });

  test.afterAll(async () => {
    if (proc?.pid) {
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 1500));
    if (repoDir) {
      await execAsync(`rm -rf "${repoDir}"`);
      repoDir = null;
    }
    proc = null;
    localUrl = null;
  });

  test('a comment on one commit does not leak onto another commit touching the same file/line', async ({
    page,
  }) => {
    await page.goto((localUrl ?? 'http://localhost:9999') + '/');
    await page.waitForFunction(() => (window as any).require !== undefined, { timeout: 10000 });
    await page.locator('#commit-strip').waitFor({ state: 'visible', timeout: 10000 });

    // Both series commits touch shared.txt at the same line number.
    await page.locator('#toggle-stacked').click();
    await expect(page.locator('#toggle-stacked')).toHaveText('Mode: Stacked');
    await page.locator('.stacked-code-view diffs-container').first().waitFor({ timeout: 10000 });

    const commits = page.locator('#commit-strip .series-commit');
    await expect(commits).toHaveCount(2, { timeout: 5000 });
    await expect(commits.first()).toHaveClass(/active/);

    // Add a comment on the first commit's changed line.
    const lineNumber = page
      .locator('.stacked-code-view diffs-container [data-interactive-line-numbers]')
      .first();
    await lineNumber.waitFor({ state: 'visible', timeout: 10000 });
    await lineNumber.click({ position: { x: 8, y: 8 } });
    await expect(page.locator('.stacked-comment-form')).toBeVisible({ timeout: 3000 });
    await page.locator('.stacked-comment-form .stacked-comment-ta').fill('Only for commit 1');
    await page.locator('.stacked-comment-form .stacked-comment-save').click();
    await expect(page.locator('.stacked-comment-box')).toContainText('Only for commit 1');

    // Switch to the second commit, which touches the exact same file/line.
    await commits.nth(1).click();
    await expect(commits.nth(1)).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('.stacked-code-view diffs-container').first().waitFor({ timeout: 10000 });

    // The comment must NOT leak onto the second commit's view of that line.
    await expect(page.locator('.stacked-comment-box')).toHaveCount(0);

    // Switching back to the first commit must still show the comment.
    await commits.nth(0).click();
    await expect(commits.nth(0)).toHaveClass(/active/, { timeout: 5000 });
    await page.locator('.stacked-code-view diffs-container').first().waitFor({ timeout: 10000 });
    await expect(page.locator('.stacked-comment-box')).toContainText('Only for commit 1');
  });
});

test.describe('Series: overall feedback is series-wide, not attached to a single commit', () => {
  test.describe.configure({ mode: 'serial' });

  // Own isolated server state — does not touch module-level serverProcess/testRepoPath
  let repoDir: string | null = null;
  let proc: import('child_process').ChildProcess | null = null;
  let localUrl: string | null = null;
  let logPath: string | null = null;

  test.beforeAll(async () => {
    const suffix = `${Date.now()}-${process.pid}`;
    repoDir = path.join(os.tmpdir(), `lrv-overall-comment-${suffix}`);
    await makeSeriesRepo(repoDir);

    const cargoPath = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
    const cmd = `cd "${repoDir}" && "${cargoPath}" --series "HEAD~2..HEAD" --port 0 --no-open`;
    const resultsDir = path.resolve(__dirname, '../test-results');
    try {
      fs.mkdirSync(resultsDir, { recursive: true });
    } catch {}
    logPath = path.join(resultsDir, `series-overall-comment-${Date.now()}.log`);

    await new Promise<void>((resolve, reject) => {
      proc = spawn('bash', ['-c', cmd], {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: {
          ...process.env,
          XDG_CONFIG_HOME: path.join(repoDir!, '.config'),
        },
      });
      let settled = false;
      let output = '';
      const appendLog = (chunk: string) => {
        try {
          if (logPath) {
            fs.appendFileSync(logPath, chunk);
          }
        } catch {}
      };
      const startupTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('startup timeout'));
        }
      }, 15000);
      const check = (buf: Buffer) => {
        const text = buf.toString();
        output += text;
        appendLog(text);
        const m = output.match(/http:\/\/[^\s]+:\d+/);
        if (m && !localUrl && !settled) {
          localUrl = m[0];
          settled = true;
          clearTimeout(startupTimer);
          setTimeout(resolve, 500);
        }
      };
      proc!.stdout?.on('data', check);
      proc!.stderr?.on('data', check);
      proc!.on('error', (error) => {
        if (!settled) {
          settled = true;
          clearTimeout(startupTimer);
          reject(error);
        }
      });
    });
  });

  test.afterAll(async () => {
    if (proc?.pid) {
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {}
    }
    await new Promise((r) => setTimeout(r, 1500));
    if (repoDir) {
      await execAsync(`rm -rf "${repoDir}"`);
      repoDir = null;
    }
    proc = null;
    localUrl = null;
  });

  test('submitting overall feedback produces a top-level overall_comment, not a per-commit comment', async ({
    page,
  }) => {
    await page.goto((localUrl ?? 'http://localhost:9999') + '/');
    await page.waitForFunction(() => (window as any).require !== undefined, { timeout: 10000 });
    await page.locator('#commit-strip').waitFor({ state: 'visible', timeout: 10000 });

    // Open the commit-message view via the "Review Summary" row and set the
    // global feedback note (not tied to any single commit).
    await page.locator('li[data-commit="1"] .summary-row-button').click();
    await page.locator('.commit-summary-input').waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('.commit-summary-input').fill('Looks good across the whole series');

    // Submit without adding any per-line comments.
    await page.locator('#submit-review').click();
    await expect(page.locator('.submit-summary-input')).toHaveValue(
      'Looks good across the whole series',
    );
    await page.locator('.confirm-submit-btn').click();
    await expect(page.locator('text=Review Submitted')).toBeVisible({ timeout: 3000 });

    // Wait for the server process (which prints its JSON result to stdout on
    // shutdown) to exit, then inspect what it actually printed.
    await new Promise<void>((resolve) => {
      if (!proc || proc.exitCode !== null) {
        resolve();
        return;
      }
      proc.once('exit', () => resolve());
      setTimeout(resolve, 5000);
    });

    const log = logPath ? fs.readFileSync(logPath, 'utf-8') : '';
    const jsonStart = log.lastIndexOf('{\n  "status"');
    expect(jsonStart, `expected JSON output in log:\n${log}`).toBeGreaterThanOrEqual(0);
    const result = JSON.parse(log.slice(jsonStart));

    expect(result.overall_comment).toBe('Looks good across the whole series');
    expect(Array.isArray(result.commits)).toBe(true);
    for (const commit of result.commits) {
      expect(commit.comments).toEqual([]);
    }
  });
});
