import { clearEl, el } from './dom';
import {
  commentContainsLine,
  commentDisplayText,
  commentLineLabel,
  commentStartLine,
} from './comments';
import { appendLinkifiedText } from './linkify';
import { openModal } from './modal';
import { MOD_KEY_LABEL } from './platform';
import type { AppContext } from './types/app';
import type { ReviewNote } from './review-notes';

export class CommitMethods {
  declare commentManager: AppContext['commentManager'];
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare currentFileIsCommit: boolean;
  declare _commitViewEl: HTMLElement | null;
  declare diff: AppContext['diff'];
  declare resetFileView: AppContext['resetFileView'];
  declare renderFileList: () => void;
  declare buildReviewNoteNode: (note: ReviewNote) => HTMLElement;
  declare overallReviewComment: AppContext['overallReviewComment'];

  showCommitSummaryDialog() {
    const modKey = MOD_KEY_LABEL;
    const footerContent = [
      el('button', { className: 'btn-secondary cancel-btn', text: 'Cancel' }),
      el('button', { className: 'btn-primary save-btn', text: 'Add Summary Comment' }),
    ];

    const { modal, body, close } = openModal({
      title: 'Add Review Summary',
      titleId: 'commit-summary-dialog',
      footerContent,
      onKeydown: (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          save();
        }
      },
    });

    modal.style.maxWidth = '600px';
    body.style.padding = '20px';

    const explainer = el('div', {
      className: 'commit-summary-help',
      text: 'Use this for high-level feedback that is not tied to a specific file or line.',
    });
    const ta = el('textarea', {
      className: 'comment-textarea',
      attrs: {
        placeholder: `Add summary comment… (${modKey}+Enter to save)`,
        autofocus: true,
      },
    });
    body.append(explainer, ta);

    const autoResize = () => {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    };
    ta.addEventListener('input', autoResize);
    ta.value = this.overallReviewComment;

    const save = () => {
      const bodyText = ta.value.trim();
      this.overallReviewComment = bodyText;
      this.renderFileList();
      if (this.currentFileIsCommit) {
        this.loadCommitView();
      }
      close();
    };

    modal.querySelector<HTMLButtonElement>('.cancel-btn')!.onclick = close;
    modal.querySelector<HTMLButtonElement>('.save-btn')!.onclick = save;
    setTimeout(() => {
      ta.focus();
      autoResize();
    }, 0);
  }

  loadCommitView() {
    this.resetFileView();
    this.currentFileIsCommit = true;
    const container = document.getElementById('editor-container');
    if (!container) {
      return;
    }
    container.style.display = 'none';
    const stackedContainer = document.getElementById('stacked-container');
    if (stackedContainer) {
      stackedContainer.style.display = 'none';
    }
    if (!this._commitViewEl) {
      const host = document.querySelector('.content');
      if (!host) {
        return;
      }
      const viewEl = el('div', { className: 'commit-view' });
      viewEl.style.padding = '16px';
      viewEl.style.overflow = 'auto';
      host.appendChild(viewEl);
      this._commitViewEl = viewEl;
    }
    const viewEl = this._commitViewEl;
    clearEl(viewEl);
    viewEl.style.display = '';

    const rev = this.diff?.commit_hash ?? '';
    if (rev) {
      viewEl.appendChild(el('div', { className: 'commit-view-hash', text: rev }));
    }

    const reviewNotes = this.reviewNoteManager.getNotesForFile('(commit)');
    const comments = this.commentManager.getCommentsForFile('(commit)');
    const card = el('div', { className: 'commit-message-card' });
    card.appendChild(
      el('div', { className: 'commit-message-card-header' }, [
        el('span', { className: 'commit-message-card-title', text: 'Commit message' }),
        el('span', { className: 'commit-message-card-hint', text: 'Click a line to comment' }),
      ]),
    );

    const msgText = this.diff?.commit_message ?? '';
    if (msgText) {
      const msgContainer = el('div', { className: 'commit-message-body' });
      msgText.split('\n').forEach((lineText, lineIndex) => {
        const lineNum = lineIndex + 1;
        const lineDiv = el('div', { className: 'commit-message-line' });
        const lineNumber = el('span', {
          className: 'commit-message-line-number',
          text: String(lineNum),
        });
        const lineContent = el('span', { className: 'commit-message-line-text' });
        appendLinkifiedText(lineContent, lineText || ' ');
        const lineCommentCount = comments.filter((comment) =>
          commentContainsLine(comment, lineNum),
        ).length;
        const commentButton = el('button', {
          className: `commit-message-comment-button${lineCommentCount > 0 ? ' has-comments' : ''}`,
          text: lineCommentCount > 0 ? `Comment · ${lineCommentCount}` : 'Comment',
          attrs: {
            type: 'button',
            'aria-label': `Comment on commit message line ${lineNum}`,
          },
        });
        commentButton.onclick = () => this.showCommitLineCommentDialog(lineNum);
        lineDiv.append(lineNumber, lineContent, commentButton);
        lineDiv.addEventListener('click', (event) => {
          const target = event.target as Element | null;
          if (target?.closest('a, button')) {
            return;
          }
          this.showCommitLineCommentDialog(lineNum);
        });
        msgContainer.appendChild(lineDiv);
      });
      card.appendChild(msgContainer);
    } else {
      card.appendChild(el('div', { className: 'commit-message-empty', text: '(no message)' }));
    }
    viewEl.appendChild(card);

    if (reviewNotes.length > 0) {
      const reviewNotesHeader = el('h3', { text: 'Review Notes' });
      reviewNotesHeader.style.marginTop = '24px';
      reviewNotesHeader.style.fontSize = '14px';
      viewEl.appendChild(reviewNotesHeader);

      const noteList = el('div');
      reviewNotes.forEach((note) => {
        const row = this.buildReviewNoteNode(note);
        row.style.height = 'auto';
        row.style.margin = '0 0 8px 0';
        noteList.appendChild(row);
      });
      viewEl.appendChild(noteList);
    }

    const commentsHeader = el('h3', { text: 'Comments' });
    commentsHeader.style.marginTop = reviewNotes.length > 0 ? '16px' : '24px';
    commentsHeader.style.fontSize = '14px';
    viewEl.appendChild(commentsHeader);

    const list = el('div');
    if (comments.length === 0) {
      const empty = el('div');
      empty.style.color = 'var(--text-secondary)';
      empty.style.fontSize = '12px';
      empty.style.padding = '8px 0';
      empty.textContent = this.diff?.commit_message
        ? 'No comments yet. Click a commit-message line to add one.'
        : 'No commit-message comments yet.';
      list.appendChild(empty);
    } else {
      comments.forEach((c) => {
        const row = el('div');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '8px';
        row.style.padding = '12px';
        row.style.marginBottom = '8px';
        row.style.border = '1px solid var(--border-color)';
        row.style.borderRadius = '4px';
        row.style.background = 'var(--bg-elevated)';

        const lineLabel = el('div');
        lineLabel.style.fontSize = '11px';
        lineLabel.style.color = 'var(--text-secondary)';
        lineLabel.textContent =
          !this.diff?.commit_message && commentStartLine(c) === 1
            ? 'Summary'
            : `Line ${commentLineLabel(c)}`;

        const bodyRow = el('div');
        bodyRow.style.display = 'flex';
        bodyRow.style.justifyContent = 'space-between';
        bodyRow.style.alignItems = 'flex-start';
        bodyRow.style.gap = '12px';

        const body = el('div');
        body.style.whiteSpace = 'pre-wrap';
        body.style.fontFamily = 'var(--font-sans)';
        body.style.fontSize = '13px';
        body.style.flex = '1';
        body.textContent = commentDisplayText(c);

        const del = el('button', { className: 'btn-danger', text: 'Delete' });
        del.style.fontSize = '11px';
        del.style.padding = '4px 8px';
        del.onclick = () => {
          const absIndex = this.commentManager.findComment('(commit)', commentStartLine(c), c.side);
          if (absIndex >= 0) {
            this.commentManager.removeComment(absIndex);
            this.loadCommitView();
          }
        };

        bodyRow.appendChild(body);
        bodyRow.appendChild(del);
        row.appendChild(lineLabel);
        row.appendChild(bodyRow);
        list.appendChild(row);
      });
    }
    viewEl.appendChild(list);
    this.renderFileList();
  }

  showCommitLineCommentDialog(lineNum: number) {
    const modKey = MOD_KEY_LABEL;

    const footerContent = [
      el('button', { className: 'btn-secondary cancel-btn', text: 'Cancel' }),
      el('button', { className: 'btn-primary save-btn', text: 'Add Comment' }),
    ];

    const { overlay, modal, body, footer, close } = openModal({
      title: `Comment on Commit Message Line ${lineNum}`,
      titleId: 'commit-comment-dialog',
      footerContent,
      onKeydown: (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          save();
        }
      },
    });

    modal.style.maxWidth = '600px';
    body.style.padding = '20px';

    const ta = el('textarea', { className: 'comment-textarea' });
    ta.rows = 4;
    ta.placeholder = 'Add your comment...';
    ta.autofocus = true;
    body.appendChild(ta);

    const hint = el('div');
    hint.style.fontSize = '11px';
    hint.style.color = 'var(--text-secondary)';
    hint.style.marginTop = '8px';
    hint.textContent = `${modKey}+Enter to save, Escape to cancel`;
    body.appendChild(hint);

    const save = () => {
      const text = ta.value.trim();
      if (!text) {
        ta.focus();
        return;
      }
      const comment = {
        file: '(commit)',
        line: lineNum,
        side: 'new' as const,
        body: text,
      };
      this.commentManager.addComment(comment);
      close();
      this.loadCommitView();
    };

    const cancelBtn = footer.querySelector<HTMLButtonElement>('.cancel-btn');
    const saveBtn = footer.querySelector<HTMLButtonElement>('.save-btn');
    if (cancelBtn) {
      cancelBtn.onclick = close;
    }
    if (saveBtn) {
      saveBtn.onclick = save;
    }

    setTimeout(() => ta.focus(), 100);
  }
}
