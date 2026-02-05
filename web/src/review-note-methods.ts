import { el } from './dom';
import { appendLinkifiedText } from './linkify';
import { commentEndLine, commentLineLabel, commentStartLine } from './comments';
import type { AppContext } from './types/app';
import type { ReviewNote } from './review-notes';
import type { editor } from 'monaco-editor';

export class ReviewNoteMethods {
  declare editor: AppContext['editor'];
  declare files: AppContext['files'];
  declare currentFileIndex: number;
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare commentManager: AppContext['commentManager'];
  declare modifiedReviewNoteDecorations: string[];
  declare originalReviewNoteDecorations: string[];
  declare modifiedReviewNoteZoneIds: string[];
  declare originalReviewNoteZoneIds: string[];

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

    const notes = this.reviewNoteManager.getNotesForFile(file.path);
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
    notes: ReviewNote[],
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
        node.appendChild(this.buildReviewNoteNode(note));
        const id = accessor.addZone({
          afterLineNumber: line,
          domNode: node,
          heightInPx: this.reviewNoteHeightPx(note),
        });
        newIds.push(id);
      });
    });
    return newIds;
  }

  private replaceReviewNoteDecorations(
    targetEditor: editor.IStandaloneCodeEditor,
    existingIds: string[],
    notes: ReviewNote[],
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
          glyphMarginClassName: 'codicon codicon-comment-discussion review-note-glyph',
          glyphMarginHoverMessage: { value: note.body },
          linesDecorationsClassName: 'review-note-line-decoration',
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
    const pieces = [note.author, note.date, `${note.side} line ${commentLineLabel(note)}`].filter(
      Boolean,
    );
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
    appendLinkifiedText(body, note.body);

    box.append(meta, body, this.buildReviewNoteActions(note));
    return box;
  }

  private buildReviewNoteActions(note: ReviewNote) {
    const actions = el('div', { className: 'review-note-actions' });
    const disposition = note.disposition ?? 'open';

    if (disposition === 'addressed' || disposition === 'ignored') {
      actions.appendChild(
        el('span', {
          className: `review-note-status review-note-status-${disposition}`,
          text: disposition === 'addressed' ? 'Queued for agent' : 'Ignored',
        }),
      );
      const undo = el('button', { className: 'btn-secondary review-note-btn', text: 'Undo' });
      undo.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.reviewNoteManager.updateNote(note, { disposition: 'open', instruction: undefined });
      });
      actions.appendChild(undo);
      return actions;
    }

    const address = el('button', { className: 'btn-primary review-note-btn', text: 'Address' });
    address.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.queueReviewNoteForAgent(note);
    });

    const reply = el('button', { className: 'btn-secondary review-note-btn', text: 'Reply' });
    reply.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showReviewNoteReplyForm(actions, note);
    });

    const ignore = el('button', { className: 'btn-secondary review-note-btn', text: 'Ignore' });
    ignore.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.reviewNoteManager.updateNote(note, { disposition: 'ignored' });
    });

    actions.append(address, reply, ignore);
    return actions;
  }

  private showReviewNoteReplyForm(actions: HTMLElement, note: ReviewNote) {
    if (actions.querySelector('.review-note-reply')) {
      return;
    }

    const form = el('div', { className: 'review-note-reply' });
    const textarea = el('textarea', {
      className: 'review-note-reply-text',
      attrs: { placeholder: 'Instructions for the agent...' },
    });
    const controls = el('div', { className: 'review-note-reply-actions' });
    const save = el('button', { className: 'btn-primary review-note-btn', text: 'Queue' });
    const cancel = el('button', { className: 'btn-secondary review-note-btn', text: 'Cancel' });

    save.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const instruction = textarea.value.trim();
      if (!instruction) {
        textarea.focus();
        return;
      }
      this.queueReviewNoteForAgent(note, instruction);
    });
    cancel.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      form.remove();
    });

    controls.append(save, cancel);
    form.append(textarea, controls);
    actions.appendChild(form);
    textarea.focus();
  }

  private queueReviewNoteForAgent(note: ReviewNote, instruction?: string) {
    const comment = {
      file: note.file,
      line: note.line,
      side: note.side,
      body: this.formatReviewNoteInstruction(note, instruction),
    };
    this.commentManager.addComment(
      note.commit_idx === undefined ? comment : { ...comment, commit_idx: note.commit_idx },
    );
    this.reviewNoteManager.updateNote(
      note,
      instruction === undefined
        ? { disposition: 'addressed' }
        : {
            disposition: 'addressed',
            instruction,
          },
    );
  }

  private formatReviewNoteInstruction(note: ReviewNote, instruction?: string) {
    const author = note.author ? ` from ${note.author}` : '';
    const quoted = note.body
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    const source = note.source_url ? `\n\nSource: ${note.source_url}` : '';
    if (instruction) {
      return `${instruction}\n\nReview comment${author}:\n${quoted}${source}`;
    }
    return `Address this review comment${author}:\n${quoted}${source}`;
  }

  private reviewNoteHeightPx(note: ReviewNote) {
    const visualLines = note.body
      .split('\n')
      .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 86)), 0);
    return Math.max(124, Math.min(460, 88 + visualLines * 18));
  }
}
