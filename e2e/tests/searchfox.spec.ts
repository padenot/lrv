import { test, expect, type Page } from '@playwright/test';
import { execFileSync, spawn, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isolateConfig } from '../test-config';

const binary = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
const TREE = 'mozilla-central';
const CALL_LINE = '  return Disconnect(count);';
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

const RESOLVED = {
  query: 'symbol:AudioNode::Disconnect',
  pretty: 'AudioNode::Disconnect',
  symbols: ['AudioNode::Disconnect'],
};

const SEARCH_RESULTS = {
  query: RESOLVED.query,
  groups: [
    {
      kind: 'normal',
      category: 'Definitions (AudioNode::Disconnect)',
      files: [
        {
          path: 'b.txt',
          lines: [{ lno: 2, line: 'beta target line', bounds: [5, 11], context: null }],
        },
      ],
    },
    {
      kind: 'normal',
      category: 'Uses (AudioNode::Disconnect)',
      files: [
        {
          path: 'a.txt',
          lines: [{ lno: 2, line: CALL_LINE, bounds: [9, 19], context: 'int main()' }],
        },
        {
          path: 'b.txt',
          lines: [{ lno: 2, line: 'beta target line', bounds: [5, 11], context: null }],
        },
        {
          path: 'dom/media/Other.cpp',
          lines: [{ lno: 40, line: '  node->Disconnect(out);', bounds: [8, 18], context: null }],
        },
      ],
    },
    {
      kind: 'test',
      category: 'Uses (AudioNode::Disconnect)',
      files: [
        {
          path: 'dom/media/test_disconnect.js',
          lines: [{ lno: 7, line: 'node.Disconnect();', bounds: [5, 15], context: null }],
        },
      ],
    },
  ],
};

type SearchfoxMock = { resolveBodies: unknown[]; searchQueries: string[] };

async function mockSearchfox(page: Page): Promise<SearchfoxMock> {
  const mock: SearchfoxMock = { resolveBodies: [], searchQueries: [] };
  await page.route('**/api/context', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      json: { ...(await response.json()), searchfox_tree: TREE },
    });
  });
  await page.route('**/api/searchfox/resolve', async (route) => {
    mock.resolveBodies.push(route.request().postDataJSON());
    await route.fulfill({ json: RESOLVED });
  });
  await page.route('**/api/searchfox/search?*', async (route) => {
    mock.searchQueries.push(new URL(route.request().url()).searchParams.get('q') ?? '');
    await route.fulfill({ json: SEARCH_RESULTS });
  });
  return mock;
}

async function startReview(root: string): Promise<{ url: string; child: ChildProcess }> {
  const diffPath = path.join(root, 'review.diff');
  fs.writeFileSync(path.join(root, 'a.txt'), `int main() {\n${CALL_LINE}\n}\n`);
  fs.writeFileSync(path.join(root, 'b.txt'), 'first\nbeta target line\nthird\n');
  fs.writeFileSync(
    diffPath,
    'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1,1 +1,3 @@\n-old a\n' +
      `+int main() {\n+${CALL_LINE}\n+}\n` +
      'diff --git a/b.txt b/b.txt\n--- a/b.txt\n+++ b/b.txt\n@@ -1,1 +1,3 @@\n-old b\n' +
      '+first\n+beta target line\n+third\n',
  );
  const child = spawn(binary, ['--file', diffPath, '--no-open'], {
    cwd: root,
    env: {
      ...process.env,
      LRV_SERVER_DIR: path.join(root, 'servers'),
      LRV_COMMENT_DB: path.join(root, 'comments.db'),
      XDG_CONFIG_HOME: path.join(root, 'config'),
    },
  });
  const url = await new Promise<string>((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error(`Server startup timeout: ${output}`)), 15000);
    child.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Server exited ${code}: ${output}`));
    });
  });
  return { url, child };
}

// Screen coordinates of the caret boundary before `column` in the modified editor.
// A click just right of that boundary lands on the character at `column`.
async function modifiedClickPoint(page: Page, lineNumber: number, column: number) {
  return page.evaluate(
    ({ lineNumber, column }) => {
      const diff = monaco.editor.getDiffEditors()[0]!;
      const modified = diff.getModifiedEditor();
      const pos = modified.getScrolledVisiblePosition({ lineNumber, column });
      const rect = modified.getDomNode()!.getBoundingClientRect();
      return { x: rect.left + pos!.left + 2, y: rect.top + pos!.top + pos!.height / 2 };
    },
    { lineNumber, column },
  );
}

test.describe('searchfox code navigation', () => {
  let root: string;
  let child: ChildProcess | null = null;

  test.beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'lrv-searchfox-'));
    execFileSync('git', ['init', '-q', root]);
  });

  test.afterEach(() => {
    child?.kill();
    child = null;
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('Mod+click resolves the identifier and jumps to its single definition in the review', async ({
    page,
  }) => {
    await isolateConfig(page, { searchfox: true });
    const mock = await mockSearchfox(page);
    const started = await startReview(root);
    child = started.child;
    await page.goto(started.url);
    await expect(page.locator('#preloader-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('Disconnect');

    const point = await modifiedClickPoint(page, 2, 10);
    await page.keyboard.down(modifier);
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up(modifier);

    await expect.poll(() => mock.resolveBodies.length).toBe(1);
    expect(mock.resolveBodies[0]).toEqual({
      path: 'a.txt',
      line: 2,
      col: 9,
      word: 'Disconnect',
      text: CALL_LINE,
    });
    await expect.poll(() => mock.searchQueries).toEqual([RESOLVED.query]);
    await expect(page.locator('.submit-modal-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('beta target line');
    await expect(page.locator('.focused-line')).toBeVisible();
  });

  test('Mod+Alt+click opens the results panel; a hit in the review opens that file at the line', async ({
    page,
  }) => {
    await isolateConfig(page, { searchfox: true });
    await mockSearchfox(page);
    const started = await startReview(root);
    child = started.child;
    await page.goto(started.url);
    await expect(page.locator('#preloader-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('Disconnect');

    const point = await modifiedClickPoint(page, 2, 10);
    await page.keyboard.down(modifier);
    await page.keyboard.down('Alt');
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Alt');
    await page.keyboard.up(modifier);

    const panel = page.locator('.searchfox-modal');
    await expect(panel).toBeVisible();
    await expect(panel.locator('h2')).toHaveText('AudioNode::Disconnect');
    await expect(panel.locator('.searchfox-category')).toHaveCount(3);
    await expect(panel.locator('.searchfox-category').nth(0)).toContainText('Definitions');
    await expect(panel.locator('.searchfox-kind')).toHaveText('test');
    await expect(panel.locator('.searchfox-line')).toHaveCount(5);
    await expect(panel.locator('.searchfox-line').nth(1).locator('mark')).toHaveText('Disconnect');
    await expect(panel.locator('.searchfox-in-review')).toHaveCount(3);
    await expect(panel.locator('.searchfox-file', { hasText: 'Other.cpp' })).not.toContainText(
      'in review',
    );
    await expect(panel.getByRole('link', { name: 'Open on searchfox' })).toHaveAttribute(
      'href',
      `https://searchfox.org/${TREE}/search?q=${encodeURIComponent(RESOLVED.query)}`,
    );

    await panel.locator('.searchfox-line', { hasText: 'beta target line' }).last().click();
    await expect(page.locator('.submit-modal-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('beta target line');
    await expect(page.locator('.focused-line')).toBeVisible();
  });

  test('editor context menu looks up the identifier under the cursor', async ({ page }) => {
    await isolateConfig(page, { searchfox: true });
    const mock = await mockSearchfox(page);
    const started = await startReview(root);
    child = started.child;
    await page.goto(started.url);
    await expect(page.locator('#preloader-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('Disconnect');

    const point = await modifiedClickPoint(page, 2, 10);
    await page.mouse.click(point.x, point.y, { button: 'right' });
    await expect(page.getByRole('menuitem', { name: 'Searchfox: Go to Definition' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Searchfox: Find Uses' })).toBeVisible();
    // Synthetic clicks and keys don't activate Monaco menu items under Playwright, so run the
    // registered action directly, as the menu would.
    await page.evaluate(() => {
      monaco.editor.getDiffEditors()[0]!.getModifiedEditor().getAction('searchfox.uses')!.run();
    });

    await expect(page.locator('.searchfox-modal')).toBeVisible();
    await expect.poll(() => mock.resolveBodies.length).toBe(1);
    expect(mock.resolveBodies[0]).toMatchObject({ path: 'a.txt', line: 2, col: 9 });
    expect(mock.searchQueries).toEqual([RESOLVED.query]);
  });

  test('Escape closes the results panel', async ({ page }) => {
    await isolateConfig(page, { searchfox: true });
    await mockSearchfox(page);
    const started = await startReview(root);
    child = started.child;
    await page.goto(started.url);
    await expect(page.locator('#preloader-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('Disconnect');

    const point = await modifiedClickPoint(page, 2, 10);
    await page.keyboard.down(modifier);
    await page.keyboard.down('Alt');
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up('Alt');
    await page.keyboard.up(modifier);

    await expect(page.locator('.searchfox-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.submit-modal-overlay')).toHaveCount(0);
  });

  test('with the searchfox setting off, Mod+click sends nothing', async ({ page }) => {
    await isolateConfig(page);
    const mock = await mockSearchfox(page);
    const started = await startReview(root);
    child = started.child;
    await page.goto(started.url);
    await expect(page.locator('#preloader-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('Disconnect');

    const point = await modifiedClickPoint(page, 2, 10);
    await page.keyboard.down(modifier);
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up(modifier);

    await page.waitForTimeout(500);
    expect(mock.resolveBodies).toEqual([]);
    expect(mock.searchQueries).toEqual([]);
    await expect(page.locator('.submit-modal-overlay')).toHaveCount(0);
  });

  test('shows a progress indicator while waiting on searchfox', async ({ page }) => {
    await isolateConfig(page, { searchfox: true });
    await mockSearchfox(page);
    let releaseSearch!: () => void;
    const searchReleased = new Promise<void>((resolve) => (releaseSearch = resolve));
    await page.route('**/api/searchfox/search?*', async (route) => {
      await searchReleased;
      await route.fulfill({ json: SEARCH_RESULTS });
    });
    const started = await startReview(root);
    child = started.child;
    await page.goto(started.url);
    await expect(page.locator('#preloader-overlay')).toHaveCount(0);
    await expect(
      page.locator('#editor-container:not(.diff-loading) .editor.modified .view-lines'),
    ).toContainText('Disconnect');

    const point = await modifiedClickPoint(page, 2, 10);
    await page.keyboard.down(modifier);
    await page.mouse.click(point.x, point.y);
    await page.keyboard.up(modifier);

    await expect(page.locator('.searchfox-busy-indicator')).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/searchfox-busy/);
    releaseSearch();
    await expect(page.locator('.searchfox-busy-indicator')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/searchfox-busy/);
  });
});
