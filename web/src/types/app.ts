import type { ReviewComment } from '../comments';
import type { editor } from 'monaco-editor';

export type Side = 'old' | 'new';

export type DiffLine = {
  old_line?: number;
  new_line?: number;
  type?: string;
  content?: string;
};

export type DiffHunk = {
  old_start?: number;
  new_start?: number;
  lines: DiffLine[];
};

export type DiffFile = {
  path: string;
  old_path?: string;
  status: string;
  hunks: DiffHunk[];
};

export type FilePair = { old: string; new: string };

export type HunkRange = {
  side: Side;
  start: number;
  end: number;
};

export type AppConfig = {
  color_scheme: string;
  font: string;
  split_view: boolean;
  auto_close_tab: boolean;
};

export type AppConfigInput = Partial<AppConfig>;

export type AppContextData = {
  title?: string;
  working_directory?: string;
  git_branch?: string;
  is_public?: boolean;
};

export type DiffStats = {
  files_changed: number;
  additions: number;
  deletions: number;
};

export interface AppContext {
  commentManager: {
    comments: ReviewComment[];
    getComments(): ReviewComment[];
    getCommentsForFile(file: string): ReviewComment[];
    addComment(comment: ReviewComment): void;
    updateComment(index: number, body: string): void;
    removeComment(index: number): void;
    findComment(file: string, line: number, side: Side): number;
    onChange(listener: () => void): void;
  };
  currentFileIndex: number;
  editor: editor.IStandaloneDiffEditor | null;
  isInline: boolean;
  modifiedDecorations: string[];
  originalDecorations: string[];
  focusedHunkDecorationsNew: string[];
  focusedHunkDecorationsOld: string[];
  focusedLineDecorationsNew: string[];
  focusedLineDecorationsOld: string[];
  currentFocusedLine: { side: Side; line: number } | null;
  currentWidget: editor.IContentWidget | null;
  currentWidgetEditor?: editor.ICodeEditor | null;
  diff: {
    files: DiffFile[];
    stats: DiffStats;
    commit_message?: string;
    commit_hash?: string;
  } | null;
  files: DiffFile[];
  stats: DiffStats;
  fileCache: Record<string, FilePair>;
  fileHunks: Record<string, HunkRange[]>;
  currentHunkIndex: Record<string, number>;
  config: AppConfig;
  context: AppContextData;
  originalModel: editor.ITextModel | null;
  modifiedModel: editor.ITextModel | null;
  _eagerPrefetchStarted: boolean;
  _commitPopoverEl: HTMLElement | null;
  currentFileIsCommit: boolean;
  _commitViewEl: HTMLElement | null;
  collapsedDirs: Set<string>;
  fileListFilter: string;

  updateUI(): void;
  renderFileList(): void;
  setupSidebarResizer(): void;
  setupFileListControls(): void;
  expandCurrentFileAncestors(): void;
  setupKeyboardShortcuts(): void;
  setupUI(): void;
  loadFile(index: number): Promise<void>;
  loadCommitView(): void;
  showCommitLineCommentDialog(lineNum: number): void;
  showCommitMessagePopover(anchorEl: HTMLElement, message: string, rev: string): void;
  applyThemeToUI(themeName: string): void;
  showSettingsModal(): void;
  showSubmitConfirmation(): Promise<void>;
  showKeyboardHelp(): void;
  updateDecorations(): void;
  showCommentDialog(file: string, fileLine: number, monacoLine: number, side: Side): void;
  initFileHunks(file: DiffFile): void;
  isAddedFile(file: DiffFile): boolean;
  fetchFilePair(filePath: string): Promise<FilePair>;
  eagerPrefetchAllFiles(): Promise<void>;
  nextFile(): void;
  previousFile(): void;
  nextHunk(): void;
  previousHunk(): void;
  jumpToHunk(hunkIndex: number): void;
  setFocusedLine(side: Side, monacoLine: number, reveal?: boolean): void;
  clearFocusedHunk(): void;
  openCommentOnCurrentFocus(): void;
}
