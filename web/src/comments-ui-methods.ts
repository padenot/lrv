import { DiscussionError } from './discussions';
import { el } from './dom';
import { MOD_KEY_LABEL } from './platform';
import {
  commentDisplayText,
  commentEndLine,
  commentLineLabel,
  commentStartLine,
  type CommentLine,
} from './comments';
import type { AppContext, Side } from './types/app';
import type { editor } from 'monaco-editor';

type EditorSelection = NonNullable<ReturnType<editor.IStandaloneCodeEditor['getSelection']>>;

export class CommentsUIMethods {
  declare editor: AppContext['editor'];
  declare files: AppContext['files'];
  declare currentFileIndex: number;
  declare commentManager: AppContext['commentManager'];
  declare discussionManager: AppContext['discussionManager'];
  declare agentAttached: boolean;
  declare modifiedDecorations: string[];
  declare originalDecorations: string[];
  declare currentWidget: AppContext['currentWidget'];
  declare currentWidgetEditor?: AppContext['currentWidgetEditor'];
  declare renderFileList: () => void;
  declare lastModifiedRangeSelection: EditorSelection | null;
  declare lastOriginalRangeSelection: EditorSelection | null;
  declare commentLineFromEditorSelection: (
    editor: editor.IStandaloneCodeEditor,
    clickedLine: number,
    fallbackSelection: EditorSelection | null,
  ) => CommentLine;

  updateDecorations() {
    if (!this.editor) {
      return;
    }

    const file = this.files[this.currentFileIndex];
    if (!file) {
      return;
    }
    const comments = this.commentManager.getCommentsForFile(file.path);
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    // Decorations for modified (new) side
    const modifiedDecorations = comments
      .filter((c) => c.side === 'new')
      .map((comment) => ({
        range: new monaco.Range(commentStartLine(comment), 1, commentEndLine(comment), 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'codicon codicon-comment',
          glyphMarginHoverMessage: { value: commentDisplayText(comment) },
        },
      }));

    // Decorations for original (old) side
    const originalDecorations = comments
      .filter((c) => c.side === 'old')
      .map((comment) => ({
        range: new monaco.Range(commentStartLine(comment), 1, commentEndLine(comment), 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: 'codicon codicon-comment',
          glyphMarginHoverMessage: { value: commentDisplayText(comment) },
        },
      }));

    this.modifiedDecorations = modifiedEditor.deltaDecorations(
      this.modifiedDecorations,
      modifiedDecorations,
    );
    this.originalDecorations = originalEditor.deltaDecorations(
      this.originalDecorations,
      originalDecorations,
    );
  }

  showCommentDialog(file: string, commentLine: CommentLine, monacoLineNumber: number, side: Side) {
    if (!this.editor) {
      return;
    }
    const targetEditor =
      side === 'new' ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();
    if (!Array.isArray(commentLine)) {
      const resolvedCommentLine = this.commentLineFromEditorSelection(
        targetEditor,
        monacoLineNumber,
        side === 'new' ? this.lastModifiedRangeSelection : this.lastOriginalRangeSelection,
      );
      if (Array.isArray(resolvedCommentLine)) {
        commentLine = resolvedCommentLine;
      }
    }

    // Remove any existing widget
    if (this.currentWidget) {
      if (this.currentWidgetEditor) {
        this.currentWidgetEditor.removeContentWidget(this.currentWidget);
      }
      this.currentWidget = null;
      this.currentWidgetEditor = null;
    }

    // Check for existing comment
    const existingIndex = this.commentManager.findComment(file, monacoLineNumber, side);
    const existingComment = existingIndex >= 0 ? this.commentManager.comments[existingIndex] : null;

    const domNode = el('div', { className: 'inline-comment-box' });
    const updateMaxWidth = () => {
      const pane = domNode.closest('.monaco-editor')?.getBoundingClientRect();
      const editorNode = targetEditor.getDomNode();
      const availableWidth = pane
        ? pane.width - 32
        : (editorNode?.getBoundingClientRect().width ?? 0);
      domNode.style.maxWidth = `${Math.max(0, Math.min(availableWidth, window.innerWidth - 32))}px`;
    };
    const modKey = MOD_KEY_LABEL;
    const title = el('h3', {
      text: `Line ${existingComment ? commentLineLabel(existingComment) : this.commentLineLabel(commentLine)}${existingComment ? ' - Edit' : ''}`,
    });
    const textarea = el('textarea', {
      className: 'comment-textarea',
      attrs: { placeholder: 'Add your comment...', autofocus: true },
    });
    const discuss = existingComment
      ? null
      : el('button', { className: 'btn-secondary discuss-btn', text: 'Discuss' });
    const error = el('div', { className: 'comment-error', attrs: { hidden: true } });
    const actions = el('div', { className: 'comment-actions' }, [
      el('span', { className: 'shortcut-hint', text: `${modKey}+Enter to save` }),
      existingComment ? el('button', { className: 'btn-danger delete-btn', text: 'Delete' }) : null,
      el('button', { className: 'btn-secondary cancel-btn', text: 'Cancel' }),
      existingComment
        ? null
        : el('span', {
            className: 'shortcut-hint discuss-hint',
            text: `${modKey}+Alt+Enter to discuss`,
          }),
      discuss,
      el('button', { className: 'btn-primary save-btn', text: 'Save' }),
    ]);
    domNode.appendChild(title);
    domNode.appendChild(textarea);
    domNode.appendChild(error);
    domNode.appendChild(actions);

    const widget = {
      getId: () => 'inline.comment.widget',
      allowEditorOverflow: true,
      suppressMouseDown: false,
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
    updateMaxWidth();
    targetEditor.layoutContentWidget(widget);
    const layoutListener = targetEditor.onDidLayoutChange(() => {
      updateMaxWidth();
      targetEditor.layoutContentWidget(widget);
    });
    this.currentWidget = widget;
    this.currentWidgetEditor = targetEditor;

    const saveBtn = domNode.querySelector<HTMLButtonElement>('.save-btn');
    const cancelBtn = domNode.querySelector<HTMLButtonElement>('.cancel-btn');
    const autoResize = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    textarea.addEventListener('input', autoResize);

    if (existingComment) {
      textarea.value = existingComment.body;
    }

    // Keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.altKey) {
          if (this.agentAttached && !existingComment) {
            void sendDiscussion();
          }
          return;
        }
        saveComment();
      }
    };
    textarea.addEventListener('keydown', handleKeydown);

    const cleanup = () => {
      targetEditor.removeContentWidget(widget);
      layoutListener.dispose();
      this.currentWidget = null;
      textarea.removeEventListener('keydown', handleKeydown);
      textarea.removeEventListener('input', autoResize);
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
          line: commentLine,
          side,
          body: textarea.value,
        };
        this.commentManager.addComment(comment);
      }
      this.updateDecorations();
      cleanup();
    };

    const sendDiscussion = async () => {
      const body = textarea.value.trim();
      if (!body) {
        textarea.focus();
        return;
      }
      if (!discuss || discuss.disabled) {
        return;
      }
      discuss.disabled = true;
      error.hidden = true;
      try {
        await this.discussionManager.send({ file, line: commentLine, side, body });
        cleanup();
      } catch (err) {
        error.textContent =
          err instanceof DiscussionError && err.status === 409
            ? 'No agent is listening any more'
            : 'Failed to send discussion. Try again.';
        error.hidden = false;
        targetEditor.layoutContentWidget(widget);
      } finally {
        discuss.disabled = false;
      }
    };
    if (discuss) {
      discuss.onclick = () => void sendDiscussion();
    }

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

    // Focus after a brief delay to let Monaco position the widget, then
    // size to content (needed when pre-filling an existing comment).
    setTimeout(() => {
      textarea.focus();
      autoResize();
      targetEditor.layoutContentWidget(widget);
    }, 100);
  }

  private commentLineLabel(line: CommentLine) {
    if (Array.isArray(line)) {
      return line[0] === line[1] ? String(line[0]) : `${line[0]}-${line[1]}`;
    }
    return String(line);
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
