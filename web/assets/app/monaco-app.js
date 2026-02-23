import { $, clearEl, el } from './dom.js';
import { CommentManager } from './comments.js';
import { fetchJSON } from './api.js';
import { CUSTOM_THEMES } from './themes.js';

import { FileEditorMethods } from './file-editor-methods.js';
import { NavigationMethods } from './navigation-methods.js';
import { CommitMethods } from './commit-methods.js';
import { CommentsUIMethods } from './comments-ui-methods.js';
import { DialogMethods } from './dialog-methods.js';

function applyMixin(TargetClass, MethodsClass) {
  for (const name of Object.getOwnPropertyNames(MethodsClass.prototype)) {
    if (name === 'constructor') {
      continue;
    }
    Object.defineProperty(
      TargetClass.prototype,
      name,
      Object.getOwnPropertyDescriptor(MethodsClass.prototype, name),
    );
  }
}

export class MonacoApp {
  constructor() {
    this.commentManager = new CommentManager();
    this.currentFileIndex = 0;
    this.editor = null;
    this.isInline = false;
    this.modifiedDecorations = [];
    this.originalDecorations = [];
    this.focusedHunkDecorations = [];
    this.currentWidget = null;
    this.diff = null;
    this.files = [];
    this.stats = null;
    this.fileCache = {};
    this.fileHunks = {}; // Track hunk start lines per file: { [path]: number[] }
    this.currentHunkIndex = {}; // Track current hunk index per file
    this.config = null; // User config from server
    this.originalModel = null;
    this.modifiedModel = null;
    this._eagerPrefetchStarted = false;
    this._commitPopoverEl = null;
    this.currentFileIsCommit = false;
    this._commitViewEl = null;

    this.commentManager.onChange(() => this.updateUI());
  }

  async init() {
    if (window.DEBUG) {
      console.log('[app] init: start');
    }
    window.Perf.recordAppInitStart();
    window.Perf.mark('init:start');
    if (performance.getEntriesByName('page:script-start').length > 0) {
      window.Perf.measure('page:script-to-init-start', 'page:script-start', 'init:start');
    }
    // Load config, context, diff data, and ensure @font-face fonts are ready
    window.Perf.mark('init:fetch:start');
    const t0 = performance.now();
    const [configData, contextData, diffData] = await Promise.all([
      fetchJSON('/api/config'),
      fetchJSON('/api/context'),
      fetchJSON('/api/diff'),
      document.fonts.ready,
    ]);
    window.Perf.mark('init:fetch:end');
    window.Perf.measure('init:fetch', 'init:fetch:start', 'init:fetch:end');
    if (window.DEBUG) {
      console.log('[app] init: responses received in', Math.round(performance.now() - t0), 'ms');
    }
    this.config = configData;
    this.context = contextData;
    if (this.context.title) {
      document.title = String(this.context.title);
    } else {
      const dirName = (this.context.working_directory || '').split('/').pop() || '';
      document.title = dirName || 'lrv';
    }
    if (window.DEBUG) {
      console.log('[app] init: parsed config/context/diff');
    }
    this.diff = diffData;
    this.files = diffData.files;
    this.stats = diffData.stats;

    // Apply split view setting from config
    this.isInline = !this.config.split_view;

    // Wait for AMD loader to be ready
    window.Perf.mark('init:amd-wait:start');
    await new Promise((resolve, reject) => {
      const start = performance.now();
      const timer = setInterval(() => {
        if (window.require) {
          clearInterval(timer);
          resolve(null);
        }
        if (performance.now() - start > 5000) {
          clearInterval(timer);
          reject(new Error('AMD loader not ready'));
        }
      }, 25);
    });
    window.Perf.mark('init:amd-wait:end');
    window.Perf.measure('init:amd-wait', 'init:amd-wait:start', 'init:amd-wait:end');
    window.require.config({
      paths: { vs: window.MONACO_VS_BASE || '/assets/vendor/monaco/min/vs' },
    });

    // Pre-apply theme variables to avoid flash while Monaco loads
    this.applyThemeToUI(this.config.color_scheme || 'vs-dark');
    document.documentElement.setAttribute('data-ui-ready', '1');

    return new Promise((resolve) => {
      window.Perf.mark('init:monaco:load:start');
      window.require(['vs/editor/editor.main'], () => {
        window.Perf.mark('init:monaco:load:end');
        window.Perf.measure('init:monaco:load', 'init:monaco:load:start', 'init:monaco:load:end');
        if (window.DEBUG) {
          console.log('[app] monaco loaded');
        }
        this.defineCustomThemes();
        this.applyThemeToUI(this.config.color_scheme || 'vs-dark');
        // Accent is set from UI_THEME_ACCENTS_HEX; keep logic simple and deterministic
        document.documentElement.setAttribute('data-ui-ready', '1');
        // Set accent directly from our theme map when available (fast, deterministic)
        const hexMap = window.UIThemeAccentsHex || {};
        const hex = hexMap[this.config.color_scheme || 'vs-dark'];
        if (hex) {
          const norm = el('div');
          norm.style.color = hex;
          document.body.appendChild(norm);
          try {
            const rgb = getComputedStyle(norm).color;
            if (rgb) {
              document.documentElement.style.setProperty('--accent-color', rgb);
            }
          } finally {
            norm.remove();
          }
          window.__ACCENT_READY = true;
        }
        window.Perf.mark('init:ui-setup:start');
        this.setupUI();
        window.Perf.mark('init:ui-setup:end');
        window.Perf.measure('init:ui-setup', 'init:ui-setup:start', 'init:ui-setup:end');
        window.Perf.mark('init:file-list:render:start');
        this.renderFileList();
        window.Perf.mark('init:file-list:render:end');
        window.Perf.measure(
          'init:file-list:render',
          'init:file-list:render:start',
          'init:file-list:render:end',
        );
        if (window.DEBUG) {
          console.log('[app] calling loadFile(0)');
        }
        window.Perf.mark('init:first-file:load:start');
        Promise.resolve(this.loadFile(0)).then(() => {
          window.Perf.mark('init:first-file:load:end');
          window.Perf.measure(
            'init:first-file:load',
            'init:first-file:load:start',
            'init:first-file:load:end',
          );
          // Set review timestamp
          document.getElementById('review-time').textContent = new Date().toLocaleString();
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
                const d = e && e.length ? e[e.length - 1].duration : null;
                if (d != null) {
                  console.log('[perf] appInit ms:', Math.round(d));
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

  applyThemeToUI(themeName) {
    // Derive UI colors from the Monaco theme definitions we register locally.
    const setVar = (k, v) => {
      if (v) {
        document.documentElement.style.setProperty(k, v);
      }
    };

    // Accent from theme rules: prefer the 'keyword' token color defined in our theme
    const defs = window.UI_THEME_DEFS || {};
    const def = defs[themeName];
    if (def && Array.isArray(def.rules)) {
      const kw = def.rules.find((r) => r && r.token === 'keyword' && r.foreground);
      if (kw && kw.foreground) {
        const hex = '#' + String(kw.foreground).replace(/^#/, '');
        const norm = el('div');
        norm.style.color = hex;
        document.body.appendChild(norm);
        try {
          setVar('--accent-color', getComputedStyle(norm).color);
          window.__ACCENT_READY = true;
        } finally {
          norm.remove();
        }
      }
    }

    // If an editor exists, derive surface/text colors from its computed styles
    const editorEl = document.querySelector('.monaco-editor');
    if (editorEl) {
      const cs = getComputedStyle(editorEl);
      setVar('--bg-primary', cs.backgroundColor);
      // Derive secondary/elevated as slight variants
      const overlay = document.querySelector('.monaco-editor .margin') || editorEl;
      const cs2 = getComputedStyle(overlay);
      setVar('--bg-secondary', cs2.backgroundColor || cs.backgroundColor);
      setVar('--bg-elevated', cs2.backgroundColor || cs.backgroundColor);
      // Text colors: use editor foreground if available else fallback to body
      const bodyCs = getComputedStyle(document.body);
      setVar('--text-primary', bodyCs.color);
      setVar('--text-secondary', ''); // allow CSS to fall back; optional refinement
    }
  }

  defineCustomThemes() {
    window.UI_THEME_DEFS = window.UI_THEME_DEFS || {};
    Object.entries(CUSTOM_THEMES).forEach(([name, theme]) => {
      monaco.editor.defineTheme(name, theme);
      window.UI_THEME_DEFS[name] = theme;
    });
  }

  renderProjectInfo() {
    const container = $('#project-info');
    if (!container) {
      return;
    }
    clearEl(container);
    if (this.context && this.context.title) {
      const t = String(this.context.title);
      container.appendChild(
        el('span', { className: 'project-info-value', text: t, attrs: { title: t } }),
      );
      // fall through to optionally show commit message as well
    }
    const wd = String(this.context.working_directory || '');
    const dirName = (wd || '').split('/').pop() || wd;
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
      const rev = this.diff.commit_hash ? String(this.diff.commit_hash).substring(0, 7) + ': ' : '';
      const firstLine = String(this.diff.commit_message || '').split('\n')[0];
      mm.textContent = rev + firstLine;
      if (this.diff.commit_message) {
        mm.title = String(this.diff.commit_message);
      }
      mm.addEventListener('click', (ev) => {
        this.showCommitMessagePopover(
          ev.currentTarget,
          String(this.diff.commit_message || ''),
          String(this.diff.commit_hash || ''),
        );
      });
      container.appendChild(mm);
    }
  }

  setupUI() {
    // File list clicks
    $('#file-list').addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (li) {
        if (li.dataset.commit === '1') {
          this.loadCommitView();
        } else {
          const index = parseInt(li.dataset.index);
          this.loadFile(index);
        }
      }
    });

    // Settings button
    $('#settings-btn').addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Help button
    $('#help-btn').addEventListener('click', () => this.showKeyboardHelp());

    // Submit button
    $('#submit-review').addEventListener('click', async () => {
      this.showSubmitConfirmation();
    });

    // Toggle view
    $('#toggle-view').addEventListener('click', () => {
      this.isInline = !this.isInline;
      this.loadFile(this.currentFileIndex);
    });

    // Stats
    $('#stats').textContent =
      `${this.stats.files_changed} files, +${this.stats.additions} -${this.stats.deletions}`;

    // Show banner for public mode
    if (this.context && this.context.is_public) {
      const b = $('#public-banner');
      if (b) {
        b.style.display = '';
      }
    }

    // Sidebar resizer
    this.setupSidebarResizer();

    // Keyboard shortcuts
    this.setupKeyboardShortcuts();
  }

}

applyMixin(MonacoApp, FileEditorMethods);
applyMixin(MonacoApp, NavigationMethods);
applyMixin(MonacoApp, CommitMethods);
applyMixin(MonacoApp, CommentsUIMethods);
applyMixin(MonacoApp, DialogMethods);
