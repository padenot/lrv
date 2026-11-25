import type {
  CodeView,
  CodeViewLineSelection,
  CodeViewOptions,
} from '../../node_modules/@pierre/diffs/dist/components/CodeView.js';
import type { OnDiffLineClickProps } from '../../node_modules/@pierre/diffs/dist/managers/InteractionManager.js';
import type { SetupWorkerPoolProps } from '../../node_modules/@pierre/diffs/dist/worker/getOrCreateWorkerPoolSingleton.js';
import type { WorkerPoolManager } from '../../node_modules/@pierre/diffs/dist/worker/WorkerPoolManager.js';
import type {
  AnnotationSide,
  CodeViewDiffItem,
  CodeViewItem,
  DiffLineAnnotation,
  FileDiffMetadata,
  FileContents,
  SelectedLineRange,
} from '../../node_modules/@pierre/diffs/dist/types.js';
import { DiscussionError, type Discussion } from './discussions';
import { el, clearEl } from './dom';
import {
  commentDisplayText,
  commentEndLine,
  commentLineLabel,
  type CommentLine,
  type ReviewComment,
} from './comments';
import { fetchJSON } from './api';
import { prefersReducedMotion } from './font';
import { FOCUS_MARGIN_LINES, type FocusedLine } from './diff-utils';
import {
  identifierAt,
  SEARCHFOX_FLASH_MS,
  searchfoxClick,
  searchfoxMenuActions,
  type SearchfoxTarget,
} from './searchfox';
import { openContextMenu } from './context-menu';
import type { ReviewNote } from './review-notes';
import type { AppConfig, AppContext, DiffFile, DiffLine, Side } from './types/app';

type StackedAnnotation =
  | { kind: 'comment'; comment: ReviewComment; index: number }
  | { kind: 'review-note'; note: ReviewNote }
  | { kind: 'discussion'; discussion: Discussion }
  | { kind: 'draft'; draft: StackedDraft };

// With `discussion`, saving converts that thread into the comment.
type StackedDraft = {
  file: string;
  line: CommentLine;
  side: Side;
  discussion?: Discussion;
  body?: string;
  summarizing?: boolean;
  textarea?: HTMLTextAreaElement;
};

const DIFFS_THEME = { dark: 'pierre-dark', light: 'pierre-light' } as const;
const DIFFS_TOKENIZE_MAX_LINE_LENGTH = 1000;

export function themeTypeFor(themeName: string): 'light' | 'dark' {
  const base = window.UI_THEME_DEFS?.[themeName]?.base ?? themeName;
  return base === 'vs' || base === 'hc-light' ? 'light' : 'dark';
}

type ParsePatchFiles =
  typeof import('../../node_modules/@pierre/diffs/dist/utils/parsePatchFiles.js').parsePatchFiles;
type ParseDiffFromFile =
  typeof import('../../node_modules/@pierre/diffs/dist/utils/parseDiffFromFile.js').parseDiffFromFile;
type DiffsRuntime = {
  CodeView: typeof import('../../node_modules/@pierre/diffs/dist/components/CodeView.js').CodeView;
  parsePatchFiles: ParsePatchFiles;
  parseDiffFromFile: ParseDiffFromFile;
  getOrCreateWorkerPoolSingleton: typeof import('../../node_modules/@pierre/diffs/dist/worker/getOrCreateWorkerPoolSingleton.js').getOrCreateWorkerPoolSingleton;
};

let diffsRuntimePromise: Promise<DiffsRuntime> | null = null;

function loadDiffsRuntime(): Promise<DiffsRuntime> {
  diffsRuntimePromise ??= Promise.all([
    import('../../node_modules/@pierre/diffs/dist/components/CodeView.js'),
    import('../../node_modules/@pierre/diffs/dist/utils/parsePatchFiles.js'),
    import('../../node_modules/@pierre/diffs/dist/utils/parseDiffFromFile.js'),
    import('../../node_modules/@pierre/diffs/dist/worker/getOrCreateWorkerPoolSingleton.js'),
  ]).then(([codeView, patchParser, fileParser, workerPool]) => ({
    CodeView: codeView.CodeView,
    parsePatchFiles: patchParser.parsePatchFiles,
    parseDiffFromFile: fileParser.parseDiffFromFile,
    getOrCreateWorkerPoolSingleton: workerPool.getOrCreateWorkerPoolSingleton,
  }));
  return diffsRuntimePromise;
}

function createDiffsWorker() {
  return new Worker('/assets/app/diffs-worker.js', { type: 'module' });
}

// One singleton pool for the whole app: the stacked view and the searchfox panel both use it.
const DIFFS_POOL_SETUP: SetupWorkerPoolProps = {
  poolOptions: {
    workerFactory: createDiffsWorker,
    poolSize: Math.min(Math.max(navigator.hardwareConcurrency ?? 4, 2), 6),
    totalASTLRUCacheSize: 64,
  },
  highlighterOptions: {
    theme: DIFFS_THEME,
    lineDiffType: 'word-alt',
    maxLineDiffLength: 1000,
    tokenizeMaxLineLength: DIFFS_TOKENIZE_MAX_LINE_LENGTH,
  },
};

export async function getStackedWorkerPool(): Promise<WorkerPoolManager> {
  const { getOrCreateWorkerPoolSingleton } = await loadDiffsRuntime();
  return getOrCreateWorkerPoolSingleton(DIFFS_POOL_SETUP);
}

/** Deleted lines, in unified or in the deletions column of split, are on the old side. */
function isDeletionRow(row: HTMLElement): boolean {
  return row.dataset.lineType === 'change-deletion' || row.closest('[data-deletions]') !== null;
}

export class StackedViewMethods {
  declare files: AppContext['files'];
  declare commentManager: AppContext['commentManager'];
  declare discussionManager: AppContext['discussionManager'];
  declare agentAttached: boolean;
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare isStacked: boolean;
  declare isInline: boolean;
  declare currentCommitIdx: AppContext['currentCommitIdx'];
  declare commitLoadGeneration: AppContext['commitLoadGeneration'];
  declare seriesInfo: AppContext['seriesInfo'];
  declare config: AppContext['config'];
  declare diff: AppContext['diff'];
  declare renderReviewNotes: () => void;
  declare renderFileList: () => void;
  declare currentFileIndex: number;
  declare currentFileIsCommit: boolean;
  declare currentFocusedLine: AppContext['currentFocusedLine'];
  declare buildDiscussionNode: (discussion: Discussion) => HTMLElement;
  declare deleteDiscussion: AppContext['deleteDiscussion'];
  declare summarizeDiscussion: AppContext['summarizeDiscussion'];
  declare buildReviewNoteNode: (note: ReviewNote) => HTMLElement;
  declare editor: AppContext['editor'];
  declare _commitViewEl: HTMLElement | null;
  declare loadFile: AppContext['loadFile'];
  declare fetchFilePair: AppContext['fetchFilePair'];
  declare fileCacheKey: AppContext['fileCacheKey'];
  declare resetFileView: AppContext['resetFileView'];
  declare searchfoxLookup: AppContext['searchfoxLookup'];

  private stackedCodeView: CodeView<StackedAnnotation> | null;
  // CodeView.setOptions replaces every option, so keep the full set to change one.
  private stackedViewOptions: CodeViewOptions<StackedAnnotation, undefined> | null;
  private stackedItems: Map<string, CodeViewDiffItem<StackedAnnotation>>;
  private stackedFileMetadata: Map<string, FileDiffMetadata>;
  private stackedDraft: StackedDraft | null;
  private stackedItemVersion: number;
  private stackedScrollUnsubscribe: (() => void) | null;
  private stackedRenderToken: number;
  // Full-content loads per file path, kept so callers can wait for one in flight.
  private stackedHydrations: Map<string, Promise<void>>;
  private stackedLastRangeSelection: CodeViewLineSelection | null;
  private stackedFileScrollOffsets?: Map<string, number>;
  // Rendered pierre instance per file path, to expand collapsed context around a line.
  private stackedInstances?: Map<string, object>;
  // The keyboard-focused line's file, and how many focus scrolls are still running.
  private stackedFocusPath: string | null;
  private stackedFocusScrolls?: number;
  // A line reached from searchfox results that is fading out.
  private stackedFlash: { path: string; line: number; start: number } | null;

  showStackedView() {
    this.resetFileView();
    this.isStacked = true;
    const editor = document.getElementById('editor-container');
    const stacked = document.getElementById('stacked-container');
    if (editor) {
      editor.style.display = 'none';
    }
    if (stacked) {
      stacked.style.display = '';
      this.renderStackedView();
    }
    this.updateStackedToggleLabel();
    this.persistStackedPref(true);
  }

  hideStackedView() {
    this.isStacked = false;
    this.clearStackedView();
    const editor = document.getElementById('editor-container');
    const stacked = document.getElementById('stacked-container');
    if (editor) {
      editor.style.display = '';
    }
    if (stacked) {
      stacked.style.display = 'none';
    }
    this.updateStackedToggleLabel();
    this.persistStackedPref(false);
    if (!this.currentFileIsCommit && this.files.length > 0) {
      void this.loadFile(this.currentFileIndex);
    }
  }

  private updateStackedToggleLabel() {
    const toggle = document.getElementById('toggle-stacked');
    if (!toggle) {
      return;
    }
    toggle.classList.toggle('active', this.isStacked);
    toggle.textContent = this.isStacked ? 'Mode: Stacked' : 'Mode: File by file';
    toggle.setAttribute('aria-pressed', String(this.isStacked));
  }

  private persistStackedPref(value: boolean) {
    this.config.stacked_view = value;
    fetchJSON<AppConfig>('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.config),
    }).catch(() => {
      /* best effort */
    });
  }

  toggleStackedView() {
    if (this.isStacked) {
      this.hideStackedView();
    } else {
      this.showStackedView();
    }
  }

  openStackedSearch(): boolean {
    if (!this.isStacked || this.currentFileIsCommit || !this.stackedCodeView) {
      return false;
    }
    this.stackedCodeView.openSearch({ mode: 'find', scope: 'all' });
    return true;
  }

  private stackedTopForFile(file: DiffFile) {
    if (file.is_binary) {
      return document.getElementById(this.stackedSectionId(file.path))?.offsetTop ?? null;
    }
    return this.stackedCodeView?.getTopForItem(this.stackedItemId(file.path)) ?? null;
  }

  async scrollToFileInStacked(index: number) {
    if (!this.isStacked) {
      return;
    }
    const file = this.files[index];
    if (!file) {
      return;
    }
    this.clearStackedFocus();
    const previousFile = this.files[this.currentFileIndex];
    const view = this.stackedCodeView;
    if (view && previousFile && !this.currentFileIsCommit) {
      const previousTop = view.getTopForItem(this.stackedItemId(previousFile.path));
      if (previousTop !== undefined) {
        const offset = Math.max(0, view.getScrollTop() - previousTop);
        (this.stackedFileScrollOffsets ??= new Map()).set(
          this.fileCacheKey(previousFile.path),
          offset,
        );
      }
    }
    this.currentFileIndex = index;
    this.currentFileIsCommit = false;
    if (this._commitViewEl) {
      this._commitViewEl.style.display = 'none';
    }
    const stackedContainer = document.getElementById('stacked-container');
    if (stackedContainer) {
      stackedContainer.style.display = '';
    }
    this.renderFileList();
    // Switching commits from the commit-message view skips rendering the
    // stacked view, so build it on first use.
    if (!this.stackedCodeView && stackedContainer && !stackedContainer.hasChildNodes()) {
      const generation = this.commitLoadGeneration;
      await this.renderStackedView();
      if (
        !this.isStacked ||
        this.currentFileIsCommit ||
        this.currentFileIndex !== index ||
        generation !== this.commitLoadGeneration
      ) {
        return;
      }
    }
    const anchor = document.getElementById(this.stackedSectionId(file.path));
    if (file.is_binary) {
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (this.stackedCodeView) {
      this.stackedCodeView.scrollTo({
        type: 'item',
        id: this.stackedItemId(file.path),
        align: 'start',
        offset: -(this.stackedFileScrollOffsets?.get(this.fileCacheKey(file.path)) ?? 0),
        behavior: 'instant',
      });
      return;
    }
    anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async revealStackedLine(index: number, line: number) {
    await this.scrollToFileInStacked(index);
    const file = this.files[index];
    const view = this.stackedCodeView;
    if (!view || !file) {
      return;
    }
    const id = this.stackedItemId(file.path);
    const scroll = (target: Parameters<typeof view.requestScroll>[0]) =>
      new Promise<string>((resolve) => view.requestScroll(target, resolve));
    // The file is rendered once its scroll settles; only then is its pierre instance known.
    // Collapsed context can only expand once the file's full contents are loaded.
    await scroll({ type: 'item', id, align: 'start', behavior: 'instant' });
    await this.hydrateStackedFile(file, (await loadDiffsRuntime()).parseDiffFromFile);
    // Unchanged lines may be collapsed; diff instances expand just the region holding `line`.
    const instance = this.stackedInstances?.get(file.path);
    if (instance && 'revealLine' in instance && typeof instance.revealLine === 'function') {
      instance.revealLine(line, 'additions');
    }
    const result = await scroll({
      type: 'line',
      id,
      lineNumber: line,
      side: 'additions',
      align: 'center',
      behavior: 'instant',
    });
    if (result === 'settled') {
      this.stackedFlash = { path: file.path, line, start: performance.now() };
      this.applyStackedFlash();
    }
  }

  /** The rendered row of a line on one side, found in the file's pierre shadow root. */
  private findStackedRow(path: string, line: number, side: Side): HTMLElement | undefined {
    const host = document.querySelector<HTMLElement>(
      `.stacked-code-view [data-path="${CSS.escape(path)}"]`,
    );
    return Array.from(
      host?.shadowRoot?.querySelectorAll<HTMLElement>(`[data-line="${line}"]`) ?? [],
    ).find((row) => isDeletionRow(row) === (side === 'old'));
  }

  /** Focuses a changed line of `path` and scrolls it to `align`. */
  showStackedFocus(path: string, focus: FocusedLine, align: 'nearest' | 'center') {
    this.clearStackedFocusMarks();
    this.currentFocusedLine = focus;
    this.stackedFocusPath = path;
    this.applyStackedFocus();
    const view = this.stackedCodeView;
    if (!view) {
      return;
    }
    // Rows are one line tall; before the row renders, assume a typical line height.
    const lineHeight = this.findStackedRow(path, focus.line, focus.side)?.offsetHeight || 20;
    this.stackedFocusScrolls = (this.stackedFocusScrolls ?? 0) + 1;
    view.requestScroll(
      {
        type: 'line',
        id: this.stackedItemId(path),
        lineNumber: focus.line,
        side: this.toAnnotationSide(focus.side),
        align,
        // With 'nearest', pierre keeps this much room above and below the line.
        offset: align === 'nearest' ? FOCUS_MARGIN_LINES * lineHeight : 0,
        behavior: prefersReducedMotion() ? 'instant' : 'smooth',
      },
      // The scroll may have rendered the line after the mark above; re-mark once it has settled.
      () => {
        this.stackedFocusScrolls = (this.stackedFocusScrolls ?? 1) - 1;
        this.applyStackedFocus();
      },
    );
  }

  clearStackedFocus() {
    this.clearStackedFocusMarks();
    this.currentFocusedLine = null;
    this.stackedFocusPath = null;
  }

  /**
   * The index of the focused line's file while the reader is still at it: the line is on
   * screen, or a focus scroll is on its way to it. Null once they have scrolled it out of view,
   * so that j/k start over in the file on screen.
   */
  stackedFocusFileIndex(): number | null {
    const path = this.stackedFocusPath;
    const focus = this.currentFocusedLine;
    const index = path ? this.files.findIndex((file) => file.path === path) : -1;
    if (!focus || index === -1) {
      return null;
    }
    if ((this.stackedFocusScrolls ?? 0) > 0) {
      return index;
    }
    const row = this.findStackedRow(path!, focus.line, focus.side)?.getBoundingClientRect();
    const view = document.querySelector('.stacked-code-view')?.getBoundingClientRect();
    return row && view && row.bottom > view.top && row.top < view.bottom ? index : null;
  }

  /** Marks the focused row. Pierre replaces rows on re-render, so this runs after each one. */
  private applyStackedFocus() {
    const focus = this.currentFocusedLine;
    const path = this.stackedFocusPath;
    if (!focus || !path || this.currentFileIsCommit) {
      return;
    }
    this.findStackedRow(path, focus.line, focus.side)?.toggleAttribute('data-stacked-focus', true);
  }

  private clearStackedFocusMarks() {
    document
      .querySelectorAll<HTMLElement>('.stacked-code-view [data-path]')
      .forEach((host) =>
        host.shadowRoot
          ?.querySelectorAll('[data-stacked-focus]')
          .forEach((row) => row.removeAttribute('data-stacked-focus')),
      );
  }

  /** Marks the flashing line's row; pierre replaces rows when it re-renders, so this runs again
   * after each render, continuing the fade where it was. */
  private applyStackedFlash() {
    const flash = this.stackedFlash;
    if (!flash) {
      return;
    }
    const elapsed = performance.now() - flash.start;
    if (elapsed >= SEARCHFOX_FLASH_MS) {
      this.stackedFlash = null;
      return;
    }
    const row = this.findStackedRow(flash.path, flash.line, 'new');
    if (!row || row.hasAttribute('data-searchfox-flash')) {
      return;
    }
    row.toggleAttribute('data-searchfox-flash', true);
    row.style.animationDelay = `-${elapsed}ms`;
    setTimeout(() => {
      row.removeAttribute('data-searchfox-flash');
      row.style.animationDelay = '';
    }, SEARCHFOX_FLASH_MS - elapsed);
  }

  clearStackedView() {
    this.stackedItemVersion ??= 0;
    this.stackedScrollUnsubscribe?.();
    this.stackedScrollUnsubscribe = null;
    this.stackedCodeView?.cleanUp();
    this.stackedCodeView = null;
    this.stackedViewOptions = null;
    this.stackedItems = new Map();
    this.stackedInstances = new Map();
    this.stackedFlash = null;
    this.currentFocusedLine = null;
    this.stackedFocusPath = null;
    this.stackedFileMetadata = new Map();
    this.stackedHydrations = new Map();
    this.stackedLastRangeSelection = null;
    this.stackedDraft = null;
    this.stackedRenderToken = (this.stackedRenderToken ?? 0) + 1;
    const container = document.getElementById('stacked-container');
    if (container) {
      clearEl(container);
    }
  }

  async renderStackedView() {
    const container = document.getElementById('stacked-container');
    if (!container) {
      return;
    }
    this.clearStackedView();
    const renderToken = this.stackedRenderToken;
    const generation = this.commitLoadGeneration;

    if (!this.files.length) {
      container.appendChild(el('div', { className: 'stacked-empty', text: 'No files changed.' }));
      return;
    }

    const { CodeView, parsePatchFiles, parseDiffFromFile, getOrCreateWorkerPoolSingleton } =
      await loadDiffsRuntime();
    if (
      !this.isStacked ||
      !container.isConnected ||
      renderToken !== this.stackedRenderToken ||
      generation !== this.commitLoadGeneration
    ) {
      return;
    }

    const codeViewRoot = el('div', { className: 'stacked-code-view' });
    codeViewRoot.addEventListener('mousedown', (event) => this.handleStackedSearchfoxClick(event));
    codeViewRoot.addEventListener('contextmenu', (event) =>
      this.handleStackedSearchfoxContextMenu(event),
    );
    container.appendChild(codeViewRoot);
    const binaryFiles = this.files.filter((file) => file.is_binary);

    const items = this.files
      .map((file) => this.buildCodeViewItem(file, parsePatchFiles))
      .filter((item): item is CodeViewDiffItem<StackedAnnotation> => !!item);
    if (!items.length) {
      if (binaryFiles.length) {
        codeViewRoot.appendChild(
          el('div', {
            className: 'stacked-empty',
            text: 'This review contains only binary files.',
          }),
        );
        binaryFiles.forEach((file) => codeViewRoot.appendChild(this.renderBinaryFileNotice(file)));
      } else {
        codeViewRoot.appendChild(
          el('div', { className: 'stacked-empty', text: 'No renderable text changes.' }),
        );
      }
      return;
    }

    const workerPool = getOrCreateWorkerPoolSingleton(DIFFS_POOL_SETUP);
    const options: CodeViewOptions<StackedAnnotation, undefined> = {
      diffStyle: this.stackedDiffStyle(),
      overflow: this.config.word_wrap ? 'wrap' : 'scroll',
      theme: DIFFS_THEME,
      themeType: themeTypeFor(this.config.color_scheme),
      lineHoverHighlight: 'both',
      hunkSeparators: 'line-info-basic',
      collapsedContextThreshold: 1,
      expansionLineCount: 30,
      stickyHeaders: true,
      enableLineSelection: true,
      renderHeaderMetadata: (fileDiff) => this.buildHeaderMetadata(this.fileForPath(fileDiff.name)),
      onLineNumberClick: (props, context) =>
        this.showStackedDraft(this.pathFromCodeViewContext(context), props),
      onSelectedLinesChange: (selection) => this.rememberStackedSelection(selection),
      onLineSelected: (range, context) =>
        this.showStackedDraftFromSelection(this.pathFromCodeViewContext(context), range),
      renderAnnotation: (annotation) =>
        this.renderStackedAnnotation(annotation as DiffLineAnnotation<StackedAnnotation>),
      // Expanding unmodified lines needs the full file contents, so load
      // them for every file the virtualizer renders.
      onPostRender: (node, instance, phase, context) => {
        const path = this.pathFromCodeViewContext(context);
        if (phase === 'unmount') {
          this.stackedInstances?.delete(path);
        } else {
          (this.stackedInstances ??= new Map()).set(path, instance);
          // Pierre's file element doesn't say which file it shows; click handling and the
          // marks below read it here.
          node.dataset.path = path;
          this.applyStackedFlash();
          this.applyStackedFocus();
          void this.hydrateStackedFile(
            this.files.find((file) => file.path === path),
            parseDiffFromFile,
          );
        }
      },
      unsafeCSS: this.stackedDiffsCss(),
    };
    const view = new CodeView<StackedAnnotation>(options, workerPool);
    this.stackedCodeView = view;
    this.stackedViewOptions = options;
    view.setup(codeViewRoot);
    view.setItems(items);
    view.render(true);
    if (binaryFiles.length) {
      binaryFiles.forEach((file) => container.appendChild(this.renderBinaryFileNotice(file)));
    }
    this.stackedScrollUnsubscribe = view.subscribeToScroll((scrollTop) => {
      this.syncCurrentFileFromStackedScroll(scrollTop);
    });
  }

  updateStackedDiffStyle() {
    if (!this.stackedCodeView || !this.stackedViewOptions) {
      return;
    }
    this.stackedViewOptions = { ...this.stackedViewOptions, diffStyle: this.stackedDiffStyle() };
    this.stackedCodeView.setOptions(this.stackedViewOptions);
  }

  private stackedDiffStyle() {
    return this.isInline ? 'unified' : 'split';
  }

  private buildCodeViewItem(
    file: DiffFile,
    parsePatchFiles: ParsePatchFiles,
  ): CodeViewDiffItem<StackedAnnotation> | null {
    if (file.is_binary) {
      return null;
    }
    const metadata = this.toPatchDiffsMetadata(file, parsePatchFiles);
    if (!metadata) {
      return null;
    }

    this.stackedFileMetadata.set(file.path, metadata);
    const item: CodeViewDiffItem<StackedAnnotation> = {
      id: this.stackedItemId(file.path),
      type: 'diff',
      fileDiff: metadata,
      annotations: this.stackedAnnotationsForFile(file.path),
      version: ++this.stackedItemVersion,
    };
    this.stackedItems.set(file.path, item);
    return item;
  }

  private hydrateStackedFile(
    file: DiffFile | undefined,
    parseDiffFromFile: ParseDiffFromFile,
  ): Promise<void> {
    if (!file || file.is_binary) {
      return Promise.resolve();
    }
    let hydration = this.stackedHydrations.get(file.path);
    if (!hydration) {
      hydration = this.loadStackedFileContents(file, parseDiffFromFile);
      this.stackedHydrations.set(file.path, hydration);
    }
    return hydration;
  }

  private async loadStackedFileContents(file: DiffFile, parseDiffFromFile: ParseDiffFromFile) {
    const renderToken = this.stackedRenderToken;
    const generation = this.commitLoadGeneration;
    const view = this.stackedCodeView;
    const metadata = await this.toFullFileDiffsMetadata(file, parseDiffFromFile);
    if (
      !metadata ||
      !this.isStacked ||
      renderToken !== this.stackedRenderToken ||
      generation !== this.commitLoadGeneration ||
      view !== this.stackedCodeView
    ) {
      return;
    }

    const existing = this.stackedItems.get(file.path);
    if (!existing) {
      return;
    }
    const nextItem: CodeViewDiffItem<StackedAnnotation> = {
      ...existing,
      fileDiff: metadata,
      annotations: this.stackedAnnotationsForFile(file.path),
      version: ++this.stackedItemVersion,
    };
    this.stackedFileMetadata.set(file.path, metadata);
    this.stackedItems.set(file.path, nextItem);
    if (this.stackedCodeView?.updateItem(nextItem)) {
      this.stackedCodeView.render(true);
    }
  }

  private async toFullFileDiffsMetadata(
    file: DiffFile,
    parseDiffFromFile: ParseDiffFromFile,
  ): Promise<FileDiffMetadata | null> {
    const cacheKey = this.fileCacheKey(file.path);
    let pair;
    try {
      pair = await this.fetchFilePair(file.path);
    } catch {
      return null;
    }

    if (!pair.old && !pair.new) {
      return null;
    }

    // @pierre/diffs splitWithNewlines skips the last line when it lacks a
    // trailing newline, causing an out-of-bounds lineIndex in the renderer.
    // Normalise both sides so the content always ends with \n.
    const normalise = (s: string) => (s && !s.endsWith('\n') ? s + '\n' : s);
    const oldFile: FileContents = {
      name: file.old_path ?? file.path,
      contents: normalise(pair.old),
      cacheKey: `${cacheKey}:old`,
    };
    const newFile: FileContents = {
      name: file.path,
      contents: normalise(pair.new),
      cacheKey: `${cacheKey}:new`,
    };

    try {
      return parseDiffFromFile(oldFile, newFile);
    } catch {
      return null;
    }
  }

  private toPatchDiffsMetadata(
    file: DiffFile,
    parsePatchFiles: ParsePatchFiles,
  ): FileDiffMetadata | null {
    if (!file.hunks.length) {
      return null;
    }
    const parsed = parsePatchFiles(this.toUnifiedPatch(file), {
      cacheKeyPrefix: `lrv:${this.fileCacheKey(file.path)}@${this.commitLoadGeneration}`,
    })[0]?.files[0];
    return parsed ?? null;
  }

  private buildHeaderMetadata(file: DiffFile): HTMLElement {
    const { additions, deletions } = this.fileDelta(file);
    const meta = el('span', { className: 'stacked-file-meta' });
    if (additions > 0) {
      meta.appendChild(el('span', { className: 'delta-add', text: `+${additions}` }));
    }
    if (deletions > 0) {
      meta.appendChild(el('span', { className: 'delta-del', text: `-${deletions}` }));
    }
    meta.appendChild(
      el('span', {
        className: `stacked-file-status status-${file.status}`,
        text: file.status[0]?.toUpperCase() ?? '?',
        attrs: { title: file.status },
      }),
    );
    return meta;
  }

  private renderBinaryFileNotice(file: DiffFile): HTMLElement {
    return el(
      'div',
      { className: 'stacked-binary-file', attrs: { id: this.stackedSectionId(file.path) } },
      [
        el('div', { className: 'stacked-binary-title', text: file.path }),
        el('div', {
          className: 'stacked-binary-body',
          text: `${file.status[0]?.toUpperCase() ?? '?'}${file.status.slice(1)} binary file. Text diff is unavailable.`,
        }),
      ],
    );
  }

  private showStackedDraft(file: string, props: OnDiffLineClickProps) {
    if (!file) {
      return;
    }
    this.openStackedDraft(file, props.lineNumber, this.fromAnnotationSide(props.annotationSide));
  }

  /** Opens the comment form on a line; a line-number click and the Enter key both come here. */
  openStackedDraft(file: string, lineNumber: number, side: Side) {
    this.stackedDraft = {
      file,
      line: this.stackedSelectedLine(file, lineNumber, side),
      side,
    };
    this.renderStackedComments();
  }

  showStackedDiscussionDraft(discussion: Discussion) {
    this.stackedDraft = {
      file: discussion.file,
      line: discussion.line,
      side: discussion.side,
      discussion,
    };
    this.renderStackedComments();
  }

  discardStackedDiscussionDraft(discussionId: string) {
    if (this.stackedDraft?.discussion?.id === discussionId) {
      this.stackedDraft = null;
      this.stackedLastRangeSelection = null;
      this.stackedCodeView?.clearSelectedLines({ notify: false });
    }
  }

  private showStackedDraftFromSelection(file: string, range: SelectedLineRange | null) {
    if (!file || !range) {
      return;
    }
    const startSide = range.side ? this.fromAnnotationSide(range.side) : null;
    const endSide = range.endSide ? this.fromAnnotationSide(range.endSide) : startSide;
    if (!startSide || startSide !== endSide) {
      return;
    }
    const start = Math.min(range.start, range.end);
    const end = Math.max(range.start, range.end);
    this.stackedDraft = {
      file,
      line: start === end ? start : [start, end],
      side: startSide,
    };
    this.renderStackedComments();
  }

  private stackedSelectedLine(file: string, clickedLine: number, side: Side): CommentLine {
    const current = this.commentLineFromStackedSelection(
      this.stackedCodeView?.getSelectedLines(),
      file,
      clickedLine,
      side,
    );
    if (Array.isArray(current)) {
      return current;
    }
    return (
      this.commentLineFromStackedSelection(
        this.stackedLastRangeSelection,
        file,
        clickedLine,
        side,
      ) ??
      current ??
      clickedLine
    );
  }

  private rememberStackedSelection(selection: CodeViewLineSelection | null) {
    if (this.isStackedRangeSelection(selection)) {
      this.stackedLastRangeSelection = selection;
    }
  }

  private commentLineFromStackedSelection(
    selected: CodeViewLineSelection | null | undefined,
    file: string,
    clickedLine: number,
    side: Side,
  ): CommentLine | null {
    const startSide = selected?.range.side ? this.fromAnnotationSide(selected.range.side) : null;
    const endSide = selected?.range.endSide
      ? this.fromAnnotationSide(selected.range.endSide)
      : startSide;
    if (
      !selected ||
      selected.id !== this.stackedItemId(file) ||
      startSide !== side ||
      endSide !== side
    ) {
      return clickedLine;
    }

    const start = Math.min(selected.range.start, selected.range.end);
    const end = Math.max(selected.range.start, selected.range.end);
    if (clickedLine < start || clickedLine > end) {
      return null;
    }
    return start === end ? start : [start, end];
  }

  private isStackedRangeSelection(
    selection: CodeViewLineSelection | null,
  ): selection is CodeViewLineSelection {
    return !!selection && selection.range.start !== selection.range.end;
  }

  renderStackedComments() {
    if (!this.isStacked) {
      return;
    }
    const draft = this.stackedDraft;
    const previousTextarea = draft?.textarea;
    const wasFocused = previousTextarea && document.activeElement === previousTextarea;
    for (const [path, item] of this.stackedItems) {
      const nextItem = {
        ...item,
        annotations: this.stackedAnnotationsForFile(path),
        version: ++this.stackedItemVersion,
      };
      this.stackedItems.set(path, nextItem);
      if (!this.stackedCodeView?.updateItem(nextItem)) {
        continue;
      }
    }
    this.stackedCodeView?.render(true);
    const textarea = draft?.textarea;
    // Agent updates can replace an annotation while the user is typing in it.
    if (wasFocused && textarea?.isConnected && textarea !== previousTextarea) {
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(
        previousTextarea.selectionStart,
        previousTextarea.selectionEnd,
        previousTextarea.selectionDirection,
      );
    }
  }

  private renderStackedAnnotation(annotation: DiffLineAnnotation<StackedAnnotation>) {
    const metadata = annotation.metadata;
    if (!metadata) {
      return undefined;
    }
    if (metadata.kind === 'draft') {
      return this.buildDraftAnnotation(metadata.draft);
    }
    if (metadata.kind === 'discussion') {
      const wrap = el('div', { className: 'stacked-annotation' });
      wrap.appendChild(this.buildDiscussionNode(metadata.discussion));
      return wrap;
    }
    if (metadata.kind === 'review-note') {
      const wrap = el('div', {
        className: `stacked-annotation stacked-review-note-${metadata.note.side}`,
      });
      wrap.appendChild(this.buildReviewNoteNode(metadata.note));
      return wrap;
    }
    return this.buildCommentAnnotation(metadata.comment, metadata.index);
  }
  private buildDraftAnnotation(draft: StackedDraft) {
    const form = el('div', { className: 'stacked-comment-form' });
    const ta = document.createElement('textarea');
    ta.className = 'stacked-comment-ta';
    ta.placeholder = 'Add a comment...';
    ta.rows = 3;
    // Keep the text in the draft so a re-render doesn't lose it.
    const firstRender = !draft.textarea;
    draft.textarea = ta;
    ta.value = draft.body ?? '';
    ta.addEventListener('input', () => {
      draft.body = ta.value;
    });
    const { discussion } = draft;

    const save = el('button', { className: 'stacked-comment-save btn-primary', text: 'Save' });
    const cancel = el('button', {
      className: 'stacked-comment-cancel btn-secondary',
      text: 'Cancel',
    });
    const reset = () => {
      if (this.stackedDraft !== draft) {
        return;
      }
      this.stackedDraft = null;
      this.stackedLastRangeSelection = null;
      this.stackedCodeView?.clearSelectedLines({ notify: false });
      this.renderStackedComments();
    };
    const discuss = el('button', {
      className: 'stacked-comment-discuss btn-secondary discuss-btn',
      text: 'Discuss',
    });
    const summarize = discussion
      ? el('button', {
          className: 'stacked-comment-summarize btn-secondary summarize-btn',
          text: draft.summarizing ? 'Summarizing…' : 'Summarize',
          attrs: { disabled: draft.summarizing },
        })
      : null;
    const error = el('div', { className: 'comment-error', attrs: { hidden: true } });
    const doSave = async () => {
      const body = ta.value.trim();
      if (!body) {
        ta.focus();
        return;
      }
      const commitIdx = this.seriesInfo?.is_series ? this.currentCommitIdx : undefined;
      if (discussion) {
        try {
          await this.deleteDiscussion(discussion);
        } catch (err) {
          error.textContent = err instanceof Error ? err.message : 'Failed to delete discussion';
          error.hidden = false;
          return;
        }
      }
      const comment: ReviewComment = {
        file: draft.file,
        line: draft.line,
        side: draft.side,
        body,
      };
      this.commentManager.addComment(
        commitIdx === undefined ? comment : { ...comment, commit_idx: commitIdx },
      );
      reset();
    };
    const sendDiscussion = async () => {
      const body = ta.value.trim();
      if (!body) {
        ta.focus();
        return;
      }
      if (discuss.disabled) {
        return;
      }
      discuss.disabled = true;
      error.hidden = true;
      try {
        await this.discussionManager.send({
          file: draft.file,
          line: draft.line,
          side: draft.side,
          body,
        });
        reset();
      } catch (err) {
        error.textContent =
          err instanceof DiscussionError && err.status === 409
            ? 'No agent is listening any more'
            : 'Failed to send discussion. Try again.';
        error.hidden = false;
      } finally {
        discuss.disabled = false;
      }
    };
    discuss.addEventListener('click', () => void sendDiscussion());
    summarize?.addEventListener('click', async () => {
      draft.summarizing = true;
      summarize.disabled = true;
      summarize.textContent = 'Summarizing…';
      error.hidden = true;
      try {
        const body = await this.summarizeDiscussion(discussion!);
        delete draft.summarizing;
        if (this.stackedDraft === draft) {
          draft.body = body;
          // Sending the request re-rendered the draft, so render it again with the summary.
          this.renderStackedComments();
        }
      } catch (err) {
        delete draft.summarizing;
        summarize.disabled = false;
        summarize.textContent = 'Summarize';
        error.textContent =
          err instanceof DiscussionError && err.status === 409
            ? 'No agent is listening any more'
            : 'Failed to request a summary. Try again.';
        error.hidden = false;
      }
    });
    save.addEventListener('click', () => void doSave());
    cancel.addEventListener('click', () => {
      reset();
    });
    ta.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (event.altKey) {
          if (this.agentAttached && !discussion) {
            void sendDiscussion();
          }
          return;
        }
        void doSave();
      } else if (event.key === 'Escape') {
        reset();
      }
    });

    form.append(
      ta,
      error,
      el('div', { className: 'stacked-comment-actions' }, [
        discussion ? summarize : discuss,
        save,
        cancel,
      ]),
    );
    // Only opening the draft should scroll it into view.
    if (firstRender) {
      queueMicrotask(() => {
        if (this.stackedDraft === draft && ta.isConnected) {
          ta.focus();
        }
      });
    }
    return form;
  }

  private buildCommentAnnotation(comment: ReviewComment, index: number) {
    const box = el('div', { className: 'stacked-comment-box' });
    const meta = el('div', {
      className: 'stacked-comment-meta',
      text: `${comment.side} line ${commentLineLabel(comment)}`,
    });
    const body = el('div', {
      className: 'stacked-comment-body',
      text: commentDisplayText(comment),
    });
    const actions = el('div', { className: 'stacked-comment-actions-row' });
    const edit = el('button', { className: 'stacked-comment-edit btn-secondary', text: 'Edit' });
    const del = el('button', { className: 'stacked-comment-del btn-danger', text: 'Delete' });

    edit.addEventListener('click', () => {
      const ta = document.createElement('textarea');
      ta.className = 'stacked-comment-ta';
      ta.rows = 3;
      ta.value = comment.body;
      const save = el('button', { className: 'btn-primary', text: 'Save' });
      const cancel = el('button', { className: 'btn-secondary', text: 'Cancel' });
      const saveEdit = () => {
        const newBody = ta.value.trim();
        if (!newBody) {
          ta.focus();
          return;
        }
        this.commentManager.updateComment(index, newBody);
      };
      save.addEventListener('click', saveEdit);
      cancel.addEventListener('click', () => this.renderStackedComments());
      ta.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          if (!event.altKey) {
            saveEdit();
          }
        } else if (event.key === 'Escape') {
          this.renderStackedComments();
        }
      });
      box.replaceChildren(
        meta,
        ta,
        el('div', { className: 'stacked-comment-actions-row' }, [save, cancel]),
      );
      ta.focus();
    });
    del.addEventListener('click', () => this.commentManager.removeComment(index));

    actions.append(edit, del);
    box.append(meta, body, actions);
    return box;
  }

  private stackedAnnotationsForFile(path: string): DiffLineAnnotation<StackedAnnotation>[] {
    const annotations: DiffLineAnnotation<StackedAnnotation>[] = [];
    this.commentManager.getCommentsForFileIndexed(path).forEach(({ comment, index }) => {
      annotations.push({
        side: this.toAnnotationSide(comment.side),
        lineNumber: commentEndLine(comment),
        metadata: { kind: 'comment', comment, index },
      });
    });
    this.reviewNoteManager.getNotesForFile(path).forEach((note) => {
      annotations.push({
        side: this.toAnnotationSide(note.side),
        lineNumber: commentEndLine(note),
        metadata: { kind: 'review-note', note },
      });
    });
    this.discussionManager.getForFile(path).forEach((discussion) => {
      annotations.push({
        side: this.toAnnotationSide(discussion.side),
        lineNumber: commentEndLine(discussion),
        metadata: { kind: 'discussion', discussion },
      });
    });
    if (this.stackedDraft?.file === path) {
      annotations.push({
        side: this.toAnnotationSide(this.stackedDraft.side),
        lineNumber: Array.isArray(this.stackedDraft.line)
          ? this.stackedDraft.line[1]
          : this.stackedDraft.line,
        metadata: { kind: 'draft', draft: this.stackedDraft },
      });
    }
    return annotations;
  }

  private syncCurrentFileFromStackedScroll(scrollTop: number) {
    if (!this.files.length) {
      return;
    }
    let bestIdx = this.currentFileIndex;
    let bestTop = Number.NEGATIVE_INFINITY;
    this.files.forEach((file, index) => {
      const top = this.stackedTopForFile(file);
      if (top == null || top > scrollTop + 32 || top < bestTop) {
        return;
      }
      bestTop = top;
      bestIdx = index;
    });
    // The keyboard focus keeps its own file (`stackedFocusPath`): a focus scroll often leaves
    // the previous file's header as the one on top.
    if (bestIdx !== this.currentFileIndex) {
      this.currentFileIndex = bestIdx;
      this.currentFileIsCommit = false;
      this.renderFileList();
    }
  }

  private toUnifiedPatch(file: DiffFile): string {
    const oldPath = file.old_path ?? file.path;
    const oldHeader = file.status === 'added' ? '/dev/null' : `a/${oldPath}`;
    const newHeader = file.status === 'deleted' ? '/dev/null' : `b/${file.path}`;
    const lines = [`diff --git a/${oldPath} b/${file.path}`];
    if (file.status === 'added') {
      lines.push('new file mode 100644');
    } else if (file.status === 'deleted') {
      lines.push('deleted file mode 100644');
    } else if (file.status === 'renamed' && file.old_path) {
      lines.push(`rename from ${file.old_path}`, `rename to ${file.path}`);
    } else if (file.status === 'copied' && file.old_path) {
      lines.push(`copy from ${file.old_path}`, `copy to ${file.path}`);
    }
    lines.push(`--- ${oldHeader}`, `+++ ${newHeader}`);
    for (const hunk of file.hunks) {
      const oldCount = hunk.lines.filter((line) => line.type !== 'add').length;
      const newCount = hunk.lines.filter((line) => line.type !== 'delete').length;
      lines.push(`@@ -${hunk.old_start ?? 0},${oldCount} +${hunk.new_start ?? 0},${newCount} @@`);
      for (const line of hunk.lines) {
        lines.push(`${this.diffLinePrefix(line)}${line.content ?? ''}`);
      }
    }
    return `${lines.join('\n')}\n`;
  }

  private diffLinePrefix(line: DiffLine) {
    if (line.type === 'add') {
      return '+';
    }
    if (line.type === 'delete') {
      return '-';
    }
    return ' ';
  }

  private fileDelta(file: DiffFile) {
    let additions = 0;
    let deletions = 0;
    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') {
          additions += 1;
        } else if (line.type === 'delete') {
          deletions += 1;
        }
      }
    }
    return { additions, deletions };
  }

  private toAnnotationSide(side: Side): AnnotationSide {
    return side === 'new' ? 'additions' : 'deletions';
  }

  private fromAnnotationSide(side: AnnotationSide): Side {
    return side === 'additions' ? 'new' : 'old';
  }

  private stackedSectionId(path: string) {
    return `stacked-file-${path.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
  }

  private stackedItemId(path: string) {
    return `file:${path}`;
  }

  private handleStackedSearchfoxClick(event: MouseEvent) {
    const click = this.config.searchfox ? searchfoxClick(event) : null;
    if (!click) {
      return;
    }
    const target = this.stackedSearchfoxTarget(event);
    if (!target) {
      return;
    }
    event.preventDefault();
    void this.searchfoxLookup(target, click.mode, click.newTab);
  }

  /** On an identifier, replaces the browser menu with Searchfox lookups; elsewhere the browser menu stays. */
  private handleStackedSearchfoxContextMenu(event: MouseEvent) {
    const target = this.config.searchfox ? this.stackedSearchfoxTarget(event) : null;
    if (!target) {
      return;
    }
    event.preventDefault();
    openContextMenu(
      event.clientX,
      event.clientY,
      searchfoxMenuActions.map(({ label, mode }) => ({
        label,
        onSelect: () => void this.searchfoxLookup(target, mode, false),
      })),
    );
  }

  /** The identifier under a click on a code line; null on gutters, annotations, headers and separators. */
  private stackedSearchfoxTarget(event: MouseEvent): SearchfoxTarget | null {
    const nodes = event.composedPath();
    const line = nodes.find(
      (node): node is HTMLElement => node instanceof HTMLElement && node.hasAttribute('data-line'),
    );
    const fileElement = nodes.find(
      (node): node is HTMLElement => node instanceof HTMLElement && node.dataset.path !== undefined,
    );
    if (!line || !fileElement) {
      return null;
    }
    const caret = document.caretPositionFromPoint(event.clientX, event.clientY, {
      shadowRoots: [line.getRootNode() as ShadowRoot],
    });
    if (!caret || !line.contains(caret.offsetNode)) {
      return null;
    }
    const beforeCaret = document.createRange();
    beforeCaret.setStart(line, 0);
    beforeCaret.setEnd(caret.offsetNode, caret.offset);
    const col = beforeCaret.toString().length;
    const text = line.textContent ?? '';
    const identifier = identifierAt(text, col);
    if (!identifier) {
      return null;
    }
    const deleted = isDeletionRow(line);
    const file = this.fileForPath(fileElement.dataset.path!);
    return {
      path: deleted ? (file.old_path ?? file.path) : file.path,
      line: Number(line.dataset.line),
      col,
      word: identifier.word,
      text,
      side: deleted ? 'old' : 'new',
      commit_idx: this.currentCommitIdx,
    };
  }

  private pathFromCodeViewContext(context: unknown): string {
    const id = (context as { item?: { id?: string } } | undefined)?.item?.id ?? '';
    return id.startsWith('file:') ? id.slice('file:'.length) : id;
  }

  private fileForPath(path: string): DiffFile {
    return this.files.find((file) => file.path === path) ?? this.files[0]!;
  }

  private stackedDiffsCss() {
    return `
      :host {
        --diffs-font-family: var(--font-mono);
        --diffs-font-features: ${this.config.ligatures ? 'normal' : '"liga" 0, "calt" 0'};
        --diffs-light-bg: var(--bg-primary);
        --diffs-dark-bg: var(--bg-primary);
        --diffs-light: var(--text-primary);
        --diffs-dark: var(--text-primary);
        --diffs-fg-number-override: var(--text-secondary);
        --diffs-bg-context-override: color-mix(in srgb, var(--bg-primary) 88%, var(--text-primary));
        --diffs-bg-context-gutter-override: color-mix(in srgb, var(--bg-primary) 84%, var(--text-primary));
        --diffs-bg-separator-override: color-mix(in srgb, var(--bg-primary) 78%, var(--text-primary));
        --diffs-bg-buffer-override: color-mix(in srgb, var(--bg-primary) 92%, var(--text-primary));
        --diffs-bg-selection-override: var(--accent-color);
        --diffs-bg-selection-number-override: var(--accent-color);
      }
      [data-line-annotation] { padding: 8px 12px; }
      [data-interactive-line-numbers] { cursor: pointer; }
      [data-stacked-focus] {
        background-color: color-mix(in srgb, var(--accent-color) 14%, transparent);
        box-shadow: inset 2px 0 0 var(--accent-color);
      }
      [data-searchfox-flash] { animation: searchfox-flash ${SEARCHFOX_FLASH_MS}ms ease-out; }
      @keyframes searchfox-flash {
        from { background-color: color-mix(in srgb, var(--accent-color) 35%, transparent); }
      }
      @media (prefers-reduced-motion: reduce) {
        [data-searchfox-flash] {
          animation: none;
          background-color: color-mix(in srgb, var(--accent-color) 20%, transparent);
        }
      }
    `;
  }
}
