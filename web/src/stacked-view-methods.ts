import type {
  CodeView,
  CodeViewLineSelection,
} from '../../node_modules/@pierre/diffs/dist/components/CodeView.js';
import type { OnDiffLineClickProps } from '../../node_modules/@pierre/diffs/dist/managers/InteractionManager.js';
import type {
  AnnotationSide,
  CodeViewDiffItem,
  CodeViewItem,
  DiffLineAnnotation,
  FileDiffMetadata,
  FileContents,
  SelectedLineRange,
} from '../../node_modules/@pierre/diffs/dist/types.js';
import { el, clearEl } from './dom';
import { commentEndLine, commentLineLabel, type CommentLine, type ReviewComment } from './comments';
import { fetchJSON } from './api';
import type { ReviewNote } from './review-notes';
import type { AppConfig, AppContext, DiffFile, DiffLine, Side } from './types/app';

type StackedAnnotation =
  | { kind: 'comment'; comment: ReviewComment; index: number }
  | { kind: 'review-note'; note: ReviewNote }
  | { kind: 'draft'; file: string; line: CommentLine; side: Side };

const DIFFS_THEME = { dark: 'pierre-dark', light: 'pierre-light' } as const;

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

export class StackedViewMethods {
  declare files: AppContext['files'];
  declare commentManager: AppContext['commentManager'];
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare isStacked: boolean;
  declare currentCommitIdx: AppContext['currentCommitIdx'];
  declare seriesInfo: AppContext['seriesInfo'];
  declare config: AppContext['config'];
  declare diff: AppContext['diff'];
  declare renderReviewNotes: () => void;
  declare renderFileList: () => void;
  declare currentFileIndex: number;
  declare currentFileIsCommit: boolean;
  declare buildReviewNoteNode: (note: ReviewNote) => HTMLElement;
  declare editor: AppContext['editor'];
  declare _commitViewEl: HTMLElement | null;
  declare loadFile: AppContext['loadFile'];
  declare fetchFilePair: AppContext['fetchFilePair'];
  declare fileCacheKey: AppContext['fileCacheKey'];

  private stackedCodeView: CodeView<StackedAnnotation> | null;
  private stackedItems: Map<string, CodeViewDiffItem<StackedAnnotation>>;
  private stackedFileMetadata: Map<string, FileDiffMetadata>;
  private stackedDraft: { file: string; line: CommentLine; side: Side } | null;
  private stackedItemVersion: number;
  private stackedScrollUnsubscribe: (() => void) | null;
  private stackedRenderToken: number;
  private stackedHydratedFiles: Set<string>;
  private stackedParseDiffFromFile: ParseDiffFromFile | null;
  private stackedLastRangeSelection: CodeViewLineSelection | null;

  showStackedView() {
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
    const toggleView = document.getElementById('toggle-view');
    if (toggleView) {
      toggleView.style.display = 'none';
    }
    this.persistStackedPref(true);
  }

  hideStackedView() {
    this.isStacked = false;
    this.stackedRenderToken = (this.stackedRenderToken ?? 0) + 1;
    const editor = document.getElementById('editor-container');
    const stacked = document.getElementById('stacked-container');
    if (editor) {
      editor.style.display = '';
    }
    if (stacked) {
      stacked.style.display = 'none';
    }
    this.updateStackedToggleLabel();
    const toggleView = document.getElementById('toggle-view');
    if (toggleView) {
      toggleView.style.display = '';
    }
    this.persistStackedPref(false);
    if (!this.editor && this.files.length > 0) {
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

  private stackedTopForFile(file: DiffFile) {
    if (file.is_binary) {
      return document.getElementById(this.stackedSectionId(file.path))?.offsetTop ?? null;
    }
    return this.stackedCodeView?.getTopForItem(this.stackedItemId(file.path)) ?? null;
  }

  scrollToFileInStacked(index: number) {
    if (!this.isStacked) {
      return;
    }
    const file = this.files[index];
    if (!file) {
      return;
    }
    this.currentFileIndex = index;
    this.currentFileIsCommit = false;
    if (this._commitViewEl) {
      this._commitViewEl.style.display = 'none';
    }
    this.renderFileList();
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
        behavior: 'instant',
      });
      return;
    }
    anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async renderStackedView() {
    const container = document.getElementById('stacked-container');
    if (!container) {
      return;
    }

    this.stackedScrollUnsubscribe?.();
    this.stackedScrollUnsubscribe = null;
    this.stackedCodeView?.cleanUp();
    this.stackedCodeView = null;
    this.stackedItems = new Map();
    this.stackedFileMetadata = new Map();
    this.stackedHydratedFiles = new Set();
    this.stackedParseDiffFromFile = null;
    this.stackedLastRangeSelection = null;
    this.stackedRenderToken = (this.stackedRenderToken ?? 0) + 1;
    const renderToken = this.stackedRenderToken;
    clearEl(container);

    const msg = this.diff?.commit_message;
    const hash = this.diff?.commit_hash;
    if (msg || hash) {
      const msgBox = el('div', { className: 'stacked-commit-message' });
      if (hash) {
        msgBox.appendChild(
          el('div', { className: 'stacked-commit-hash', text: hash.slice(0, 12) }),
        );
      }
      if (msg) {
        msgBox.appendChild(el('pre', { className: 'stacked-commit-msg-body', text: msg }));
      }
      container.appendChild(msgBox);
    }

    if (!this.files.length) {
      container.appendChild(el('div', { className: 'stacked-empty', text: 'No files changed.' }));
      return;
    }

    const { CodeView, parsePatchFiles, parseDiffFromFile, getOrCreateWorkerPoolSingleton } =
      await loadDiffsRuntime();
    if (!this.isStacked || !container.isConnected || renderToken !== this.stackedRenderToken) {
      return;
    }
    this.stackedParseDiffFromFile = parseDiffFromFile;

    const codeViewRoot = el('div', { className: 'stacked-code-view' });
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

    const workerPool = getOrCreateWorkerPoolSingleton({
      poolOptions: {
        workerFactory: createDiffsWorker,
        poolSize: Math.min(Math.max(navigator.hardwareConcurrency ?? 4, 2), 6),
        totalASTLRUCacheSize: 64,
      },
      highlighterOptions: {
        theme: DIFFS_THEME,
        lineDiffType: 'word-alt',
        maxLineDiffLength: 1000,
        tokenizeMaxLineLength: 1000,
      },
    });
    const view = new CodeView<StackedAnnotation>(
      {
        diffStyle: 'split',
        theme: DIFFS_THEME,
        lineHoverHighlight: 'both',
        hunkSeparators: 'line-info-basic',
        collapsedContextThreshold: 1,
        expansionLineCount: 30,
        stickyHeaders: true,
        enableLineSelection: true,
        renderHeaderMetadata: (fileDiff) =>
          this.buildHeaderMetadata(this.fileForPath(fileDiff.name)),
        onLineNumberClick: (props, context) =>
          this.showStackedDraft(this.pathFromCodeViewContext(context), props),
        onSelectedLinesChange: (selection) => this.rememberStackedSelection(selection),
        onLineSelected: (range, context) =>
          this.showStackedDraftFromSelection(this.pathFromCodeViewContext(context), range),
        renderAnnotation: (annotation) =>
          this.renderStackedAnnotation(annotation as DiffLineAnnotation<StackedAnnotation>),
        unsafeCSS: this.stackedDiffsCss(),
      },
      workerPool,
    );
    this.stackedCodeView = view;
    view.setup(codeViewRoot);
    view.setItems(items);
    view.render(true);
    if (binaryFiles.length) {
      binaryFiles.forEach((file) => container.appendChild(this.renderBinaryFileNotice(file)));
    }
    this.stackedScrollUnsubscribe = view.subscribeToScroll((scrollTop) => {
      this.syncCurrentFileFromStackedScroll(scrollTop);
    });
    void this.hydrateStackedFile(this.files[this.currentFileIndex], parseDiffFromFile);
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

  private async hydrateStackedFile(
    file: DiffFile | undefined,
    parseDiffFromFile: ParseDiffFromFile,
  ) {
    if (!file || file.is_binary || this.stackedHydratedFiles.has(file.path)) {
      return;
    }
    this.stackedHydratedFiles.add(file.path);

    const metadata = await this.toFullFileDiffsMetadata(file, parseDiffFromFile);
    if (!metadata || !this.isStacked || this.stackedParseDiffFromFile !== parseDiffFromFile) {
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
      cacheKey: `${this.fileCacheKey(file.path)}:old`,
    };
    const newFile: FileContents = {
      name: file.path,
      contents: normalise(pair.new),
      cacheKey: `${this.fileCacheKey(file.path)}:new`,
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
    const parsed = parsePatchFiles(this.toUnifiedPatch(file), `lrv:${file.path}`)[0]?.files[0];
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
    const side = this.fromAnnotationSide(props.annotationSide);
    this.stackedDraft = {
      file,
      line: this.stackedSelectedLine(file, props.lineNumber, side),
      side,
    };
    this.renderStackedComments();
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
  }

  private renderStackedAnnotation(annotation: DiffLineAnnotation<StackedAnnotation>) {
    const metadata = annotation.metadata;
    if (!metadata) {
      return undefined;
    }
    if (metadata.kind === 'draft') {
      return this.buildDraftAnnotation(metadata);
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
  private buildDraftAnnotation(draft: Extract<StackedAnnotation, { kind: 'draft' }>) {
    const form = el('div', { className: 'stacked-comment-form' });
    const ta = document.createElement('textarea');
    ta.className = 'stacked-comment-ta';
    ta.placeholder = 'Add a comment...';
    ta.rows = 3;

    const save = el('button', { className: 'stacked-comment-save btn-primary', text: 'Save' });
    const cancel = el('button', {
      className: 'stacked-comment-cancel btn-secondary',
      text: 'Cancel',
    });
    const doSave = () => {
      const body = ta.value.trim();
      if (!body) {
        ta.focus();
        return;
      }
      const comment: ReviewComment = {
        file: draft.file,
        line: draft.line,
        side: draft.side,
        body,
      };
      this.commentManager.addComment(
        this.seriesInfo?.is_series ? { ...comment, commit_idx: this.currentCommitIdx } : comment,
      );
      this.stackedDraft = null;
      this.stackedLastRangeSelection = null;
      this.stackedCodeView?.clearSelectedLines({ notify: false });
      this.renderStackedComments();
    };
    save.addEventListener('click', doSave);
    cancel.addEventListener('click', () => {
      this.stackedDraft = null;
      this.stackedLastRangeSelection = null;
      this.stackedCodeView?.clearSelectedLines({ notify: false });
      this.renderStackedComments();
    });
    ta.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        doSave();
      } else if (event.key === 'Escape') {
        this.stackedDraft = null;
        this.stackedLastRangeSelection = null;
        this.stackedCodeView?.clearSelectedLines({ notify: false });
        this.renderStackedComments();
      }
    });

    form.append(ta, el('div', { className: 'stacked-comment-actions' }, [save, cancel]));
    queueMicrotask(() => ta.focus());
    return form;
  }

  private buildCommentAnnotation(comment: ReviewComment, index: number) {
    const box = el('div', { className: 'stacked-comment-box' });
    const meta = el('div', {
      className: 'stacked-comment-meta',
      text: `${comment.side} line ${commentLineLabel(comment)}`,
    });
    const body = el('div', { className: 'stacked-comment-body', text: comment.body });
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
          saveEdit();
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
    if (this.stackedDraft?.file === path) {
      annotations.push({
        side: this.toAnnotationSide(this.stackedDraft.side),
        lineNumber: Array.isArray(this.stackedDraft.line)
          ? this.stackedDraft.line[1]
          : this.stackedDraft.line,
        metadata: { kind: 'draft', ...this.stackedDraft },
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
    if (bestIdx !== this.currentFileIndex) {
      this.currentFileIndex = bestIdx;
      this.currentFileIsCommit = false;
      this.renderFileList();
      if (this.stackedParseDiffFromFile) {
        void this.hydrateStackedFile(this.files[bestIdx], this.stackedParseDiffFromFile);
      }
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
    `;
  }
}
