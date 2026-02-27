import { clearEl, el } from './dom';
import type { AppContext } from './types/app';

export class FileListMethods {
  declare diff: AppContext['diff'];
  declare currentFileIsCommit: boolean;
  declare commentManager: AppContext['commentManager'];
  declare files: AppContext['files'];
  declare currentFileIndex: number;

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

  renderFileList() {
    const list = document.getElementById('file-list');
    if (!list) {
      return;
    }
    clearEl(list);

    // Optional pseudo-file for commit (when reviewing full commits)
    const hasCommit = this.diff !== null && (this.diff.commit_message || this.diff.commit_hash);
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
      const added = file.hunks.reduce(
        (acc, h) => acc + h.lines.filter((line) => line.type === 'add').length,
        0,
      );
      const deleted = file.hunks.reduce(
        (acc, h) => acc + h.lines.filter((line) => line.type === 'delete').length,
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
}
