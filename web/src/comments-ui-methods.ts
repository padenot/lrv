import { el } from './dom';
import { MOD_KEY_LABEL } from './platform';
import type { AppContext, Side } from './types/app';

export class CommentsUIMethods {
  declare editor: AppContext['editor'];
  declare files: AppContext['files'];
  declare currentFileIndex: number;
  declare commentManager: AppContext['commentManager'];
  declare modifiedDecorations: string[];
  declare originalDecorations: string[];
  declare currentWidget: AppContext['currentWidget'];
  declare currentWidgetEditor?: AppContext['currentWidgetEditor'];
  declare renderFileList: () => void;

  updateDecorations() {
    if (!this.editor) {
      return;
    }

    const file = this.files[this.currentFileIndex];
    const comments = this.commentManager.getCommentsForFile(file.path);
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    // Decorations for modified (new) side
    const modifiedDecorations = comments
      .filter((c) => c.side === 'new')
      .map((comment) => ({
        range: new monaco.Range(comment.start_line, 1, comment.start_line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'codicon codicon-comment',
          glyphMarginHoverMessage: { value: comment.body },
        },
      }));

    // Decorations for original (old) side
    const originalDecorations = comments
      .filter((c) => c.side === 'old')
      .map((comment) => ({
        range: new monaco.Range(comment.start_line, 1, comment.start_line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'codicon codicon-comment',
          glyphMarginHoverMessage: { value: comment.body },
        },
      }));

    this.modifiedDecorations = modifiedEditor.deltaDecorations(
      this.modifiedDecorations || [],
      modifiedDecorations,
    );
    this.originalDecorations = originalEditor.deltaDecorations(
      this.originalDecorations || [],
      originalDecorations,
    );
  }

  showCommentDialog(file: string, fileLineNumber: number, monacoLineNumber: number, side: Side) {
    const targetEditor =
      side === 'new' ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();

    // Remove any existing widget
    if (this.currentWidget) {
      if (this.currentWidgetEditor) {
        this.currentWidgetEditor.removeContentWidget(this.currentWidget);
      }
      this.currentWidget = null;
      this.currentWidgetEditor = null;
    }

    // Check for existing comment
    const existingIndex = this.commentManager.findComment(file, fileLineNumber, side);
    const existingComment = existingIndex >= 0 ? this.commentManager.comments[existingIndex] : null;

    // Create the widget
    const domNode = el('div', { className: 'inline-comment-box' });
    const modKey = MOD_KEY_LABEL;
    const title = el('h3', {
      text: `Line ${fileLineNumber}${existingComment ? ' - Edit' : ''}`,
    });
    const textarea = el('textarea', {
      className: 'comment-textarea',
      attrs: { placeholder: 'Add your comment...', autofocus: true },
    });
    const actions = el('div', { className: 'comment-actions' }, [
      el('span', { className: 'shortcut-hint', text: `${modKey}+Enter to save` }),
      existingComment ? el('button', { className: 'btn-danger delete-btn', text: 'Delete' }) : null,
      el('button', { className: 'btn-secondary cancel-btn', text: 'Cancel' }),
      el('button', { className: 'btn-primary save-btn', text: 'Save' }),
    ]);
    domNode.appendChild(title);
    domNode.appendChild(textarea);
    domNode.appendChild(actions);

    const widget = {
      getId: () => 'inline.comment.widget',
      getDomNode: () => domNode,
      getPosition: () => ({
        position: {
          lineNumber: monacoLineNumber,
          column: 1,
        },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
        ],
      }),
    };

    targetEditor.addContentWidget(widget);
    this.currentWidget = widget;
    this.currentWidgetEditor = targetEditor;

    const saveBtn = domNode.querySelector<HTMLButtonElement>('.save-btn');
    const cancelBtn = domNode.querySelector<HTMLButtonElement>('.cancel-btn');
    if (existingComment) {
      textarea.value = existingComment.body || '';
    }

    // Keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveComment();
      }
    };
    document.addEventListener('keydown', handleKeydown);

    const cleanup = () => {
      targetEditor.removeContentWidget(widget);
      this.currentWidget = null;
      document.removeEventListener('keydown', handleKeydown);
    };

    const saveComment = () => {
      if (!textarea.value.trim()) {
        textarea.focus();
        return;
      }

      if (existingIndex >= 0) {
        this.commentManager.updateComment(existingIndex, textarea.value);
      } else {
        const comment = {
          file,
          start_line: fileLineNumber,
          end_line: fileLineNumber,
          side,
          body: textarea.value,
          severity: 'comment',
        };
        this.commentManager.addComment(comment);
      }
      this.updateDecorations();
      cleanup();
    };

    if (saveBtn) {
      saveBtn.onclick = saveComment;
    }
    if (cancelBtn) {
      cancelBtn.onclick = cleanup;
    }

    // Delete button (only present for existing comments)
    const deleteBtnEl = domNode.querySelector<HTMLButtonElement>('.delete-btn');
    if (deleteBtnEl) {
      deleteBtnEl.onclick = () => {
        this.commentManager.removeComment(existingIndex);
        this.updateDecorations();
        cleanup();
      };
    }

    // Focus after a brief delay to let Monaco position the widget
    setTimeout(() => textarea.focus(), 100);
  }

  updateUI() {
    const count = this.commentManager.getComments().length;
    const countEl = document.getElementById('comment-count');
    if (countEl) {
      countEl.textContent = count.toString();
    }
    this.renderFileList();
  }
}
