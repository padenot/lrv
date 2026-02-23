import { $, clearEl, el } from './dom.js';
import { fetchJSON } from './api.js';
import { detectLanguageFromPathAndContent } from './language.js';
import { MONACO_HIDE_UNCHANGED, computeHunkRanges } from './diff-utils.js';
import { monoFontStack, prefersReducedMotion } from './font.js';
import { markAppReady } from './ui-signals.js';

export class FileEditorMethods {
  async fetchFilePair(filePath) {
    if (this.fileCache[filePath]) {
      return this.fileCache[filePath];
    }

    const [oldData, newData] = await Promise.all([
      fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=old`).catch((err) => {
        if (window.DEBUG) {
          console.error('[app] old fetch failed', err);
        }
        return { content: '' };
      }),
      fetchJSON(`/api/file?path=${encodeURIComponent(filePath)}&side=new`).catch((err) => {
        if (window.DEBUG) {
          console.error('[app] new fetch failed', err);
        }
        return { content: '' };
      }),
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
    clearEl(list);

    // Optional pseudo-file for commit (when reviewing full commits)
    const hasCommit = !!(this.diff && (this.diff.commit_message || this.diff.commit_hash));
    if (hasCommit) {
      const li = el('li', {
        className: this.currentFileIsCommit ? 'active' : '',
        attrs: { 'data-commit': '1' },
      });

      const left = el('span', { className: 'file-left' }, [el('span', { text: 'Commit' })]);

      const right = el('span', { className: 'file-right' });
      const commentCount = this.commentManager.getCommentsForFile('(commit)').length;
      if (commentCount > 0) {
        left.appendChild(
          el('span', { className: 'file-comment-badge', text: String(commentCount) }),
        );
      }

      right.appendChild(el('span', { className: 'file-status', text: 'C' }));

      li.appendChild(left);
      li.appendChild(right);
      list.appendChild(li);
    }

    this.files.forEach((file, index) => {
      const li = el('li', {
        className: !this.currentFileIsCommit && index === this.currentFileIndex ? 'active' : '',
        attrs: { 'data-index': index },
      });

      // Left: name + (optional) comment count
      const left = el('span', { className: 'file-left' });
      const name = el('span');
      // Display renames clearly as "old.txt → new.txt"
      if (file.status === 'renamed' && file.old_path) {
        name.textContent = `${file.old_path} → ${file.path}`;
      } else {
        name.textContent = file.path;
      }
      left.appendChild(name);

      const commentCount = this.commentManager.getCommentsForFile(file.path).length;
      if (commentCount > 0) {
        left.appendChild(
          el('span', { className: 'file-comment-badge', text: String(commentCount) }),
        );
      }

      // Right: per-file +/- and status
      const right = el('span', { className: 'file-right' });

      // Compute per-file additions/deletions (serde lowercases enum and renames to `type`)
      const added = (file.hunks || []).reduce(
        (acc, h) => acc + (h.lines || []).filter((l) => l && l.type === 'add').length,
        0,
      );
      const deleted = (file.hunks || []).reduce(
        (acc, h) => acc + (h.lines || []).filter((l) => l && l.type === 'delete').length,
        0,
      );

      right.appendChild(
        el('span', { className: 'file-delta' }, [
          el('span', { className: 'delta-add', text: `+${added}` }),
          ' ',
          el('span', { className: 'delta-del', text: `-${deleted}` }),
        ]),
      );

      right.appendChild(
        el('span', {
          className: `file-status ${file.status}`,
          text: file.status[0].toUpperCase(),
        }),
      );

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
    window.Perf.mark('loadFile:start');
    window.Perf.recordFileSwitchStart();
    this.currentFileIndex = index;
    const file = this.files[index];
    if (window.DEBUG) {
      console.log('[app] loadFile: path', file.path, 'status', file.status);
    }

    this.initFileHunks(file);
    this.renderFileList();

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
    const oldContent = this.fileCache[file.path].old || '';
    const newContent = this.fileCache[file.path].new || '';
    const detectionPath = file.path || file.old_path || '';
    const language = detectLanguageFromPathAndContent(detectionPath, newContent || oldContent);

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
    window.Perf.mark('loadFile:models:start');
    this.originalModel = monaco.editor.createModel(oldContent, language);
    this.modifiedModel = monaco.editor.createModel(newContent, language);
    window.Perf.mark('loadFile:models:end');
    window.Perf.measure('loadFile:models', 'loadFile:models:start', 'loadFile:models:end');
    if (window.DEBUG) {
      console.log(
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
    this.editor.setModel({
      original: this.originalModel,
      modified: this.modifiedModel,
    });
    window.Perf.mark('loadFile:setModel:end');
    window.Perf.measure('loadFile:setModel', 'loadFile:setModel:start', 'loadFile:setModel:end');
    // Now that models are bound, update diff editor + sub-editors.
    // Register a one-time onDidUpdateDiff listener to scroll to top after
    // Monaco finishes its async diff/hideUnchangedRegions computation; a plain
    // setScrollTop(0) here would be overridden by that async step.  The
    // listener fires well before the 100 ms jumpToHunk timer.
    try {
      const scrollReset = this.editor.onDidUpdateDiff(() => {
        scrollReset.dispose();
        this.editor.getModifiedEditor().setScrollTop(0);
        this.editor.getOriginalEditor().setScrollTop(0);
      });
      this.editor.updateOptions({
        renderSideBySide: !this.isInline,
        theme: theme,
        fontFamily: mono,
        glyphMargin: true,
        folding: false,
        lineDecorationsWidth: 0,
        scrollBeyondLastLine: true,
        hideUnchangedRegions: MONACO_HIDE_UNCHANGED,
      });
      const opts = {
        smoothScrolling: !reduceMotion,
        glyphMargin: true,
        folding: false,
        scrollBeyondLastLine: true,
      };
      const me = this.editor.getModifiedEditor();
      const oe = this.editor.getOriginalEditor();
      if (me.getModel()) {
        me.updateOptions(opts);
      }
      if (oe.getModel()) {
        oe.updateOptions(opts);
      }
    } catch (_) {}
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

    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    modifiedEditor.updateOptions({ lineNumbers: 'on' });
    originalEditor.updateOptions({ lineNumbers: 'on' });

    this.setupEditorClickHandlers(file.path, modifiedEditor, originalEditor);
    this.updateDecorations();
    this.applyInitialHunkFocus(file.path);
  }

  setupEditorClickHandlers(filePath, modifiedEditor, originalEditor) {
    modifiedEditor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        const monacoLine = e.target.position.lineNumber;
        this.showCommentDialog(filePath, monacoLine, monacoLine, 'new');
      }
    });

    originalEditor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN
      ) {
        const monacoLine = e.target.position.lineNumber;
        this.showCommentDialog(filePath, monacoLine, monacoLine, 'old');
      }
    });
  }

  applyInitialHunkFocus(filePath) {
    const hunks = this.fileHunks[filePath];
    if (hunks && hunks.length > 0) {
      const currentIdx = this.currentHunkIndex[filePath] || 0;
      setTimeout(() => {
        this.jumpToHunk(currentIdx);
        const hr = hunks[currentIdx];
        const side = hr.side === 'old' ? 'old' : 'new';
        this.setFocusedLine(side, hr.start, false);
      }, 100);
    }
  }

  initFileHunks(file) {
    if (!this.fileHunks[file.path]) {
      const { hunkRanges } = computeHunkRanges(file.hunks);
      this.fileHunks[file.path] = hunkRanges;
      this.currentHunkIndex[file.path] = 0;
    }
  }

}
