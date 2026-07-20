import { FileTree } from '../../node_modules/@pierre/trees/dist/render/FileTree.js';
import type { GitStatus } from '../../node_modules/@pierre/trees/dist/publicTypes.js';
import { clearEl, el } from './dom';
import type { AppContext, DiffFile } from './types/app';

export class FileListMethods {
  declare diff: AppContext['diff'];
  declare commentManager: AppContext['commentManager'];
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare files: AppContext['files'];
  declare currentFileIndex: number;
  declare collapsedDirs: AppContext['collapsedDirs'];
  declare fileListFilter: AppContext['fileListFilter'];
  declare isStacked: AppContext['isStacked'];
  declare scrollToFileInStacked: AppContext['scrollToFileInStacked'];
  declare loadFile: AppContext['loadFile'];
  declare currentFileIsCommit: AppContext['currentFileIsCommit'];
  declare loadCommitView: AppContext['loadCommitView'];

  private fileTree: FileTree | null;
  private fileTreeExpansion: 'open' | 'closed';

  setupSidebarResizer() {
    const sidebar = document.getElementById('sidebar') as HTMLDivElement | null;
    const resizer = document.getElementById('sidebar-resizer') as HTMLDivElement | null;
    const collapseBtn = document.getElementById('sidebar-collapse-btn') as HTMLButtonElement | null;
    if (!sidebar || !resizer) {
      return;
    }

    const STORAGE_KEY = 'lrv-sidebar-collapsed';
    const setCollapsed = (collapsed: boolean) => {
      sidebar.classList.toggle('collapsed', collapsed);
      if (collapseBtn) {
        collapseBtn.textContent = collapsed ? '›' : '‹';
        const label = collapsed ? 'Open sidebar' : 'Collapse sidebar';
        collapseBtn.setAttribute('aria-label', label);
        collapseBtn.setAttribute('title', label);
        collapseBtn.setAttribute('aria-expanded', String(!collapsed));
      }
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    };

    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      setCollapsed(true);
    }

    collapseBtn?.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    collapseBtn?.addEventListener('click', () => {
      setCollapsed(!sidebar.classList.contains('collapsed'));
    });

    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
      if (sidebar.classList.contains('collapsed')) {
        return;
      }
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

  setupCommitStripResizer() {
    const strip = document.getElementById('commit-strip') as HTMLDivElement | null;
    const resizer = document.getElementById('commit-strip-resizer') as HTMLDivElement | null;
    const sidebar = document.getElementById('sidebar') as HTMLDivElement | null;
    if (!strip || !resizer || !sidebar) {
      return;
    }

    const STORAGE_KEY = 'lrv-commit-strip-height-pct';
    const DEFAULT_PCT = 0.5;

    const sidebarHeight = () => sidebar.getBoundingClientRect().height;

    const applyPct = (pct: number) => {
      strip.style.height = Math.round(sidebarHeight() * pct) + 'px';
    };

    const saved = localStorage.getItem(STORAGE_KEY);
    applyPct(saved !== null ? parseFloat(saved) : DEFAULT_PCT);

    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = strip.getBoundingClientRect().height;
      resizer.classList.add('dragging');
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) {
        return;
      }
      const newHeight = startHeight + e.clientY - startY;
      const total = sidebarHeight();
      strip.style.height = Math.max(60, Math.min(newHeight, total - 60)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) {
        return;
      }
      isResizing = false;
      resizer.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const total = sidebarHeight();
      localStorage.setItem(STORAGE_KEY, String(strip.getBoundingClientRect().height / total));
    });
  }

  setupFileListControls() {
    const filter = document.getElementById('file-list-filter') as HTMLInputElement | null;
    const collapseAll = document.getElementById('collapse-all-dirs');
    const expandAll = document.getElementById('expand-all-dirs');

    if (filter) {
      filter.value = this.fileListFilter;
    }

    filter?.addEventListener('input', () => {
      this.fileListFilter = filter.value.trim().toLowerCase();
      this.fileTree?.setSearch(this.fileListFilter || null);
      this.renderSummary(this.visibleFileCount());
    });

    collapseAll?.addEventListener('click', () => {
      this.fileTreeExpansion = 'closed';
      this.renderFileList();
    });

    expandAll?.addEventListener('click', () => {
      this.fileTreeExpansion = 'open';
      this.renderFileList();
    });
  }

  expandCurrentFileAncestors() {
    const currentPath = this.currentPath();
    if (currentPath) {
      this.selectFileTreePath(currentPath);
      this.fileTree?.scrollToPath(currentPath, { focus: true, offset: 'nearest' });
    }
  }

  private selectFileTreePath(path: string) {
    const tree = this.fileTree;
    if (!tree) {
      return;
    }
    for (const selectedPath of tree.getSelectedPaths()) {
      if (selectedPath !== path) {
        tree.getItem(selectedPath)?.deselect();
      }
    }
    tree.getItem(path)?.select();
    tree.focusPath(path);
  }

  renderFileList() {
    const list = document.getElementById('file-list');
    const summaryHost = document.getElementById('overall-review-summary');
    if (!list || !summaryHost) {
      return;
    }

    this.fileTree?.cleanUp();
    this.fileTree = null;
    clearEl(list);
    clearEl(summaryHost);
    list.classList.add('file-tree', 'file-tree-root');

    this.renderCommitRow(summaryHost);

    if (!this.files.length) {
      list.appendChild(
        el('li', { className: 'file-list-empty', text: 'No files match the current filter.' }),
      );
      this.renderSummary(0);
      return;
    }

    const selectedPath = this.currentPath();
    const treeHost = document.createElement('file-tree-container');
    treeHost.className = 'lrv-file-tree';
    list.appendChild(treeHost);

    const pathToIndex = new Map(this.files.map((file, index) => [file.path, index]));
    const tree = new FileTree({
      paths: this.files.map((file) => file.path),
      flattenEmptyDirectories: true,
      initialExpansion: this.fileTreeExpansion ?? 'open',
      initialSelectedPaths: selectedPath && !this.currentFileIsCommit ? [selectedPath] : [],
      gitStatus: this.files.map((file) => ({
        path: file.path,
        status: this.gitStatus(file),
      })),
      search: false,
      fileTreeSearchMode: 'hide-non-matches',
      initialSearchQuery: this.fileListFilter || null,
      density: 'compact',
      icons: { set: 'minimal' },
      renderRowDecoration: ({ item }) => {
        const file = this.files[pathToIndex.get(item.path) ?? -1];
        if (!file) {
          return null;
        }
        const { added, deleted } = this.computeFileDelta(file);
        const comments =
          this.commentManager.getCommentsForFile(file.path).length +
          this.reviewNoteManager.getNotesForFile(file.path).length;
        const commentText = comments > 0 ? ` ● ${comments}` : '';
        return {
          text: `+${added} -${deleted} ${file.status[0]?.toUpperCase() ?? '?'}${commentText}`,
          title: `${file.path}: +${added} -${deleted}${comments > 0 ? `, ${comments} comments` : ''}`,
        };
      },
      onSelectionChange: (paths) => {
        const selected = paths[0];
        if (!selected) {
          return;
        }
        const index = pathToIndex.get(selected);
        if (index === undefined) {
          return;
        }
        if (this.isStacked) {
          this.scrollToFileInStacked(index);
        } else {
          void this.loadFile(index);
        }
      },
      unsafeCSS: this.fileTreeCss(),
    });
    this.fileTree = tree;
    tree.render({ fileTreeContainer: treeHost });

    this.renderSummary(this.visibleFileCount());
    requestAnimationFrame(() => {
      if (selectedPath && !this.currentFileIsCommit) {
        this.selectFileTreePath(selectedPath);
        tree.scrollToPath(selectedPath, { focus: true, offset: 'nearest' });
      }
    });
  }

  private renderCommitRow(host: HTMLElement) {
    const hasCommit = this.diff !== null;
    if (!hasCommit) {
      return;
    }

    const li = el('li', {
      className: `tree-row tree-row-summary ${this.currentFileIsCommit ? 'active' : ''}`,
      attrs: { 'data-commit': '1' },
    });

    const reviewNoteCount = this.reviewNoteManager.getNotesForFile('(commit)').length;
    const label = 'Commit message';

    const left = el('span', { className: 'file-left' }, [
      el('span', { className: 'file-name summary-file-name', text: label }),
    ]);
    const commentCount =
      this.commentManager.getCommentsForFile('(commit)').length + reviewNoteCount;
    if (commentCount > 0) {
      left.appendChild(el('span', { className: 'file-comment-badge', text: String(commentCount) }));
    }

    const rowButton = el(
      'button',
      {
        className: 'tree-row-content tree-row-button summary-row-button',
        attrs: { type: 'button', 'aria-label': 'Review and comment on commit message' },
      },
      [left],
    );
    rowButton.onclick = () => {
      this.loadCommitView();
    };
    li.appendChild(rowButton);
    host.appendChild(li);
  }

  private renderSummary(visibleFiles: number) {
    const summary = document.getElementById('file-list-summary');
    if (!summary) {
      return;
    }
    const totalFiles = this.files.length;
    const filterLabel = this.fileListFilter ? ` matching "${this.fileListFilter}"` : '';
    summary.textContent =
      visibleFiles === totalFiles && !this.fileListFilter
        ? `${totalFiles} files`
        : `${visibleFiles} of ${totalFiles} files${filterLabel}`;
  }

  private currentPath() {
    return this.currentFileIsCommit ? null : (this.files[this.currentFileIndex]?.path ?? null);
  }

  private visibleFileCount() {
    if (!this.fileListFilter) {
      return this.files.length;
    }
    const filter = this.fileListFilter.toLowerCase();
    return this.files.filter(
      (file) =>
        file.path.toLowerCase().includes(filter) ||
        Boolean(file.old_path?.toLowerCase().includes(filter)),
    ).length;
  }

  private computeFileDelta(file: DiffFile) {
    const added = file.hunks.reduce(
      (acc, hunk) => acc + hunk.lines.filter((line) => line.type === 'add').length,
      0,
    );
    const deleted = file.hunks.reduce(
      (acc, hunk) => acc + hunk.lines.filter((line) => line.type === 'delete').length,
      0,
    );
    return { added, deleted };
  }

  private gitStatus(file: DiffFile): GitStatus {
    if (file.status === 'added') {
      return 'added';
    }
    if (file.status === 'deleted') {
      return 'deleted';
    }
    if (file.status === 'renamed') {
      return 'renamed';
    }
    return 'modified';
  }

  private fileTreeCss() {
    return `
      :host {
        flex: 1 1 auto;
        min-height: 0;
        --trees-bg-override: transparent;
        --trees-fg-override: var(--text-primary);
        --trees-fg-muted-override: var(--text-secondary);
        --trees-selected-bg-override: var(--bg-elevated);
        --trees-selected-fg-override: var(--text-primary);
        --trees-selected-focused-border-color-override: var(--accent-color);
        --trees-focus-ring-color-override: var(--accent-color);
        --trees-border-color-override: var(--border-color);
        --trees-border-radius-override: 1px;
        --trees-item-padding-x-override: 3px;
        --trees-item-margin-x-override: 0px;
        --trees-padding-inline-override: 0px;
        --trees-level-gap-override: 2px;
        font-family: var(--font-sans);
      }
      [data-file-tree-virtualized-root] {
        background: transparent;
      }
      [data-type="item"] {
        border-radius: 1px;
        margin: 1px 0;
        box-shadow: inset 0 0 0 1px transparent;
      }
      [data-type="item"]:hover {
        background: var(--bg-elevated);
      }
      [data-item-selected="true"] {
        background: var(--bg-elevated);
        box-shadow: inset 3px 0 0 var(--accent-color);
      }
      [data-item-focused="true"],
      [aria-selected="true"] {
        outline: none;
      }
      [data-item-section="decoration"],
      [data-item-section="git"] {
        font-variant-numeric: tabular-nums;
        color: var(--text-secondary);
      }
    `;
  }
}
