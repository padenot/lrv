import { el, clearEl } from './dom';
import { detectLanguageFromPathAndContent } from './language';
import { fetchJSON } from './api';
import type {
  AppConfig,
  AppContext,
  DiffFile,
  DiffHunk,
  DiffLine,
  FilePair,
  Side,
} from './types/app';

const CONTEXT_LINES = 3;

export class StackedViewMethods {
  declare files: AppContext['files'];
  declare fileCache: AppContext['fileCache'];
  declare fileCacheKey: AppContext['fileCacheKey'];
  declare fetchFilePair: AppContext['fetchFilePair'];
  declare commentManager: AppContext['commentManager'];
  declare isStacked: boolean;
  declare currentCommitIdx: AppContext['currentCommitIdx'];
  declare seriesInfo: AppContext['seriesInfo'];
  declare config: AppContext['config'];
  declare renderReviewNotes: () => void;

  // ─── Toggle ──────────────────────────────────────────────────────────────

  showStackedView() {
    this.isStacked = true;
    const editor = document.getElementById('editor-container');
    const stacked = document.getElementById('stacked-container');
    if (editor) {
      editor.style.display = 'none';
    }
    if (stacked) {
      stacked.style.display = '';
      this.renderStackedView();
    }
    document.getElementById('toggle-stacked')?.classList.add('active');
    // Inline/Side-by-Side is Monaco-only — hide it in stacked mode
    const toggleView = document.getElementById('toggle-view');
    if (toggleView) {
      toggleView.style.display = 'none';
    }
    this.persistStackedPref(true);
  }

  hideStackedView() {
    this.isStacked = false;
    const editor = document.getElementById('editor-container');
    const stacked = document.getElementById('stacked-container');
    if (editor) {
      editor.style.display = '';
    }
    if (stacked) {
      stacked.style.display = 'none';
    }
    document.getElementById('toggle-stacked')?.classList.remove('active');
    const toggleView = document.getElementById('toggle-view');
    if (toggleView) {
      toggleView.style.display = '';
    }
    this.persistStackedPref(false);
  }

  private persistStackedPref(value: boolean) {
    this.config.stacked_view = value;
    fetchJSON<AppConfig>('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.config),
    }).catch(() => {
      /* best effort */
    });
  }

  toggleStackedView() {
    if (this.isStacked) {
      this.hideStackedView();
    } else {
      this.showStackedView();
    }
  }

  scrollToFileInStacked(index: number) {
    if (!this.isStacked) {
      return;
    }
    const file = this.files[index];
    if (!file) {
      return;
    }
    const anchor = document.getElementById(`stacked-file-${CSS.escape(file.path)}`);
    anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  renderStackedView() {
    const container = document.getElementById('stacked-container');
    if (!container) {
      return;
    }
    clearEl(container);
    if (!this.files.length) {
      container.appendChild(el('div', { className: 'stacked-empty', text: 'No files changed.' }));
      return;
    }
    this.files.forEach((file) => {
      container.appendChild(this.buildFileSection(file));
    });
    // Re-render comments
    this.renderStackedComments();
    this.renderReviewNotes();
  }

  // ─── Per-file section ────────────────────────────────────────────────────

  private buildFileSection(file: DiffFile): HTMLElement {
    const section = el('div', {
      className: 'stacked-file-section',
      attrs: { id: `stacked-file-${CSS.escape(file.path)}` },
    });

    // File header
    const header = el('div', { className: 'stacked-file-header' });
    const nameEl = el('span', {
      className: 'stacked-file-name',
      text: file.old_path ? `${file.old_path} → ${file.path}` : file.path,
    });
    const statusEl = el('span', {
      className: `stacked-file-status status-${file.status}`,
      text: file.status[0]!.toUpperCase(),
      attrs: { title: file.status },
    });
    const additions = file.hunks.flatMap((h) => h.lines).filter((l) => l.type === 'add').length;
    const deletions = file.hunks.flatMap((h) => h.lines).filter((l) => l.type === 'delete').length;
    const statsEl = el('span', { className: 'stacked-file-stats' });
    if (additions) {
      statsEl.appendChild(el('span', { className: 'delta-add', text: `+${additions}` }));
    }
    if (deletions) {
      statsEl.appendChild(el('span', { className: 'delta-del', text: `-${deletions}` }));
    }

    header.append(nameEl, statusEl, statsEl);
    section.appendChild(header);

    if (!file.hunks.length) {
      section.appendChild(
        el('div', { className: 'stacked-no-hunks', text: 'Binary or empty file.' }),
      );
      return section;
    }

    const sampleContent = file.hunks[0]?.lines.find((l) => l.content)?.content ?? '';
    const language = detectLanguageFromPathAndContent(file.old_path ?? file.path, sampleContent);
    // Code cells to colorize after table is built: [element, content]
    const codeCells: Array<[HTMLTableCellElement, string]> = [];

    // Diff table — side-by-side: old-num | old-code | new-num | new-code
    const table = document.createElement('table');
    table.className = 'stacked-diff-table';
    table.setAttribute('data-path', file.path);

    const cg = document.createElement('colgroup');
    for (const w of ['44px', 'calc(50% - 44px)', '44px', 'calc(50% - 44px)']) {
      const col = document.createElement('col');
      col.style.width = w;
      cg.appendChild(col);
    }
    table.appendChild(cg);

    const body = document.createElement('tbody');

    file.hunks.forEach((hunk, hunkIdx) => {
      const prevHunk = file.hunks[hunkIdx - 1];

      const gapOldStart = prevHunk
        ? (prevHunk.old_start ?? 0) + prevHunk.lines.filter((l) => l.type !== 'add').length
        : 0;
      const gapNewStart = prevHunk
        ? (prevHunk.new_start ?? 0) + prevHunk.lines.filter((l) => l.type !== 'delete').length
        : 0;
      const gapCount = Math.max(0, (hunk.old_start ?? 1) - 1 - gapOldStart);

      if (gapCount > 0) {
        body.appendChild(this.buildShowMoreRow(file, gapOldStart + 1, gapNewStart + 1, gapCount));
      }

      // Hunk header
      const hunkHeaderRow = document.createElement('tr');
      hunkHeaderRow.className = 'stacked-hunk-header';
      const hunkHeaderCell = document.createElement('td');
      hunkHeaderCell.colSpan = 4;
      hunkHeaderCell.textContent = `@@ -${hunk.old_start ?? 0} +${hunk.new_start ?? 0} @@`;
      hunkHeaderRow.appendChild(hunkHeaderCell);
      body.appendChild(hunkHeaderRow);

      hunk.lines.forEach((line) => this.buildDiffRow(line, file.path, codeCells, body));
    });

    table.appendChild(body);
    section.appendChild(table);

    // Async colorize all code cells in one pass
    if (codeCells.length > 0) {
      const allContent = codeCells.map(([, c]) => c).join('\n');
      monaco.editor
        .colorize(allContent, language, { tabSize: 2 })
        .then((html) => {
          const lines = html.split('<br/>');
          codeCells.forEach(([cell], i) => {
            if (lines[i] !== undefined) {
              cell.innerHTML = lines[i]!;
            }
          });
        })
        .catch(() => {
          /* leave plain text */
        });
    }

    return section;
  }

  // ─── Diff row ────────────────────────────────────────────────────────────

  // Side-by-side layout: old-num | old-code | new-num | new-code
  private buildDiffRow(
    line: DiffLine,
    filePath: string,
    codeCells: Array<[HTMLTableCellElement, string]>,
    body: HTMLTableSectionElement,
  ) {
    const type = line.type ?? 'context';
    const isAdd = type === 'add';
    const isDel = type === 'delete';
    const content = line.content ?? '';

    const tr = document.createElement('tr');

    const oldNum = document.createElement('td');
    oldNum.className = 'stacked-num' + (isDel ? ' stacked-num-del' : '');
    oldNum.textContent = line.old_line != null ? String(line.old_line) : '';

    const oldCode = document.createElement('td');
    oldCode.className = 'stacked-code stacked-old' + (isDel ? ' stacked-code-del' : '');
    if (!isAdd) {
      oldCode.textContent = content;
      codeCells.push([oldCode, content]);
      if (line.old_line != null) {
        oldCode.style.cursor = 'pointer';
        oldCode.addEventListener('click', () =>
          this.showInlineCommentForm(filePath, line.old_line!, 'old', tr, body),
        );
      }
    }

    const newNum = document.createElement('td');
    newNum.className = 'stacked-num' + (isAdd ? ' stacked-num-add' : '');
    newNum.textContent = line.new_line != null ? String(line.new_line) : '';

    const newCode = document.createElement('td');
    newCode.className = 'stacked-code stacked-new' + (isAdd ? ' stacked-code-add' : '');
    if (!isDel) {
      newCode.textContent = content;
      codeCells.push([newCode, content]);
      if (line.new_line != null) {
        newCode.style.cursor = 'pointer';
        newCode.addEventListener('click', () =>
          this.showInlineCommentForm(filePath, line.new_line!, 'new', tr, body),
        );
      }
    }

    tr.append(oldNum, oldCode, newNum, newCode);
    body.appendChild(tr);
  }

  // ─── Show more context ───────────────────────────────────────────────────

  private buildShowMoreRow(
    file: DiffFile,
    oldStart: number,
    newStart: number,
    count: number,
  ): HTMLTableRowElement {
    const tr = document.createElement('tr');
    tr.className = 'stacked-show-more';
    const td = document.createElement('td');
    td.colSpan = 4;

    const btn = el('button', {
      className: 'stacked-show-more-btn',
      text: `↕ Show ${count} line${count === 1 ? '' : 's'}`,
    });

    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Loading…';
      await this.expandContext(file, oldStart, newStart, count, tr);
      tr.remove();
    });

    td.appendChild(btn);
    tr.appendChild(td);
    return tr;
  }

  private async expandContext(
    file: DiffFile,
    oldStart: number,
    newStart: number,
    count: number,
    insertBefore: HTMLTableRowElement,
  ) {
    const body = insertBefore.parentElement as HTMLTableSectionElement;
    if (!body) {
      return;
    }

    let pair: FilePair;
    try {
      pair = await this.fetchFilePair(file.path);
    } catch {
      return;
    }

    const oldLines = pair.old.split('\n');
    const newLines = pair.new.split('\n');

    for (let i = 0; i < count; i++) {
      const ol = oldStart + i;
      const nl = newStart + i;
      const tr = document.createElement('tr');
      tr.className = 'stacked-ctx stacked-ctx-expanded';

      const oldNum = document.createElement('td');
      oldNum.className = 'stacked-num';
      oldNum.textContent = String(ol);

      const oldCode = document.createElement('td');
      oldCode.className = 'stacked-code stacked-old';
      oldCode.textContent = oldLines[ol - 1] ?? '';

      const newNum = document.createElement('td');
      newNum.className = 'stacked-num';
      newNum.textContent = String(nl);

      const newCode = document.createElement('td');
      newCode.className = 'stacked-code stacked-new';
      newCode.textContent = newLines[nl - 1] ?? '';

      tr.append(oldNum, oldCode, newNum, newCode);
      body.insertBefore(tr, insertBefore);
    }
  }

  // ─── Inline comments ─────────────────────────────────────────────────────

  private showInlineCommentForm(
    filePath: string,
    lineNum: number,
    side: Side,
    afterRow: HTMLTableRowElement,
    body: HTMLTableSectionElement,
  ) {
    // Don't open a second form for the same location
    const existing = body.querySelector('.stacked-comment-form-row');
    if (existing) {
      existing.remove();
    }

    const tr = document.createElement('tr');
    tr.className = 'stacked-comment-form-row';
    const td = document.createElement('td');
    td.colSpan = 4;

    const form = el('div', { className: 'stacked-comment-form' });
    const ta = document.createElement('textarea');
    ta.className = 'stacked-comment-ta';
    ta.placeholder = 'Add a comment…';
    ta.rows = 3;

    const actions = el('div', { className: 'stacked-comment-actions' });
    const save = el('button', { className: 'stacked-comment-save btn-primary', text: 'Save' });
    const cancel = el('button', {
      className: 'stacked-comment-cancel btn-secondary',
      text: 'Cancel',
    });

    save.addEventListener('click', () => {
      const body_ = ta.value.trim();
      if (!body_) {
        return;
      }
      this.commentManager.addComment({
        file: filePath,
        line: lineNum,
        side,
        body: body_,
        commit_idx: this.seriesInfo?.is_series ? this.currentCommitIdx : undefined,
      } as Parameters<typeof this.commentManager.addComment>[0]);
      tr.remove();
      this.renderStackedComments();
    });

    cancel.addEventListener('click', () => tr.remove());

    actions.append(save, cancel);
    form.append(ta, actions);
    td.appendChild(form);
    tr.appendChild(td);

    const next = afterRow.nextSibling;
    body.insertBefore(tr, next ?? null);
    ta.focus();
  }

  renderStackedComments() {
    const container = document.getElementById('stacked-container');
    if (!container || !this.isStacked) {
      return;
    }

    // Remove existing comment display rows
    container.querySelectorAll('.stacked-comment-row').forEach((el) => el.remove());

    const comments = this.commentManager.getComments();
    comments.forEach((comment, idx) => {
      const table = container.querySelector<HTMLTableElement>(
        `table[data-path="${CSS.escape(comment.file)}"]`,
      );
      if (!table) {
        return;
      }
      const body = table.querySelector('tbody');
      if (!body) {
        return;
      }

      // Find the code cell for this comment's line + side
      const selector = comment.side === 'new' ? '.stacked-new' : '.stacked-old';
      let targetRow: HTMLTableRowElement | null = null;
      for (const row of Array.from(body.rows)) {
        const cells = row.querySelectorAll<HTMLTableCellElement>('.stacked-num');
        // 4-col layout: col0=old-num, col1=new-num (old-code is not .stacked-num)
        const num = comment.side === 'new' ? cells[1]?.textContent : cells[0]?.textContent;
        if (num && parseInt(num) === comment.line) {
          targetRow = row as HTMLTableRowElement;
          break;
        }
      }
      if (!targetRow) {
        return;
      }

      const tr = document.createElement('tr');
      tr.className = 'stacked-comment-row';
      tr.setAttribute('data-comment-idx', String(idx));
      const td = document.createElement('td');
      td.colSpan = 4;

      const box = el('div', { className: 'stacked-comment-box' });
      const bodyEl = el('div', { className: 'stacked-comment-body', text: comment.body });
      const meta = el('div', {
        className: 'stacked-comment-meta',
        text: `${comment.side} line ${comment.line}`,
      });
      const del = el('button', {
        className: 'stacked-comment-del',
        text: '✕',
        attrs: { title: 'Delete' },
      });
      del.addEventListener('click', () => {
        this.commentManager.removeComment(idx);
        this.renderStackedComments();
      });

      box.append(meta, bodyEl, del);
      td.appendChild(box);
      tr.appendChild(td);

      const next = targetRow.nextSibling;
      body.insertBefore(tr, next ?? null);
    });
  }
}
