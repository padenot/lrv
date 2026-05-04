import { clearEl, el } from './dom';
import { fetchJSON } from './api';
import { showNavIndicator } from './ui-signals';
import type { AppContext, DiffFile, DiffStats, SeriesInfo } from './types/app';

export class SeriesMethods {
  declare seriesInfo: AppContext['seriesInfo'];
  declare currentCommitIdx: number;
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
  declare loadFile: (index: number) => Promise<void>;
  declare loadCommitView: () => void;
  declare renderFileList: () => void;
  declare eagerPrefetchAllFiles: () => Promise<void>;

  renderSeriesNav() {
    const container = document.getElementById('commit-strip');
    if (!container) return;
    if (!this.seriesInfo?.is_series) {
      container.style.display = 'none';
      return;
    }
    container.style.display = '';
    clearEl(container);

    const { commits } = this.seriesInfo;
    const nav = el('div', { className: 'series-nav' });

    commits.forEach((commit) => {
      const isActive = commit.idx === this.currentCommitIdx;
      const row = el('div', { className: `series-commit${isActive ? ' active' : ''}` });

      const num = el('span', { className: 'series-commit-num', text: String(commit.idx + 1) });

      const info = el('div', { className: 'series-commit-info' });
      const msg = commit.commit_message?.split('\n')[0] ?? '(no message)';
      const title = el('div', { className: 'series-commit-msg', text: msg });
      const meta = el('div', { className: 'series-commit-meta' });

      const hash = commit.commit_hash?.slice(0, 8) ?? '';
      const adds = commit.stats.additions;
      const dels = commit.stats.deletions;
      meta.innerHTML = `<span class="series-hash">${hash}</span> <span class="delta-add">+${adds}</span> <span class="delta-del">-${dels}</span>`;

      info.appendChild(title);
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
    if (!series) return;
    const clamped = Math.max(0, Math.min(idx, series.commits.length - 1));
    this.currentCommitIdx = clamped;
    this.commentManager.currentCommitIdx = clamped;

    const diffData = await fetchJSON<{
      files: DiffFile[];
      stats: DiffStats;
      commit_message?: string;
      commit_hash?: string;
    }>(`/api/diff?commit=${clamped}`);

    this.diff = diffData;
    this.files = diffData.files;
    this.stats = diffData.stats;

    // Reset per-commit navigation state (fileCache is keyed by commitIdx:path so no reset needed)
    this.fileHunks = {};
    this.currentHunkIndex = {};
    this.currentFileIndex = 0;
    this.currentFileIsCommit = false;
    this._eagerPrefetchStarted = false;

    this.renderSeriesNav();
    this.renderFileList();

    if (this.files.length > 0) {
      await this.loadFile(0);
    } else {
      this.loadCommitView();
    }

    showNavIndicator(
      `Commit ${clamped + 1}/${series.commits.length}: ${series.commits[clamped]?.commit_message?.split('\n')[0] ?? ''}`,
    );
  }

  nextCommit() {
    if (!this.seriesInfo?.is_series) return;
    this.loadCommit(this.currentCommitIdx + 1);
  }

  previousCommit() {
    if (!this.seriesInfo?.is_series) return;
    this.loadCommit(this.currentCommitIdx - 1);
  }
}
