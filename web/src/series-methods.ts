import { REVISION_STATE_CLASSES, WAITING_ON_YOUR_REVIEW } from './phabricator-status';
import { clearEl, el } from './dom';
import { fetchJSON } from './api';
import type { AppContext, DiffFile, DiffStats, PhabStatus, PrInfo, SeriesInfo } from './types/app';
import { sortDiffFiles } from './file-order';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** An eye, drawn in the current text colour. */
function eyeIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 14 14');
  svg.setAttribute('aria-hidden', 'true');
  const outline = document.createElementNS(SVG_NS, 'path');
  outline.setAttribute('d', 'M1 7s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z');
  const pupil = document.createElementNS(SVG_NS, 'circle');
  pupil.setAttribute('cx', '7');
  pupil.setAttribute('cy', '7');
  pupil.setAttribute('r', '1.8');
  svg.append(outline, pupil);
  return svg;
}

export type PrGroup = { pr: PrInfo | null; commitIdxs: number[] };

/// Split the commits into contiguous runs sharing a pull request, in commit order. Commits outside
/// any PR form `pr: null` runs wherever they occur.
export function prGroups(series: SeriesInfo): PrGroup[] {
  const groups: PrGroup[] = [];
  let lastPr: number | undefined | null = null;
  series.commits.forEach((commit, i) => {
    const prIdx = commit.pr;
    let group = groups[groups.length - 1];
    if (!group || prIdx !== lastPr) {
      group = {
        pr: prIdx === undefined ? null : (series.prs?.[prIdx] ?? null),
        commitIdxs: [],
      };
      groups.push(group);
      lastPr = prIdx;
    }
    group.commitIdxs.push(i);
  });
  return groups;
}

export class SeriesMethods {
  declare seriesInfo: AppContext['seriesInfo'];
  declare phabRevisionStatus: PhabStatus | null;
  declare revisionIdFor: (commitIdx: number) => string | null;
  declare publishedRevisionIds: Set<string>;
  declare renderCommitBar: () => void;
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
  declare discussionManager: AppContext['discussionManager'];
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

  commentCountFor(commitIdx: number): number {
    return (
      this.commentManager.getComments().filter((c) => c.commit_idx === commitIdx).length +
      this.reviewNoteManager.getNotes().filter((n) => n.commit_idx === commitIdx).length
    );
  }

  /// Header above each run of commits: "PR #N title" (the number links to the PR) or "No PR".
  prHeader(group: PrGroup, repos: Set<string>): HTMLElement {
    const { pr } = group;
    const count = group.commitIdxs.reduce((n, idx) => n + this.commentCountFor(idx), 0);
    const active = group.commitIdxs.includes(this.currentCommitIdx);
    const row = el('div', {
      className: `pr-row${active ? ' active' : ''}${pr ? '' : ' no-pr'}`,
    });
    const title = el('div', { className: 'pr-row-title' });
    if (!pr) {
      title.textContent = 'No PR';
    } else {
      title.appendChild(document.createTextNode('PR '));
      const num = `#${pr.number}`;
      if (pr.url) {
        const link = el('a', { className: 'pr-row-link', text: num }) as HTMLAnchorElement;
        link.href = pr.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.title = `Open ${pr.owner}/${pr.repo}#${pr.number} on GitHub`;
        title.appendChild(link);
      } else {
        title.appendChild(document.createTextNode(num));
      }
      if (pr.title) {
        title.appendChild(document.createTextNode(` ${pr.title}`));
      }
      if (repos.size > 1) {
        title.appendChild(
          el('span', { className: 'pr-row-repo', text: ` ${pr.owner}/${pr.repo}` }),
        );
      }
    }
    row.appendChild(title);
    if (count > 0) {
      row.appendChild(el('span', { className: 'series-comment-badge', text: String(count) }));
    }
    return row;
  }

  nextWaitingCommit() {
    const commits = this.seriesInfo?.is_series ? this.seriesInfo.commits : [];
    for (let offset = 1; offset <= commits.length; offset++) {
      const commit = commits[(this.currentCommitIdx + offset) % commits.length];
      if (
        commit &&
        this.phabRevisionStatus?.revisions.some(
          (r) => r.commit_idxs.includes(commit.idx) && r.my_review === 'waiting',
        )
      ) {
        if (commit.idx !== this.currentCommitIdx) {
          void this.loadCommit(commit.idx);
        }
        document.querySelector('.series-commit.active')?.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
  }

  renderSeriesNav() {
    this.renderCommitBar();
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

    const { commits, prs } = this.seriesInfo;
    const nav = el('div', { className: 'series-nav' });
    const revisions = this.phabRevisionStatus?.revisions.filter((r) =>
      commits.some((c) => r.commit_idxs.includes(c.idx)),
    );
    if (revisions?.some((r) => r.status)) {
      const waiting = revisions.filter((r) => r.my_review === 'waiting').length;
      const accepted = revisions.filter((r) => r.status === 'accepted').length;
      const others = revisions.length - waiting - accepted;
      const summary = el('div', { className: 'series-review-summary' });
      const jump = el('button', {
        className: 'series-waiting-jump',
        text: `${waiting} need${waiting === 1 ? 's' : ''} your review`,
        attrs: { title: 'Next commit waiting on your review' },
      }) as HTMLButtonElement;
      jump.disabled = waiting === 0;
      jump.onclick = () => this.nextWaitingCommit();
      summary.append(jump, document.createTextNode(` · ${accepted} accepted · ${others} other`));
      container.appendChild(summary);
    }

    const uniqueAuthors = new Set(commits.map((c) => c.commit_author).filter(Boolean));
    const mixedAuthors = uniqueAuthors.size > 1;

    const renderCommit = (commit: (typeof commits)[number]) => {
      const isActive = commit.idx === this.currentCommitIdx;
      const commitCommentCount = this.commentCountFor(commit.idx);
      const revision = this.phabRevisionStatus?.revisions.find((r) =>
        r.commit_idxs.includes(commit.idx),
      );
      const waiting = revision?.my_review === 'waiting';
      const row = el('div', {
        className: `series-commit${revision?.closed ? ' revision-closed' : ''}${isActive ? ' active' : ''}${commitCommentCount > 0 ? ' has-comments' : ''}`,
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
      // The revision id identifies the commit better than its hash once there is one.
      const revisionId = this.revisionIdFor(commit.idx);
      meta.appendChild(
        revisionId
          ? el('span', {
              className: 'series-revision-id',
              text: `${revisionId}${this.publishedRevisionIds.has(revisionId) ? ' ✓' : ''}`,
            })
          : el('span', { className: 'series-hash', text: commit.commit_hash?.slice(0, 8) ?? '' }),
      );
      meta.append(
        el('span', { className: 'delta-add', text: `+${commit.stats.additions}` }),
        el('span', { className: 'delta-del', text: `-${commit.stats.deletions}` }),
      );
      if (mixedAuthors && commit.commit_author) {
        meta.appendChild(el('span', { className: 'series-author', text: commit.commit_author }));
      }
      if (waiting) {
        const tip = `${WAITING_ON_YOUR_REVIEW}${revision.via_group ? ' (via group)' : ''}`;
        meta.appendChild(
          el(
            'span',
            {
              className: 'series-review-icon',
              attrs: { title: tip, role: 'img', 'aria-label': tip },
            },
            [eyeIcon()],
          ),
        );
      }
      if (revision?.status_name) {
        meta.appendChild(
          el('span', {
            className: `series-revision-status ${REVISION_STATE_CLASSES[revision.status ?? ''] ?? ''}`,
            text: revision.status_name,
          }),
        );
      }

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
    };

    if (prs?.length) {
      const repos = new Set(prs.map((p) => `${p.owner}/${p.repo}`));
      for (const group of prGroups(this.seriesInfo)) {
        nav.appendChild(this.prHeader(group, repos));
        group.commitIdxs.forEach((idx) => {
          const commit = commits[idx];
          if (commit) {
            renderCommit(commit);
          }
        });
      }
    } else {
      commits.forEach(renderCommit);
    }

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
    this.discussionManager.currentCommitIdx = clamped;

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
