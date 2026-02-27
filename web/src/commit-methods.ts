import { clearEl, el } from './dom';
import { commentLineLabel, commentStartLine } from './comments';
import { openModal } from './modal';
import { MOD_KEY_LABEL } from './platform';
import { showNavIndicator } from './ui-signals';
import type { AppContext } from './types/app';

export class CommitMethods {
  declare _commitPopoverEl: HTMLElement | null;
  declare commentManager: AppContext['commentManager'];
  declare currentFileIsCommit: boolean;
  declare _commitViewEl: HTMLElement | null;
  declare diff: AppContext['diff'];
  declare renderFileList: () => void;

  showCommitMessagePopover(anchorEl: HTMLElement, message: string, rev: string) {
    // Toggle if already visible
    if (this._commitPopoverEl) {
      this._commitPopoverEl.remove();
      this._commitPopoverEl = null;
      return;
    }
    const pop = el('div', { className: 'commit-popover' });
    const first = (message || '').split('\n')[0] || '(no message)';
    const title = el('div', {
      className: 'commit-popover-title',
      text: (rev ? rev + ': ' : '') + first,
    });
    const body = el('div', { className: 'commit-popover-body', text: message || '' });
    pop.appendChild(title);
    pop.appendChild(body);

    // Inline comment box
    const form = el('div');
    form.style.marginTop = '10px';
    const ta = el('textarea');
    ta.rows = 3;
    ta.style.width = '100%';
    ta.placeholder = 'Comment on this commit…';
    const controls = el('div');
    controls.style.display = 'flex';
    controls.style.gap = '8px';
    controls.style.marginTop = '6px';
    const addBtn = el('button', { className: 'btn-secondary', text: 'Add Comment' });
    const cancelBtn = el('button', { className: 'btn-secondary', text: 'Cancel' });
    controls.appendChild(addBtn);
    controls.appendChild(cancelBtn);
    form.appendChild(ta);
    form.appendChild(controls);
    pop.appendChild(form);
    document.body.appendChild(pop);
    // Position near the anchor
    const r = anchorEl.getBoundingClientRect();
    const pad = 6;
    let top = r.bottom + pad;
    let left = r.left;
    // Clamp to viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // If too far right, adjust left
    const rect = pop.getBoundingClientRect();
    if (left + rect.width + pad > vw) {
      left = Math.max(pad, vw - rect.width - pad);
    }
    if (top + rect.height + pad > vh) {
      top = Math.max(pad, r.top - rect.height - pad);
    }
    pop.style.left = `${Math.max(pad, left)}px`;
    pop.style.top = `${Math.max(pad, top)}px`;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target || (!pop.contains(target) && target !== anchorEl)) {
        cleanup();
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
      }
    };
    const cleanup = () => {
      if (this._commitPopoverEl) {
        this._commitPopoverEl.remove();
        this._commitPopoverEl = null;
      }
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onEsc, true);
    };
    this._commitPopoverEl = pop;
    setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onEsc, true);
    }, 0);

    // Wire buttons
    cancelBtn.onclick = (e) => {
      e.preventDefault();
      cleanup();
    };
    addBtn.onclick = (e) => {
      e.preventDefault();
      const body = (ta.value || '').trim();
      if (!body) {
        ta.focus();
        return;
      }
      const comment = {
        file: '(commit)',
        line: 1,
        side: 'new' as const,
        body,
      };
      this.commentManager.addComment(comment);
      showNavIndicator('Commit comment added');
      cleanup();
    };
  }

  loadCommitView() {
    this.currentFileIsCommit = true;
    const container = document.getElementById('editor-container');
    if (!container) {
      return;
    }
    container.style.display = 'none';
    if (!this._commitViewEl) {
      const host = document.querySelector('.content');
      if (!host) {
        return;
      }
      const viewEl = el('div', { className: 'commit-view' });
      viewEl.style.padding = '16px';
      viewEl.style.overflow = 'auto';
      viewEl.style.height = 'calc(100vh - 48px)';
      host.appendChild(viewEl);
      this._commitViewEl = viewEl;
    }
    const viewEl = this._commitViewEl;
    clearEl(viewEl);
    viewEl.style.display = '';

    const meta = el('div');
    meta.style.color = 'var(--text-secondary)';
    meta.style.fontSize = '11px';
    meta.style.marginBottom = '12px';
    const rev = this.diff && this.diff.commit_hash ? String(this.diff.commit_hash) : '';
    meta.textContent = rev;
    viewEl.appendChild(meta);

    const msgText = String((this.diff && this.diff.commit_message) || '(no message)');
    const msgLines = msgText.split('\n');

    const msgContainer = el('div');
    msgContainer.style.border = '1px solid var(--border-color)';
    msgContainer.style.borderRadius = '4px';
    msgContainer.style.background = 'var(--bg-elevated)';
    msgContainer.style.fontFamily = 'var(--font-mono)';
    msgContainer.style.fontSize = '13px';

    msgLines.forEach((lineText, lineIndex) => {
      const lineNum = lineIndex + 1;
      const lineDiv = el('div');
      lineDiv.style.display = 'flex';
      lineDiv.style.lineHeight = '1.6';
      lineDiv.style.cursor = 'pointer';
      lineDiv.style.padding = '2px 0';
      lineDiv.onmouseover = () => {
        lineDiv.style.background = 'var(--bg-secondary)';
      };
      lineDiv.onmouseout = () => {
        lineDiv.style.background = '';
      };

      const lineNumSpan = el('span');
      lineNumSpan.style.display = 'inline-block';
      lineNumSpan.style.width = '40px';
      lineNumSpan.style.textAlign = 'right';
      lineNumSpan.style.paddingRight = '12px';
      lineNumSpan.style.color = 'var(--text-secondary)';
      lineNumSpan.style.userSelect = 'none';
      lineNumSpan.style.flexShrink = '0';
      lineNumSpan.textContent = String(lineNum);

      const lineContent = el('span');
      lineContent.style.paddingRight = '12px';
      lineContent.style.whiteSpace = 'pre-wrap';
      lineContent.style.wordBreak = 'break-word';
      lineContent.textContent = lineText || ' ';

      lineDiv.appendChild(lineNumSpan);
      lineDiv.appendChild(lineContent);

      lineDiv.onclick = () => {
        this.showCommitLineCommentDialog(lineNum);
      };

      msgContainer.appendChild(lineDiv);
    });

    viewEl.appendChild(msgContainer);

    const commentsHeader = el('h3', { text: 'Comments' });
    commentsHeader.style.marginTop = '24px';
    commentsHeader.style.fontSize = '14px';
    viewEl.appendChild(commentsHeader);

    const list = el('div');
    const comments = this.commentManager.getCommentsForFile('(commit)');
    if (comments.length === 0) {
      const empty = el('div');
      empty.style.color = 'var(--text-secondary)';
      empty.style.fontSize = '12px';
      empty.style.padding = '8px 0';
      empty.textContent = 'No comments yet. Click a line in the message above to add one.';
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
        lineLabel.textContent = `Line ${commentLineLabel(c)}`;

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
        body.textContent = c.body;

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

  showCommitLineCommentDialog(lineNum) {
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

    const ta = el('textarea');
    ta.rows = 4;
    ta.style.width = '100%';
    ta.style.fontFamily = 'var(--font-sans)';
    ta.style.fontSize = '13px';
    ta.style.padding = '8px';
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
      const text = (ta.value || '').trim();
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
