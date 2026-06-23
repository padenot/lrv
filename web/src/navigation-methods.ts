import { IS_MAC } from './platform';
import { KEYBOARD_SHORTCUTS, type KeyboardAction } from './shortcuts';
import { prefersReducedMotion } from './font';
import { showNavIndicator } from './ui-signals';
import { openModal } from './modal';
import { clearEl, el } from './dom';
import type { AppContext, Side } from './types/app';
import type { editor } from 'monaco-editor';

export class NavigationMethods {
  declare currentWidget: AppContext['currentWidget'];
  declare isInline: boolean;
  declare currentFileIndex: number;
  declare files: AppContext['files'];
  declare fileHunks: AppContext['fileHunks'];
  declare currentHunkIndex: AppContext['currentHunkIndex'];
  declare editor: AppContext['editor'];
  declare currentFocusedLine: AppContext['currentFocusedLine'];
  declare focusedHunkDecorationsNew: AppContext['focusedHunkDecorationsNew'];
  declare focusedHunkDecorationsOld: AppContext['focusedHunkDecorationsOld'];
  declare focusedLineDecorationsNew: AppContext['focusedLineDecorationsNew'];
  declare focusedLineDecorationsOld: AppContext['focusedLineDecorationsOld'];
  declare loadFile: (index: number) => Promise<void>;
  declare isAddedFile: AppContext['isAddedFile'];
  declare showSubmitConfirmation: () => Promise<void>;
  declare showKeyboardHelp: () => void;
  declare showCommentDialog: AppContext['showCommentDialog'];
  declare nextCommit: () => void;
  declare previousCommit: () => void;
  declare currentFileIsCommit: AppContext['currentFileIsCommit'];
  declare fetchFilePair: AppContext['fetchFilePair'];

  private getCurrentFile() {
    return this.files[this.currentFileIndex]!;
  }

  showContextPeek() {
    if (this.currentFileIsCommit) {
      showNavIndicator('Context peek is for file diffs');
      return;
    }

    const file = this.getCurrentFile();
    if (!file) {
      return;
    }
    if (file.is_binary) {
      showNavIndicator('Binary file has no text context');
      return;
    }

    const fileHunks = this.fileHunks[file.path];
    const activeHunk = fileHunks?.[this.currentHunkIndex[file.path] ?? 0];
    const initialSide: Side = this.currentFocusedLine?.side ?? activeHunk?.side ?? 'new';
    const initialLine = this.currentFocusedLine?.line ?? activeHunk?.start ?? 1;
    let side: Side = initialSide;
    let centerLine = initialLine;
    const pageSize = 20;

    const { modal, body, footer, close } = openModal({
      title: `Peek Context: ${file.path}`,
      titleId: 'peek-context-dialog',
      footerContent: [],
    });
    modal.classList.add('context-peek-modal');
    body.classList.add('context-peek-body');
    footer.classList.add('context-peek-footer');

    const controls = el('div', { className: 'context-peek-controls' });
    const sideLabel = el('span', { className: 'context-peek-side-label' });
    const sideNew = el('button', { className: 'btn-secondary', text: 'New side' });
    const sideOld = el('button', { className: 'btn-secondary', text: 'Old side' });
    const prevBtn = el('button', { className: 'btn-secondary', text: 'Prev 20' });
    const nextBtn = el('button', { className: 'btn-secondary', text: 'Next 20' });
    const closeBtn = el('button', { className: 'btn-primary', text: 'Close' });
    const title = el('div', { className: 'context-peek-title' });
    const pre = el('pre', { className: 'context-peek-code' });
    const empty = el('div', { className: 'context-peek-empty' });

    controls.append(sideLabel, sideNew, sideOld, prevBtn, nextBtn);
    body.append(controls, title, pre, empty);
    footer.appendChild(closeBtn);

    closeBtn.onclick = close;
    empty.style.display = 'none';

    const render = async () => {
      const pair = await this.fetchFilePair(file.path);
      const text = side === 'old' ? pair.old : pair.new;
      const lines = text.split('\n');
      const maxLine = Math.max(1, lines.length - (text.endsWith('\n') ? 1 : 0));
      centerLine = Math.min(Math.max(centerLine, 1), maxLine);
      const start = Math.max(1, centerLine - pageSize);
      const end = Math.min(maxLine, centerLine + pageSize);

      sideLabel.textContent = `${side === 'old' ? 'Old' : 'New'} side`;
      title.textContent = `${file.path}:${start}-${end}`;
      sideNew.classList.toggle('active', side === 'new');
      sideOld.classList.toggle('active', side === 'old');
      sideNew.disabled = !pair.new;
      sideOld.disabled = !pair.old;
      prevBtn.disabled = start <= 1;
      nextBtn.disabled = end >= maxLine;

      if (maxLine === 0 || !text) {
        clearEl(pre);
        pre.style.display = 'none';
        empty.style.display = '';
        empty.textContent = `No ${side} text is available for this file.`;
        return;
      }

      pre.style.display = '';
      empty.style.display = 'none';
      clearEl(pre);
      for (let lineNo = start; lineNo <= end; lineNo++) {
        const row = el('div', {
          className: `context-peek-line${lineNo === centerLine ? ' active' : ''}`,
        });
        row.append(
          el('span', { className: 'context-peek-gutter', text: String(lineNo) }),
          el('span', {
            className: 'context-peek-text',
            text: lines[lineNo - 1] ?? '',
          }),
        );
        pre.appendChild(row);
      }
    };

    sideNew.onclick = () => {
      side = 'new';
      void render();
    };
    sideOld.onclick = () => {
      side = 'old';
      void render();
    };
    prevBtn.onclick = () => {
      centerLine = Math.max(1, centerLine - pageSize);
      void render();
    };
    nextBtn.onclick = () => {
      centerLine += pageSize;
      void render();
    };

    void render();
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Modal-specific key handlers take precedence while a modal is open.
      if (document.querySelector('.submit-modal-overlay')) {
        return;
      }

      // Never handle shortcuts while authoring text (inputs, textareas, contenteditable)
      const activeElement = (document.activeElement || document.body) as HTMLElement;
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
        case 'nextCommit':
          this.nextCommit();
          break;
        case 'previousCommit':
          this.previousCommit();
          break;
      }
    });
  }

  toggleView() {
    this.isInline = !this.isInline;
    this.loadFile(this.currentFileIndex);
    const file = this.getCurrentFile();
    const isAddedFile = this.isAddedFile(file);
    if (isAddedFile) {
      showNavIndicator('Inline (new file)');
      return;
    }
    showNavIndicator(this.isInline ? 'Inline' : 'Side-by-Side');
  }

  matchKeyboardShortcut(e: KeyboardEvent): KeyboardAction | null {
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

  matchesKeyCombo(e: KeyboardEvent, combo: string, modKey: boolean): boolean {
    const parts = combo.split('+');
    let needsMod = false;
    let needsShift = false;
    let needsAlt = false;
    let key = '';

    for (const part of parts) {
      if (part === 'Mod') {
        needsMod = true;
      } else if (part === 'Shift') {
        needsShift = true;
      } else if (part === 'Alt') {
        needsAlt = true;
      } else {
        key = part;
      }
    }

    // Check Mod key
    if (needsMod !== modKey) {
      return false;
    }

    // Check Alt key
    if (needsAlt !== e.altKey) {
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
    const file = this.getCurrentFile();
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      this.nextFile();
      return;
    }

    const currentIdx = this.currentHunkIndex[file.path] ?? 0;
    if (currentIdx >= hunks.length - 1) {
      this.nextFile();
    } else {
      const nextIdx = currentIdx + 1;
      this.currentHunkIndex[file.path] = nextIdx;
      this.jumpToHunk(nextIdx);
    }
  }

  previousHunk() {
    const file = this.getCurrentFile();
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      this.previousFile();
      return;
    }

    const currentIdx = this.currentHunkIndex[file.path] ?? 0;
    if (currentIdx <= 0) {
      this.previousFile();
    } else {
      const prevIdx = currentIdx - 1;
      this.currentHunkIndex[file.path] = prevIdx;
      this.jumpToHunk(prevIdx);
    }
  }

  jumpToHunk(hunkIndex: number) {
    if (!this.editor) {
      return;
    }

    const file = this.getCurrentFile();
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunkIndex >= hunks.length) {
      return;
    }

    const hunkRange = hunks[hunkIndex]!;
    const reduceMotion = prefersReducedMotion();
    const smooth = monaco.editor.ScrollType.Smooth;

    if (hunkRange.side === 'old') {
      const originalEditor = this.editor.getOriginalEditor();
      originalEditor.revealLineInCenter(
        hunkRange.start,
        reduceMotion ? monaco.editor.ScrollType.Immediate : smooth,
      );
      this.highlightFocusedHunk(hunkRange.start, hunkRange.end, 'old');
      this.setFocusedLine('old', hunkRange.start, false);
      const idx = (this.currentHunkIndex[file.path] ?? 0) + 1;
      const total = hunks.length;
      showNavIndicator(`Hunk ${idx}/${total} • old`);
    } else {
      const modifiedEditor = this.editor.getModifiedEditor();
      modifiedEditor.revealLineInCenter(
        hunkRange.start,
        reduceMotion ? monaco.editor.ScrollType.Immediate : smooth,
      );
      this.highlightFocusedHunk(hunkRange.start, hunkRange.end, 'new');
      this.setFocusedLine('new', hunkRange.start, false);
      const idx = (this.currentHunkIndex[file.path] ?? 0) + 1;
      const total = hunks.length;
      showNavIndicator(`Hunk ${idx}/${total} • new`);
    }
  }

  highlightFocusedHunk(startLine: number, endLine: number, side: Side = 'new') {
    if (!this.editor) {
      return;
    }

    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();

    const decorations: editor.IModelDeltaDecoration[] = [];
    for (let line = startLine; line <= endLine; line++) {
      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: { isWholeLine: true, className: 'focused-hunk-line' },
      });
    }

    // Clear both sides, then apply to the chosen side
    this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations(
      this.focusedHunkDecorationsNew,
      [],
    );
    this.focusedHunkDecorationsOld = originalEditor.deltaDecorations(
      this.focusedHunkDecorationsOld,
      [],
    );
    if (side === 'old') {
      this.focusedHunkDecorationsOld = originalEditor.deltaDecorations([], decorations);
    } else {
      this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations([], decorations);
    }
  }

  setFocusedLine(side: Side, monacoLine: number, reveal = true) {
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
      this.focusedLineDecorationsNew,
      [],
    );
    this.focusedLineDecorationsOld = originalEditor.deltaDecorations(
      this.focusedLineDecorationsOld,
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
    showNavIndicator(`Line ${monacoLine} • ${side === 'old' ? 'old' : 'new'}`);
  }

  moveLine(delta: number) {
    if (!this.editor) {
      return;
    }
    const file = this.getCurrentFile();
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      return;
    }
    // Initialize focus if needed: start of current hunk
    let idx = this.currentHunkIndex[file.path] ?? 0;
    const hr = hunks[idx]!;
    if (!this.currentFocusedLine) {
      const side = hr.side === 'old' ? 'old' : 'new';
      this.setFocusedLine(side, hr.start, true);
      return;
    }

    let { side, line } = this.currentFocusedLine;
    // Verify current focus lies within current hunk; adjust if not
    if (side !== hr.side || line < hr.start || line > hr.end) {
      side = hr.side === 'old' ? 'old' : 'new';
      line = hr.start;
    }

    // Step within hunk
    let nextLine = line + delta;
    if (nextLine >= hr.start && nextLine <= hr.end) {
      this.setFocusedLine(side, nextLine, true);
      return;
    }

    // Move to neighbor hunk
    if (delta > 0 && idx < hunks.length - 1) {
      idx += 1;
      this.currentHunkIndex[file.path] = idx;
      const nhr = hunks[idx]!;
      const ns = nhr.side === 'old' ? 'old' : 'new';
      this.jumpToHunk(idx);
      this.setFocusedLine(ns, nhr.start, true);
    } else if (delta < 0 && idx > 0) {
      idx -= 1;
      this.currentHunkIndex[file.path] = idx;
      const phr = hunks[idx]!;
      const ps = phr.side === 'old' ? 'old' : 'new';
      this.jumpToHunk(idx);
      this.setFocusedLine(ps, phr.end, true);
    }
  }

  clearFocusedHunk() {
    if (!this.editor) {
      return;
    }
    const modifiedEditor = this.editor.getModifiedEditor();
    const originalEditor = this.editor.getOriginalEditor();
    this.focusedHunkDecorationsNew = modifiedEditor.deltaDecorations(
      this.focusedHunkDecorationsNew,
      [],
    );
    this.focusedHunkDecorationsOld = originalEditor.deltaDecorations(
      this.focusedHunkDecorationsOld,
      [],
    );
  }

  openCommentOnCurrentFocus() {
    if (!this.editor) {
      return;
    }

    const file = this.getCurrentFile();
    const hunks = this.fileHunks[file.path];
    if (!hunks || hunks.length === 0) {
      return;
    }

    if (this.currentFocusedLine) {
      const { side, line } = this.currentFocusedLine;
      this.showCommentDialog(file.path, line, line, side);
      return;
    }

    // Fallback to current hunk start if no line is focused
    const currentIdx = this.currentHunkIndex[file.path] ?? 0;
    const hunkRange = hunks[currentIdx]!;
    const side = hunkRange.side === 'old' ? 'old' : 'new';
    this.showCommentDialog(file.path, hunkRange.start, hunkRange.start, side);
  }
}
