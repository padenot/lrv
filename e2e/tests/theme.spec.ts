import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

let serverProcess: ChildProcess | null = null;
let serverUrl: string | null = null;
let testRepoPath: string | null = null;

async function startServer(port: number = 0): Promise<void> {
  if (!testRepoPath) {
    throw new Error('Test repo not initialized');
  }
  return new Promise((resolve, reject) => {
    const cargoPath = (() => {
      const envBin = process.env.LRV_BIN;
      if (envBin && envBin.length > 0) {
        return path.isAbsolute(envBin) ? envBin : path.resolve(__dirname, '../../', envBin);
      }
      return path.resolve(__dirname, '../../target/debug/lrv');
    })();
    const cmd = `cd "${testRepoPath}" && git diff HEAD | "${cargoPath}" --port ${port} --no-open`;
    serverUrl = null;
    serverProcess = spawn('bash', ['-c', cmd], { stdio: ['inherit', 'pipe', 'pipe'] });
    let output = '';
    const check = (d: Buffer) => {
      const t = d.toString();
      output += t;
      const m = t.match(/http:\/\/[^\s]+:\d+/);
      if (m && !serverUrl) {
        serverUrl = m[0];
        setTimeout(resolve, 200);
      }
    };
    serverProcess.stdout?.on('data', check);
    serverProcess.stderr?.on('data', check);
    serverProcess.on('error', reject);
    setTimeout(() => reject(new Error('Server startup timeout')), 15000);
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) {
      return resolve();
    }
    const p = serverProcess;
    serverProcess = null;
    p.on('close', () => resolve());
    try {
      if (p.pid) {
        process.kill(-p.pid, 'SIGTERM');
      }
    } catch {}
    setTimeout(() => {
      try {
        if (p.pid) {
          process.kill(-p.pid, 'SIGKILL');
        }
      } catch {}
      resolve();
    }, 1500);
  });
}

test.describe.configure({ mode: 'serial', timeout: 120000 });

test.describe('Theme + Accent', () => {
  test.beforeEach(async () => {
    const suffix = `${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    testRepoPath = path.join(os.tmpdir(), `lrv-theme-${suffix}`);
    const setupScript = path.resolve(__dirname, '../setup-test-repo.sh');
    await execAsync(`"${setupScript}" "${testRepoPath}"`);
    await startServer(0);
  });

  test.afterEach(async () => {
    await stopServer();
    if (testRepoPath) {
      await execAsync(`rm -rf "${testRepoPath}"`);
      testRepoPath = null;
    }
  });

  test('devtools dark accent is pink and no flash', async ({ page }) => {
    const url = (serverUrl ?? 'http://localhost:9999') + '/';

    // Navigate to DOMContentLoaded to check initial visibility (no flash of default theme)
    await page.goto(url + `?r=${Date.now()}`, { waitUntil: 'domcontentloaded' });
    const [attr, initialVis] = await page.evaluate(() => [
      document.documentElement.getAttribute('data-ui-ready'),
      getComputedStyle(document.body).visibility,
    ]);
    if (attr === '1') {
      expect(initialVis).toBe('visible');
    } else {
      expect(initialVis).toBe('hidden');
    }

    // Set config to firefox devtools dark theme
    const newConfig = {
      color_scheme: 'firefox-devtools-dark',
      split_view: true,
      font: 'JetBrains Mono',
      auto_close_tab: false,
    };
    await page.request.put(url + 'api/config', { data: newConfig });

    // Reload to apply config from server and allow Monaco to load
    await page.goto(url + `?r=${Date.now()}-2`, { waitUntil: 'load' });

    // Wait for editor to appear and body to be visible
    await page.waitForSelector('.monaco-editor', { state: 'attached', timeout: 15000 });
    await page.waitForFunction(() => getComputedStyle(document.body).visibility === 'visible', {
      timeout: 10000,
    });
    const vis = await page.evaluate(() => getComputedStyle(document.body).visibility);
    expect(vis).toBe('visible');

    // Accent should be the DevTools pink (#ff7de9) — variables store rgb()
    // Wait for accent derivation to complete
    await page.waitForFunction(() => (window as any).__ACCENT_READY === true, { timeout: 15000 });
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim(),
    );
    expect(accent.replace(/\s+/g, '')).toBe('rgb(255,125,233)');

    // Also verify a primary button uses the accent color
    const btnBg = await page.evaluate(() => {
      const b = document.createElement('button');
      b.className = 'btn-primary';
      document.body.appendChild(b);
      const v = getComputedStyle(b).backgroundColor;
      b.remove();
      return v;
    });
    expect(btnBg).toBe('rgb(255, 125, 233)');
  });
});
