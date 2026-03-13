import { clearEl, el } from './dom';
import type { AppContext, DiffFile } from './types/app';

type TreeFileNode = {
  kind: 'file';
  index: number;
  file: DiffFile;
  label: string;
  added: number;
  deleted: number;
  commentCount: number;
};

type TreeDirNode = {
  kind: 'dir';
  name: string;
  key: string;
  dirs: Map<string, TreeDirNode>;
  files: TreeFileNode[];
  added: number;
  deleted: number;
  commentCount: number;
  fileCount: number;
};

export class FileListMethods {
  declare diff: AppContext['diff'];
  declare currentFileIsCommit: boolean;
  declare commentManager: AppContext['commentManager'];
  declare files: AppContext['files'];
  declare currentFileIndex: number;
  declare collapsedDirs: AppContext['collapsedDirs'];
  declare fileListFilter: AppContext['fileListFilter'];

  setupSidebarResizer() {
    const sidebar = document.getElementById('sidebar') as HTMLDivElement | null;
    const resizer = document.getElementById('sidebar-resizer') as HTMLDivElement | null;
    if (!sidebar || !resizer) {
      return;
    }
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

  setupFileListControls() {
    const filter = document.getElementById('file-list-filter') as HTMLInputElement | null;
    const collapseAll = document.getElementById('collapse-all-dirs');
    const expandAll = document.getElementById('expand-all-dirs');

    if (filter) {
      filter.value = this.fileListFilter;
    }

    filter?.addEventListener('input', () => {
      this.fileListFilter = filter.value.trim().toLowerCase();
      this.renderFileList();
    });

    collapseAll?.addEventListener('click', () => {
      this.collapsedDirs = this.collectDirectoryKeys();
      this.renderFileList();
    });

    expandAll?.addEventListener('click', () => {
      this.collapsedDirs.clear();
      this.renderFileList();
    });
  }

  private computeFileDelta(file: DiffFile) {
    const added = file.hunks.reduce(
      (acc, h) => acc + h.lines.filter((line) => line.type === 'add').length,
      0,
    );
    const deleted = file.hunks.reduce(
      (acc, h) => acc + h.lines.filter((line) => line.type === 'delete').length,
      0,
    );
    return { added, deleted };
  }

  private basename(path: string) {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  private fileLabel(file: DiffFile) {
    if (file.status === 'renamed' && file.old_path) {
      const oldBase = this.basename(file.old_path);
      const newBase = this.basename(file.path);
      return oldBase === newBase ? newBase : `${oldBase} → ${newBase}`;
    }
    return this.basename(file.path);
  }

  private matchesFilter(file: DiffFile, filter: string) {
    if (!filter) {
      return true;
    }
    return (
      file.path.toLowerCase().includes(filter) ||
      Boolean(file.old_path?.toLowerCase().includes(filter))
    );
  }

  private makeDir(name: string, key: string): TreeDirNode {
    return {
      kind: 'dir',
      name,
      key,
      dirs: new Map(),
      files: [],
      added: 0,
      deleted: 0,
      commentCount: 0,
      fileCount: 0,
    };
  }

  private buildFileTree() {
    const root = this.makeDir('', '');
    for (const [index, file] of this.files.entries()) {
      const { added, deleted } = this.computeFileDelta(file);
      const commentCount = this.commentManager.getCommentsForFile(file.path).length;
      const fileNode: TreeFileNode = {
        kind: 'file',
        index,
        file,
        label: this.fileLabel(file),
        added,
        deleted,
        commentCount,
      };

      const dirParts = file.path.split('/').slice(0, -1);
      let cursor = root;
      cursor.added += added;
      cursor.deleted += deleted;
      cursor.commentCount += commentCount;
      cursor.fileCount += 1;
      let key = '';
      for (const part of dirParts) {
        key = key ? `${key}/${part}` : part;
        let child = cursor.dirs.get(part);
        if (!child) {
          child = this.makeDir(part, key);
          cursor.dirs.set(part, child);
        }
        child.added += added;
        child.deleted += deleted;
        child.commentCount += commentCount;
        child.fileCount += 1;
        cursor = child;
      }
      cursor.files.push(fileNode);
    }
    return root;
  }

  private collectDirectoryKeys() {
    const out = new Set<string>();
    for (const file of this.files) {
      let key = '';
      for (const part of file.path.split('/').slice(0, -1)) {
        key = key ? `${key}/${part}` : part;
        out.add(key);
      }
    }
    return out;
  }

  expandCurrentFileAncestors() {
    if (this.currentFileIsCommit) {
      return;
    }
    const file = this.files[this.currentFileIndex];
    if (!file) {
      return;
    }
    let key = '';
    for (const part of file.path.split('/').slice(0, -1)) {
      key = key ? `${key}/${part}` : part;
      this.collapsedDirs.delete(key);
    }
  }

  private renderCommitRow(list: HTMLElement) {
    const hasCommit = this.diff !== null && (this.diff.commit_message || this.diff.commit_hash);
    if (!hasCommit) {
      return;
    }

    const li = el('li', {
      className: `tree-row ${this.currentFileIsCommit ? 'active' : ''}`,
      attrs: { 'data-commit': '1' },
    });

    const left = el('span', { className: 'file-left' }, [
      el('span', { className: 'tree-toggle-spacer' }),
      el('span', { className: 'file-name', text: 'Commit' }),
    ]);
    const commentCount = this.commentManager.getCommentsForFile('(commit)').length;
    if (commentCount > 0) {
      left.appendChild(el('span', { className: 'file-comment-badge', text: String(commentCount) }));
    }

    const right = el('span', { className: 'file-right' }, [
      el('span', { className: 'file-status', text: 'C' }),
    ]);

    li.appendChild(el('span', { className: 'tree-row-content' }, [left, right]));
    list.appendChild(li);
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

  private makeDirectoryRow(dir: TreeDirNode, isCollapsed: boolean) {
    return el(
      'li',
      {
        className: 'tree-row directory-row',
        attrs: {
          'data-dir-key': dir.key,
          'aria-expanded': String(!isCollapsed),
        },
      },
      [
        el('span', { className: 'tree-row-content' }, [
          el('span', { className: 'file-left' }, [
            el('button', {
              className: 'tree-toggle',
              text: isCollapsed ? '▸' : '▾',
              attrs: {
                type: 'button',
                'aria-label': `${isCollapsed ? 'Expand' : 'Collapse'} ${dir.key}`,
              },
            }),
            el('span', { className: 'file-name', text: dir.name }),
            dir.commentCount > 0
              ? el('span', { className: 'file-comment-badge', text: String(dir.commentCount) })
              : null,
          ]),
          el('span', { className: 'file-right' }, [
            el('span', { className: 'file-delta' }, [
              el('span', { className: 'delta-add', text: `+${dir.added}` }),
              ' ',
              el('span', { className: 'delta-del', text: `-${dir.deleted}` }),
            ]),
            el('span', { className: 'file-status', text: String(dir.fileCount) }),
          ]),
        ]),
      ],
    );
  }

  private makeFileRow(node: TreeFileNode) {
    const isActive = !this.currentFileIsCommit && node.index === this.currentFileIndex;
    const li = el('li', {
      className: `tree-row ${isActive ? 'active' : ''}`,
      attrs: {
        'data-index': node.index,
        title:
          node.file.status === 'renamed' && node.file.old_path
            ? `${node.file.old_path} → ${node.file.path}`
            : node.file.path,
      },
    });

    const left = el('span', { className: 'file-left' }, [
      el('span', { className: 'tree-toggle-spacer' }),
      el('span', { className: 'file-name', text: node.label }),
      node.commentCount > 0
        ? el('span', { className: 'file-comment-badge', text: String(node.commentCount) })
        : null,
    ]);

    const right = el('span', { className: 'file-right' }, [
      el('span', { className: 'file-delta' }, [
        el('span', { className: 'delta-add', text: `+${node.added}` }),
        ' ',
        el('span', { className: 'delta-del', text: `-${node.deleted}` }),
      ]),
      el('span', {
        className: `file-status ${node.file.status}`,
        text: node.file.status.charAt(0).toUpperCase(),
      }),
    ]);

    li.appendChild(el('span', { className: 'tree-row-content' }, [left, right]));
    return li;
  }

  private appendDirectory(
    list: HTMLElement,
    dir: TreeDirNode,
    filter: string,
    forcedVisible: boolean,
  ): number {
    const dirMatches = Boolean(filter) && dir.key.toLowerCase().includes(filter);
    const revealSubtree = forcedVisible || dirMatches;
    const children = el('ul', { className: 'file-tree-children' });
    let visibleFiles = 0;

    const childDirs = Array.from(dir.dirs.values()).sort((a, b) => a.key.localeCompare(b.key));
    for (const childDir of childDirs) {
      visibleFiles += this.appendDirectory(children, childDir, filter, revealSubtree);
    }

    const childFiles = [...dir.files].sort((a, b) => a.file.path.localeCompare(b.file.path));
    for (const fileNode of childFiles) {
      if (!revealSubtree && !this.matchesFilter(fileNode.file, filter)) {
        continue;
      }
      children.appendChild(this.makeFileRow(fileNode));
      visibleFiles += 1;
    }

    if (visibleFiles === 0) {
      return 0;
    }

    const isCollapsed = !filter && this.collapsedDirs.has(dir.key);
    const dirRow = this.makeDirectoryRow(dir, isCollapsed);
    if ((!isCollapsed || filter) && children.childElementCount > 0) {
      dirRow.appendChild(children);
    }
    list.appendChild(dirRow);
    return visibleFiles;
  }

  renderFileList() {
    const list = document.getElementById('file-list');
    if (!list) {
      return;
    }
    clearEl(list);

    const treeRoot = this.buildFileTree();
    list.classList.add('file-tree', 'file-tree-root');

    this.renderCommitRow(list);

    const filter = this.fileListFilter.trim().toLowerCase();
    let visibleFiles = 0;
    const topDirs = Array.from(treeRoot.dirs.values()).sort((a, b) => a.key.localeCompare(b.key));
    for (const dir of topDirs) {
      visibleFiles += this.appendDirectory(list, dir, filter, false);
    }

    const rootFiles = [...treeRoot.files].sort((a, b) => a.file.path.localeCompare(b.file.path));
    for (const fileNode of rootFiles) {
      if (!this.matchesFilter(fileNode.file, filter)) {
        continue;
      }
      list.appendChild(this.makeFileRow(fileNode));
      visibleFiles += 1;
    }

    if (visibleFiles === 0) {
      list.appendChild(el('li', { className: 'file-list-empty', text: 'No files match the current filter.' }));
    }

    this.renderSummary(visibleFiles);

    requestAnimationFrame(() => {
      list.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    });
  }
}
