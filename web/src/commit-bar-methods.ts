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
  /** Review requests per commit: the event seq, or null while the request is in flight. */
  declare private pendingReviewsMap: Map<number, number | null> | undefined;
  private reviewError: string | null = null;
  private reviewErrorTimer: number | undefined;

  // Mixin fields aren't initialized, so create the map on first use.
  private get pendingReviews() {
    return (this.pendingReviewsMap ??= new Map());
  }

  setupRequestReview() {
    this.pendingReviews.clear();
    const button = document.getElementById('request-review') as HTMLButtonElement;
    button.addEventListener('click', () => {
      const commitIdx = this.currentCommitIdx;
      this.pendingReviews.set(commitIdx, null);
      this.reviewError = null;
      window.clearTimeout(this.reviewErrorTimer);
      this.updateRequestReviewButton();
      requestReview(commitIdx)
        .then(({ seq }) => {
          if (this.pendingReviews.has(commitIdx)) {
            this.pendingReviews.set(commitIdx, seq);
            this.updateRequestReviewButton();
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          this.pendingReviews.delete(commitIdx);
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
    const state = this.agentState;
    const starting = !state.attached && state.launch === 'running';
    if (!state.attached && !starting) {
      // The agent went away, so nothing is coming for the queued requests.
      this.pendingReviews.clear();
    }
    // A request is handled once the agent polls again past its seq. A launched agent
    // that hasn't listened yet gets queued requests on its first poll.
    const acked = state.acked ?? 0;
    for (const [idx, seq] of this.pendingReviews) {
      if (seq !== null && seq <= acked) {
        this.pendingReviews.delete(idx);
      }
    }
    const pending = this.pendingReviews.has(this.currentCommitIdx);
    button.hidden = (!state.attached && !starting) || !!this.context?.is_public;
    button.disabled = pending;
    button.textContent = this.reviewError ? 'Request failed' : 'Request Review';
    button.title =
      this.reviewError ??
      (pending
        ? starting
          ? 'The agent will review this commit once it has started'
          : 'The agent has been asked to review this commit'
        : state.busy || starting
          ? 'The agent is working; this request will be queued'
          : '');
    button.setAttribute(
      'aria-label',
      this.reviewError ?? `Request review of commit ${this.currentCommitIdx + 1}`,
    );
  }

  /** Attached, or launched by lrv and still starting. */
  private agentActive() {
    return this.agentAttached || this.agentState.launch === 'running';
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
      bar.hidden = !hash && !message && !id && !this.agentActive();
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
    bar.hidden = !hash && !message && !id && !this.agentActive();
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
