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
const outDir = path.resolve(__dirname, '../test-results');
if (!fs.existsSync(outDir)) {
  try {
    fs.mkdirSync(outDir, { recursive: true });
  } catch {}
}

function computeStats(values: number[]): {
  n: number;
  mean: number | null;
  median: number | null;
  p95: number | null;
  min: number | null;
  max: number | null;
} {
  const n = values.length;
  if (n === 0) {
    return { n: 0, mean: null, median: null, p95: null, min: null, max: null };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const percentile = (p: number): number => {
    const idx = (n - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    const t = idx - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  };
  return {
    n,
    mean,
    median: percentile(0.5),
    p95: percentile(0.95),
    min: sorted[0],
    max: sorted[n - 1],
  };
}

async function startServer(port: number = 0): Promise<void> {
  if (!testRepoPath) throw new Error('Test repo not initialized');
  return new Promise((resolve, reject) => {
    const cargoPath = (() => {
      const envBin = process.env.LRV_BIN;
      if (envBin && envBin.length > 0) {
        return path.isAbsolute(envBin) ? envBin : path.resolve(__dirname, '../../', envBin);
      }
      return path.resolve(__dirname, '../../target/release/lrv');
    })();
    const benchDiff = process.env.LRV_BENCH_DIFF;
    const cmd = benchDiff
      ? `cd "${testRepoPath}" && cat "${benchDiff}" | "${cargoPath}" --port ${port} --no-open`
      : `cd "${testRepoPath}" && git diff HEAD | "${cargoPath}" --port ${port} --no-open`;
    serverUrl = null;
    console.log(`[server] starting with cmd: ${cmd}`);
    const serverLog = path.join(outDir, `server-${Date.now()}.log`);
    fs.writeFileSync(serverLog, `[start] ${new Date().toISOString()}\nCMD: ${cmd}\n`);
    serverProcess = spawn('bash', ['-c', cmd], { stdio: ['inherit', 'pipe', 'pipe'] });
    let output = '';
    const check = (d: Buffer) => {
      const t = d.toString();
      output += t;
      for (const line of t.split(/\r?\n/)) {
        if (line.trim()) console.log(`[server] ${line}`);
      }
      try {
        fs.appendFileSync(serverLog, t);
      } catch {}
      const m = t.match(/http:\/\/[^\s]+:\d+/);
      if (m && !serverUrl) serverUrl = m[0];
      if (output.includes('Available at:')) setTimeout(resolve, 300);
    };
    serverProcess.stdout?.on('data', check);
    serverProcess.stderr?.on('data', check);
    serverProcess.on('error', reject);
    setTimeout(() => {
      console.error('[server] startup timeout. Partial output:\n' + output);
      try {
        fs.appendFileSync(serverLog, `\n[timeout]\n${output}\n`);
      } catch {}
      reject(new Error('Server startup timeout'));
    }, 15000);
  });
}

async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (!serverProcess) return resolve();
    const p = serverProcess;
    serverProcess = null;
    p.on('close', () => resolve());
    try {
      if (p.pid) process.kill(-p.pid, 'SIGTERM');
    } catch {}
    setTimeout(() => {
      try {
        if (p.pid) process.kill(-p.pid, 'SIGKILL');
      } catch {}
      resolve();
    }, 2000);
  });
}

test.describe.configure({ mode: 'serial', timeout: 120000 });

test.describe('Perf Bench', () => {
  test.beforeEach(async () => {
    const suffix = `${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1e9)}`;
    testRepoPath = path.join(os.tmpdir(), `lrv-perf-${suffix}`);
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

  test('app init performance (10x)', async ({ page }) => {
    const pageLog = path.join(outDir, `page-${Date.now()}.log`);
    const w = (s: string) => {
      try {
        fs.appendFileSync(pageLog, s + '\n');
      } catch {}
    };
    page.on('pageerror', (e) => {
      const s = `[pageerror] ${String(e)}`;
      console.log(s);
      w(s);
    });
    page.on('console', (msg) => {
      const s = `[pageconsole] ${msg.type()} ${msg.text()}`;
      console.log(s);
      w(s);
    });
    page.on('request', (req) => {
      const s = `[request] ${req.method()} ${req.url()}`;
      console.log(s);
      w(s);
    });
    page.on('response', async (res) => {
      const s = `[response] ${res.status()} ${res.url()}`;
      console.log(s);
      w(s);
    });
    page.on('requestfailed', (req) => {
      const s = `[requestfailed] ${req.url()} ${req.failure()?.errorText}`;
      console.log(s);
      w(s);
    });
    const url = (serverUrl ?? 'http://localhost:9999') + '/';
    const samples: number[] = [];
    const navToDiffVisible: number[] = [];
    for (let i = 0; i < 10; i++) {
      console.log(`[iter] start ${i}`);
      const navStart = process.hrtime.bigint();
      await page.goto(url + `?r=${Date.now()}-${i}`, { waitUntil: 'load' });
      // App is ready when it declares readiness after first diff
      try {
        await page.waitForFunction(
          () => document.querySelectorAll('.monaco-editor .view-lines .view-line').length > 0,
          { timeout: 60000 },
        );
        const navEnd = process.hrtime.bigint();
        navToDiffVisible.push(Number(navEnd - navStart) / 1_000_000);
        await page.waitForFunction(() => (window as any).__APP_READY === true, { timeout: 60000 });
        await page.waitForFunction(() => performance.getEntriesByName('appInit').length > 0, {
          timeout: 10000,
        });
      } catch (e) {
        // Dump some diagnostics
        const html = await page.content();
        console.log('[diag] __APP_READY wait timeout. Snippet of body:', html.slice(0, 500));
        const perf = await page.evaluate(() => ({
          marks: performance.getEntriesByType('mark').map((e) => e.name),
          measures: performance
            .getEntriesByType('measure')
            .map((e) => ({ n: e.name, d: e.duration })),
        }));
        console.log('[diag] performance entries:', JSON.stringify(perf));
        throw e;
      }
      const ms = await page.evaluate(() => {
        const arr = (window as any).Perf?.getMetrics?.().appInit || [];
        return arr.length ? arr[arr.length - 1] : null;
      });
      if (typeof ms === 'number') samples.push(ms);
      const navMs = navToDiffVisible.length ? navToDiffVisible[navToDiffVisible.length - 1] : null;
      console.log(`[iter] end ${i} appInit=${ms} navToDiffVisible=${navMs}`);
    }
    // Persist
    try {
      const outDir = path.resolve(__dirname, '../test-results');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, 'perf-init.json');
      const coldNavToDiffVisible = navToDiffVisible.length > 0 ? navToDiffVisible[0] : null;
      const warmNavToDiffVisible = navToDiffVisible.slice(1);
      const summary = {
        primaryMetric: 'navToDiffVisible',
        navToDiffVisible: {
          coldMs: coldNavToDiffVisible,
          warmMs: warmNavToDiffVisible,
          coldStats: computeStats(coldNavToDiffVisible == null ? [] : [coldNavToDiffVisible]),
          warmStats: computeStats(warmNavToDiffVisible),
          overallStats: computeStats(navToDiffVisible),
        },
        appInit: {
          overallStats: computeStats(samples),
        },
      };
      fs.writeFileSync(
        outPath,
        JSON.stringify({ appInit: samples, navToDiffVisible, coldNavToDiffVisible, summary }, null, 2),
      );
      console.log(`[perf-init] wrote metrics to ${outPath}`);
    } catch {}
    expect(samples.length).toBe(10);
    expect(navToDiffVisible.length).toBe(10);
  });

  test('rapid file switching perf', async ({ page }) => {
    const url = (serverUrl ?? 'http://localhost:9999') + '/';
    // Log page events for debugging
    const pageLog = path.join(outDir, `page-rapid-${Date.now()}.log`);
    const w = (s: string) => {
      try {
        fs.appendFileSync(pageLog, s + '\n');
      } catch {}
    };
    page.on('pageerror', (e) => {
      const s = `[pageerror] ${String(e)}`;
      console.log(s);
      w(s);
    });
    page.on('console', (msg) => {
      const s = `[pageconsole] ${msg.type()} ${msg.text()}`;
      console.log(s);
      w(s);
    });
    page.on('request', (req) => {
      const s = `[request] ${req.method()} ${req.url()}`;
      console.log(s);
      w(s);
    });
    page.on('response', async (res) => {
      const s = `[response] ${res.status()} ${res.url()}`;
      console.log(s);
      w(s);
    });
    page.on('requestfailed', (req) => {
      const s = `[requestfailed] ${req.url()} ${req.failure()?.errorText}`;
      console.log(s);
      w(s);
    });

    await page.goto(url + `?r=${Date.now()}-rapid`, { waitUntil: 'load' });
    // Wait for editor to be added to DOM and first lines rendered
    await page.waitForSelector('.monaco-editor', { timeout: 60000, state: 'attached' });
    await page.waitForFunction(
      () =>
        document.querySelectorAll('#file-list li').length > 0 &&
        document.querySelectorAll('.monaco-editor .view-lines .view-line').length > 0,
      { timeout: 60000 },
    );
    // Also ensure UI theme is applied to avoid hidden body
    await page.waitForFunction(
      () =>
        document.documentElement.getAttribute('data-ui-ready') === '1' ||
        getComputedStyle(document.body).visibility === 'visible',
      { timeout: 10000 },
    );
    await page.evaluate(
      () => (window as any).Perf && (window as any).Perf.clear && (window as any).Perf.clear(),
    );
    // Switch a few files repeatedly
    await page.waitForFunction(() => document.querySelectorAll('#file-list li').length > 0, {
      timeout: 30000,
    });
    const count = await page.locator('#file-list li').count();
    const n = Math.min(3, count);
    for (let i = 0; i < 6; i++) {
      await page
        .locator('#file-list li')
        .nth(i % n)
        .click();
      await page.locator('.monaco-editor').first().waitFor({ timeout: 30000 });
    }
    // Persist
    try {
      const metrics = await page.evaluate(() => (window as any).Perf?.getMetrics?.());
      const outDir = path.resolve(__dirname, '../test-results');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, 'perf-switch.json');
      fs.writeFileSync(outPath, JSON.stringify({ fileSwitch: metrics?.fileSwitch || [] }, null, 2));
      console.log(`[perf] wrote metrics to ${outPath}`);
    } catch {}
  });
});
