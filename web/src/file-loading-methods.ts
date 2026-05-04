import { $ } from './dom';
import { detectLanguageFromPathAndContent } from './language';
import { MONACO_HIDE_UNCHANGED } from './diff-utils';
import { monoFontStack, prefersReducedMotion } from './font';
import { markAppReady } from './ui-signals';
import type { AppContext, DiffFile } from './types/app';
import type { editor } from 'monaco-editor';

export class FileLoadingMethods {
  declare currentFileIsCommit: boolean;
  declare currentFileIndex: number;
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
  declare updateDecorations: () => void;
  declare showCommentDialog: AppContext['showCommentDialog'];
  declare fileHunks: AppContext['fileHunks'];
  declare currentHunkIndex: AppContext['currentHunkIndex'];
  declare jumpToHunk: AppContext['jumpToHunk'];
  declare setFocusedLine: AppContext['setFocusedLine'];
  declare expandCurrentFileAncestors: AppContext['expandCurrentFileAncestors'];

  private getCurrentFile(index: number) {
    return this.files[index]!;
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

    // Use the configured Monaco theme directly
    const theme = this.config.color_scheme;

    // Create diff editor on first run, reuse afterwards
    const container = document.getElementById('editor-container');
    if (!container) {
      return;
    }
    // Ensure commit view is hidden
    if (this._commitViewEl) {
      this._commitViewEl.style.display = 'none';
      container.style.display = '';
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
    const oldBanner = $<HTMLElement>('#old-missing-banner');
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
    // Hide before setModel so the fold reflow from hideUnchangedRegions is
    // invisible. Revealed inside onDidUpdateDiff after folds are applied.
    const editorContainer = diffEditor.getContainerDomNode();
    editorContainer.style.opacity = '0';
    diffEditor.setModel({
      original: this.originalModel!,
      modified: this.modifiedModel!,
    });
    window.Perf.mark('loadFile:setModel:end');
    window.Perf.measure('loadFile:setModel', 'loadFile:setModel:start', 'loadFile:setModel:end');
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      editorContainer.style.opacity = '';
    };
    const fallback = setTimeout(reveal, 500);
    // Use `let` so the callback can reference scrollReset safely even if
    // onDidUpdateDiff fires synchronously during listener registration
    // (const would be in TDZ, causing a ReferenceError that silences reveal).
    let scrollReset: ReturnType<typeof diffEditor.onDidUpdateDiff>;
    scrollReset = diffEditor.onDidUpdateDiff(() => {
      clearTimeout(fallback);
      scrollReset?.dispose();
      diffEditor.getModifiedEditor().setScrollTop(0);
      diffEditor.getOriginalEditor().setScrollTop(0);
      reveal();
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
    this.applyInitialHunkFocus(file.path);
  }

  setupEditorClickHandlers(
    filePath: string,
    modifiedEditor: editor.IStandaloneCodeEditor,
    originalEditor: editor.IStandaloneCodeEditor,
  ) {
    modifiedEditor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        if (!e.target.position) {
          return;
        }
        const monacoLine = e.target.position.lineNumber;
        this.showCommentDialog(filePath, monacoLine, monacoLine, 'new');
      }
    });

    originalEditor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        if (!e.target.position) {
          return;
        }
        const monacoLine = e.target.position.lineNumber;
        this.showCommentDialog(filePath, monacoLine, monacoLine, 'old');
      }
    });
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
