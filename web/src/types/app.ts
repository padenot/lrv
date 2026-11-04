import type { CommentLine, ReviewComment } from '../comments';
import type { Discussion, DiscussionManager } from '../discussions';
import type { ReviewNote } from '../review-notes';
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
  is_binary?: boolean;
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
  stacked_view: boolean;
  auto_close_tab: boolean;
  word_wrap: boolean;
  auto_fetch_comments: boolean;
};

export type AppConfigInput = Partial<AppConfig>;

export type ReviewAction = 'comment' | 'accept' | 'request-changes';

export type PhabRevisionStatus = {
  id: string;
  title: string;
  url: string;
  commit_idxs: number[];
  own: boolean;
  closed: boolean;
  status?: string | null;
  status_name?: string | null;
  publishable: boolean;
  reason?: string;
  published: boolean;
};

export type PhabStatus = { user: string; error?: string; revisions: PhabRevisionStatus[] };
export type PublishState = {
  action: ReviewAction;
  overall: string;
  error?: string;
  busy?: boolean;
};

export type AppContextData = {
  title?: string;
  working_directory?: string;
  git_branch?: string;
  is_public?: boolean;
  launch_available?: boolean;
  claude_skill_installed?: boolean;
  comment_store_error?: string | null;
  phabricator_available?: boolean;
  phabricator_revisions?: (string | null)[];
};

export type UserTheme = {
  id: string;
  name: string;
  accent_hex: string;
  data: {
    base: string;
    inherit: boolean;
    rules: Array<{ token: string; foreground?: string; fontStyle?: string }>;
    colors: Record<string, string>;
  };
};

export type CommitSummary = {
  idx: number;
  commit_hash?: string;
  commit_author?: string;
  commit_date?: string;
  commit_message?: string;
  jj_change_id?: string;
  stats: DiffStats;
  pr?: number;
};

export type PrInfo = {
  owner: string;
  repo: string;
  number: number;
  title?: string;
  url?: string;
};

export type SeriesInfo = {
  is_series: boolean;
  commits: CommitSummary[];
  prs?: PrInfo[];
};

export type DiffStats = {
  files_changed: number;
  additions: number;
  deletions: number;
};

export interface AppContext {
  discussionManager: DiscussionManager;
  agentAttached: boolean;
  agentState: AgentState;
  setAgentState(state: AgentState): void;
  setupConnectAgent(): void;
  commentManager: {
    comments: ReviewComment[];
    currentCommitIdx: number | null;
    getComments(): ReviewComment[];
    getCommentsForFile(file: string): ReviewComment[];
    getCommentsForFileIndexed(file: string): Array<{ comment: ReviewComment; index: number }>;
    addComment(comment: ReviewComment): void;
    setComments(comments: ReviewComment[]): void;
    updateComment(index: number, body: string): void;
    removeComment(index: number): void;
    findComment(file: string, line: number, side: Side): number;
    onChange(listener: () => void): void;
  };
  reviewNoteManager: {
    currentCommitIdx: number | null;
    setNotes(notes: ReviewNote[]): void;
    mergeNotes(notes: ReviewNote[]): void;
    addNote(note: ReviewNote): void;
    updateNote(note: ReviewNote, patch: Partial<ReviewNote>): void;
    getNotes(): ReviewNote[];
    nextSummary(rootId: string): Promise<ReviewNote>;
    getDiscussionReplies(discussionId: string): ReviewNote[];
    removeDiscussionReplies(id: string): void;
    getNotesForFile(file: string): ReviewNote[];
    findNote(file: string, line: number, side: Side): number;
    onChange(listener: () => void): void;
  };
  currentFileIndex: number;
  editor: editor.IStandaloneDiffEditor | null;
  isInline: boolean;
  modifiedDecorations: string[];
  originalDecorations: string[];
  modifiedReviewNoteDecorations: string[];
  originalReviewNoteDecorations: string[];
  modifiedReviewNoteZoneIds: string[];
  originalReviewNoteZoneIds: string[];
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
    jj_change_id?: string;
  } | null;
  files: DiffFile[];
  stats: DiffStats;
  fileCache: Record<string, FilePair>;
  overallReviewComment: string;
  reviewSubmitted: boolean;
  userThemes: UserTheme[];
  fileCacheKey(filePath: string, commitIdx?: number): string;
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
  seriesInfo: SeriesInfo | null;
  currentCommitIdx: number;
  commitLoadGeneration: number;
  isStacked: boolean;

  updateUI(): void;
  showStackedView(): void;
  hideStackedView(): void;
  toggleStackedView(): void;
  scrollToFileInStacked(index: number): void;
  renderStackedComments(): void;
  renderFileList(): void;
  renderSeriesNav(): void;
  loadCommit(idx: number): Promise<void>;
  nextCommit(): void;
  previousCommit(): void;
  setupSidebarResizer(): void;
  setupCommitStripResizer(): void;
  setupFileListControls(): void;
  expandCurrentFileAncestors(): void;
  setupKeyboardShortcuts(): void;
  setupUI(): void;
  loadFile(index: number): Promise<void>;
  resetFileView(): void;
  clearStackedView(): void;
  loadCommitView(): void;
  showCommitLineCommentDialog(lineNum: number): void;
  showCommitMessagePopover(anchorEl: HTMLElement, message: string, rev: string): void;
  applyThemeToUI(themeName: string): void;
  showSettingsModal(): void;
  showSubmitConfirmation(): Promise<void>;
  clearPersistedComments(): Promise<void>;
  showKeyboardHelp(): void;
  updateDecorations(): void;
  renderReviewNotes(): void;
  showCommentDialog(
    file: string,
    fileLine: CommentLine,
    monacoLine: number,
    side: Side,
    discussion?: Discussion,
  ): void;
  showStackedDiscussionDraft(discussion: Discussion): void;
  deleteDiscussion(discussion: Discussion): Promise<void>;
  summarizeDiscussion(discussion: Discussion): Promise<string>;
  showCommitSummaryDialog(): void;
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

export type AgentState = {
  attached: boolean;
  busy: boolean;
  launch: 'idle' | 'running' | 'failed';
  initial_review?: boolean;
  error?: string | null;
};
export type LaunchRequest = {
  provider: 'claude' | 'codex';
  model: string;
  effort: string;
  initial_review: boolean;
};
