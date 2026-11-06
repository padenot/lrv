import { test, expect, Page } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { isolateConfig } from '../test-config';

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
    let settled = false;
    const startupTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Server startup timeout'));
      }
    }, 15000);
    const check = (d: Buffer) => {
      const t = d.toString();
      output += t;
      const m = t.match(/http:\/\/[^\s]+:\d+/);
      if (m && !serverUrl && !settled) {
        serverUrl = m[0];
        settled = true;
        clearTimeout(startupTimer);
        setTimeout(resolve, 200);
      }
    };
    serverProcess.stdout?.on('data', check);
    serverProcess.stderr?.on('data', check);
    serverProcess.on('error', (error) => {
      if (!settled) {
        settled = true;
        clearTimeout(startupTimer);
        reject(error);
      }
    });
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

test.describe('Editor Font', () => {
  test.beforeEach(async () => {
    const suffix = `${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    testRepoPath = path.join(os.tmpdir(), `lrv-font-${suffix}`);
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

  test('rejects non-monospace config font and uses monospace fallback', async ({ page }) => {
    const url = (serverUrl ?? 'http://localhost:9999') + '/';

    await isolateConfig(page, { font: 'Inter' });

    // Load the app with the bad config
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('.monaco-editor', { state: 'attached', timeout: 15000 });

    // Ensure Monaco renders without depending on FileTree pointer hit-testing internals.
    await page.evaluate(() => (window as any).__APP?.loadFile?.(0));
    await page.waitForSelector('.monaco-editor', { timeout: 15000 });

    // Verify the editor font is monospace: measure 'm' and 'i' widths via canvas
    // using the font that Monaco is actually using.
    const isMonospace = await page.evaluate(() => {
      const editorEl = document.querySelector('.monaco-editor .view-lines') as HTMLElement;
      if (!editorEl) {
        return false;
      }
      const computed = getComputedStyle(editorEl);
      const fontFamily = computed.fontFamily;
      const fontSize = computed.fontSize || '13px';

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      ctx.font = `${fontSize} ${fontFamily}`;
      const mWidth = ctx.measureText('m').width;
      const iWidth = ctx.measureText('i').width;
      return Math.abs(mWidth - iWidth) < 1;
    });

    expect(isMonospace).toBe(true);

    // Also verify 'Inter' is NOT in the computed fontFamily of the editor
    const fontFamily = await page.evaluate(() => {
      const editorEl = document.querySelector('.monaco-editor .view-lines') as HTMLElement;
      if (!editorEl) {
        return '';
      }
      return getComputedStyle(editorEl).fontFamily;
    });

    expect(fontFamily.toLowerCase()).not.toContain('inter');
  });

  test('ligatures setting applies to Monaco and stacked views', async ({ page }) => {
    const url = (serverUrl ?? 'http://localhost:9999') + '/';
    const disabled = '"calt" 0, "liga" 0';

    const monacoFeatures = () =>
      page.evaluate(() => {
        const lines = document.querySelector('.monaco-editor .view-lines');
        return lines ? getComputedStyle(lines).fontFeatureSettings : '';
      });
    const stackedFeatures = () =>
      page
        .locator('.stacked-code-view diffs-container [data-line]')
        .first()
        .evaluate((line) => getComputedStyle(line).fontFeatureSettings);
    const setLigatures = async (on: boolean) => {
      await page.locator('#settings-btn').click();
      await page.locator('#ligatures').setChecked(on);
      await page.locator('.help-modal .save-btn').click();
      await expect(page.locator('#ligatures')).toHaveCount(0);
    };

    const savedConfig = await isolateConfig(page);
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForSelector('.monaco-editor', { state: 'attached', timeout: 15000 });
    await page.evaluate(() => (window as any).__APP?.loadFile?.(0));
    await page.waitForSelector('.monaco-editor .view-lines', { timeout: 15000 });
    await expect.poll(monacoFeatures).toBe(disabled);

    await setLigatures(true);
    await expect.poll(monacoFeatures).toBe('"calt", "liga"');

    await page.locator('#toggle-stacked').click();
    await expect.poll(stackedFeatures).toBe('normal');

    await setLigatures(false);
    await expect.poll(stackedFeatures).toBe(disabled);
    expect(savedConfig().ligatures).toBe(false);
  });
});
