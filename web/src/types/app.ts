import type { CommentLine, ReviewComment } from '../comments';
import type { Discussion, DiscussionManager } from '../discussions';
import type { ReviewNote } from '../review-notes';
import type { editor } from 'monaco-editor';
import type { SearchfoxTarget } from '../searchfox';

export type Side = 'old' | 'new';

export type DiffLine = {
  // Null on the side a line doesn't exist on (added lines have no old line).
  old_line?: number | null;
  new_line?: number | null;
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
  ligatures: boolean;
  auto_fetch_comments: boolean;
  searchfox: boolean;
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
  my_review: 'waiting' | 'done' | 'none';
  via_group: boolean;
  reviewers_pending: number;
  publishable: boolean;
  reason?: string;
  published: boolean;
};

export type PhabStatus = { user: string; error?: string; revisions: PhabRevisionStatus[] };
export type PhabPublishResponse = { url: string; revision?: PhabRevisionStatus };

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
  own_revisions?: (boolean | null)[];
  /** Searchfox tree used for code navigation, e.g. "firefox-main". */
  searchfox_tree?: string | null;
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
  updateCommitBarVisibility(): void;
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
  currentWidget: { discussionId: string | undefined; close: () => void } | null;
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
  scrollToFileInStacked(index: number): Promise<void>;
  /** Scrolls the stacked view to new-side `line` of file `index` and selects it. */
  revealStackedLine(index: number, line: number): Promise<void>;
  updateStackedDiffStyle(): void;
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
  applyThemeToUI(themeName: string): void;
  showSettingsModal(): void;
  showSubmitConfirmation(lgtm?: boolean): Promise<void>;
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
  /** Resolves `target` on searchfox. `definition` jumps to the single
   * definition when there is one, `uses` lists every hit; both fall back to the
   * results panel. With `newTab`, opens searchfox.org in a new browser tab instead. */
  searchfoxLookup(
    target: SearchfoxTarget,
    mode: 'definition' | 'uses',
    newTab: boolean,
  ): Promise<void>;
  discardStackedDiscussionDraft(discussionId: string): void;
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
  error?: string | null;
  /** Highest event seq the agent has polled past, i.e. finished handling. */
  acked?: number;
};
export type LaunchRequest = {
  provider: 'claude' | 'codex';
  model: string;
  effort: string;
};
