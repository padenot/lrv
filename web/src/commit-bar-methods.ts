import { el } from './dom';
import { appendLinkifiedText } from './linkify';
import type { AppContext } from './types/app';

export class CommitBarMethods {
  declare diff: AppContext['diff'];
  declare seriesInfo: AppContext['seriesInfo'];
  declare currentCommitIdx: number;
  declare revisionIdFor: (idx: number) => string | null;
  declare updatePublishButton: () => void;
  declare previousCommit: () => void;
  declare nextCommit: () => void;

  renderCommitBar() {
    const bar = document.getElementById('commit-bar');
    const context = document.getElementById('commit-bar-context');
    if (!bar || !context) {
      return;
    }
    // Prefer the series entry: while a commit loads, this.diff still holds the previous one.
    const seriesCommit = this.seriesInfo?.is_series
      ? this.seriesInfo.commits[this.currentCommitIdx]
      : undefined;
    const commit = seriesCommit ?? this.diff;
    const hash = commit?.commit_hash ?? '';
    const message = commit?.commit_message ?? '';
    const id = this.revisionIdFor(this.currentCommitIdx);
    bar.hidden = !hash && !message && !id;
    context.replaceChildren();
    if (this.seriesInfo?.is_series) {
      const nav = el('div', { className: 'commit-bar-nav' });
      const previous = el('button', {
        className: 'commit-bar-nav-btn',
        text: '‹',
        attrs: { 'aria-label': 'Previous commit' },
      });
      previous.disabled = this.currentCommitIdx === 0;
      previous.onclick = () => this.previousCommit();
      const next = el('button', {
        className: 'commit-bar-nav-btn',
        text: '›',
        attrs: { 'aria-label': 'Next commit' },
      });
      next.disabled = this.currentCommitIdx === this.seriesInfo.commits.length - 1;
      next.onclick = () => this.nextCommit();
      nav.append(
        previous,
        el('span', {
          className: 'commit-bar-position',
          text: `${this.currentCommitIdx + 1}/${this.seriesInfo.commits.length}`,
        }),
        next,
      );
      context.append(nav);
    }
    const title = el('span', { attrs: { id: 'commit-bar-title', title: message } });
    appendLinkifiedText(title, message.split('\n')[0] ?? '');
    context.append(
      title,
      el('span', { attrs: { id: 'commit-bar-hash', title: hash }, text: hash.slice(0, 8) }),
      el('span', { attrs: { id: 'commit-revision' } }),
    );
    this.updatePublishButton();
  }
}
