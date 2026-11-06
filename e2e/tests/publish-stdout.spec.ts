import { test, expect } from '@playwright/test';
import { execFileSync, spawn, type ChildProcess } from 'child_process';
import { createServer } from 'http';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isolateConfig } from '../test-config';

test('Finish prints remaining comments and published URLs to stdout and exits', async ({
  page,
}) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lrv-publish-stdout-'));
  // Publishing needs a local commit whose Git tree matches the one recorded on the diff.
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  git('init', '-q');
  fs.writeFileSync(path.join(root, 'a.txt'), 'old\n');
  git('add', 'a.txt');
  git('commit', '-q', '-m', 'Base');
  fs.writeFileSync(path.join(root, 'a.txt'), 'new\n');
  git('commit', '-q', '-am', 'Change a.txt');
  const [tree, parent] = git('log', '-1', '--format=%T %P').split(' ');
  const calls: string[] = [];
  let base = '';
  const conduit = createServer((request, response) => {
    const method = request.url?.split('/').pop() ?? '';
    calls.push(method);
    const results: Record<string, unknown> = {
      'user.whoami': { phid: 'PHID-USER-reviewer', userName: 'reviewer' },
      'differential.revision.search': {
        data: [
          {
            id: 123,
            phid: 'PHID-DREV-123',
            fields: {
              title: 'Revision',
              uri: `${base}/D123`,
              diffPHID: 'PHID-DIFF-1',
              authorPHID: 'PHID-USER-author',
            },
          },
        ],
      },
      'differential.diff.search': { data: [{ id: 1, phid: 'PHID-DIFF-1' }] },
      'differential.querydiffs': {
        '1': {
          properties: {
            'local:commits': { c1: { commit: 'c1', tree, parents: [parent] } },
          },
        },
      },
      'transaction.search': { data: [] },
      'differential.createinline': {},
      'differential.createcomment': {},
    };
    request.resume();
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({ error_code: null, error_info: null, result: results[method] ?? {} }),
    );
  });
  let child: ChildProcess | undefined;
  try {
    await new Promise<void>((resolve) => conduit.listen(0, '127.0.0.1', resolve));
    const address = conduit.address();
    if (!address || typeof address === 'string') {
      throw new Error('No mock server address');
    }
    base = `http://127.0.0.1:${address.port}`;
    fs.writeFileSync(path.join(root, 'review.diff'), git('show', 'HEAD') + '\n');
    fs.writeFileSync(
      path.join(root, 'notes.json'),
      JSON.stringify([
        {
          id: 'address',
          origin: 'host',
          file: 'a.txt',
          line: 1,
          side: 'new',
          body: 'Fix this',
          author: 'Reviewer',
        },
        { id: 'agent', file: 'a.txt', line: 1, side: 'new', body: 'Agent finding' },
      ]),
    );
    const binary = process.env.LRV_BIN || path.resolve(__dirname, '../../target/debug/lrv');
    child = spawn(
      binary,
      [
        '--file',
        'review.diff',
        '--no-open',
        '--port',
        '0',
        '--phab-revision',
        'D123',
        '--review-notes-file',
        'notes.json',
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          PHABRICATOR_BASE_URL: base,
          PHABRICATOR_API_KEY: 'test-token',
          LRV_SERVER_DIR: path.join(root, 'servers'),
          LRV_COMMENT_DB: path.join(root, 'comments.db'),
          XDG_CONFIG_HOME: path.join(root, 'config'),
        },
      },
    );
    let stdout = '';
    child.stdout!.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    const server = child;
    const url = await new Promise<string>((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error(`Startup timeout: ${output}`)), 15000);
      server.stderr!.on('data', (data: Buffer) => {
        output += data.toString();
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      server.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      server.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Server exited ${code}: ${output}`));
      });
    });
    await isolateConfig(page);
    await page.goto(url);
    await expect(page.locator('#publish-commit')).toHaveText('Publish');
    await page.evaluate(() => {
      window.__APP!.commentManager.addComment({
        file: 'a.txt',
        line: 1,
        side: 'new',
        body: 'Publish this',
      });
      const manager = window.__APP!.reviewNoteManager;
      manager.getNotes().forEach((note) => manager.updateNote(note, { disposition: 'accepted' }));
    });
    await page.locator('#publish-commit').click();
    await page.locator('.publish-revision').click();
    await expect(page.locator('#publish-commit')).toHaveText('Published ✓');
    expect(calls.filter((method) => method === 'differential.createinline')).toHaveLength(2);
    expect(calls).toContain('differential.createcomment');
    await page.locator('#submit-review').click();
    await page.locator('.confirm-submit-btn').click();
    await expect.poll(() => server.exitCode).toBe(0);
    const result = JSON.parse(stdout);
    expect(result.published).toEqual([`${base}/D123`]);
    // A stale accepted host note on someone else's revision is excluded from Finish.
    expect(result.comments).toEqual([]);
  } finally {
    if (child && child.exitCode === null) {
      child.kill('SIGKILL');
    }
    await new Promise<void>((resolve, reject) =>
      conduit.close((error) => (error ? reject(error) : resolve())),
    );
    fs.rmSync(root, { recursive: true, force: true });
  }
});
