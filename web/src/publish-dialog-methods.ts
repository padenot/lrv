import { el } from './dom';
import { openModal } from './modal';
import { fetchJSON } from './api';
import { commentKey } from './dialog-methods';
import { isAddressRequest, type ReviewComment } from './comments';
import type { AppContext, PhabStatus, PublishState, ReviewAction } from './types/app';

export class PublishDialogMethods {
  declare commentManager: AppContext['commentManager'];
  declare seriesInfo: AppContext['seriesInfo'];
  declare publishedCommentKeys: Set<string>;
  declare publishedRevisionIds: Set<string>;
  declare publishStates: Map<string, PublishState>;
  declare currentCommitIdx: number;
  declare phabRevisionStatus: PhabStatus | null;
  declare renderSeriesNav: () => void;
  declare phabStatus: Promise<PhabStatus> | null;
  declare renderSubmitComments: (body: HTMLElement, comments: ReviewComment[]) => Promise<void>;

  prefetchPhabricator(): Promise<PhabStatus> {
    this.phabStatus ??= fetchJSON<PhabStatus>('/api/phabricator')
      .then((status) => {
        this.phabRevisionStatus = status;
        status.revisions
          .filter((r) => r.published)
          .forEach((r) => this.publishedRevisionIds.add(r.id));
        this.renderSeriesNav();
        return status;
      })
      .catch((error) => {
        this.phabStatus = null;
        throw error;
      });
    return this.phabStatus;
  }

  updatePublishButton() {
    const button = document.getElementById('publish-commit') as HTMLButtonElement | null;
    if (!button) {
      return;
    }
    const revision = this.phabRevisionStatus?.revisions.find((r) =>
      r.commit_idxs.includes(this.currentCommitIdx),
    );
    button.hidden = !revision;
    if (!revision) {
      return;
    }
    const published = this.publishedRevisionIds.has(revision.id);
    button.textContent = published ? `Published ${revision.id} ✓` : `Publish ${revision.id}`;
    button.disabled = published || !revision.publishable || !!this.phabRevisionStatus?.error;
    button.title = this.phabRevisionStatus?.error ?? revision.reason ?? '';
  }

  async showPublishDialog(revisionId: string) {
    let publish: () => Promise<void> = async () => {};
    const closeButton = el('button', { className: 'btn-secondary', text: 'Close' });
    const publishButton = el('button', {
      className: 'btn-primary publish-revision',
      text: 'Publish',
    });
    publishButton.disabled = true;
    const { body, close } = openModal({
      title: 'Publish to Phabricator',
      titleId: 'publish-title',
      modalClass: 'submit-review-modal publish-dialog',
      footerContent: [closeButton, publishButton],
      onKeydown: (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          void publish();
        }
      },
    });
    closeButton.onclick = close;
    body.appendChild(el('p', { text: 'Validating Phabricator revisions…' }));
    let status: PhabStatus;
    try {
      status = await this.prefetchPhabricator();
    } catch (error) {
      body.replaceChildren(el('div', { className: 'submit-error', text: String(error) }));
      return;
    }
    body.replaceChildren(el('p', { text: status.user ? `as @${status.user}` : '' }));
    if (status.error) {
      body.appendChild(el('div', { className: 'submit-error', text: status.error }));
    }
    const originals = this.commentManager
      .getComments()
      .filter((c) => !this.publishedCommentKeys.has(commentKey(c)));
    const forRevision = (id: string) => {
      const revision = status.revisions.find((r) => r.id === id)!;
      return originals.filter(
        (c) => revision.commit_idxs.includes(c.commit_idx ?? 0) && !isAddressRequest(c),
      );
    };
    const panel = el('div', { className: 'publish-panel' });
    body.appendChild(panel);
    const revision = status.revisions.find((r) => r.id === revisionId);
    if (!revision) {
      panel.appendChild(el('p', { text: 'Revision unavailable.' }));
      return;
    }
    const unassigned = originals.filter(
      (c) => revision.commit_idxs.includes(c.commit_idx ?? 0) && isAddressRequest(c),
    );
    let rendering = 0;
    const render = () => {
      const generation = ++rendering;
      panel.replaceChildren();
      if (unassigned.length) {
        panel.appendChild(
          el('p', {
            className: 'submit-publish-note',
            text: `${unassigned.length} ${unassigned.length === 1 ? 'comment stays' : 'comments stay'} in the review and ${unassigned.length === 1 ? 'is' : 'are'} printed on Finish.`,
          }),
        );
      }
      let state = this.publishStates.get(revisionId);
      if (!state) {
        state = { action: 'comment', overall: '' };
        this.publishStates.set(revisionId, state);
      }
      const tabState = state;
      const comments = forRevision(revisionId);
      const updateButton = () => {
        publishButton.disabled =
          !!status.error ||
          !revision.publishable ||
          revision.published ||
          !!tabState.busy ||
          (!comments.length && !tabState.overall.trim() && tabState.action === 'comment');
        publishButton.textContent = revision.published
          ? 'Published ✓'
          : tabState.busy
            ? 'Publishing…'
            : `Publish ${revision.id}`;
      };
      panel.appendChild(
        el('a', {
          className: 'auto-link',
          text: `${revision.id} ${revision.title} ↗`,
          attrs: { href: revision.url, target: '_blank', rel: 'noopener noreferrer' },
        }),
      );
      panel.appendChild(
        el('p', {
          text: `Commit ${revision.commit_idxs.map((i) => i + 1).join(', ')}/${this.seriesInfo?.commits.length ?? 1}`,
        }),
      );
      if (revision.reason) {
        panel.appendChild(el('div', { className: 'submit-error', text: revision.reason }));
      }
      if (revision.closed) {
        panel.appendChild(
          el('p', {
            className: 'submit-publish-note',
            text: 'This revision is closed or abandoned.',
          }),
        );
      }
      const actions = el('div', {
        className: 'publish-verdict',
        attrs: { role: 'group', 'aria-label': 'Verdict' },
      });
      const options: Array<[ReviewAction, string]> = [
        ['comment', 'Comment'],
        ['accept', 'Accept'],
        ['request-changes', 'Request Changes'],
      ];
      for (const [value, label] of options) {
        const button = el('button', {
          text: label,
          attrs: {
            'aria-pressed': String(tabState.action === value),
            title:
              revision.own && value !== 'comment'
                ? 'This is your own revision; you can only comment.'
                : '',
          },
        });
        button.disabled =
          revision.published || !!tabState.busy || (revision.own && value !== 'comment');
        button.onclick = () => {
          tabState.action = value;
          render();
        };
        actions.appendChild(button);
      }
      panel.appendChild(actions);
      if (revision.own) {
        panel.appendChild(
          el('p', {
            className: 'submit-publish-note',
            text: `You are the author of ${revision.id}, so Phabricator only lets you comment.`,
          }),
        );
      }
      const input = el('textarea', {
        className: 'submit-summary-input',
        attrs: {
          'aria-label': `Overall comment for ${revision.id}`,
          placeholder: `Overall comment for ${revision.id}`,
        },
      });
      input.value = tabState.overall;
      input.disabled = revision.published || !!tabState.busy;
      input.oninput = () => {
        tabState.overall = input.value;
        updateButton();
      };
      panel.appendChild(input);
      if (tabState.error) {
        panel.appendChild(el('div', { className: 'submit-error', text: tabState.error }));
      }
      const preview = el('div');
      panel.appendChild(preview);
      // Only the reply itself is published, not the note it answers.
      const plainComments = comments.map(({ in_reply_to: _note, ...comment }) => comment);
      void this.renderSubmitComments(preview, plainComments).then(() => {
        if (generation !== rendering) {
          preview.remove();
        }
      });
      panel.appendChild(
        el('p', {
          className: 'submit-publish-note',
          text: `Any unsubmitted drafts you have on ${revision.id} are published.`,
        }),
      );
      updateButton();
      publish = async () => {
        if (publishButton.disabled || publishButton.hidden) {
          return;
        }
        tabState.busy = true;
        delete tabState.error;
        render();
        try {
          const response = await fetch('/api/phabricator/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              revision: revision.id,
              comments: plainComments,
              overall_comment: tabState.overall,
              action: tabState.action,
            }),
          });
          if (!response.ok) {
            throw new Error((await response.text()).trim() || `HTTP ${response.status}`);
          }
          revision.published = true;
          comments.forEach((c) => this.publishedCommentKeys.add(commentKey(c)));
          this.publishedRevisionIds.add(revision.id);
          this.renderSeriesNav();
          close();
        } catch (error) {
          tabState.error = `Failed to publish review: ${error instanceof Error ? error.message : error}`;
        } finally {
          tabState.busy = false;
          render();
        }
      };
    };
    publishButton.onclick = () => void publish();
    render();
  }
}
