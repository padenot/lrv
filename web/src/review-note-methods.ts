import { DiscussionError, type Discussion } from './discussions';
import type { CommentLine } from './comments';
import { el } from './dom';
import { appendLinkifiedText } from './linkify';
import {
  commentEndLine,
  commentLineLabel,
  commentStartLine,
  replyTarget,
  isForeignHostNote,
  type ReviewComment,
} from './comments';
import type { AppContext } from './types/app';
import { acceptedBody, type ReviewNote } from './review-notes';
import type { editor } from 'monaco-editor';

type InlineThread = {
  file: string;
  line: CommentLine;
  side: 'old' | 'new';
  node: HTMLElement;
  height: () => number;
  hover: string;
  discussion?: boolean;
};

export class ReviewNoteMethods {
  declare context: AppContext['context'];
  declare publishedNoteIds: Set<string>;
  declare editor: AppContext['editor'];
  declare files: AppContext['files'];
  declare currentFileIndex: number;
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare discussionManager: AppContext['discussionManager'];
  declare buildDiscussionNode: (discussion: Discussion) => HTMLElement;
  declare commentManager: AppContext['commentManager'];
  declare modifiedReviewNoteDecorations: string[];
  declare originalReviewNoteDecorations: string[];
  declare modifiedReviewNoteZoneIds: string[];
  declare originalReviewNoteZoneIds: string[];
  declare isStacked: AppContext['isStacked'];
  declare renderStackedComments: AppContext['renderStackedComments'];

  renderReviewNotes() {
    this.renderMonacoReviewNotes();
    this.renderStackedReviewNotes();
  }

  private renderMonacoReviewNotes() {
    if (!this.editor) {
      return;
    }

    const file = this.files[this.currentFileIndex];
    if (!file) {
      return;
    }

    const notes: InlineThread[] = [
      ...this.reviewNoteManager.getNotesForFile(file.path).map((note) => {
        const node = this.buildReviewNoteNode(note);
        return {
          file: note.file,
          line: note.line,
          side: note.side,
          height: () =>
            this.reviewNoteHeightPx(acceptedBody(note)) +
            (node.querySelector('.review-note-reply') ? 200 : 0) +
            (node.querySelector('.review-note-original:not([hidden])')
              ? this.reviewNoteHeightPx(note.body)
              : 0),
          hover: acceptedBody(note),
          node,
        };
      }),
      ...this.discussionManager.getForFile(file.path).map((discussion) => {
        const node = this.buildDiscussionNode(discussion);
        return {
          file: discussion.file,
          line: discussion.line,
          side: discussion.side,
          node,
          hover: discussion.body,
          height: () => {
            const bodies = Array.from(node.querySelectorAll('.discussion-body'));
            const entries = bodies.reduce(
              (total, body) => total + this.reviewNoteHeightPx(body.textContent || '') - 48,
              0,
            );
            return Math.min(
              460,
              52 + entries + (node.querySelector('.discussion-reply') ? 200 : 0),
            );
          },
          discussion: true,
        };
      }),
    ];
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    const modifiedNotes = notes.filter((note) => note.side === 'new');
    const originalNotes = notes.filter((note) => note.side === 'old');

    this.modifiedReviewNoteZoneIds = this.replaceReviewNoteZones(
      modifiedEditor,
      this.modifiedReviewNoteZoneIds,
      modifiedNotes,
    );
    this.originalReviewNoteZoneIds = this.replaceReviewNoteZones(
      originalEditor,
      this.originalReviewNoteZoneIds,
      originalNotes,
    );

    this.modifiedReviewNoteDecorations = this.replaceReviewNoteDecorations(
      modifiedEditor,
      this.modifiedReviewNoteDecorations,
      modifiedNotes,
    );
    this.originalReviewNoteDecorations = this.replaceReviewNoteDecorations(
      originalEditor,
      this.originalReviewNoteDecorations,
      originalNotes,
    );
  }

  private replaceReviewNoteZones(
    targetEditor: editor.IStandaloneCodeEditor,
    existingIds: string[],
    notes: InlineThread[],
  ) {
    const model = targetEditor.getModel();
    if (!model) {
      return [];
    }

    const maxLine = model.getLineCount();
    const newIds: string[] = [];
    targetEditor.changeViewZones((accessor) => {
      existingIds.forEach((id) => accessor.removeZone(id));
      notes.forEach((note) => {
        const line = Math.max(1, Math.min(commentEndLine(note), maxLine));
        const node = el('div', {
          className: `review-note-zone review-note-zone-${note.side}`,
        });
        node.appendChild(note.node);
        const zone: editor.IViewZone = {
          afterLineNumber: line,
          domNode: node,
          heightInPx: note.height(),
        };
        const id = accessor.addZone(zone);
        note.node.addEventListener(note.discussion ? 'discussion-layout' : 'note-layout', () => {
          zone.heightInPx = note.height();
          targetEditor.changeViewZones((zones) => zones.layoutZone(id));
        });
        newIds.push(id);
      });
    });
    return newIds;
  }

  private replaceReviewNoteDecorations(
    targetEditor: editor.IStandaloneCodeEditor,
    existingIds: string[],
    notes: InlineThread[],
  ) {
    const model = targetEditor.getModel();
    if (!model) {
      return [];
    }

    const maxLine = model.getLineCount();
    const decorations = notes.map((note) => {
      const start = Math.max(1, Math.min(commentStartLine(note), maxLine));
      const end = Math.max(start, Math.min(commentEndLine(note), maxLine));
      return {
        range: new monaco.Range(start, 1, end, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: note.discussion
            ? 'codicon codicon-hubot discussion-glyph'
            : 'codicon codicon-comment-discussion review-note-glyph',
          glyphMarginHoverMessage: { value: note.hover },
          linesDecorationsClassName: note.discussion
            ? 'discussion-line-decoration'
            : 'review-note-line-decoration',
        },
      };
    });

    return targetEditor.deltaDecorations(existingIds, decorations);
  }

  private renderStackedReviewNotes() {
    const container = document.getElementById('stacked-container');
    if (!container) {
      return;
    }

    if (this.isStacked && container.querySelector('.stacked-code-view')) {
      this.renderStackedComments();
      return;
    }

    container.querySelectorAll('.stacked-review-note-row').forEach((row) => row.remove());

    this.files.forEach((file) => {
      const notes = this.reviewNoteManager.getNotesForFile(file.path);
      notes.forEach((note) => this.insertStackedReviewNote(container, note));
    });
  }

  private insertStackedReviewNote(container: HTMLElement, note: ReviewNote) {
    const table = container.querySelector<HTMLTableElement>(
      `table[data-path="${CSS.escape(note.file)}"]`,
    );
    const body = table?.querySelector('tbody');
    if (!body) {
      return;
    }

    const targetLine = commentEndLine(note);
    let targetRow: HTMLTableRowElement | null = null;
    for (const row of Array.from(body.rows)) {
      const cells = row.querySelectorAll<HTMLTableCellElement>('.stacked-num');
      const num = note.side === 'new' ? cells[1]?.textContent : cells[0]?.textContent;
      if (num && Number.parseInt(num, 10) === targetLine) {
        targetRow = row as HTMLTableRowElement;
        break;
      }
    }
    if (!targetRow) {
      return;
    }

    const tr = document.createElement('tr');
    tr.className = `stacked-review-note-row stacked-review-note-${note.side}`;
    const oldCell = document.createElement('td');
    oldCell.colSpan = 2;
    const newCell = document.createElement('td');
    newCell.colSpan = 2;

    const noteCell = note.side === 'new' ? newCell : oldCell;
    const spacerCell = note.side === 'new' ? oldCell : newCell;
    noteCell.className = 'stacked-review-note-cell';
    spacerCell.className = 'stacked-review-note-spacer';
    noteCell.appendChild(this.buildReviewNoteNode(note));
    tr.append(oldCell, newCell);

    const next = targetRow.nextSibling;
    body.insertBefore(tr, next ?? null);
  }

  buildReviewNoteNode(note: ReviewNote) {
    const disposition = note.disposition ?? 'open';
    const box = el('div', {
      className: `review-note review-note-${note.side} review-note-${disposition}`,
    });
    for (const eventName of ['pointerdown', 'mousedown', 'click', 'dblclick']) {
      box.addEventListener(eventName, (event) => event.stopPropagation());
    }
    const meta = el('div', { className: 'review-note-meta' });
    const pieces = [
      note.author,
      note.date,
      note.read_only ? undefined : `${note.side} line ${commentLineLabel(note)}`,
    ].filter(Boolean);
    meta.textContent = pieces.join(' - ');
    if (note.source_url) {
      const link = el('a', {
        className: 'review-note-source',
        text: 'Open',
        attrs: {
          href: note.source_url,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      });
      meta.appendChild(link);
    }

    const body = el('div', { className: 'review-note-body' });
    appendLinkifiedText(body, acceptedBody(note));

    box.append(meta, body);
    if (note.accepted_body !== undefined) {
      const original = el('div', { className: 'review-note-body review-note-original' });
      original.hidden = true;
      appendLinkifiedText(original, note.body);
      const toggle = el('button', {
        className: 'btn-secondary review-note-btn',
        text: 'Show original',
      });
      toggle.addEventListener('click', () => {
        original.hidden = !original.hidden;
        toggle.textContent = original.hidden ? 'Show original' : 'Hide original';
        box.dispatchEvent(new Event('note-layout'));
      });
      meta.appendChild(toggle);
      box.appendChild(original);
    }
    if (!note.read_only) {
      box.appendChild(this.buildReviewNoteActions(note));
    }
    return box;
  }

  private buildReviewNoteActions(note: ReviewNote) {
    const actions = el('div', { className: 'review-note-actions' });
    const disposition = note.disposition ?? 'open';
    if (note.id && this.publishedNoteIds.has(note.id)) {
      actions.appendChild(
        el('span', {
          className: 'review-note-status review-note-status-accepted',
          text: 'Published',
        }),
      );
      return actions;
    }

    const foreignHost = isForeignHostNote(note, this.context.own_revisions);
    const reply = el('button', {
      className: `btn-secondary review-note-btn${foreignHost ? '' : ' review-note-reply-btn'}`,
      text: 'Reply',
    });
    reply.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showReviewNoteReplyForm(actions, note);
    });

    if (foreignHost) {
      actions.appendChild(reply);
      return actions;
    }

    if (disposition === 'accepted' || disposition === 'ignored') {
      actions.appendChild(
        el('span', {
          className: `review-note-status review-note-status-${disposition}`,
          text:
            disposition === 'accepted'
              ? note.accepted_body === undefined
                ? 'Accepted'
                : 'Accepted (edited)'
              : 'Ignored',
        }),
      );
      const undo = el('button', { className: 'btn-secondary review-note-btn', text: 'Undo' });
      undo.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.reviewNoteManager.updateNote(note, { disposition: 'open' });
      });
      actions.appendChild(undo);
      if (
        disposition === 'accepted' &&
        note.accepted_body !== undefined &&
        (note.origin ?? 'agent') === 'agent'
      ) {
        actions.appendChild(this.buildReviewNoteEditButton(actions, note));
      }
      return actions;
    }

    const accept = el('button', { className: 'btn-primary review-note-btn', text: 'Accept' });
    accept.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.reviewNoteManager.updateNote(note, { disposition: 'accepted' });
    });

    const discuss = el('button', {
      className: 'btn-secondary review-note-btn discuss-btn',
      text: 'Discuss',
    });
    discuss.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showReviewNoteReplyForm(actions, note, true);
    });

    const ignore = el('button', { className: 'btn-secondary review-note-btn', text: 'Ignore' });
    ignore.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.reviewNoteManager.updateNote(note, { disposition: 'ignored' });
    });

    actions.appendChild(accept);
    if ((note.origin ?? 'agent') === 'agent') {
      actions.appendChild(this.buildReviewNoteEditButton(actions, note));
    }
    actions.append(ignore, reply, discuss);
    return actions;
  }

  private buildReviewNoteEditButton(actions: HTMLElement, note: ReviewNote) {
    const edit = el('button', { className: 'btn-secondary review-note-btn', text: 'Edit' });
    edit.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (actions.querySelector('.review-note-reply')) {
        return;
      }
      const targetEditor = this.isStacked
        ? null
        : note.side === 'old'
          ? this.editor?.getOriginalEditor()
          : this.editor?.getModifiedEditor();
      const scrollTop = targetEditor?.getScrollTop();
      const restoreScroll = () => {
        if (targetEditor && scrollTop !== undefined) {
          targetEditor.setScrollTop(scrollTop);
        }
      };
      const form = el('div', { className: 'review-note-reply' });
      const textarea = el('textarea', { className: 'review-note-reply-text' });
      textarea.value = acceptedBody(note);
      const controls = el('div', { className: 'review-note-reply-actions' });
      const accept = el('button', { className: 'btn-primary review-note-btn', text: 'Accept' });
      const cancel = el('button', { className: 'btn-secondary review-note-btn', text: 'Cancel' });
      const save = () => {
        const text = textarea.value.trim();
        if (!text) {
          textarea.focus();
          return;
        }
        this.reviewNoteManager.updateNote(note, { disposition: 'accepted', accepted_body: text });
        restoreScroll();
      };
      accept.addEventListener('click', save);
      textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          event.stopPropagation();
          save();
        }
      });
      cancel.addEventListener('click', () => {
        form.remove();
        actions.closest('.review-note')?.dispatchEvent(new Event('note-layout'));
        restoreScroll();
      });
      controls.append(accept, cancel);
      form.append(textarea, controls);
      actions.appendChild(form);
      actions.closest('.review-note')?.dispatchEvent(new Event('note-layout'));
      textarea.focus();
    });
    return edit;
  }

  private showReviewNoteReplyForm(actions: HTMLElement, note: ReviewNote, discuss = false) {
    if (actions.querySelector('.review-note-reply')) {
      return;
    }

    const form = el('div', { className: 'review-note-reply' });
    const textarea = el('textarea', {
      className: 'review-note-reply-text',
      attrs: { placeholder: discuss ? 'Question about this note...' : 'Reply to this note...' },
    });
    const controls = el('div', { className: 'review-note-reply-actions' });
    const save = el('button', {
      className: 'btn-primary review-note-btn',
      text: discuss ? 'Discuss' : 'Queue',
    });
    const error = el('div', { className: 'comment-error' });
    error.hidden = true;
    const cancel = el('button', { className: 'btn-secondary review-note-btn', text: 'Cancel' });

    save.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const instruction = textarea.value.trim();
      if (!instruction) {
        textarea.focus();
        return;
      }
      if (save.disabled) {
        return;
      }
      save.disabled = true;
      error.hidden = true;
      try {
        if (discuss) {
          await this.discussionManager.send({
            file: note.file,
            line: note.line,
            side: note.side,
            body: instruction,
            ...(note.commit_idx === undefined ? {} : { commit_idx: note.commit_idx }),
            note: replyTarget(note),
          });
        } else {
          this.queueReviewNoteForAgent(note, instruction);
        }
        form.remove();
      } catch (err) {
        error.textContent =
          err instanceof DiscussionError && err.status === 409
            ? 'No agent is listening any more'
            : 'Failed to send discussion. Try again.';
        error.hidden = false;
      } finally {
        save.disabled = false;
      }
    });
    cancel.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      form.remove();
    });

    controls.append(save, cancel);
    form.append(error, textarea, controls);
    actions.appendChild(form);
    textarea.focus();
  }

  private queueReviewNoteForAgent(note: ReviewNote, instruction: string) {
    const comment: ReviewComment = {
      file: note.file,
      line: note.line,
      side: note.side,
      body: instruction,
      in_reply_to: replyTarget(note),
    };
    this.commentManager.addComment(
      note.commit_idx === undefined ? comment : { ...comment, commit_idx: note.commit_idx },
    );
  }

  private reviewNoteHeightPx(body: string) {
    const visualLines = body
      .split('\n')
      .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 86)), 0);
    return Math.max(124, Math.min(460, 88 + visualLines * 18));
  }
}
