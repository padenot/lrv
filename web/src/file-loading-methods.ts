import { $, el } from './dom';
import { detectLanguageFromPathAndContent } from './language';
import { MONACO_HIDE_UNCHANGED } from './diff-utils';
import { monoFontStack, prefersReducedMotion } from './font';
import { markAppReady } from './ui-signals';
import type { AppContext, DiffFile } from './types/app';
import type { editor } from 'monaco-editor';

// Incremented on every loadFile call so stale onDidUpdateDiff callbacks
// from a superseded load cannot uncover the editor prematurely.
let _loadSerial = 0;
type EditorSelection = NonNullable<ReturnType<editor.IStandaloneCodeEditor['getSelection']>>;

export class FileLoadingMethods {
  declare currentFileIsCommit: boolean;
  declare currentFileIndex: number;
  declare currentCommitIdx: AppContext['currentCommitIdx'];
  declare files: AppContext['files'];
  declare isInline: boolean;
  declare initFileHunks: AppContext['initFileHunks'];
  declare renderFileList: () => void;
  declare originalModel: AppContext['originalModel'];
  declare modifiedModel: AppContext['modifiedModel'];
  declare currentWidget: AppContext['currentWidget'];
  declare currentWidgetEditor?: AppContext['currentWidgetEditor'];
  declare config: AppContext['config'];
  declare _commitViewEl: HTMLElement | null;
  declare editor: AppContext['editor'];
  declare fetchFilePair: AppContext['fetchFilePair'];
  declare fileCacheKey: AppContext['fileCacheKey'];
  declare fileCache: AppContext['fileCache'];
  declare seriesInfo: AppContext['seriesInfo'];
  declare modifiedReviewNoteDecorations: AppContext['modifiedReviewNoteDecorations'];
  declare originalReviewNoteDecorations: AppContext['originalReviewNoteDecorations'];
  declare modifiedReviewNoteZoneIds: AppContext['modifiedReviewNoteZoneIds'];
  declare originalReviewNoteZoneIds: AppContext['originalReviewNoteZoneIds'];
  declare updateDecorations: () => void;
  declare renderReviewNotes: () => void;
  declare showCommentDialog: AppContext['showCommentDialog'];
  declare fileHunks: AppContext['fileHunks'];
  declare currentHunkIndex: AppContext['currentHunkIndex'];
  declare jumpToHunk: AppContext['jumpToHunk'];
  declare setFocusedLine: AppContext['setFocusedLine'];
  declare expandCurrentFileAncestors: AppContext['expandCurrentFileAncestors'];
  private lastModifiedRangeSelection: EditorSelection | null;
  private lastOriginalRangeSelection: EditorSelection | null;
  private editorClickDisposables: Array<{ dispose(): void }>;

  private getCurrentFile(index: number) {
    return this.files[index]!;
  }

  private binaryPreviewUrl(file: DiffFile, side: 'old' | 'new') {
    const params = new URLSearchParams({
      path: side === 'old' ? file.old_path || file.path : file.path,
      side,
    });
    if (this.seriesInfo?.is_series) {
      params.set('commit', String(this.currentCommitIdx));
    }
    return `/api/file/preview?${params.toString()}`;
  }

  private renderBinaryPreview(container: HTMLElement, file: DiffFile) {
    const status = file.status.toLowerCase();
    const canShowOld = !['added', 'add', 'a', 'new'].includes(status);
    const canShowNew = !['deleted', 'delete', 'd', 'removed'].includes(status);
    const initialSide: 'old' | 'new' = canShowNew ? 'new' : 'old';

    const previewFrame = el('iframe', {
      className: 'binary-file-preview-frame',
      attrs: {
        title: `${file.path} binary preview`,
        loading: 'lazy',
      },
    }) as HTMLIFrameElement;

    const previewLink = el('a', {
      className: 'binary-file-open-link',
      text: 'Open in new tab',
      attrs: { target: '_blank', rel: 'noopener noreferrer' },
    }) as HTMLAnchorElement;

    const setSide = (side: 'old' | 'new') => {
      const url = this.binaryPreviewUrl(file, side);
      previewFrame.src = url;
      previewLink.href = url;
      oldBtn?.classList.toggle('active', side === 'old');
      newBtn?.classList.toggle('active', side === 'new');
      label.textContent = side === 'old' ? 'Showing old side' : 'Showing new side';
    };

    const label = el('div', {
      className: 'binary-file-side-label',
      text: '',
    });

    let oldBtn: HTMLButtonElement | null = null;
    let newBtn: HTMLButtonElement | null = null;
    const controls = el('div', { className: 'binary-file-controls' });
    if (canShowOld && canShowNew) {
      oldBtn = el('button', {
        className: 'btn-secondary binary-file-side-btn',
        text: 'Old',
        attrs: { type: 'button' },
      }) as HTMLButtonElement;
      newBtn = el('button', {
        className: 'btn-secondary binary-file-side-btn',
        text: 'New',
        attrs: { type: 'button' },
      }) as HTMLButtonElement;
      oldBtn.onclick = () => setSide('old');
      newBtn.onclick = () => setSide('new');
      controls.append(oldBtn, newBtn);
    }
    controls.append(label, previewLink);

    container.appendChild(
      el('div', { className: 'binary-file-notice' }, [
        el('div', { className: 'binary-file-title', text: 'Binary file' }),
        el('div', {
          className: 'binary-file-body',
          text: `${file.path} changed. Previewing it with the browser instead of a text diff.`,
        }),
        controls,
        previewFrame,
      ]),
    );
    setSide(initialSide);
  }

  isAddedFile(file: DiffFile) {
    const rawStatus = file.status.toLowerCase();
    if (rawStatus === 'added' || rawStatus === 'add' || rawStatus === 'a' || rawStatus === 'new') {
      return true;
    }

    // Fallback for non-git emitters: new files typically have hunks rooted at old line 0.
    return file.hunks.length > 0 && file.hunks.every((h) => (h.old_start ?? 0) === 0);
  }

  async loadFile(index: number) {
    this.currentFileIsCommit = false;
    if (window.DEBUG) {
      console.info('[app] loadFile: index', index);
    }
    window.Perf.mark('loadFile:start');
    window.Perf.recordFileSwitchStart();
    this.currentFileIndex = index;
    const file = this.getCurrentFile(index);
    const isAddedFile = this.isAddedFile(file);
    const renderSideBySide = !this.isInline && !isAddedFile;
    if (window.DEBUG) {
      console.info('[app] loadFile: path', file.path, 'status', file.status);
    }

    this.initFileHunks(file);
    this.expandCurrentFileAncestors();
    this.renderFileList();

    // Dispose old models and widget; keep editor instance
    if (this.originalModel) {
      this.originalModel.dispose();
      this.originalModel = null;
    }
    if (this.modifiedModel) {
      this.modifiedModel.dispose();
      this.modifiedModel = null;
    }
    if (this.currentWidget && this.currentWidgetEditor) {
      this.currentWidgetEditor.removeContentWidget(this.currentWidget);
      this.currentWidget = null;
      this.currentWidgetEditor = null;
    }
    this.modifiedReviewNoteZoneIds = [];
    this.originalReviewNoteZoneIds = [];
    this.modifiedReviewNoteDecorations = [];
    this.originalReviewNoteDecorations = [];

    // Use the configured Monaco theme directly
    const theme = this.config.color_scheme;

    // Create diff editor on first run, reuse afterwards
    const container = document.getElementById('editor-container');
    if (!container) {
      return;
    }
    container.classList.toggle('file-added-view', file.status === 'added');
    container.classList.remove('binary-file-view');
    const binaryNotice = container.querySelector<HTMLElement>('.binary-file-notice');
    binaryNotice?.remove();
    // Ensure commit view is hidden
    if (this._commitViewEl) {
      this._commitViewEl.style.display = 'none';
      container.style.display = '';
    }
    const oldBanner = $<HTMLElement>('#old-missing-banner');
    if (oldBanner) {
      oldBanner.style.display = 'none';
    }
    if (file.is_binary) {
      container.classList.add('binary-file-view');
      this.renderBinaryPreview(container, file);
      markAppReady();
      return;
    }
    const mono = monoFontStack(this.config.font);
    const reduceMotion = prefersReducedMotion();
    if (!this.editor) {
      this.editor = monaco.editor.createDiffEditor(container, {
        theme: theme,
        renderSideBySide,
        readOnly: true,
        originalEditable: false,
        automaticLayout: true,
        scrollBeyondLastLine: true,
        minimap: { enabled: true },
        glyphMargin: true,
        folding: false,
        lineDecorationsWidth: 0,
        fontSize: 14,
        fontFamily: mono,
        lineNumbers: 'on',
        renderOverviewRuler: true,
        hideUnchangedRegions: MONACO_HIDE_UNCHANGED,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
        },
      });
    }

    // Fetch full content and let Monaco hide unchanged regions in-view
    window.Perf.mark('loadFile:fetch:start');
    await this.fetchFilePair(file.path);
    window.Perf.mark('loadFile:fetch:end');
    window.Perf.measure('loadFile:fetch', 'loadFile:fetch:start', 'loadFile:fetch:end');
    const filePair = this.fileCache[this.fileCacheKey(file.path)]!;
    const oldContent = filePair.old;
    const newContent = filePair.new;
    const detectionPath = file.path || file.old_path || '';
    const language = detectLanguageFromPathAndContent(detectionPath, newContent || oldContent);

    // Show/hide banner when old content is unavailable but new content exists
    if (oldBanner) {
      const show = !isAddedFile && filePair.old.length === 0 && filePair.new.length > 0;
      oldBanner.style.display = show ? '' : 'none';
    }
    window.Perf.mark('loadFile:models:start');
    this.originalModel = monaco.editor.createModel(oldContent, language);
    this.modifiedModel = monaco.editor.createModel(newContent, language);
    window.Perf.mark('loadFile:models:end');
    window.Perf.measure('loadFile:models', 'loadFile:models:start', 'loadFile:models:end');
    if (window.DEBUG) {
      console.info(
        '[app] models created for',
        file.path,
        'lang',
        language,
        'old/new lines',
        oldContent.split('\n').length,
        newContent.split('\n').length,
      );
    }

    window.Perf.mark('loadFile:setModel:start');
    const diffEditor = this.editor!;
    const editorContainer = document.getElementById('editor-container');
    editorContainer?.classList.add('diff-loading');
    const mySerial = ++_loadSerial;
    const uncover = () => {
      if (_loadSerial === mySerial) {
        editorContainer?.classList.remove('diff-loading');
      }
    };
    const fallback = setTimeout(uncover, 1500);
    diffEditor.setModel({
      original: this.originalModel!,
      modified: this.modifiedModel!,
    });
    window.Perf.mark('loadFile:setModel:end');
    window.Perf.measure('loadFile:setModel', 'loadFile:setModel:start', 'loadFile:setModel:end');
    // Use `let` so a synchronous onDidUpdateDiff fire (before scrollReset is
    // assigned) hits ?.dispose() safely and leaves the listener active for
    // the real async diff-ready fire.
    let scrollReset: ReturnType<typeof diffEditor.onDidUpdateDiff>;
    scrollReset = diffEditor.onDidUpdateDiff(() => {
      scrollReset?.dispose();
      clearTimeout(fallback);
      diffEditor.getModifiedEditor().setScrollTop(0);
      diffEditor.getOriginalEditor().setScrollTop(0);
      // Two rAFs: one for Monaco to commit view zones, one for the browser to paint.
      requestAnimationFrame(() => requestAnimationFrame(uncover));
    });
    diffEditor.updateOptions({
      renderSideBySide,
      fontFamily: mono,
      glyphMargin: true,
      folding: false,
      lineDecorationsWidth: 0,
      scrollBeyondLastLine: true,
      hideUnchangedRegions: MONACO_HIDE_UNCHANGED,
    });
    monaco.editor.setTheme(theme);
    const opts = {
      smoothScrolling: !reduceMotion,
      glyphMargin: true,
      folding: false,
      scrollBeyondLastLine: true,
    };
    const me = diffEditor.getModifiedEditor();
    const oe = diffEditor.getOriginalEditor();
    if (me.getModel()) {
      me.updateOptions(opts);
    }
    if (oe.getModel()) {
      oe.updateOptions(opts);
    }
    // Record end after the new models are set and painted
    window.Perf.mark('loadFile:paint-wait:start');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.Perf.mark('loadFile:paint-wait:end');
        window.Perf.measure(
          'loadFile:paint-wait',
          'loadFile:paint-wait:start',
          'loadFile:paint-wait:end',
        );
        window.Perf.recordFileSwitchEnd();
        window.Perf.mark('loadFile:end');
        window.Perf.measure('loadFile:total', 'loadFile:start', 'loadFile:end');
        if (window.DEBUG) {
          const e = performance.getEntriesByName('fileSwitch');
          const d = e.length > 0 ? e[e.length - 1]!.duration : null;
          if (d != null) {
            console.info('[perf] fileSwitch ms:', Math.round(d));
          }
        }
        // Derive accent color from a visible keyword token if present (prefer 'function'/'const'/'import')
        const prefs = ['function', 'const', 'import', 'class', 'return', 'if', 'export', 'let'];
        const spans = Array.from(document.querySelectorAll('.monaco-editor .view-line span'));
        let found: Element | null = null;
        for (const p of prefs) {
          for (const s of spans) {
            const txt = (s.textContent ?? '').trim();
            if (txt === p) {
              found = s;
              break;
            }
          }
          if (found) {
            break;
          }
        }
        if (found) {
          const col = getComputedStyle(found).color;
          if (col) {
            document.documentElement.style.setProperty('--accent-color', col);
          }
        }
        markAppReady();
      }),
    );

    const modifiedEditor = diffEditor.getModifiedEditor();
    const originalEditor = diffEditor.getOriginalEditor();

    modifiedEditor.updateOptions({ lineNumbers: 'on' });
    originalEditor.updateOptions({ lineNumbers: 'on' });

    this.setupEditorClickHandlers(file.path, modifiedEditor, originalEditor);
    this.updateDecorations();
    this.renderReviewNotes();
    this.applyInitialHunkFocus(file.path);
  }

  setupEditorClickHandlers(
    filePath: string,
    modifiedEditor: editor.IStandaloneCodeEditor,
    originalEditor: editor.IStandaloneCodeEditor,
  ) {
    this.editorClickDisposables?.forEach((disposable) => disposable.dispose());
    this.editorClickDisposables = [];
    this.lastModifiedRangeSelection = this.editorRangeSelection(modifiedEditor.getSelection());
    this.lastOriginalRangeSelection = this.editorRangeSelection(originalEditor.getSelection());
    this.editorClickDisposables.push(
      modifiedEditor.onDidChangeCursorSelection(() => {
        this.lastModifiedRangeSelection =
          this.editorRangeSelection(modifiedEditor.getSelection()) ??
          this.lastModifiedRangeSelection;
      }),
      originalEditor.onDidChangeCursorSelection(() => {
        this.lastOriginalRangeSelection =
          this.editorRangeSelection(originalEditor.getSelection()) ??
          this.lastOriginalRangeSelection;
      }),
      modifiedEditor.onMouseUp((e) => {
        this.lastModifiedRangeSelection =
          this.editorRangeSelection(modifiedEditor.getSelection()) ??
          this.lastModifiedRangeSelection;
      }),
      originalEditor.onMouseUp((e) => {
        this.lastOriginalRangeSelection =
          this.editorRangeSelection(originalEditor.getSelection()) ??
          this.lastOriginalRangeSelection;
      }),
    );

    this.editorClickDisposables.push(
      modifiedEditor.onMouseDown((e) => {
        if (this.isCommentGutterTarget(e) && e.target.position) {
          this.beginEditorGutterGesture(
            filePath,
            modifiedEditor,
            e.target.position.lineNumber,
            'new',
          );
        }
      }),

      originalEditor.onMouseDown((e) => {
        if (this.isCommentGutterTarget(e) && e.target.position) {
          this.beginEditorGutterGesture(
            filePath,
            originalEditor,
            e.target.position.lineNumber,
            'old',
          );
        }
      }),
    );
  }

  private beginEditorGutterGesture(
    filePath: string,
    targetEditor: editor.IStandaloneCodeEditor,
    downLine: number,
    side: 'new' | 'old',
  ) {
    const handleMouseUp = (event: MouseEvent) => {
      const target = targetEditor.getTargetAtClientPoint(event.clientX, event.clientY);
      const upLine = target?.position?.lineNumber ?? downLine;
      const fallbackSelection =
        side === 'new' ? this.lastModifiedRangeSelection : this.lastOriginalRangeSelection;
      this.showCommentDialog(
        filePath,
        this.commentLineFromGutterGesture(targetEditor, downLine, upLine, fallbackSelection),
        upLine,
        side,
      );
    };
    document.addEventListener('mouseup', handleMouseUp, { capture: true, once: true });
  }

  private isCommentGutterTarget(e: editor.IEditorMouseEvent) {
    return (
      e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
      e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
    );
  }

  private commentLineFromGutterGesture(
    editor: editor.IStandaloneCodeEditor,
    downLine: number,
    upLine: number,
    fallbackSelection: EditorSelection | null,
  ) {
    if (downLine !== upLine) {
      const start = Math.min(downLine, upLine);
      const end = Math.max(downLine, upLine);
      return [start, end] as [number, number];
    }
    return this.commentLineFromEditorSelection(editor, upLine, fallbackSelection);
  }

  commentLineFromEditorSelection(
    editor: editor.IStandaloneCodeEditor,
    clickedLine: number,
    fallbackSelection: EditorSelection | null,
  ) {
    const current = this.commentLineFromSelection(editor.getSelection(), clickedLine);
    if (Array.isArray(current)) {
      return current;
    }
    return this.commentLineFromSelection(fallbackSelection, clickedLine) ?? current ?? clickedLine;
  }

  private commentLineFromSelection(
    selection: EditorSelection | null,
    clickedLine: number,
  ): number | [number, number] | null {
    if (!selection || selection.isEmpty()) {
      return null;
    }

    const start = Math.min(selection.startLineNumber, selection.endLineNumber);
    let end = Math.max(selection.startLineNumber, selection.endLineNumber);

    // When selecting whole lines by dragging to column 1 of the next line,
    // Monaco's selection endpoint is the first column after the intended range.
    const forwardSelection =
      selection.startLineNumber < selection.endLineNumber ||
      (selection.startLineNumber === selection.endLineNumber &&
        selection.startColumn <= selection.endColumn);
    const exclusiveEndColumn = forwardSelection ? selection.endColumn : selection.startColumn;
    if (end > start && exclusiveEndColumn === 1) {
      end -= 1;
    }

    if (clickedLine < start || clickedLine > end || end < start) {
      return null;
    }
    return start === end ? start : ([start, end] as [number, number]);
  }

  private editorRangeSelection(selection: EditorSelection | null): EditorSelection | null {
    if (
      !selection ||
      selection.isEmpty() ||
      selection.startLineNumber === selection.endLineNumber
    ) {
      return null;
    }
    return selection;
  }

  applyInitialHunkFocus(filePath: string) {
    const hunks = this.fileHunks[filePath];
    if (hunks && hunks.length > 0) {
      const currentIdx = this.currentHunkIndex[filePath] ?? 0;
      setTimeout(() => {
        this.jumpToHunk(currentIdx);
        const hr = hunks[currentIdx]!;
        const side = hr.side === 'old' ? 'old' : 'new';
        this.setFocusedLine(side, hr.start, false);
      }, 100);
    }
  }
}
