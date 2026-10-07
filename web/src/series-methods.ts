import { clearEl, el } from './dom';
import { fetchJSON } from './api';
import type { AppContext, DiffFile, DiffStats } from './types/app';
import { sortDiffFiles } from './file-order';

export class SeriesMethods {
  declare seriesInfo: AppContext['seriesInfo'];
  declare currentCommitIdx: number;
  declare commitLoadGeneration: number;
  declare diff: AppContext['diff'];
  declare files: AppContext['files'];
  declare stats: AppContext['stats'];
  declare fileCache: AppContext['fileCache'];
  declare fileHunks: AppContext['fileHunks'];
  declare currentHunkIndex: AppContext['currentHunkIndex'];
  declare currentFileIndex: number;
  declare currentFileIsCommit: boolean;
  declare _eagerPrefetchStarted: boolean;
  declare commentManager: AppContext['commentManager'];
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare loadFile: (index: number) => Promise<void>;
  declare loadCommitView: () => void;
  declare renderFileList: () => void;
  declare renderProjectInfo: () => void;
  declare eagerPrefetchAllFiles: () => Promise<void>;
  declare isStacked: boolean;
  declare renderStackedView: () => void;
  declare clearStackedView: AppContext['clearStackedView'];
  declare resetFileView: AppContext['resetFileView'];
  declare _commitViewEl: AppContext['_commitViewEl'];
  private commitLoadController: AbortController | null;

  renderSeriesNav() {
    const container = document.getElementById('commit-strip');
    const resizer = document.getElementById('commit-strip-resizer');
    if (!container) {
      return;
    }
    if (!this.seriesInfo?.is_series) {
      container.style.display = 'none';
      if (resizer) {
        resizer.style.display = 'none';
      }
      return;
    }
    container.style.display = '';
    if (resizer) {
      resizer.style.display = '';
    }
    clearEl(container);

    const { commits } = this.seriesInfo;
    const nav = el('div', { className: 'series-nav' });

    const uniqueAuthors = new Set(commits.map((c) => c.commit_author).filter(Boolean));
    const mixedAuthors = uniqueAuthors.size > 1;

    commits.forEach((commit) => {
      const isActive = commit.idx === this.currentCommitIdx;
      const commitCommentCount =
        this.commentManager.getComments().filter((c) => c.commit_idx === commit.idx).length +
        this.reviewNoteManager.getNotes().filter((n) => n.commit_idx === commit.idx).length;
      const row = el('div', {
        className: `series-commit${isActive ? ' active' : ''}${commitCommentCount > 0 ? ' has-comments' : ''}`,
      });

      const num = el('span', { className: 'series-commit-num', text: String(commit.idx + 1) });

      const info = el('div', { className: 'series-commit-info' });
      const msg = commit.commit_message?.split('\n')[0] ?? '(no message)';
      const titleRow = el('div', { className: 'series-commit-title-row' });
      const title = el('div', { className: 'series-commit-msg', text: msg });
      titleRow.appendChild(title);

      if (commitCommentCount > 0) {
        titleRow.appendChild(
          el('span', { className: 'series-comment-badge', text: String(commitCommentCount) }),
        );
      }

      const meta = el('div', { className: 'series-commit-meta' });

      const hash = commit.commit_hash?.slice(0, 8) ?? '';
      const adds = commit.stats.additions;
      const dels = commit.stats.deletions;
      const authorPart =
        mixedAuthors && commit.commit_author
          ? ` <span class="series-author">${commit.commit_author}</span>`
          : '';
      meta.innerHTML = `<span class="series-hash">${hash}</span> <span class="delta-add">+${adds}</span> <span class="delta-del">-${dels}</span>${authorPart}`;

      info.appendChild(titleRow);
      info.appendChild(meta);
      row.appendChild(num);
      row.appendChild(info);

      row.addEventListener('click', () => {
        if (commit.idx !== this.currentCommitIdx) {
          this.loadCommit(commit.idx);
        }
      });

      nav.appendChild(row);
    });

    container.appendChild(nav);
  }

  async loadCommit(idx: number) {
    const series = this.seriesInfo;
    if (!series) {
      return;
    }
    const showCommitMessage = this.currentFileIsCommit;
    const clamped = Math.max(0, Math.min(idx, series.commits.length - 1));
    const generation = ++this.commitLoadGeneration;
    this.commitLoadController?.abort();
    const controller = new AbortController();
    this.commitLoadController = controller;
    this.currentCommitIdx = clamped;
    this.commentManager.currentCommitIdx = clamped;
    this.reviewNoteManager.currentCommitIdx = clamped;

    // Invalidate the previous view before awaiting anything. Its outstanding
    // file loads may finish, but cannot publish into this generation.
    this.resetFileView();
    this.clearStackedView();
    if (this._commitViewEl) {
      clearEl(this._commitViewEl);
      this._commitViewEl.style.display = 'none';
    }
    this.files = [];
    this.diff = null;
    this.stats = { files_changed: 0, additions: 0, deletions: 0 };
    this.fileHunks = {};
    this.currentHunkIndex = {};
    this.currentFileIndex = 0;
    this._eagerPrefetchStarted = false;
    this.renderSeriesNav();
    this.renderFileList();
    this.renderProjectInfo();

    let diffData: {
      files: DiffFile[];
      stats: DiffStats;
      commit_message?: string;
      commit_hash?: string;
    };
    try {
      diffData = await fetchJSON<typeof diffData>(`/api/diff?commit=${clamped}`, {
        signal: controller.signal,
      });
    } catch (error) {
      if (generation !== this.commitLoadGeneration || controller.signal.aborted) {
        return;
      }
      throw error;
    }
    if (generation !== this.commitLoadGeneration) {
      return;
    }

    this.files = sortDiffFiles(diffData.files);
    this.diff = { ...diffData, files: this.files };
    this.stats = diffData.stats;
    this._eagerPrefetchStarted = false;

    this.currentFileIsCommit = showCommitMessage;

    this.renderSeriesNav();
    this.renderFileList();
    this.renderProjectInfo();

    if (showCommitMessage) {
      this.loadCommitView();
    } else if (this.isStacked) {
      await this.renderStackedView();
    } else if (this.files.length > 0) {
      await this.loadFile(0);
    } else {
      this.loadCommitView();
    }
  }

  nextCommit() {
    if (!this.seriesInfo?.is_series) {
      return;
    }
    this.loadCommit(this.currentCommitIdx + 1);
  }

  previousCommit() {
    if (!this.seriesInfo?.is_series) {
      return;
    }
    this.loadCommit(this.currentCommitIdx - 1);
  }
}
