import { $, clearEl, el } from './dom';
import { CommentManager } from './comments';
import { ReviewNoteManager } from './review-notes';
import { fetchJSON } from './api';
import { DEFAULT_APP_CONFIG, resolveAppConfig } from './config';
import {
  buildCommentDraftKey,
  clearCommentDraft,
  loadCommentDraft,
  saveCommentDraft,
} from './comment-draft-storage';
import { CUSTOM_THEMES } from './themes';
import { markAppReady } from './ui-signals';
import { appendLinkifiedText } from './linkify';

import { FileDataMethods } from './file-data-methods';
import { FileListMethods } from './file-list-methods';
import { FileLoadingMethods } from './file-loading-methods';
import { NavigationMethods } from './navigation-methods';
import { CommitMethods } from './commit-methods';
import { CommentsUIMethods } from './comments-ui-methods';
import { ReviewNoteMethods } from './review-note-methods';
import { DialogMethods } from './dialog-methods';
import { SeriesMethods } from './series-methods';
import { StackedViewMethods } from './stacked-view-methods';
import type {
  AppConfig,
  AppConfigInput,
  AppContextData,
  DiffFile,
  DiffStats,
  FilePair,
  HunkRange,
  SeriesInfo,
  UserTheme,
} from './types/app';
import type { editor } from 'monaco-editor';
import type { UIThemeDefinitionMap } from './themes';
import type { ReviewNote } from './review-notes';

type Constructor = { prototype: object };
function applyMixin(TargetClass: Constructor, MethodsClass: Constructor) {
  for (const name of Object.getOwnPropertyNames(MethodsClass.prototype)) {
    if (name === 'constructor') {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(MethodsClass.prototype, name);
    if (!descriptor) {
      continue;
    }
    Object.defineProperty(TargetClass.prototype, name, descriptor);
  }
}

export class MonacoApp {
  commentManager: CommentManager;
  reviewNoteManager: ReviewNoteManager;
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
  currentFocusedLine: { side: 'old' | 'new'; line: number } | null;
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
  context!: AppContextData;
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
  commentDraftKey: string | null;
  commentDraftWrite: Promise<void>;
  declare updateUI: () => void;
  declare renderReviewNotes: () => void;
  declare renderFileList: () => void;
  declare renderSeriesNav: () => void;
  declare loadCommit: (idx: number) => Promise<void>;
  declare nextCommit: () => void;
  declare previousCommit: () => void;
  declare loadFile: (index: number) => Promise<void>;
  declare showCommitMessagePopover: (anchorEl: HTMLElement, message: string, rev: string) => void;
  declare loadCommitView: () => void;
  declare showSettingsModal: () => void;
  declare showKeyboardHelp: () => void;
  declare showSubmitConfirmation: () => Promise<void>;
  declare userThemes: UserTheme[];
  declare isStacked: boolean;
  declare showStackedView: () => void;
  declare hideStackedView: () => void;
  declare toggleStackedView: () => void;
  declare scrollToFileInStacked: (index: number) => void;
  declare renderStackedComments: () => void;
  declare setupSidebarResizer: () => void;
  declare setupCommitStripResizer: () => void;
  declare setupFileListControls: () => void;
  declare setupKeyboardShortcuts: () => void;

  constructor() {
    this.commentManager = new CommentManager();
    this.reviewNoteManager = new ReviewNoteManager();
    this.currentFileIndex = 0;
    this.editor = null;
    this.isInline = false;
    this.modifiedDecorations = [];
    this.originalDecorations = [];
    this.modifiedReviewNoteDecorations = [];
    this.originalReviewNoteDecorations = [];
    this.modifiedReviewNoteZoneIds = [];
    this.originalReviewNoteZoneIds = [];
    this.focusedHunkDecorationsNew = [];
    this.focusedHunkDecorationsOld = [];
    this.focusedLineDecorationsNew = [];
    this.focusedLineDecorationsOld = [];
    this.currentFocusedLine = null;
    this.currentWidget = null;
    this.diff = null;
    this.files = [];
    this.stats = { files_changed: 0, additions: 0, deletions: 0 };
    this.fileCache = {};
    this.userThemes = [];
    this.fileHunks = {}; // Track hunk start lines per file: { [path]: number[] }
    this.currentHunkIndex = {}; // Track current hunk index per file
    this.config = DEFAULT_APP_CONFIG;
    this.originalModel = null;
    this.modifiedModel = null;
    this._eagerPrefetchStarted = false;
    this._commitPopoverEl = null;
    this.currentFileIsCommit = false;
    this._commitViewEl = null;
    this.collapsedDirs = new Set();
    this.fileListFilter = '';
    this.seriesInfo = null;
    this.currentCommitIdx = 0;
    this.commentDraftKey = null;
    this.commentDraftWrite = Promise.resolve();
    this.isStacked = false;

    this.commentManager.onChange(() => {
      this.persistComments();
      this.updateUI();
      if (this.isStacked) {
        this.renderStackedComments();
      }
    });
    this.reviewNoteManager.onChange(() => {
      this.renderReviewNotes();
      this.renderFileList();
      if (this.currentFileIsCommit) {
        this.loadCommitView();
      }
    });
  }

  async init() {
    if (window.DEBUG) {
      console.info('[app] init: start');
    }
    window.Perf.recordAppInitStart();
    window.Perf.mark('init:start');
    if (performance.getEntriesByName('page:script-start').length > 0) {
      window.Perf.measure('page:script-to-init-start', 'page:script-start', 'init:start');
    }
    // Load config, context, diff data, series info, and ensure @font-face fonts are ready
    window.Perf.mark('init:fetch:start');
    const t0 = performance.now();
    const [configData, contextData, diffData, seriesData, reviewNotesData, userThemesData] =
      await Promise.all([
        fetchJSON<AppConfigInput>('/api/config'),
        fetchJSON<AppContextData>('/api/context'),
        fetchJSON<{
          files: DiffFile[];
          stats: DiffStats;
          commit_message?: string;
          commit_hash?: string;
        }>('/api/diff'),
        fetchJSON<SeriesInfo>('/api/series'),
        fetchJSON<ReviewNote[]>('/api/review-notes'),
        fetchJSON<UserTheme[]>('/api/themes'),
        document.fonts.ready,
      ]);
    window.Perf.mark('init:fetch:end');
    window.Perf.measure('init:fetch', 'init:fetch:start', 'init:fetch:end');
    if (window.DEBUG) {
      console.info('[app] init: responses received in', Math.round(performance.now() - t0), 'ms');
    }
    this.config = resolveAppConfig(configData);
    this.context = contextData;
    if (this.context.title) {
      document.title = this.context.title;
    } else {
      const dirName = (this.context.working_directory ?? '').split('/').pop() ?? '';
      document.title = dirName || 'lrv';
    }
    if (window.DEBUG) {
      console.info('[app] init: parsed config/context/diff');
    }
    this.seriesInfo = seriesData;
    this.userThemes = userThemesData ?? [];
    this.currentCommitIdx = 0;
    this.commentManager.currentCommitIdx = seriesData.is_series ? 0 : null;
    this.reviewNoteManager.currentCommitIdx = seriesData.is_series ? 0 : null;
    this.reviewNoteManager.setNotes(reviewNotesData ?? []);
    this.diff = diffData;
    this.files = diffData.files;
    this.stats = diffData.stats;
    this.commentDraftKey = buildCommentDraftKey(this.context, this.diff, this.seriesInfo);
    await this.restorePersistedComments();

    // Apply split view setting from config
    this.isInline = !this.config.split_view;

    // Wait for AMD loader to be ready
    window.Perf.mark('init:amd-wait:start');
    await new Promise<void>((resolve, reject) => {
      const start = performance.now();
      const timer = setInterval(() => {
        if (window.require) {
          clearInterval(timer);
          resolve();
        }
        if (performance.now() - start > 5000) {
          clearInterval(timer);
          reject(new Error('AMD loader not ready'));
        }
      }, 25);
    });
    window.Perf.mark('init:amd-wait:end');
    window.Perf.measure('init:amd-wait', 'init:amd-wait:start', 'init:amd-wait:end');
    const amdRequire = window.require!;
    amdRequire.config({
      paths: { vs: window.MONACO_VS_BASE ?? '/assets/vendor/monaco/min/vs' },
    });

    // Pre-apply theme variables to avoid flash while Monaco loads
    this.applyThemeToUI(this.config.color_scheme);
    document.documentElement.setAttribute('data-ui-ready', '1');

    return new Promise<void>((resolve) => {
      window.Perf.mark('init:monaco:load:start');
      amdRequire(['vs/editor/editor.main'], () => {
        window.Perf.mark('init:monaco:load:end');
        window.Perf.measure('init:monaco:load', 'init:monaco:load:start', 'init:monaco:load:end');
        if (window.DEBUG) {
          console.info('[app] monaco loaded');
        }
        this.defineCustomThemes();
        this.applyThemeToUI(this.config.color_scheme);
        document.documentElement.setAttribute('data-ui-ready', '1');
        window.Perf.mark('init:ui-setup:start');
        this.setupUI();
        window.Perf.mark('init:ui-setup:end');
        window.Perf.measure('init:ui-setup', 'init:ui-setup:start', 'init:ui-setup:end');
        window.Perf.mark('init:file-list:render:start');
        this.renderSeriesNav();
        this.renderFileList();
        window.Perf.mark('init:file-list:render:end');
        window.Perf.measure(
          'init:file-list:render',
          'init:file-list:render:start',
          'init:file-list:render:end',
        );
        if (window.DEBUG) {
          console.info('[app] calling loadFile(0)');
        }
        if (this.config.stacked_view) {
          this.showStackedView();
        }
        window.Perf.mark('init:first-file:load:start');
        const firstLoad =
          this.isStacked || this.files.length === 0 ? Promise.resolve() : this.loadFile(0);
        if (this.files.length === 0) {
          this.loadCommitView();
        }
        Promise.resolve(firstLoad).then(() => {
          window.Perf.mark('init:first-file:load:end');
          window.Perf.measure(
            'init:first-file:load',
            'init:first-file:load:start',
            'init:first-file:load:end',
          );
          // Set review timestamp
          const reviewTime = document.getElementById('review-time');
          if (reviewTime) {
            reviewTime.textContent = new Date().toLocaleString();
          }
          // Set project info
          this.renderProjectInfo();
          // Wait for paint and record init end
          window.Perf.mark('init:final-paint-wait:start');
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.Perf.mark('init:final-paint-wait:end');
              window.Perf.measure(
                'init:final-paint-wait',
                'init:final-paint-wait:start',
                'init:final-paint-wait:end',
              );
              window.Perf.recordAppInitEnd();
              window.Perf.mark('init:end');
              window.Perf.measure('init:total', 'init:start', 'init:end');
              // Minimal perf log (gated behind DEBUG)
              if (window.DEBUG) {
                const e = performance.getEntriesByName('appInit');
                const d = e.length > 0 ? e[e.length - 1]!.duration : null;
                if (d != null) {
                  console.info('[perf] appInit ms:', Math.round(d));
                }
              }
              markAppReady();
            }),
          );
          resolve();
        });
      });
    });
  }

  private persistComments() {
    if (!this.commentDraftKey) {
      return;
    }

    const key = this.commentDraftKey;
    const comments = this.commentManager.getComments();
    this.commentDraftWrite = this.commentDraftWrite
      .catch(() => undefined)
      .then(() => saveCommentDraft(key, comments));
  }

  private async restorePersistedComments() {
    if (!this.commentDraftKey) {
      return;
    }

    const comments = await loadCommentDraft(this.commentDraftKey);
    if (comments.length === 0) {
      return;
    }

    const banner = document.getElementById('restore-banner');
    const msg = document.getElementById('restore-banner-msg');
    const yesBtn = document.getElementById('restore-yes-btn');
    const noBtn = document.getElementById('restore-no-btn');
    if (!banner || !msg || !yesBtn || !noBtn) {
      this.commentManager.setComments(comments);
      return;
    }

    msg.textContent = `${comments.length} comment${comments.length === 1 ? '' : 's'} from a previous session — restore?`;
    banner.style.display = '';

    const close = () => {
      banner.style.display = 'none';
    };

    yesBtn.onclick = () => {
      this.commentManager.setComments(comments);
      close();
    };
    noBtn.onclick = () => {
      void this.clearPersistedComments();
      close();
    };
  }

  async clearPersistedComments() {
    if (!this.commentDraftKey) {
      return;
    }

    try {
      await this.commentDraftWrite.catch(() => undefined);
      await clearCommentDraft(this.commentDraftKey);
    } catch (error) {
      console.warn('Failed to clear persisted review comments:', error);
    }
  }

  applyThemeToUI(themeName: string) {
    // Derive UI colors from the Monaco theme definitions we register locally.
    const setVar = (k: string, v: string) => {
      if (v) {
        document.documentElement.style.setProperty(k, v);
      }
    };

    const defs: UIThemeDefinitionMap = window.UI_THEME_DEFS ?? {};

    // Use explicit accent map first (same source as init), fall back to keyword token for user themes
    const accentHex =
      (window.UIThemeAccentsHex ?? {})[themeName] ??
      (() => {
        const def = defs[themeName];
        if (def && Array.isArray(def.rules)) {
          const kw = def.rules.find((r) => r && r.token === 'keyword' && r.foreground);
          if (kw?.foreground) {
            return '#' + String(kw.foreground).replace(/^#/, '');
          }
        }
        return null;
      })();
    if (accentHex) {
      const norm = el('div');
      norm.style.color = accentHex;
      document.body.appendChild(norm);
      try {
        setVar('--accent-color', getComputedStyle(norm).color);
        window.__ACCENT_READY = true;
      } finally {
        norm.remove();
      }
    }

    // Apply surface/text colors from the theme definition's color tokens where
    // available, then fall back to DOM-derived values.
    const themeColors: Record<string, string> =
      (defs[themeName] as unknown as { colors?: Record<string, string> })?.colors ?? {};

    const fromTheme = (token: string) => themeColors[token] ?? '';

    setVar('--bg-primary', fromTheme('editor.background'));
    setVar(
      '--bg-secondary',
      fromTheme('editorGutter.background') ||
        fromTheme('editor.lineHighlightBackground') ||
        fromTheme('editor.background'),
    );
    setVar(
      '--bg-elevated',
      fromTheme('editorGutter.background') ||
        fromTheme('editor.lineHighlightBackground') ||
        fromTheme('editor.background'),
    );
    setVar('--text-primary', fromTheme('editor.foreground'));
    setVar('--text-secondary', fromTheme('editorLineNumber.foreground'));
    setVar('--border-color', fromTheme('editorGroup.border'));

    // Fill any gaps with DOM-derived values (built-in themes have no colors map)
    const editorEl = document.querySelector('.monaco-editor');
    if (editorEl) {
      const cs = getComputedStyle(editorEl);
      if (!fromTheme('editor.background')) {
        setVar('--bg-primary', cs.backgroundColor);
      }
      if (!fromTheme('editorGutter.background') && !fromTheme('editor.lineHighlightBackground')) {
        const margin = document.querySelector('.monaco-editor .margin') ?? editorEl;
        setVar('--bg-secondary', getComputedStyle(margin).backgroundColor || cs.backgroundColor);
        setVar('--bg-elevated', getComputedStyle(margin).backgroundColor || cs.backgroundColor);
      }
      if (!fromTheme('editor.foreground')) {
        setVar('--text-primary', getComputedStyle(document.body).color);
      }
      if (!fromTheme('editorLineNumber.foreground')) {
        const rgbNums = cs.backgroundColor.match(/\d+/g);
        if (rgbNums && rgbNums.length >= 3) {
          const lum = (0.2126 * +rgbNums[0]! + 0.7152 * +rgbNums[1]! + 0.0722 * +rgbNums[2]!) / 255;
          document.documentElement.style.setProperty(
            '--text-secondary',
            lum > 0.5 ? '#595c60' : '#858585',
          );
        }
      }
    }
  }

  defineCustomThemes() {
    const defs = (window.UI_THEME_DEFS ??= {});
    Object.entries(CUSTOM_THEMES).forEach(([name, theme]) => {
      monaco.editor.defineTheme(name, theme);
      defs[name] = theme;
    });
    this.userThemes.forEach((t) => {
      monaco.editor.defineTheme(t.id, t.data as Parameters<typeof monaco.editor.defineTheme>[1]);
      defs[t.id] = t.data;
      window.UIThemeAccentsHex = { ...window.UIThemeAccentsHex, [t.id]: t.accent_hex };
    });
  }

  renderProjectInfo() {
    const container = $('#project-info');
    if (!container) {
      return;
    }
    clearEl(container);
    if (this.context.title) {
      const t = this.context.title;
      container.appendChild(
        el('span', { className: 'project-info-value', text: t, attrs: { title: t } }),
      );
      // fall through to optionally show commit message as well
    }
    const wd = this.context.working_directory ?? '';
    const dirName = wd.split('/').pop() || wd;
    container.appendChild(
      el('span', { className: 'project-info-value', text: dirName, attrs: { title: wd } }),
    );
    if (this.context.git_branch) {
      container.appendChild(el('span', { className: 'project-info-separator', text: '·' }));
      container.appendChild(
        el('span', { className: 'project-info-value git-branch', text: this.context.git_branch }),
      );
    }

    // Optional commit message from diff (when reviewing full commits)
    if (this.diff && (this.diff.commit_message || this.diff.commit_hash)) {
      container.appendChild(el('span', { className: 'project-info-separator', text: '·' }));
      const mm = el('span', { className: 'commit-message' });
      const rev = this.diff.commit_hash ? `${this.diff.commit_hash.substring(0, 7)}: ` : '';
      const firstLine = (this.diff.commit_message ?? '').split('\n')[0];
      appendLinkifiedText(mm, rev + firstLine);
      if (this.diff.commit_message) {
        mm.title = this.diff.commit_message;
      }
      mm.addEventListener('click', (ev) => {
        const target = ev.target as Element | null;
        if (target?.closest('a')) {
          ev.stopPropagation();
          return;
        }
        this.showCommitMessagePopover(
          ev.currentTarget as HTMLElement,
          this.diff?.commit_message ?? '',
          this.diff?.commit_hash ?? '',
        );
      });
      container.appendChild(mm);
    }
  }

  setupUI() {
    // File list clicks
    $('#file-list')?.addEventListener('click', (e) => {
      const li = (e.target as Element | null)?.closest('li');
      if (li) {
        const dirKey = li.getAttribute('data-dir-key');
        if (dirKey) {
          if (this.collapsedDirs.has(dirKey)) {
            this.collapsedDirs.delete(dirKey);
          } else {
            this.collapsedDirs.add(dirKey);
          }
          this.renderFileList();
          return;
        }
        if (li.dataset.commit === '1') {
          this.loadCommitView();
        } else {
          const index = Number(li.dataset.index ?? -1);
          if (index >= 0) {
            if (this.isStacked) {
              this.scrollToFileInStacked(index);
            } else {
              this.loadFile(index);
            }
          }
        }
      }
    });

    // Settings button
    $('#settings-btn')?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Help button
    $('#help-btn')?.addEventListener('click', () => this.showKeyboardHelp());

    // Submit button
    $('#submit-review')?.addEventListener('click', async () => {
      this.showSubmitConfirmation();
    });

    // Toggle view
    $('#toggle-view')?.addEventListener('click', () => {
      this.isInline = !this.isInline;
      this.loadFile(this.currentFileIndex);
    });

    $('#toggle-stacked')?.addEventListener('click', () => {
      this.toggleStackedView();
    });

    // Stats
    const statsEl = $('#stats');
    if (statsEl) {
      statsEl.textContent = `${this.stats.files_changed} files, +${this.stats.additions} -${this.stats.deletions}`;
    }

    // Show banner for public mode
    if (this.context.is_public) {
      const b = $<HTMLElement>('#public-banner');
      if (b) {
        b.style.display = '';
      }
    }

    // Show skill install banner if Claude Code skill is not installed
    if (this.context.claude_skill_installed === false) {
      const banner = $<HTMLElement>('#skill-banner');
      const installBtn = $<HTMLButtonElement>('#skill-install-btn');
      const dismissBtn = $<HTMLButtonElement>('#skill-dismiss-btn');
      if (banner) {
        banner.style.display = '';
        const hide = () => {
          banner.style.display = 'none';
        };
        dismissBtn?.addEventListener('click', hide);
        installBtn?.addEventListener('click', async () => {
          installBtn.disabled = true;
          installBtn.textContent = 'Installing…';
          try {
            const res = await fetch('/api/install-skill', { method: 'POST' });
            if (res.ok) {
              hide();
            } else {
              installBtn.textContent = 'Failed — try again';
              installBtn.disabled = false;
            }
          } catch {
            installBtn.textContent = 'Failed — try again';
            installBtn.disabled = false;
          }
        });
      }
    }

    // Sidebar resizer
    this.setupSidebarResizer();
    this.setupCommitStripResizer();
    this.setupFileListControls();

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }
}

applyMixin(MonacoApp, FileDataMethods);
applyMixin(MonacoApp, FileListMethods);
applyMixin(MonacoApp, FileLoadingMethods);
applyMixin(MonacoApp, NavigationMethods);
applyMixin(MonacoApp, CommitMethods);
applyMixin(MonacoApp, CommentsUIMethods);
applyMixin(MonacoApp, ReviewNoteMethods);
applyMixin(MonacoApp, DialogMethods);
applyMixin(MonacoApp, SeriesMethods);
applyMixin(MonacoApp, StackedViewMethods);
