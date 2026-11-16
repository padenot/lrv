import { el } from './dom';
import { requestReview } from './api';
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

  declare agentAttached: boolean;
  declare agentState: AppContext['agentState'];
  declare context: AppContext['context'];
  private pendingReviewState: AppContext['agentState'] | null = null;
  private reviewError: string | null = null;
  private reviewErrorTimer: number | undefined;

  setupRequestReview() {
    this.pendingReviewState = null;
    const button = document.getElementById('request-review') as HTMLButtonElement;
    button.addEventListener('click', () => {
      this.pendingReviewState = this.agentState;
      this.reviewError = null;
      window.clearTimeout(this.reviewErrorTimer);
      this.updateRequestReviewButton();
      void requestReview(this.currentCommitIdx).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.pendingReviewState = null;
        this.reviewError = /\b409\b/.test(message)
          ? 'The agent is no longer connected.'
          : /\b403\b/.test(message)
            ? 'Review requests are disabled in public mode.'
            : 'Could not send the review request. Try again.';
        this.updateRequestReviewButton();
        this.reviewErrorTimer = window.setTimeout(() => {
          this.reviewError = null;
          this.updateRequestReviewButton();
        }, 3000);
      });
    });
  }

  updateRequestReviewButton() {
    const button = document.getElementById('request-review') as HTMLButtonElement;
    button.hidden = !this.agentState.attached || !!this.context?.is_public;
    button.disabled = this.agentState.busy || this.pendingReviewState === this.agentState;
    button.textContent = this.reviewError ? 'Request failed' : 'Request Review';
    button.title = this.reviewError ?? (button.disabled ? 'The agent is working' : '');
    button.setAttribute(
      'aria-label',
      this.reviewError ?? `Request review of commit ${this.currentCommitIdx + 1}`,
    );
  }

  /** The current commit's identity; while a commit loads, this.diff still holds the previous one. */
  private currentCommitInfo() {
    const seriesCommit = this.seriesInfo?.is_series
      ? this.seriesInfo.commits[this.currentCommitIdx]
      : undefined;
    const commit = seriesCommit ?? this.diff;
    return {
      hash: commit?.commit_hash ?? '',
      message: commit?.commit_message ?? '',
      id: this.revisionIdFor(this.currentCommitIdx),
    };
  }

  /** Agent state only affects visibility, so it needn't rebuild the bar's contents. */
  updateCommitBarVisibility() {
    const bar = document.getElementById('commit-bar');
    if (bar) {
      const { hash, message, id } = this.currentCommitInfo();
      bar.hidden = !hash && !message && !id && !this.agentAttached;
    }
    this.updateRequestReviewButton();
  }

  renderCommitBar() {
    const bar = document.getElementById('commit-bar');
    const context = document.getElementById('commit-bar-context');
    if (!bar || !context) {
      return;
    }
    const { hash, message, id } = this.currentCommitInfo();
    bar.hidden = !hash && !message && !id && !this.agentAttached;
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
    this.updateRequestReviewButton();
  }
}
