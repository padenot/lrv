// Set provisional document title while loading
try {
  document.title = 'lrv — Loading…';
} catch {}
// Global onerror (only when DEBUG) to capture filename/line for syntax errors
try {
  if (window.DEBUG) {
    window.addEventListener('error', function (e) {
      try {
        console.log('[onerror]', e.message, e.filename, e.lineno, e.colno);
      } catch (_) {}
    });
  }
} catch (_) {}
// Toggle for optional debug logging (off by default in dist)
window.DEBUG = false;
// App readiness flag (set true when first diff is rendered)
window.__APP_READY = false;
// Simple performance instrumentation
// Small DOM helpers for readability
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const MONO_FALLBACK = "'Monaco', 'Menlo', 'Consolas', monospace";
const DEFAULT_MONO_STACK = `'JetBrains Mono', ${MONO_FALLBACK}`;

function isMonospace(fontName) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `72px '${fontName}'`;
  return Math.abs(ctx.measureText('m').width - ctx.measureText('i').width) < 1;
}

function monoFontStack(font) {
  const name = (font || '').toString().trim();
  if (!name) {
    return DEFAULT_MONO_STACK;
  }
  if (name.includes(',')) {
    return name;
  }
  if (!isMonospace(name)) {
    return DEFAULT_MONO_STACK;
  }
  return `'${name}', ${MONO_FALLBACK}`;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const IS_MAC = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const MOD_KEY_LABEL = IS_MAC ? '⌘' : 'Ctrl';

function computeHunkRanges(hunks) {
  let oldLineStart = Infinity,
    oldLineEnd = 0,
    newLineStart = Infinity,
    newLineEnd = 0;
  const hunkRanges = [];
  (hunks || []).forEach((hunk) => {
    const newLines = hunk.lines.filter((l) => l.new_line).map((l) => l.new_line);
    if (newLines.length > 0) {
      hunkRanges.push({
        side: 'new',
        start: Math.min(...newLines),
        end: Math.max(...newLines),
      });
    }
    const deletedOldLines = hunk.lines
      .filter((l) => l.old_line && l.type === 'delete')
      .map((l) => l.old_line);
    if (deletedOldLines.length > 0) {
      hunkRanges.push({
        side: 'old',
        start: Math.min(...deletedOldLines),
        end: Math.max(...deletedOldLines),
      });
    }
    hunk.lines.forEach((line) => {
      if (line.old_line) {
        oldLineStart = Math.min(oldLineStart, line.old_line);
        oldLineEnd = Math.max(oldLineEnd, line.old_line);
      }
      if (line.new_line) {
        newLineStart = Math.min(newLineStart, line.new_line);
        newLineEnd = Math.max(newLineEnd, line.new_line);
      }
    });
  });
  return {
    hunkRanges,
    oldLineStart,
    oldLineEnd,
    newLineStart,
    newLineEnd,
  };
}

function openModal({ title, titleId, modalClass = '', footerHtml = '', onKeydown = null }) {
  const overlay = document.createElement('div');
  overlay.className = 'submit-modal-overlay';

  const modal = document.createElement('div');
  modal.className = `submit-modal${modalClass ? ' ' + modalClass : ''}`;

  const header = document.createElement('div');
  header.className = 'submit-modal-header';
  header.innerHTML = `
    <h2${titleId ? ` id="${titleId}"` : ''}>${title}</h2>
    <button class="submit-modal-close" aria-label="Close">&times;</button>
  `;

  const body = document.createElement('div');
  body.className = 'submit-modal-body';

  const footer = document.createElement('div');
  footer.className = 'submit-modal-footer';
  if (footerHtml) {
    footer.innerHTML = footerHtml;
  }

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const previouslyFocused = document.activeElement;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  if (titleId) {
    modal.setAttribute('aria-labelledby', titleId);
  }

  const focusable = () =>
    Array.from(
      modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled'));

  const onTrap = (e) => {
    if (e.key === 'Tab') {
      const nodes = focusable();
      if (nodes.length === 0) {
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', onTrap);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onTrap);
    if (onKeydown) {
      document.removeEventListener('keydown', onKeydown);
    }
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  };

  header.querySelector('.submit-modal-close').onclick = close;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
    }
  });

  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  document.addEventListener('keydown', handleEscape);

  if (onKeydown) {
    document.addEventListener('keydown', onKeydown);
  }

  setTimeout(() => {
    const f = focusable()[0];
    if (f) {
      f.focus();
    }
  }, 0);

  return { overlay, modal, body, footer, close };
}

window.Perf = {
  mark: (name) => {
    performance.mark(name);
  },
  measure: (name, start, end) => {
    performance.measure(name, { start, end });
  },
  recordFileSwitchStart: () => {
    performance.mark('fileSwitchStart');
  },
  recordFileSwitchEnd: () => {
    performance.mark('fileSwitchEnd');
    performance.measure('fileSwitch', { start: 'fileSwitchStart', end: 'fileSwitchEnd' });
  },
  recordAppInitStart: () => {
    performance.mark('appInitStart');
  },
  recordAppInitEnd: () => {
    performance.mark('appInitEnd');
    performance.measure('appInit', { start: 'appInitStart', end: 'appInitEnd' });
  },
  getMetrics: () => {
    const toDurations = (name) => (performance.getEntriesByName(name) || []).map((e) => e.duration);
    return { fileSwitch: toDurations('fileSwitch'), appInit: toDurations('appInit') };
  },
  clear: () => {
    performance.clearMarks();
    performance.clearMeasures();
  },
};

// Helper: fetch JSON with status check
// For /api/file requests, show a delayed throbber if they take noticeable time
let __fileFetchPending = 0;
let __fileFetchDelayTimer = null;
let __fetchSpinnerEl = null;
function ensureFetchSpinner() {
  try {
    if (!__fetchSpinnerEl) {
      const host = document.querySelector('.header .header-actions');
      if (!host) {
        return;
      }
      const s = document.createElement('span');
      s.id = 'fetch-spinner';
      s.className = 'fetch-spinner';
      host.insertBefore(s, host.firstChild);
      __fetchSpinnerEl = s;
    }
  } catch {}
}
function showFetchSpinnerDelayed() {
  try {
    ensureFetchSpinner();
    if (!__fetchSpinnerEl) {
      return;
    }
    if (__fileFetchDelayTimer) {
      return;
    } // already scheduled
    __fileFetchDelayTimer = setTimeout(() => {
      if (__fileFetchPending > 0) {
        __fetchSpinnerEl.classList.add('visible');
        try {
          if (window.__APP && typeof window.__APP.eagerPrefetchAllFiles === 'function') {
            window.__APP.eagerPrefetchAllFiles();
          }
        } catch {}
      }
      __fileFetchDelayTimer = null;
    }, 400);
  } catch {}
}
function hideFetchSpinnerMaybe() {
  try {
    if (__fileFetchPending === 0) {
      if (__fileFetchDelayTimer) {
        clearTimeout(__fileFetchDelayTimer);
        __fileFetchDelayTimer = null;
      }
      if (__fetchSpinnerEl) {
        __fetchSpinnerEl.classList.remove('visible');
      }
    }
  } catch {}
}
async function fetchJSON(url, options) {
  const isFile = typeof url === 'string' && url.startsWith('/api/file');
  if (isFile) {
    __fileFetchPending++;
    if (__fileFetchPending === 1) {
      showFetchSpinnerDelayed();
    }
  }
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Request failed ${res.status} ${res.statusText} at ${url}${text ? `: ${text.slice(0, 200)}` : ''}`,
      );
    }
    return res.json();
  } finally {
    if (isFile) {
      __fileFetchPending = Math.max(0, __fileFetchPending - 1);
      hideFetchSpinnerMaybe();
    }
  }
}

// Simple theme → accent mapping (use theme’s intended accent color)
const UI_THEME_ACCENTS_HEX = {
  'firefox-devtools-dark': '#ff7de9',
  'firefox-devtools-light': '#d92bb4',
  'github-dark': '#58a6ff',
  'github-light': '#0969da',
  'solarized-dark': '#268bd2',
  'solarized-light': '#268bd2',
  'vs-dark': '#007acc',
  'hc-black': '#007acc',
  vs: '#007acc',
  'hc-light': '#007acc',
};
try {
  window.UIThemeAccentsHex = UI_THEME_ACCENTS_HEX;
} catch {}

// Small ephemeral navigation indicator in header
let __navTimer = null;
function showNavIndicator(text) {
  try {
    const el = document.getElementById('nav-indicator');
    if (!el) {
      return;
    }
    el.textContent = text;
    el.style.display = 'inline-block';
    if (__navTimer) {
      clearTimeout(__navTimer);
    }
    __navTimer = setTimeout(() => {
      el.style.display = 'none';
    }, 900);
  } catch {}
}

function markAppReady() {
  if (window.__APP_READY) {
    return;
  }
  const hasLines = document.querySelectorAll('.monaco-editor .view-lines .view-line').length > 0;
  if (hasLines) {
    window.__APP_READY = true;
    if (window.DEBUG) {
      console.log('[app] APP_READY: diff lines visible');
    }
    return;
  }
  const container = document.querySelector('.monaco-editor .view-lines');
  if (container && !window.__APP_READY) {
    if (window.DEBUG) {
      console.log('[app] Waiting for first view-line via MutationObserver');
    }
    const obs = new MutationObserver(() => {
      if (document.querySelectorAll('.monaco-editor .view-lines .view-line').length > 0) {
        window.__APP_READY = true;
        if (window.DEBUG) {
          console.log('[app] APP_READY: observer saw first line');
        }
        obs.disconnect();
      }
    });
    obs.observe(container, { childList: true, subtree: true });
  }
}

// Comment Manager
class CommentManager {
  constructor() {
    this.comments = [];
    this.listeners = [];
  }

  addComment(comment) {
    this.comments.push(comment);
    this.notifyListeners();
  }

  removeComment(index) {
    this.comments.splice(index, 1);
    this.notifyListeners();
  }

  findComment(file, line, side) {
    return this.comments.findIndex(
      (c) => c.file === file && c.start_line === line && c.side === side,
    );
  }

  updateComment(index, newBody) {
    if (index >= 0 && index < this.comments.length) {
      this.comments[index].body = newBody;
      this.notifyListeners();
    }
  }

  getComments() {
    return [...this.comments];
  }

  getCommentsForFile(file) {
    return this.comments.filter((c) => c.file === file);
  }

  onChange(listener) {
    this.listeners.push(listener);
  }

  notifyListeners() {
    this.listeners.forEach((l) => l());
  }
}

// Keyboard shortcuts configuration
const KEYBOARD_SHORTCUTS = [
  // File navigation
  { keys: ['Mod+ArrowDown', 'Mod+J'], action: 'nextFile', description: 'Next file' },
  { keys: ['Mod+ArrowUp', 'Mod+K'], action: 'previousFile', description: 'Previous file' },
  // Hunk navigation
  { keys: ['Shift+ArrowDown', 'Shift+J'], action: 'nextHunk', description: 'Next hunk' },
  { keys: ['Shift+ArrowUp', 'Shift+K'], action: 'previousHunk', description: 'Previous hunk' },
  // Line navigation (within change hunks)
  { keys: ['ArrowDown', 'j'], action: 'lineDown', description: 'Next changed line' },
  { keys: ['ArrowUp', 'k'], action: 'lineUp', description: 'Previous changed line' },
  // View toggle, comments and actions
  { keys: ['s'], action: 'toggleView', description: 'Toggle inline/side-by-side' },
  { keys: ['Enter'], action: 'openComment', description: 'Comment on focused line' },
  { keys: ['Escape'], action: 'clearFocus', description: 'Clear focus' },
  { keys: ['Mod+Shift+Enter'], action: 'submitReview', description: 'Submit review' },
  { keys: ['?'], action: 'showHelp', description: 'Show keyboard shortcuts' },
];

// Monaco App
class MonacoApp {
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
    this.fileRanges = {}; // Track visible ranges per file
    this.fileHunks = {}; // Track hunk start lines per file: { [path]: number[] }
    this.currentHunkIndex = {}; // Track current hunk index per file
    this.config = null; // User config from server
    this.originalModel = null;
    this.modifiedModel = null;
    this.scrollListenerDispose = null;
    this._eagerPrefetchStarted = false;
    this._commitPopoverEl = null;
    this.currentFileIsCommit = false;
    this._commitViewEl = null;

    this.commentManager.onChange(() => this.updateUI());
  }

  getFileOffsets(filePath) {
    const range = this.fileRanges[filePath];
    return {
      newOffset: range && !range.hasFullContent ? range.new.start - 1 : 0,
      oldOffset: range && !range.hasFullContent ? range.old.start - 1 : 0,
    };
  }

  async fetchFilePair(filePath) {
    if (this.fileCache[filePath]) {
      return this.fileCache[filePath];
    }
    const [oldData, newData] = await Promise.all([
      fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=old`),
      fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=new`),
    ]);
    this.fileCache[filePath] = {
      old: oldData.content || '',
      new: newData.content || '',
    };
    return this.fileCache[filePath];
  }

  // When we detect slow file fetches, eagerly prefetch the rest to warm caches
  async eagerPrefetchAllFiles() {
    if (this._eagerPrefetchStarted) {
      return;
    }
    this._eagerPrefetchStarted = true;
    try {
      const paths = (this.files || []).map((f) => f.path).filter(Boolean);
      const toFetch = paths.filter((p) => !this.fileCache[p]);
      if (toFetch.length === 0) {
        return;
      }
      if (window.DEBUG) {
        console.log('[prefetch] warming', toFetch.length, 'files');
      }
      const concurrency = 8;
      let i = 0;
      const nextBatch = () => {
        const batch = [];
        for (let k = 0; k < concurrency && i < toFetch.length; k++, i++) {
          const p = toFetch[i];
          batch.push(
            Promise.all([
              fetchJSON(`/api/file?path=${encodeURIComponent(p)}&side=old`),
              fetchJSON(`/api/file?path=${encodeURIComponent(p)}&side=new`),
            ])
              .then(([oldData, newData]) => {
                this.fileCache[p] = { old: oldData.content || '', new: newData.content || '' };
              })
              .catch(() => {}),
          );
        }
        return Promise.all(batch);
      };
      while (i < toFetch.length) {
        await nextBatch();
      }
      if (window.DEBUG) {
        console.log('[prefetch] done');
      }
    } catch {}
  }

  async init() {
    if (window.DEBUG) {
      console.log('[app] init: start');
    }
    window.Perf.recordAppInitStart();
    // Load config, context, diff data, and ensure @font-face fonts are ready
    const t0 = performance.now();
    const [configData, contextData, diffData] = await Promise.all([
      fetchJSON('/api/config'),
      fetchJSON('/api/context'),
      fetchJSON('/api/diff'),
      document.fonts.ready,
    ]);
    if (window.DEBUG) {
      console.log('[app] init: responses received in', Math.round(performance.now() - t0), 'ms');
    }
    this.config = configData;
    this.context = contextData;
    try {
      if (this.context.title) {
        document.title = String(this.context.title);
      } else {
        const dirName = (this.context.working_directory || '').split('/').pop() || '';
        document.title = dirName || 'lrv';
      }
    } catch {}
    if (window.DEBUG) {
      console.log('[app] init: parsed config/context/diff');
    }
    this.diff = diffData;
    this.files = diffData.files;
    this.stats = diffData.stats;

    // Apply split view setting from config
    this.isInline = !this.config.split_view;

    // Wait for AMD loader to be ready
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
    window.require.config({
      paths: { vs: window.MONACO_VS_BASE || '/assets/vendor/monaco/min/vs' },
    });

    // Pre-apply theme variables to avoid flash while Monaco loads
    try {
      this.applyThemeToUI(this.config.color_scheme || 'vs-dark');
      document.documentElement.setAttribute('data-ui-ready', '1');
    } catch {}

    return new Promise((resolve) => {
      window.require(['vs/editor/editor.main'], () => {
        if (window.DEBUG) {
          console.log('[app] monaco loaded');
        }
        this.defineCustomThemes();
        this.applyThemeToUI(this.config.color_scheme || 'vs-dark');
        // Accent is set from UI_THEME_ACCENTS_HEX; keep logic simple and deterministic
        try {
          document.documentElement.setAttribute('data-ui-ready', '1');
        } catch {}
        // Set accent directly from our theme map when available (fast, deterministic)
        try {
          const hexMap = window.UIThemeAccentsHex || {};
          const hex = hexMap[this.config.color_scheme || 'vs-dark'];
          if (hex) {
            const norm = document.createElement('div');
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
            try {
              window.__ACCENT_READY = true;
            } catch {}
          }
        } catch {}
        this.setupUI();
        this.renderFileList();
        if (window.DEBUG) {
          console.log('[app] calling loadFile(0)');
        }
        Promise.resolve(this.loadFile(0)).then(() => {
          // Set review timestamp
          document.getElementById('review-time').textContent = new Date().toLocaleString();
          // Set project info
          this.renderProjectInfo();
          // Wait for paint and record init end
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.Perf.recordAppInitEnd();
              // Minimal perf log (gated behind DEBUG)
              try {
                if (window.DEBUG) {
                  const e = performance.getEntriesByName('appInit');
                  const d = e && e.length ? e[e.length - 1].duration : null;
                  if (d != null) {
                    console.log('[perf] appInit ms:', Math.round(d));
                  }
                }
              } catch {}
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
    try {
      const defs = window.UI_THEME_DEFS || {};
      const def = defs[themeName];
      if (def && Array.isArray(def.rules)) {
        const kw = def.rules.find((r) => r && r.token === 'keyword' && r.foreground);
        if (kw && kw.foreground) {
          const hex = '#' + String(kw.foreground).replace(/^#/, '');
          const norm = document.createElement('div');
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
    } catch {}

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
    // Initialize theme defs registry
    window.UI_THEME_DEFS = window.UI_THEME_DEFS || {};

    // Solarized Dark
    const solarizedDark = {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '586e75', fontStyle: 'italic' },
        { token: 'keyword', foreground: '859900' },
        { token: 'number', foreground: 'd33682' },
        { token: 'string', foreground: '2aa198' },
        { token: 'type', foreground: 'b58900' },
        { token: 'class', foreground: 'b58900' },
        { token: 'function', foreground: '268bd2' },
        { token: 'variable', foreground: '268bd2' },
        { token: 'constant', foreground: 'd33682' },
      ],
      colors: {
        'editor.background': '#002b36',
        'editor.foreground': '#839496',
        'editor.lineHighlightBackground': '#073642',
        'editorCursor.foreground': '#839496',
        'editor.selectionBackground': '#073642',
        'editor.inactiveSelectionBackground': '#073642',
      },
    };
    monaco.editor.defineTheme('solarized-dark', solarizedDark);
    window.UI_THEME_DEFS['solarized-dark'] = solarizedDark;

    // Solarized Light
    const solarizedLight = {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '93a1a1', fontStyle: 'italic' },
        { token: 'keyword', foreground: '859900' },
        { token: 'number', foreground: 'd33682' },
        { token: 'string', foreground: '2aa198' },
        { token: 'type', foreground: 'b58900' },
        { token: 'class', foreground: 'b58900' },
        { token: 'function', foreground: '268bd2' },
        { token: 'variable', foreground: '268bd2' },
        { token: 'constant', foreground: 'd33682' },
      ],
      colors: {
        'editor.background': '#fdf6e3',
        'editor.foreground': '#657b83',
        'editor.lineHighlightBackground': '#eee8d5',
        'editorCursor.foreground': '#657b83',
        'editor.selectionBackground': '#eee8d5',
        'editor.inactiveSelectionBackground': '#eee8d5',
      },
    };
    monaco.editor.defineTheme('solarized-light', solarizedLight);
    window.UI_THEME_DEFS['solarized-light'] = solarizedLight;

    // Firefox DevTools Dark
    const fxDark = {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '5c6773', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7de9' },
        { token: 'number', foreground: '75bfff' },
        { token: 'string', foreground: '86de74' },
        { token: 'type', foreground: '75bfff' },
        { token: 'class', foreground: 'ff9400' },
        { token: 'function', foreground: 'ff9400' },
        { token: 'variable', foreground: 'b1b1b3' },
        { token: 'constant', foreground: '75bfff' },
      ],
      colors: {
        'editor.background': '#0c0c0d',
        'editor.foreground': '#b1b1b3',
        'editor.lineHighlightBackground': '#1c1b22',
        'editorCursor.foreground': '#b1b1b3',
        'editor.selectionBackground': '#2b2a33',
        'editor.inactiveSelectionBackground': '#1c1b22',
      },
    };
    monaco.editor.defineTheme('firefox-devtools-dark', fxDark);
    window.UI_THEME_DEFS['firefox-devtools-dark'] = fxDark;

    // Firefox DevTools Light
    const fxLight = {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '737373', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'd92bb4' },
        { token: 'number', foreground: '0074e8' },
        { token: 'string', foreground: '058b00' },
        { token: 'type', foreground: '0074e8' },
        { token: 'class', foreground: 'c43500' },
        { token: 'function', foreground: 'c43500' },
        { token: 'variable', foreground: '222222' },
        { token: 'constant', foreground: '0074e8' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#222222',
        'editor.lineHighlightBackground': '#f5f5f5',
        'editorCursor.foreground': '#222222',
        'editor.selectionBackground': '#e6e6e6',
        'editor.inactiveSelectionBackground': '#f0f0f0',
      },
    };
    monaco.editor.defineTheme('firefox-devtools-light', fxLight);
    window.UI_THEME_DEFS['firefox-devtools-light'] = fxLight;

    // GitHub Dark
    const ghDark = {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'ff7b72' },
        { token: 'number', foreground: '79c0ff' },
        { token: 'string', foreground: 'a5d6ff' },
        { token: 'type', foreground: 'ffa657' },
        { token: 'class', foreground: 'ffa657' },
        { token: 'function', foreground: 'd2a8ff' },
        { token: 'variable', foreground: 'ffa657' },
        { token: 'constant', foreground: '79c0ff' },
      ],
      colors: {
        'editor.background': '#0d1117',
        'editor.foreground': '#c9d1d9',
        'editor.lineHighlightBackground': '#161b22',
        'editorCursor.foreground': '#c9d1d9',
        'editor.selectionBackground': '#1f6feb',
        'editor.inactiveSelectionBackground': '#1f6feb40',
      },
    };
    monaco.editor.defineTheme('github-dark', ghDark);
    window.UI_THEME_DEFS['github-dark'] = ghDark;

    // GitHub Light
    const ghLight = {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'cf222e' },
        { token: 'number', foreground: '0550ae' },
        { token: 'string', foreground: '0a3069' },
        { token: 'type', foreground: '8250df' },
        { token: 'class', foreground: '8250df' },
        { token: 'function', foreground: '8250df' },
        { token: 'variable', foreground: '953800' },
        { token: 'constant', foreground: '0550ae' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#24292f',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editorCursor.foreground': '#24292f',
        'editor.selectionBackground': '#0969da30',
        'editor.inactiveSelectionBackground': '#0969da20',
      },
    };
    monaco.editor.defineTheme('github-light', ghLight);
    window.UI_THEME_DEFS['github-light'] = ghLight;
  }

  renderProjectInfo() {
    const el = $('#project-info');
    if (!el) {
      return;
    }
    el.textContent = '';
    if (this.context && this.context.title) {
      const t = String(this.context.title);
      const span = document.createElement('span');
      span.className = 'project-info-value';
      span.setAttribute('title', t);
      span.textContent = t;
      el.appendChild(span);
      // fall through to optionally show commit message as well
    }
    const wd = String(this.context.working_directory || '');
    const dirName = (wd || '').split('/').pop() || wd;
    const dirSpan = document.createElement('span');
    dirSpan.className = 'project-info-value';
    dirSpan.setAttribute('title', wd);
    dirSpan.textContent = dirName;
    el.appendChild(dirSpan);
    if (this.context.git_branch) {
      const sep = document.createElement('span');
      sep.className = 'project-info-separator';
      sep.textContent = '·';
      el.appendChild(sep);
      const br = document.createElement('span');
      br.className = 'project-info-value git-branch';
      br.textContent = String(this.context.git_branch);
      el.appendChild(br);
    }

    // Optional commit message from diff (when reviewing full commits)
    if (this.diff && (this.diff.commit_message || this.diff.commit_hash)) {
      const sep = document.createElement('span');
      sep.className = 'project-info-separator';
      sep.textContent = '·';
      el.appendChild(sep);
      const mm = document.createElement('span');
      mm.className = 'commit-message';
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
      el.appendChild(mm);
    }
  }

  showCommitMessagePopover(anchorEl, message, rev) {
    try {
      // Toggle if already visible
      if (this._commitPopoverEl) {
        this._commitPopoverEl.remove();
        this._commitPopoverEl = null;
        return;
      }
      const pop = document.createElement('div');
      pop.className = 'commit-popover';
      const title = document.createElement('div');
      title.className = 'commit-popover-title';
      const first = (message || '').split('\n')[0] || '(no message)';
      title.textContent = (rev ? rev + ': ' : '') + first;
      const body = document.createElement('div');
      body.className = 'commit-popover-body';
      body.textContent = message || '';
      pop.appendChild(title);
      pop.appendChild(body);

      // Inline comment box
      const form = document.createElement('div');
      form.style.marginTop = '10px';
      const ta = document.createElement('textarea');
      ta.rows = 3;
      ta.style.width = '100%';
      ta.placeholder = 'Comment on this commit…';
      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '8px';
      controls.style.marginTop = '6px';
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add Comment';
      addBtn.className = 'expand-btn';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.className = 'expand-btn';
      controls.appendChild(addBtn);
      controls.appendChild(cancelBtn);
      form.appendChild(ta);
      form.appendChild(controls);
      pop.appendChild(form);
      document.body.appendChild(pop);
      // Position near the anchor
      const r = anchorEl.getBoundingClientRect();
      const pad = 6;
      let top = r.bottom + pad;
      let left = r.left;
      // Clamp to viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // If too far right, adjust left
      const rect = pop.getBoundingClientRect();
      if (left + rect.width + pad > vw) {
        left = Math.max(pad, vw - rect.width - pad);
      }
      if (top + rect.height + pad > vh) {
        top = Math.max(pad, r.top - rect.height - pad);
      }
      pop.style.left = `${Math.max(pad, left)}px`;
      pop.style.top = `${Math.max(pad, top)}px`;

      const onDocClick = (e) => {
        if (!pop.contains(e.target) && e.target !== anchorEl) {
          cleanup();
        }
      };
      const onEsc = (e) => {
        if (e.key === 'Escape') {
          cleanup();
        }
      };
      const cleanup = () => {
        if (this._commitPopoverEl) {
          this._commitPopoverEl.remove();
          this._commitPopoverEl = null;
        }
        document.removeEventListener('click', onDocClick, true);
        document.removeEventListener('keydown', onEsc, true);
      };
      this._commitPopoverEl = pop;
      setTimeout(() => {
        document.addEventListener('click', onDocClick, true);
        document.addEventListener('keydown', onEsc, true);
      }, 0);

      // Wire buttons
      cancelBtn.onclick = (e) => {
        e.preventDefault();
        cleanup();
      };
      addBtn.onclick = (e) => {
        e.preventDefault();
        const body = (ta.value || '').trim();
        if (!body) {
          ta.focus();
          return;
        }
        const comment = {
          file: '(commit)',
          start_line: 1,
          end_line: 1,
          side: 'new',
          body,
          severity: 'comment',
        };
        this.commentManager.addComment(comment);
        // Optionally feedback
        try {
          showNavIndicator('Commit comment added');
        } catch {}
        cleanup();
      };
    } catch {}
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

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Never handle shortcuts while authoring text (inputs, textareas, contenteditable)
      const activeElement = document.activeElement || document.body;
      if (
        activeElement &&
        (activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'INPUT' ||
          activeElement.isContentEditable)
      ) {
        return;
      }

      // If a comment widget is open, disable all global shortcuts
      if (this.currentWidget !== null) {
        return;
      }

      // Match key event to shortcut
      const action = this.matchKeyboardShortcut(e);
      if (!action) {
        return;
      }

      e.preventDefault();

      // Execute action
      switch (action) {
        case 'nextFile':
          this.nextFile();
          break;
        case 'previousFile':
          this.previousFile();
          break;
        case 'toggleView':
          this.toggleView();
          break;
        case 'lineDown':
          this.moveLine(1);
          break;
        case 'lineUp':
          this.moveLine(-1);
          break;
        case 'nextHunk':
          this.nextHunk();
          break;
        case 'previousHunk':
          this.previousHunk();
          break;
        case 'openComment':
          this.openCommentOnCurrentFocus();
          break;
        case 'submitReview':
          this.showSubmitConfirmation();
          break;
        case 'showHelp':
          this.showKeyboardHelp();
          break;
        case 'clearFocus':
          this.clearFocusedHunk();
          break;
      }
    });
  }

  toggleView() {
    this.isInline = !this.isInline;
    this.loadFile(this.currentFileIndex);
    try {
      showNavIndicator(this.isInline ? 'Inline' : 'Side-by-Side');
    } catch {}
  }

  matchKeyboardShortcut(e) {
    const modKey = IS_MAC ? e.metaKey : e.ctrlKey;

    for (const shortcut of KEYBOARD_SHORTCUTS) {
      for (const keyCombo of shortcut.keys) {
        if (this.matchesKeyCombo(e, keyCombo, modKey)) {
          return shortcut.action;
        }
      }
    }
    return null;
  }

  matchesKeyCombo(e, combo, modKey) {
    const parts = combo.split('+');
    let needsMod = false;
    let needsShift = false;
    let key = '';

    for (const part of parts) {
      if (part === 'Mod') {
        needsMod = true;
      } else if (part === 'Shift') {
        needsShift = true;
      } else {
        key = part;
      }
    }

    // Check Mod key
    if (needsMod !== modKey) {
      return false;
    }

    // Special handling for characters that naturally require Shift (like ?)
    // These should match regardless of Shift state
    const specialChars = ['?', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];
    const isSpecialChar = specialChars.includes(key);

    // Check Shift key (but ignore for special chars)
    if (!isSpecialChar && needsShift !== e.shiftKey) {
      return false;
    }

    // Layout-agnostic detection using KeyboardEvent.code for letters and '/?'
    const isLetter = key.length === 1 && /[a-z]/i.test(key);
    if (key === '?') {
      // On US layouts, '?' is Shift + Slash
      return e.shiftKey && e.code === 'Slash';
    }
    if (isLetter) {
      const code = 'Key' + key.toUpperCase();
      return e.code === code;
    }
    // Fall back to string key comparison for non-letters and named keys (e.g., ArrowUp)
    return e.key === key;
  }

  nextFile() {
    if (this.currentFileIndex < this.files.length - 1) {
      this.loadFile(this.currentFileIndex + 1);
      showNavIndicator(`File ${this.currentFileIndex + 2}/${this.files.length}`);
    }
  }

  previousFile() {
    if (this.currentFileIndex > 0) {
      this.loadFile(this.currentFileIndex - 1);
      showNavIndicator(`File ${this.currentFileIndex}/${this.files.length}`);
    }
  }

  nextHunk() {
    const file = this.files[this.currentFileIndex];
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      return;
    }

    const currentIdx = this.currentHunkIndex[file.path] || 0;
    const nextIdx = Math.min(currentIdx + 1, hunks.length - 1);
    this.currentHunkIndex[file.path] = nextIdx;
    this.jumpToHunk(nextIdx);
  }

  previousHunk() {
    const file = this.files[this.currentFileIndex];
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      return;
    }

    const currentIdx = this.currentHunkIndex[file.path] || 0;
    const prevIdx = Math.max(currentIdx - 1, 0);
    this.currentHunkIndex[file.path] = prevIdx;
    this.jumpToHunk(prevIdx);
  }

  jumpToHunk(hunkIndex) {
    if (!this.editor) {
      return;
    }

    const file = this.files[this.currentFileIndex];
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunkIndex >= hunks.length) {
      return;
    }

    const hunkRange = hunks[hunkIndex];
    const { newOffset, oldOffset } = this.getFileOffsets(file.path);

    const reduceMotion = prefersReducedMotion();
    const smooth = monaco.editor.ScrollType.Smooth;

    if (hunkRange.side === 'old') {
      const originalEditor = this.editor.getOriginalEditor();
      const monacoStartLine = hunkRange.start - oldOffset;
      const monacoEndLine = hunkRange.end - oldOffset;
      originalEditor.revealLineInCenter(
        monacoStartLine,
        reduceMotion ? monaco.editor.ScrollType.Immediate : smooth,
      );
      this.highlightFocusedHunk(monacoStartLine, monacoEndLine, 'old');
      this.setFocusedLine('old', monacoStartLine, false);
      // Indicator
      const idx = (this.currentHunkIndex[file.path] || 0) + 1;
      const total = (this.fileHunks[file.path] || []).length;
      showNavIndicator(`Hunk ${idx}/${total} • old`);
    } else {
      const modifiedEditor = this.editor.getModifiedEditor();
      const monacoStartLine = hunkRange.start - newOffset;
      const monacoEndLine = hunkRange.end - newOffset;
      modifiedEditor.revealLineInCenter(
        monacoStartLine,
        reduceMotion ? monaco.editor.ScrollType.Immediate : smooth,
      );
      this.highlightFocusedHunk(monacoStartLine, monacoEndLine, 'new');
      this.setFocusedLine('new', monacoStartLine, false);
      const idx = (this.currentHunkIndex[file.path] || 0) + 1;
      const total = (this.fileHunks[file.path] || []).length;
      showNavIndicator(`Hunk ${idx}/${total} • new`);
    }
  }

  highlightFocusedHunk(startLine, endLine, side = 'new') {
    if (!this.editor) {
      return;
    }

    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    const decorations = [];
    for (let line = startLine; line <= endLine; line++) {
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: { isWholeLine: true, className: 'focused-hunk-line' },
      });
    }

    // Clear both sides, then apply to the chosen side
    this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations(
      this.focusedHunkDecorationsNew || [],
      [],
    );
    this.focusedHunkDecorationsOld = originalEditor.deltaDecorations(
      this.focusedHunkDecorationsOld || [],
      [],
    );
    if (side === 'old') {
      this.focusedHunkDecorationsOld = originalEditor.deltaDecorations([], decorations);
    } else {
      this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations([], decorations);
    }
  }

  setFocusedLine(side, monacoLine, reveal = true) {
    if (!this.editor) {
      return;
    }
    this.currentFocusedLine = { side, line: monacoLine };
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();
    const reduceMotion = prefersReducedMotion();
    const scrollType = reduceMotion
      ? monaco.editor.ScrollType.Immediate
      : monaco.editor.ScrollType.Smooth;

    // Clear existing
    this.focusedLineDecorationsNew = modifiedEditor.deltaDecorations(
      this.focusedLineDecorationsNew || [],
      [],
    );
    this.focusedLineDecorationsOld = originalEditor.deltaDecorations(
      this.focusedLineDecorationsOld || [],
      [],
    );

    const dec = [
      {
        range: new monaco.Range(monacoLine, 1, monacoLine, 1),
        options: { isWholeLine: true, className: 'focused-line' },
      },
    ];
    if (side === 'old') {
      this.focusedLineDecorationsOld = originalEditor.deltaDecorations([], dec);
      if (reveal) {
        originalEditor.revealLineInCenterIfOutsideViewport(monacoLine, scrollType);
      }
    } else {
      this.focusedLineDecorationsNew = modifiedEditor.deltaDecorations([], dec);
      if (reveal) {
        modifiedEditor.revealLineInCenterIfOutsideViewport(monacoLine, scrollType);
      }
    }
    // Header indicator
    const { newOffset, oldOffset } = this.getFileOffsets(this.files[this.currentFileIndex].path);
    const fileLine = side === 'old' ? monacoLine + oldOffset : monacoLine + newOffset;
    showNavIndicator(`Line ${fileLine} • ${side === 'old' ? 'old' : 'new'}`);
  }

  moveLine(delta) {
    if (!this.editor) {
      return;
    }
    const file = this.files[this.currentFileIndex];
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      return;
    }
    const { newOffset, oldOffset } = this.getFileOffsets(file.path);

    // Initialize focus if needed: start of current hunk
    let idx = this.currentHunkIndex[file.path] || 0;
    const hr = hunks[idx];
    if (!this.currentFocusedLine) {
      const side = hr.side === 'old' ? 'old' : 'new';
      const monacoStart = side === 'old' ? hr.start - oldOffset : hr.start - newOffset;
      this.setFocusedLine(side, monacoStart, true);
      return;
    }

    let { side, line } = this.currentFocusedLine;
    // Verify current focus lies within current hunk; adjust if not
    const hunkStart = hr.side === 'old' ? hr.start - oldOffset : hr.start - newOffset;
    const hunkEnd = hr.side === 'old' ? hr.end - oldOffset : hr.end - newOffset;
    if (side !== (hr.side || 'new') || line < hunkStart || line > hunkEnd) {
      side = hr.side === 'old' ? 'old' : 'new';
      line = hunkStart;
    }

    // Step within hunk
    let nextLine = line + delta;
    if (nextLine >= hunkStart && nextLine <= hunkEnd) {
      this.setFocusedLine(side, nextLine, true);
      return;
    }

    // Move to neighbor hunk
    if (delta > 0 && idx < hunks.length - 1) {
      idx += 1;
      this.currentHunkIndex[file.path] = idx;
      const nhr = hunks[idx];
      const ns = nhr.side === 'old' ? 'old' : 'new';
      const nStart = ns === 'old' ? nhr.start - oldOffset : nhr.start - newOffset;
      this.jumpToHunk(idx);
      this.setFocusedLine(ns, nStart, true);
    } else if (delta < 0 && idx > 0) {
      idx -= 1;
      this.currentHunkIndex[file.path] = idx;
      const phr = hunks[idx];
      const ps = phr.side === 'old' ? 'old' : 'new';
      const pEnd = ps === 'old' ? phr.end - oldOffset : phr.end - newOffset;
      this.jumpToHunk(idx);
      this.setFocusedLine(ps, pEnd, true);
    }
  }

  clearFocusedHunk() {
    if (!this.editor) {
      return;
    }
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();
    this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations(
      this.focusedHunkDecorationsNew || [],
      [],
    );
    this.focusedHunkDecorationsOld = originalEditor.deltaDecorations(
      this.focusedHunkDecorationsOld || [],
      [],
    );
  }

  openCommentOnCurrentFocus() {
    if (!this.editor) {
      return;
    }

    const file = this.files[this.currentFileIndex];
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      return;
    }

    const { newOffset, oldOffset } = this.getFileOffsets(file.path);

    if (this.currentFocusedLine) {
      const { side, line } = this.currentFocusedLine;
      const fileLineNumber = side === 'old' ? line + oldOffset : line + newOffset;
      this.showCommentDialog(file.path, fileLineNumber, line, side);
      return;
    }

    // Fallback to current hunk start if no line is focused
    const currentIdx = this.currentHunkIndex[file.path] || 0;
    const hunkRange = hunks[currentIdx];
    const side = hunkRange.side === 'old' ? 'old' : 'new';
    const monacoLine = side === 'old' ? hunkRange.start - oldOffset : hunkRange.start - newOffset;
    this.showCommentDialog(file.path, hunkRange.start, monacoLine, side);
  }

  setupSidebarResizer() {
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebar-resizer');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) {
        return;
      }
      const newWidth = e.clientX;
      if (newWidth >= 150 && newWidth <= 600) {
        sidebar.style.width = newWidth + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  renderFileList() {
    const list = document.getElementById('file-list');
    list.innerHTML = '';

    // Optional pseudo-file for commit (when reviewing full commits)
    const hasCommit = !!(this.diff && (this.diff.commit_message || this.diff.commit_hash));
    if (hasCommit) {
      const li = document.createElement('li');
      li.dataset.commit = '1';
      li.className = this.currentFileIsCommit ? 'active' : '';

      const left = document.createElement('span');
      left.className = 'file-left';
      const name = document.createElement('span');
      name.textContent = 'Commit';
      left.appendChild(name);

      const right = document.createElement('span');
      right.className = 'file-right';
      const commentCount = this.commentManager.getCommentsForFile('(commit)').length;
      if (commentCount > 0) {
        const commentBadge = document.createElement('span');
        commentBadge.className = 'file-comment-badge';
        commentBadge.textContent = String(commentCount);
        left.appendChild(commentBadge);
      }

      const status = document.createElement('span');
      status.className = 'file-status';
      status.textContent = 'C';
      right.appendChild(status);

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    }

    this.files.forEach((file, index) => {
      const li = document.createElement('li');
      li.dataset.index = index;
      li.className = !this.currentFileIsCommit && index === this.currentFileIndex ? 'active' : '';

      // Left: name + (optional) comment count
      const left = document.createElement('span');
      left.className = 'file-left';
      const name = document.createElement('span');
      // Display renames clearly as "old.txt → new.txt"
      if (file.status === 'renamed' && file.old_path) {
        name.textContent = `${file.old_path} → ${file.path}`;
      } else {
        name.textContent = file.path;
      }
      left.appendChild(name);

      const commentCount = this.commentManager.getCommentsForFile(file.path).length;
      if (commentCount > 0) {
        const commentBadge = document.createElement('span');
        commentBadge.className = 'file-comment-badge';
        commentBadge.textContent = String(commentCount);
        left.appendChild(commentBadge);
      }

      // Right: per-file +/- and status
      const right = document.createElement('span');
      right.className = 'file-right';

      // Compute per-file additions/deletions (serde lowercases enum and renames to `type`)
      const added = (file.hunks || []).reduce(
        (acc, h) => acc + (h.lines || []).filter((l) => l && l.type === 'add').length,
        0,
      );
      const deleted = (file.hunks || []).reduce(
        (acc, h) => acc + (h.lines || []).filter((l) => l && l.type === 'delete').length,
        0,
      );

      const delta = document.createElement('span');
      delta.className = 'file-delta';
      delta.innerHTML = `<span class="delta-add">+${added}</span> <span class="delta-del">-${deleted}</span>`;
      right.appendChild(delta);

      const status = document.createElement('span');
      status.className = `file-status ${file.status}`;
      status.textContent = file.status[0].toUpperCase();
      right.appendChild(status);

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    });
  }

  async loadFile(index) {
    this.currentFileIsCommit = false;
    if (window.DEBUG) {
      console.log('[app] loadFile: index', index);
    }
    window.Perf.recordFileSwitchStart();
    this.currentFileIndex = index;
    const file = this.files[index];
    if (window.DEBUG) {
      console.log('[app] loadFile: path', file.path, 'status', file.status);
    }

    // Update show full file button
    const showFullBtn = $('#show-full-file');
    let range = this.fileRanges[file.path];
    if (!range) {
      // Initialize range and hunk ranges from metadata
      const { hunkRanges, oldLineStart, oldLineEnd, newLineStart, newLineEnd } =
        computeHunkRanges(file.hunks);
      this.fileHunks[file.path] = hunkRanges;
      this.currentHunkIndex[file.path] = 0;
      range = this.fileRanges[file.path] = {
        old: { start: oldLineStart, end: oldLineEnd },
        new: { start: newLineStart, end: newLineEnd },
        hasFullContent: false,
        totalOldLines: null,
        totalNewLines: null,
      };
    }
    if (range && range.hasFullContent) {
      showFullBtn.style.display = 'none';
    } else {
      showFullBtn.style.display = 'block';
      showFullBtn.disabled = false;
      showFullBtn.textContent = `Show Full File`;
      showFullBtn.onclick = () => this.loadFullFile(index);
    }

    this.renderFileList();
    this.renderExpandControls();

    // Dispose old models and widget; keep editor instance
    if (this.originalModel) {
      try {
        this.originalModel.dispose();
      } catch (e) {}
      this.originalModel = null;
    }
    if (this.modifiedModel) {
      try {
        this.modifiedModel.dispose();
      } catch (e) {}
      this.modifiedModel = null;
    }
    if (this.currentWidget && this.currentWidgetEditor) {
      try {
        this.currentWidgetEditor.removeContentWidget(this.currentWidget);
      } catch (e) {}
      this.currentWidget = null;
      this.currentWidgetEditor = null;
    }

    // Determine language from file extension
    const extension = file.path.split('.').pop();
    const languageMap = {
      rs: 'rust',
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      md: 'markdown',
      json: 'json',
      html: 'html',
      css: 'css',
    };
    const language = languageMap[extension] || 'plaintext';

    // Use the configured Monaco theme directly
    const theme = this.config.color_scheme || 'vs-dark';

    // Create diff editor on first run, reuse afterwards
    const container = document.getElementById('editor-container');
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
        renderSideBySide: !this.isInline,
        readOnly: true,
        originalEditable: false,
        automaticLayout: true,
        scrollBeyondLastLine: true,
        minimap: { enabled: true },
        glyphMargin: true,
        folding: false,
        lineDecorationsWidth: 0,
        fontSize: 13,
        fontFamily: mono,
        lineNumbers: 'on',
        renderOverviewRuler: true,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
        },
      });
      try {
        // Defer sub-editor option updates until models are set
      } catch (_) {}
    } else {
      // Defer diff editor option updates until after models are bound
    }

    // Lazily fetch content and slice to visible range
    await this.fetchFilePair(file.path);
    const oldAll = (this.fileCache[file.path].old || '').split('\n');
    const newAll = (this.fileCache[file.path].new || '').split('\n');
    if (range.totalOldLines == null) {
      range.totalOldLines = oldAll.length;
    }
    if (range.totalNewLines == null) {
      range.totalNewLines = newAll.length;
    }
    let oldStart = typeof range.old.start === 'number' && range.old.start > 0 ? range.old.start : 1;
    let oldEnd = range.old.end && range.old.end >= oldStart ? range.old.end : oldAll.length;
    let newStart = typeof range.new.start === 'number' && range.new.start > 0 ? range.new.start : 1;
    let newEnd = range.new.end && range.new.end >= newStart ? range.new.end : newAll.length;
    if (range.hasFullContent) {
      oldStart = 1;
      oldEnd = oldAll.length;
      newStart = 1;
      newEnd = newAll.length;
    }
    const oldContent = oldAll
      .slice(Math.max(0, oldStart - 1), Math.max(oldStart - 1, oldEnd))
      .join('\n');
    const newContent = newAll
      .slice(Math.max(0, newStart - 1), Math.max(newStart - 1, newEnd))
      .join('\n');

    // Show/hide banner when old content is unavailable but new content exists
    try {
      const oldBanner = $('#old-missing-banner');
      if (oldBanner) {
        const status = String((this.files[index] && this.files[index].status) || '').toLowerCase();
        const isAdded = status === 'added';
        const show =
          !isAdded &&
          (!this.fileCache[file.path].old || this.fileCache[file.path].old.length === 0) &&
          this.fileCache[file.path].new &&
          this.fileCache[file.path].new.length > 0;
        oldBanner.style.display = show ? '' : 'none';
      }
    } catch (_) {}
    this.originalModel = monaco.editor.createModel(oldContent, language);
    this.modifiedModel = monaco.editor.createModel(newContent, language);
    if (window.DEBUG) {
      console.log(
        '[app] models created for',
        file.path,
        'lang',
        language,
        'old/new lines',
        oldAll.length,
        newAll.length,
      );
    }

    this.editor.setModel({
      original: this.originalModel,
      modified: this.modifiedModel,
    });
    // Now that models are bound, update diff editor + sub-editors
    try {
      this.editor.updateOptions({
        renderSideBySide: !this.isInline,
        theme: theme,
        fontFamily: mono,
        glyphMargin: true,
        folding: false,
        lineDecorationsWidth: 0,
        scrollBeyondLastLine: true,
      });
      const me = this.editor.getModifiedEditor && this.editor.getModifiedEditor();
      const oe = this.editor.getOriginalEditor && this.editor.getOriginalEditor();
      const opts = {
        smoothScrolling: !reduceMotion,
        glyphMargin: true,
        folding: false,
        scrollBeyondLastLine: true,
      };
      if (me && me.getModel()) {
        me.updateOptions(opts);
      }
      if (oe && oe.getModel()) {
        oe.updateOptions(opts);
      }
    } catch (_) {}
    // Store offsets for line/hunk navigation helpers
    this.currentOffsets = {
      newOffset: newStart > 0 ? newStart - 1 : 0,
      oldOffset: oldStart > 0 ? oldStart - 1 : 0,
    };
    try {
      window.__APP_READY = true;
    } catch (e) {}

    // Record end after the new models are set and painted
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.Perf.recordFileSwitchEnd();
        try {
          if (window.DEBUG) {
            const e = performance.getEntriesByName('fileSwitch');
            const d = e && e.length ? e[e.length - 1].duration : null;
            if (d != null) {
              console.log('[perf] fileSwitch ms:', Math.round(d));
            }
          }
        } catch {}
        // Derive accent color from a visible keyword token if present (prefer 'function'/'const'/'import')
        try {
          const prefs = ['function', 'const', 'import', 'class', 'return', 'if', 'export', 'let'];
          const spans = Array.from(document.querySelectorAll('.monaco-editor .view-line span'));
          let found = null;
          for (const p of prefs) {
            for (const s of spans) {
              const txt = (s.textContent || '').trim();
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
        } catch {}
        markAppReady();
      }),
    );

    // Set custom line numbers to show actual file line numbers
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    let newOffset = 0;
    let oldOffset = 0;

    if (range && !range.hasFullContent) {
      newOffset = range.new.start - 1;
      oldOffset = range.old.start - 1;

      modifiedEditor.updateOptions({
        lineNumbers: (lineNumber) => (lineNumber + newOffset).toString(),
        lineNumbersMinChars: 4,
      });

      originalEditor.updateOptions({
        lineNumbers: (lineNumber) => (lineNumber + oldOffset).toString(),
        lineNumbersMinChars: 4,
      });
    } else {
      modifiedEditor.updateOptions({ lineNumbers: 'on' });
      originalEditor.updateOptions({ lineNumbers: 'on' });
    }

    // Add click handler for comments on BOTH sides (line numbers and glyph margin)
    modifiedEditor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        const monacoLine = e.target.position.lineNumber;
        const fileLineNumber = monacoLine + newOffset;
        this.showCommentDialog(file.path, fileLineNumber, monacoLine, 'new');
      }
    });

    originalEditor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        const monacoLine = e.target.position.lineNumber;
        const fileLineNumber = monacoLine + oldOffset;
        this.showCommentDialog(file.path, fileLineNumber, monacoLine, 'old');
      }
    });

    // Update decorations for existing comments
    this.updateDecorations();

    // Setup scroll listener to show/hide bottom expand control
    this.setupScrollListener();

    // Highlight the current hunk (first hunk by default) and set focused line
    const hunks = this.fileHunks[file.path];
    if (hunks && hunks.length > 0) {
      const currentIdx = this.currentHunkIndex[file.path] || 0;
      setTimeout(() => {
        this.jumpToHunk(currentIdx);
        const hr = hunks[currentIdx];
        const newOffset = this.currentOffsets ? this.currentOffsets.newOffset : 0;
        const oldOffset = this.currentOffsets ? this.currentOffsets.oldOffset : 0;
        const side = hr.side === 'old' ? 'old' : 'new';
        const monacoLine = side === 'old' ? hr.start - oldOffset : hr.start - newOffset;
        this.setFocusedLine(side, monacoLine, false);
      }, 100);
    }
  }

  loadCommitView() {
    this.currentFileIsCommit = true;
    // Hide all UI elements that don't apply to commit view
    const topC = document.getElementById('expand-top-container');
    const bottomC = document.getElementById('expand-bottom-container');
    const showFullBtn = document.getElementById('show-full-file');
    if (topC) {
      topC.style.display = 'none';
    }
    if (bottomC) {
      bottomC.style.display = 'none';
    }
    if (showFullBtn) {
      showFullBtn.style.display = 'none';
    }

    const container = document.getElementById('editor-container');
    container.style.display = 'none';
    if (!this._commitViewEl) {
      const host = document.querySelector('.content');
      const el = document.createElement('div');
      el.className = 'commit-view';
      el.style.padding = '16px';
      el.style.overflow = 'auto';
      el.style.height = 'calc(100vh - 48px)';
      host.appendChild(el);
      this._commitViewEl = el;
    }
    const el = this._commitViewEl;
    el.innerHTML = '';
    el.style.display = '';

    const meta = document.createElement('div');
    meta.style.color = 'var(--text-secondary)';
    meta.style.fontSize = '11px';
    meta.style.marginBottom = '12px';
    const rev = this.diff && this.diff.commit_hash ? String(this.diff.commit_hash) : '';
    meta.textContent = rev;
    el.appendChild(meta);

    const msgText = String((this.diff && this.diff.commit_message) || '(no message)');
    const msgLines = msgText.split('\n');

    const msgContainer = document.createElement('div');
    msgContainer.style.border = '1px solid var(--border-color)';
    msgContainer.style.borderRadius = '4px';
    msgContainer.style.background = 'var(--bg-elevated)';
    msgContainer.style.fontFamily = 'var(--font-mono)';
    msgContainer.style.fontSize = '13px';

    msgLines.forEach((lineText, lineIndex) => {
      const lineNum = lineIndex + 1;
      const lineDiv = document.createElement('div');
      lineDiv.style.display = 'flex';
      lineDiv.style.lineHeight = '1.6';
      lineDiv.style.cursor = 'pointer';
      lineDiv.style.padding = '2px 0';
      lineDiv.onmouseover = () => {
        lineDiv.style.background = 'var(--bg-secondary)';
      };
      lineDiv.onmouseout = () => {
        lineDiv.style.background = '';
      };

      const lineNumSpan = document.createElement('span');
      lineNumSpan.style.display = 'inline-block';
      lineNumSpan.style.width = '40px';
      lineNumSpan.style.textAlign = 'right';
      lineNumSpan.style.paddingRight = '12px';
      lineNumSpan.style.color = 'var(--text-secondary)';
      lineNumSpan.style.userSelect = 'none';
      lineNumSpan.style.flexShrink = '0';
      lineNumSpan.textContent = lineNum;

      const lineContent = document.createElement('span');
      lineContent.style.paddingRight = '12px';
      lineContent.style.whiteSpace = 'pre-wrap';
      lineContent.style.wordBreak = 'break-word';
      lineContent.textContent = lineText || ' ';

      lineDiv.appendChild(lineNumSpan);
      lineDiv.appendChild(lineContent);

      lineDiv.onclick = () => {
        this.showCommitLineCommentDialog(lineNum);
      };

      msgContainer.appendChild(lineDiv);
    });

    el.appendChild(msgContainer);

    const commentsHeader = document.createElement('h3');
    commentsHeader.textContent = 'Comments';
    commentsHeader.style.marginTop = '24px';
    commentsHeader.style.fontSize = '14px';
    el.appendChild(commentsHeader);

    const list = document.createElement('div');
    const comments = this.commentManager.getCommentsForFile('(commit)');
    if (comments.length === 0) {
      const empty = document.createElement('div');
      empty.style.color = 'var(--text-secondary)';
      empty.style.fontSize = '12px';
      empty.style.padding = '8px 0';
      empty.textContent = 'No comments yet. Click a line in the message above to add one.';
      list.appendChild(empty);
    } else {
      comments.forEach((c, idx) => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.flexDirection = 'column';
        row.style.gap = '8px';
        row.style.padding = '12px';
        row.style.marginBottom = '8px';
        row.style.border = '1px solid var(--border-color)';
        row.style.borderRadius = '4px';
        row.style.background = 'var(--bg-elevated)';

        const lineLabel = document.createElement('div');
        lineLabel.style.fontSize = '11px';
        lineLabel.style.color = 'var(--text-secondary)';
        lineLabel.textContent = `Line ${c.start_line}`;

        const bodyRow = document.createElement('div');
        bodyRow.style.display = 'flex';
        bodyRow.style.justifyContent = 'space-between';
        bodyRow.style.alignItems = 'flex-start';
        bodyRow.style.gap = '12px';

        const body = document.createElement('div');
        body.style.whiteSpace = 'pre-wrap';
        body.style.fontFamily = 'var(--font-sans)';
        body.style.fontSize = '13px';
        body.style.flex = '1';
        body.textContent = c.body;

        const del = document.createElement('button');
        del.className = 'btn-danger';
        del.textContent = 'Delete';
        del.style.fontSize = '11px';
        del.style.padding = '4px 8px';
        del.onclick = () => {
          const absIndex = this.commentManager.findComment('(commit)', c.start_line, c.side);
          if (absIndex >= 0) {
            this.commentManager.removeComment(absIndex);
            this.loadCommitView();
          }
        };

        bodyRow.appendChild(body);
        bodyRow.appendChild(del);
        row.appendChild(lineLabel);
        row.appendChild(bodyRow);
        list.appendChild(row);
      });
    }
    el.appendChild(list);
    this.renderFileList();
  }

  showCommitLineCommentDialog(lineNum) {
    const modKey = MOD_KEY_LABEL;

    const footerHtml = `
      <button class="btn-secondary cancel-btn">Cancel</button>
      <button class="btn-primary save-btn">Add Comment</button>
    `;

    const { overlay, modal, body, footer, close } = openModal({
      title: `Comment on Commit Message Line ${lineNum}`,
      titleId: 'commit-comment-dialog',
      footerHtml,
      onKeydown: (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          save();
        }
      },
    });

    modal.style.maxWidth = '600px';
    body.style.padding = '20px';

    const ta = document.createElement('textarea');
    ta.rows = 4;
    ta.style.width = '100%';
    ta.style.fontFamily = 'var(--font-sans)';
    ta.style.fontSize = '13px';
    ta.style.padding = '8px';
    ta.placeholder = 'Add your comment...';
    ta.autofocus = true;
    body.appendChild(ta);

    const hint = document.createElement('div');
    hint.style.fontSize = '11px';
    hint.style.color = 'var(--text-secondary)';
    hint.style.marginTop = '8px';
    hint.textContent = `${modKey}+Enter to save, Escape to cancel`;
    body.appendChild(hint);

    const save = () => {
      const text = (ta.value || '').trim();
      if (!text) {
        ta.focus();
        return;
      }
      const comment = {
        file: '(commit)',
        start_line: lineNum,
        end_line: lineNum,
        side: 'new',
        body: text,
        severity: 'comment',
      };
      this.commentManager.addComment(comment);
      close();
      this.loadCommitView();
    };

    footer.querySelector('.cancel-btn').onclick = close;
    footer.querySelector('.save-btn').onclick = save;

    setTimeout(() => ta.focus(), 100);
  }

  updateDecorations() {
    if (!this.editor) {
      return;
    }

    const file = this.files[this.currentFileIndex];
    const comments = this.commentManager.getCommentsForFile(file.path);
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    // Get offsets for current file
    const { newOffset, oldOffset } = this.getFileOffsets(file.path);

    // Decorations for modified (new) side
    const modifiedDecorations = comments
      .filter((c) => c.side === 'new')
      .map((comment) => {
        const monacoLine = comment.start_line - newOffset;
        return {
          range: new monaco.Range(monacoLine, 1, monacoLine, 1),
          options: {
            isWholeLine: true,
            glyphMarginClassName: 'codicon codicon-comment',
            glyphMarginHoverMessage: { value: comment.body },
          },
        };
      });

    // Decorations for original (old) side
    const originalDecorations = comments
      .filter((c) => c.side === 'old')
      .map((comment) => {
        const monacoLine = comment.start_line - oldOffset;
        return {
          range: new monaco.Range(monacoLine, 1, monacoLine, 1),
          options: {
            isWholeLine: true,
            glyphMarginClassName: 'codicon codicon-comment',
            glyphMarginHoverMessage: { value: comment.body },
          },
        };
      });

    this.modifiedDecorations = modifiedEditor.deltaDecorations(
      this.modifiedDecorations || [],
      modifiedDecorations,
    );
    this.originalDecorations = originalEditor.deltaDecorations(
      this.originalDecorations || [],
      originalDecorations,
    );
  }

  showCommentDialog(file, fileLineNumber, monacoLineNumber, side) {
    const targetEditor =
      side === 'new' ? this.editor.getModifiedEditor() : this.editor.getOriginalEditor();

    // Remove any existing widget
    if (this.currentWidget) {
      if (this.currentWidgetEditor) {
        this.currentWidgetEditor.removeContentWidget(this.currentWidget);
      }
      this.currentWidget = null;
      this.currentWidgetEditor = null;
    }

    // Check for existing comment
    const existingIndex = this.commentManager.findComment(file, fileLineNumber, side);
    const existingComment = existingIndex >= 0 ? this.commentManager.comments[existingIndex] : null;

    // Create the widget
    const domNode = document.createElement('div');
    domNode.className = 'inline-comment-box';
    const modKey = MOD_KEY_LABEL;
    const deleteBtnHtml = existingComment
      ? '<button class="btn-danger delete-btn">Delete</button>'
      : '';
    domNode.innerHTML = `
          <h3>Line ${fileLineNumber}${existingComment ? ' - Edit' : ''}</h3>
          <textarea class="comment-textarea" placeholder="Add your comment..." autofocus></textarea>
          <div class="comment-actions">
            <span class="shortcut-hint">${modKey}+Enter to save</span>
            ${deleteBtnHtml}
            <button class="btn-secondary cancel-btn">Cancel</button>
            <button class="btn-primary save-btn">Save</button>
          </div>
        `;

    const widget = {
      getId: () => 'inline.comment.widget',
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
    this.currentWidget = widget;
    this.currentWidgetEditor = targetEditor;

    const saveBtn = domNode.querySelector('.save-btn');
    const cancelBtn = domNode.querySelector('.cancel-btn');
    const textarea = domNode.querySelector('.comment-textarea');
    if (existingComment && textarea) {
      textarea.value = existingComment.body || '';
    }

    // Keyboard shortcuts
    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        cleanup();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        saveComment();
      }
    };
    document.addEventListener('keydown', handleKeydown);

    const cleanup = () => {
      targetEditor.removeContentWidget(widget);
      this.currentWidget = null;
      document.removeEventListener('keydown', handleKeydown);
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
          start_line: fileLineNumber,
          end_line: fileLineNumber,
          side,
          body: textarea.value,
          severity: 'comment',
        };
        this.commentManager.addComment(comment);
      }
      this.updateDecorations();
      cleanup();
    };

    saveBtn.onclick = saveComment;
    cancelBtn.onclick = cleanup;

    // Delete button (only present for existing comments)
    const deleteBtnEl = domNode.querySelector('.delete-btn');
    if (deleteBtnEl) {
      deleteBtnEl.onclick = () => {
        this.commentManager.removeComment(existingIndex);
        this.updateDecorations();
        cleanup();
      };
    }

    // Focus after a brief delay to let Monaco position the widget
    setTimeout(() => textarea.focus(), 100);
  }

  async loadFullFile(index) {
    const file = this.files[index];

    await this.fetchFilePair(file.path);

    // Update tracking BEFORE reloading
    const range = this.fileRanges[file.path];
    range.hasFullContent = true;
    range.old.start = 1;
    range.old.end = range.totalOldLines || this.fileCache[file.path].old.split('\n').length;
    range.new.start = 1;
    range.new.end = range.totalNewLines || this.fileCache[file.path].new.split('\n').length;

    // Reload the editor with full content via loadFile
    await this.loadFile(index);

    // Update button
    const showFullBtn = document.getElementById('show-full-file');
    showFullBtn.style.display = 'none';
  }

  async renderExpandControls() {
    // Remove existing controls
    $$('.expand-controls').forEach((el) => el.remove());

    const file = this.files[this.currentFileIndex];
    const range = this.fileRanges[file.path];

    if (window.DEBUG) {
      console.log(`renderExpandControls for ${file.path}`);
      console.log('Range:', range);
    }

    if (!range || range.hasFullContent) {
      if (window.DEBUG) {
        console.log(`Skipping: ${!range ? 'no range' : 'has full content'}`);
      }
      return;
    }

    // Fetch total line counts if we don't have them
    if (range.totalOldLines === null || range.totalNewLines === null) {
      await this.fetchFileLengths(file.path);
    }

    if (window.DEBUG) {
      console.log(`Total lines: old=${range.totalOldLines}, new=${range.totalNewLines}`);
      console.log(
        `Current range: old ${range.old.start}-${range.old.end}, new ${range.new.start}-${range.new.end}`,
      );
    }

    const topContainer = $('#expand-top-container');
    const bottomContainer = $('#expand-bottom-container');

    // Calculate available lines above and below current view
    // Use the maximum of old/new sides since they may have different lengths
    const availableAboveOld = Math.max(0, range.old.start - 1);
    const availableAboveNew = Math.max(0, range.new.start - 1);
    const availableAbove = Math.max(availableAboveOld, availableAboveNew);

    const availableBelowOld = Math.max(0, range.totalOldLines - range.old.end);
    const availableBelowNew = Math.max(0, range.totalNewLines - range.new.end);
    const availableBelow = Math.max(availableBelowOld, availableBelowNew);

    // If showing full content on both sides, mark as such and hide controls
    if (availableAbove === 0 && availableBelow === 0) {
      range.hasFullContent = true;
      document.getElementById('show-full-file').style.display = 'none';
      topContainer.innerHTML = '';
      bottomContainer.innerHTML = '';
      bottomContainer.style.display = 'none';
      if (window.DEBUG) {
        console.log(`Already showing full file`);
      }
      return;
    }

    if (window.DEBUG) {
      console.log(
        `Available: above=${availableAbove} (old=${availableAboveOld}, new=${availableAboveNew}), below=${availableBelow} (old=${availableBelowOld}, new=${availableBelowNew})`,
      );
    }

    // Clear previous controls
    topContainer.innerHTML = '';
    bottomContainer.innerHTML = '';

    // Add expand controls
    if (availableAbove > 0) {
      if (window.DEBUG) {
        console.log(`Adding top control`);
      }
      const topControl = this.createExpandControl('top', file.path, availableAbove);
      topContainer.appendChild(topControl);
      // Will be shown/hidden by scroll listener
    } else {
      topContainer.style.display = 'none';
    }

    if (availableBelow > 0) {
      if (window.DEBUG) {
        console.log(`Adding bottom control`);
      }
      const bottomControl = this.createExpandControl('bottom', file.path, availableBelow);
      bottomContainer.appendChild(bottomControl);
      // Will be shown/hidden by scroll listener
    } else {
      if (window.DEBUG) {
        console.log(`NOT adding bottom control - availableBelow=${availableBelow}`);
      }
      bottomContainer.style.display = 'none';
    }
  }

  setupScrollListener() {
    if (!this.editor) {
      return;
    }

    const modifiedEditor = this.editor.getModifiedEditor();

    // Remove previous listener if it exists
    if (this.scrollListenerDispose && this.scrollListenerDispose.dispose) {
      try {
        this.scrollListenerDispose.dispose();
      } catch (e) {}
      this.scrollListenerDispose = null;
    }

    // Listen for scroll changes
    this.scrollListenerDispose = modifiedEditor.onDidScrollChange(() => {
      this.checkExpandVisibility();
    });

    // Initial check
    setTimeout(() => this.checkExpandVisibility(), 100);
  }

  checkExpandVisibility() {
    if (!this.editor) {
      return;
    }

    const modifiedEditor = this.editor.getModifiedEditor();
    const visibleRanges = modifiedEditor.getVisibleRanges();

    if (visibleRanges.length === 0) {
      return;
    }

    const firstVisibleLine = visibleRanges[0].startLineNumber;
    const lastVisibleLine = visibleRanges[visibleRanges.length - 1].endLineNumber;
    const totalLines = modifiedEditor.getModel().getLineCount();

    // Show top expand button when within 3 lines of top
    const topContainer = document.getElementById('expand-top-container');
    if (topContainer && topContainer.querySelector('.expand-controls')) {
      const nearTop = firstVisibleLine <= 4;
      topContainer.style.display = nearTop ? 'block' : 'none';
    }

    // Show bottom expand button when within 3 lines of bottom
    const bottomContainer = document.getElementById('expand-bottom-container');
    if (bottomContainer && bottomContainer.querySelector('.expand-controls')) {
      const nearBottom = lastVisibleLine >= totalLines - 3;
      bottomContainer.style.display = nearBottom ? 'block' : 'none';
    }
  }

  async fetchFileLengths(filePath) {
    const range = this.fileRanges[filePath];
    const { old, new: newContent } = await this.fetchFilePair(filePath);
    range.totalOldLines = old.split('\n').length;
    range.totalNewLines = newContent.split('\n').length;
  }

  createExpandControl(position, filePath, availableLines) {
    const expandAmount = Math.min(20, availableLines);
    const control = document.createElement('div');
    control.className = `expand-controls ${position}`;
    control.innerHTML = `
          <div class="expand-line"></div>
          <button class="expand-btn" data-position="${position}" data-file="${filePath}">
            ↕ Expand ${position === 'top' ? 'Above' : 'Below'} (+${expandAmount} line${expandAmount === 1 ? '' : 's'})
          </button>
          <div class="expand-line"></div>
        `;

    const btn = control.querySelector('.expand-btn');
    btn.onclick = () => this.expandLines(position, filePath);

    return control;
  }

  async expandLines(position, filePath) {
    const range = this.fileRanges[filePath];
    const file = this.files.find((f) => f.path === filePath);
    if (!file) {
      return;
    }

    if (window.DEBUG) {
      console.log(`Expanding ${position} for ${filePath}`);
      console.log(
        `Current range: old ${range.old.start}-${range.old.end}, new ${range.new.start}-${range.new.end}`,
      );
    }

    // Fetch the full file content
    const { old, new: newContent } = await this.fetchFilePair(filePath);
    const oldLines = old.split('\n');
    const newLines = newContent.split('\n');

    if (window.DEBUG) {
      console.log(`File lengths: old ${oldLines.length}, new ${newLines.length}`);
    }

    // Calculate new range
    const expandAmount = 20;
    let newOldStart = range.old.start;
    let newOldEnd = range.old.end;
    let newNewStart = range.new.start;
    let newNewEnd = range.new.end;

    if (position === 'top') {
      newOldStart = Math.max(1, range.old.start - expandAmount);
      newNewStart = Math.max(1, range.new.start - expandAmount);
    } else {
      // Expand below, but don't exceed file length
      newOldEnd = Math.min(oldLines.length, range.old.end + expandAmount);
      newNewEnd = Math.min(newLines.length, range.new.end + expandAmount);
    }

    if (window.DEBUG) {
      console.log(`New range: old ${newOldStart}-${newOldEnd}, new ${newNewStart}-${newNewEnd}`);
    }

    // Extract the lines we need (0-indexed slice from 1-indexed line numbers)
    file.old_content = oldLines.slice(newOldStart - 1, newOldEnd).join('\n');
    file.new_content = newLines.slice(newNewStart - 1, newNewEnd).join('\n');

    if (window.DEBUG) {
      console.log(
        `Extracted content lengths: old ${file.old_content.split('\n').length}, new ${file.new_content.split('\n').length}`,
      );
    }

    // Update range
    range.old.start = newOldStart;
    range.old.end = newOldEnd;
    range.new.start = newNewStart;
    range.new.end = newNewEnd;

    // Update total line counts if not set
    if (range.totalOldLines === null) {
      range.totalOldLines = oldLines.length;
    }
    if (range.totalNewLines === null) {
      range.totalNewLines = newLines.length;
    }

    // Save scroll position before reloading
    let scrollLineNumber = null;
    if (this.editor) {
      const modifiedEditor = this.editor.getModifiedEditor();
      const visibleRanges = modifiedEditor.getVisibleRanges();
      if (visibleRanges.length > 0) {
        scrollLineNumber = visibleRanges[0].startLineNumber;
      }
    }

    // Calculate how many lines were actually added at top
    const oldNewStart = range.new.start;

    // Reload editor
    this.loadFile(this.currentFileIndex);

    // Restore scroll position after a brief delay for editor to initialize
    if (scrollLineNumber !== null) {
      setTimeout(() => {
        if (this.editor) {
          const modifiedEditor = this.editor.getModifiedEditor();
          // If we expanded at top, adjust scroll by actual lines added
          const linesAddedAtTop = position === 'top' ? oldNewStart - newNewStart : 0;
          const adjustedLine = scrollLineNumber + linesAddedAtTop;
          const reduceMotion = prefersReducedMotion();
          modifiedEditor.revealLineInCenter(
            adjustedLine,
            reduceMotion ? monaco.editor.ScrollType.Immediate : monaco.editor.ScrollType.Smooth,
          );
        }
      }, 50);
    }
  }

  updateUI() {
    const count = this.commentManager.getComments().length;
    document.getElementById('comment-count').textContent = count.toString();
    this.renderFileList();
  }

  showKeyboardHelp() {
    const { overlay, modal, body, close } = openModal({
      title: 'Keyboard Shortcuts',
      titleId: 'kb-help-title',
      modalClass: 'help-modal',
      onKeydown: (e) => {
        if (e.key === '?') {
          e.preventDefault();
          close();
        }
      },
    });

    const table = document.createElement('table');
    table.className = 'shortcuts-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>Shortcut</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    KEYBOARD_SHORTCUTS.forEach((shortcut) => {
      const row = document.createElement('tr');

      const keysCell = document.createElement('td');
      const keyComboDiv = document.createElement('div');
      keyComboDiv.className = 'key-combo';

      shortcut.keys.forEach((combo, idx) => {
        if (idx > 0) {
          const orSpan = document.createElement('span');
          orSpan.className = 'key-or';
          orSpan.textContent = 'or';
          keyComboDiv.appendChild(orSpan);
        }

        const displayCombo = combo.replace('Mod', IS_MAC ? 'Cmd' : 'Ctrl');
        const parts = displayCombo.split('+');

        parts.forEach((part, partIdx) => {
          if (partIdx > 0) {
            const plus = document.createElement('span');
            plus.textContent = '+';
            plus.style.margin = '0 2px';
            plus.style.color = '#888';
            keyComboDiv.appendChild(plus);
          }

          const key = document.createElement('span');
          key.className = 'key';
          const displayKey = part
            .replace('ArrowDown', '↓')
            .replace('ArrowUp', '↑')
            .replace('Enter', '⏎');
          key.textContent = displayKey;
          keyComboDiv.appendChild(key);
        });
      });

      keysCell.appendChild(keyComboDiv);

      const actionCell = document.createElement('td');
      actionCell.textContent = shortcut.description;

      row.appendChild(keysCell);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });

    body.appendChild(table);
  }

  showSettingsModal() {
    const footerHtml = `
      <button class="btn-secondary cancel-btn">Cancel</button>
      <button class="btn-primary save-btn">Save</button>
    `;

    const { overlay, modal, body, footer, close } = openModal({
      title: 'Settings',
      titleId: 'settings-title',
      modalClass: 'help-modal',
      footerHtml,
    });

    const form = document.createElement('form');
    form.className = 'settings-form';

    let currentColorScheme = this.config.color_scheme || 'vs-dark';
    const legacyThemeMap = {
      dark: 'vs-dark',
      light: 'vs',
      'high-contrast': 'hc-black',
    };
    if (legacyThemeMap[currentColorScheme]) {
      currentColorScheme = legacyThemeMap[currentColorScheme];
    }

    const currentFont = (this.config.font && this.config.font.trim()) || 'JetBrains Mono';
    const currentSplitView = this.config.split_view !== undefined ? this.config.split_view : true;
    const currentAutoCloseTab =
      this.config.auto_close_tab !== undefined ? this.config.auto_close_tab : true;

    if (window.DEBUG) {
      console.log('Settings modal - current values:', {
        currentColorScheme,
        currentFont,
        currentSplitView,
        currentAutoCloseTab,
      });
    }

    form.innerHTML = `
      <div class="settings-field">
        <label for="color-scheme">Theme</label>
        <select id="color-scheme" name="color_scheme">
          <optgroup label="Standard">
            <option value="vs-dark">VS Dark</option>
            <option value="vs">VS Light</option>
            <option value="hc-black">High Contrast Dark</option>
            <option value="hc-light">High Contrast Light</option>
          </optgroup>
          <optgroup label="GitHub">
            <option value="github-dark">GitHub Dark</option>
            <option value="github-light">GitHub Light</option>
          </optgroup>
          <optgroup label="Firefox DevTools">
            <option value="firefox-devtools-dark">Firefox DevTools Dark</option>
            <option value="firefox-devtools-light">Firefox DevTools Light</option>
          </optgroup>
          <optgroup label="Solarized">
            <option value="solarized-dark">Solarized Dark</option>
            <option value="solarized-light">Solarized Light</option>
          </optgroup>
        </select>
      </div>

      <div class="settings-field">
        <label for="font">Editor Font</label>
        <input type="text" id="font" name="font" value="${currentFont}" placeholder="JetBrains Mono">
      </div>

      <div class="settings-field">
        <label for="split-view">Split View</label>
        <div class="checkbox-wrapper">
          <input type="checkbox" id="split-view" name="split_view" ${currentSplitView ? 'checked' : ''}>
          <span>Show original and modified side-by-side</span>
        </div>
      </div>

      <div class="settings-field">
        <label for="auto-close-tab">Auto-Close Tab</label>
        <div class="checkbox-wrapper">
          <input type="checkbox" id="auto-close-tab" name="auto_close_tab" ${currentAutoCloseTab ? 'checked' : ''}>
          <span>Automatically close tab after submitting review</span>
        </div>
      </div>
    `;

    body.appendChild(form);
    form.querySelector('#color-scheme').value = currentColorScheme;

    const save = async () => {
      const saveBtn = footer.querySelector('.save-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const formData = new FormData(form);
      const newConfig = {
        color_scheme: formData.get('color_scheme'),
        font: (formData.get('font') || '').toString().trim() || 'JetBrains Mono',
        split_view: formData.get('split_view') === 'on',
        auto_close_tab: formData.get('auto_close_tab') === 'on',
      };

      try {
        const response = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        });

        if (response.ok) {
          this.config = newConfig;
          this.isInline = !this.config.split_view;
          try {
            monaco.editor.setTheme(this.config.color_scheme || 'vs-dark');
          } catch {}
          this.applyThemeToUI(this.config.color_scheme || 'vs-dark');
          saveBtn.textContent = 'Saved!';

          setTimeout(() => {
            close();
            this.loadFile(this.currentFileIndex);
          }, 500);
        } else {
          alert('Failed to save settings');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      } catch (error) {
        alert(`Failed to save settings: ${error}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    };

    footer.querySelector('.cancel-btn').onclick = close;
    footer.querySelector('.save-btn').onclick = save;

    setTimeout(() => {
      const initial = form.querySelector('#color-scheme');
      if (initial) {
        initial.focus();
      }
    }, 0);
  }

  async showSubmitConfirmation() {
    const comments = this.commentManager.getComments();

    const footerHtml = `
      <button class="btn-secondary cancel-submit-btn">Cancel</button>
      <button class="btn-primary confirm-submit-btn">Submit Review</button>
    `;

    const { overlay, modal, body, footer, close } = openModal({
      title: comments.length === 0 ? 'Submit Review' : `Review Comments (${comments.length})`,
      titleId: 'submit-title',
      footerHtml,
    });

    if (comments.length === 0) {
      const noCommentsMsg = document.createElement('p');
      noCommentsMsg.textContent = 'No comments. Submit to approve this review.';
      noCommentsMsg.style.padding = '20px';
      noCommentsMsg.style.textAlign = 'center';
      noCommentsMsg.style.color = 'var(--text-secondary)';
      body.appendChild(noCommentsMsg);
    }

    const commentsByFile = {};
    comments.forEach((comment) => {
      if (!commentsByFile[comment.file]) {
        commentsByFile[comment.file] = [];
      }
      commentsByFile[comment.file].push(comment);
    });

    const fileContents = {};
    await Promise.all(
      Object.keys(commentsByFile).map(async (filePath) => {
        const fileComments = commentsByFile[filePath];
        const sides = [...new Set(fileComments.map((c) => c.side))];

        for (const side of sides) {
          const key = `${filePath}:${side}`;
          try {
            const data = await fetchJSON(
              `/api/file?path=${encodeURIComponent(filePath)}&side=${side}`,
            );
            fileContents[key] = data.content.split('\n');
          } catch (err) {
            console.error(`Failed to fetch ${key}:`, err);
            fileContents[key] = [];
          }
        }
      }),
    );

    comments.forEach((comment) => {
      const preview = document.createElement('div');
      preview.className = 'comment-preview';

      const headerText = `${comment.file}:${comment.start_line} (${comment.side}) — ${comment.severity}`;
      const previewHeader = document.createElement('div');
      previewHeader.className = 'comment-preview-header';
      previewHeader.textContent = headerText;

      const fileKey = `${comment.file}:${comment.side}`;
      const lines = fileContents[fileKey] || [];
      const lineIndex = comment.start_line - 1;
      const startLine = Math.max(0, lineIndex - 1);
      const endLine = Math.min(lines.length, lineIndex + 2);
      const excerpt = lines.slice(startLine, endLine);

      const codeBlock = document.createElement('div');
      codeBlock.className = 'comment-preview-code';
      excerpt.forEach((line, idx) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'comment-preview-code-line';
        if (startLine + idx === lineIndex) {
          lineDiv.classList.add('target');
        }
        lineDiv.textContent = line || ' ';
        codeBlock.appendChild(lineDiv);
      });

      const commentText = document.createElement('div');
      commentText.className = 'comment-preview-text';
      commentText.textContent = comment.body;

      preview.appendChild(previewHeader);
      preview.appendChild(codeBlock);
      preview.appendChild(commentText);
      body.appendChild(preview);
    });

    const submit = async () => {
      const submitBtn = footer.querySelector('.confirm-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const resp = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments }),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        submitBtn.textContent = 'Submitted!';
        document.getElementById('submit-review').disabled = true;
        document.getElementById('submit-review').textContent = 'Review Submitted';

        setTimeout(() => {
          close();
          if (this.config.auto_close_tab) {
            window.close();
          }
        }, 1000);
      } catch (error) {
        alert(`Failed to submit review: ${error}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
      }
    };

    footer.querySelector('.cancel-submit-btn').onclick = close;
    footer.querySelector('.confirm-submit-btn').onclick = submit;

    setTimeout(() => {
      const f = footer.querySelector('.confirm-submit-btn');
      if (f) {
        f.focus();
      }
    }, 0);
  }
}

// Initialize app
const app = new MonacoApp();
try {
  window.__APP = app;
} catch {}
app.init().then(() => {
  if (window.DEBUG) {
    console.log('Monaco Editor initialized');
  }
});
