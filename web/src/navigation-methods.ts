import { IS_MAC } from './platform';
import { KEYBOARD_SHORTCUTS, shortcutKeys, type KeyboardAction } from './shortcuts';
import { prefersReducedMotion } from './font';
import {
  FOCUS_MARGIN_LINES,
  counterpartLine,
  hunkStartFocus,
  stepFocus,
  stepHunk,
  type FocusedLine,
} from './diff-utils';
import type { AppContext, DiffFile, HunkRange, Side } from './types/app';
import type { editor } from 'monaco-editor';

export class NavigationMethods {
  declare currentWidget: AppContext['currentWidget'];
  declare isStacked: boolean;
  declare isInline: boolean;
  declare currentFileIndex: number;
  declare currentFileIsCommit: boolean;
  declare files: AppContext['files'];
  declare fileHunks: AppContext['fileHunks'];
  declare currentHunkIndex: AppContext['currentHunkIndex'];
  declare initFileHunks: AppContext['initFileHunks'];
  declare editor: AppContext['editor'];
  declare currentFocusedLine: AppContext['currentFocusedLine'];
  declare focusedHunkDecorationsNew: AppContext['focusedHunkDecorationsNew'];
  declare focusedHunkDecorationsOld: AppContext['focusedHunkDecorationsOld'];
  declare focusedLineDecorationsNew: AppContext['focusedLineDecorationsNew'];
  declare focusedLineDecorationsOld: AppContext['focusedLineDecorationsOld'];
  declare loadFile: (index: number) => Promise<void>;
  declare scrollToFileInStacked: AppContext['scrollToFileInStacked'];
  declare showStackedFocus: (focus: FocusedLine, align: 'nearest' | 'center') => void;
  declare clearStackedFocus: () => void;
  declare openStackedDraft: (file: string, lineNumber: number, side: Side) => void;
  declare updateStackedDiffStyle: () => void;
  declare isAddedFile: AppContext['isAddedFile'];
  declare showKeyboardHelp: () => void;
  declare openStackedSearch: () => boolean;
  declare showCommentDialog: AppContext['showCommentDialog'];
  declare nextCommit: () => void;
  declare previousCommit: () => void;

  private getCurrentFile() {
    return this.files[this.currentFileIndex]!;
  }

  /** The file's changed ranges. The stacked view never loads a file, so they may not exist yet. */
  private hunksOf(file: DiffFile): HunkRange[] {
    this.initFileHunks(file);
    return this.fileHunks[file.path]!;
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Modal-specific key handlers take precedence while a modal is open.
      if (document.querySelector('.submit-modal-overlay')) {
        return;
      }

      // The composed path reaches text fields inside shadow DOM, such as stacked Find.
      const target = e.composedPath()[0];
      if (
        target instanceof HTMLElement &&
        (target.matches('input, textarea') || target.isContentEditable)
      ) {
        return;
      }

      // If a comment widget is open, disable all global shortcuts
      if (this.currentWidget !== null) {
        return;
      }

      // Match key event to shortcut
      const action = this.matchKeyboardShortcut(e);
      if (action === 'findStackedDiff') {
        if (!e.defaultPrevented && this.openStackedSearch()) {
          e.preventDefault();
        }
        return;
      }
      if (!action || !this.canRunShortcut(action)) {
        return;
      }
      if (action === 'submitLgtm' && (e.defaultPrevented || e.repeat)) {
        return;
      }
      // Escape closes an open menu, and a text field's own handler (stacked Find) takes it
      // first; only a bare Escape clears the focus.
      if (
        action === 'clearFocus' &&
        (e.defaultPrevented || document.querySelector('.context-menu'))
      ) {
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
        case 'oldSide':
          this.moveSide('old');
          break;
        case 'newSide':
          this.moveSide('new');
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
          // Goes through the button so that, with several destinations, the menu opens.
          document.getElementById('submit-review')?.click();
          break;
        case 'submitLgtm':
          document.getElementById('submit-lgtm')?.click();
          break;
        case 'showHelp':
          this.showKeyboardHelp();
          break;
        case 'clearFocus':
          if (this.isStacked) {
            this.clearStackedFocus();
          } else {
            this.clearFocusedHunk();
          }
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

  // Focus shortcuts need a visible code view. Where there is none, their keys stay with
  // the browser (e.g. scrolling).
  private canRunShortcut(action: KeyboardAction) {
    const needsCodeView =
      action === 'lineDown' ||
      action === 'lineUp' ||
      action === 'oldSide' ||
      action === 'newSide' ||
      action === 'openComment' ||
      action === 'clearFocus';
    return !needsCodeView || this.hasCodeView();
  }

  private hasCodeView() {
    if (this.isStacked) {
      return !this.currentFileIsCommit && this.files.length > 0;
    }
    return !!this.editor;
  }

  toggleView() {
    this.isInline = !this.isInline;
    this.updateViewToggleLabel();
    if (this.isStacked) {
      this.updateStackedDiffStyle();
    } else {
      this.loadFile(this.currentFileIndex);
    }
  }

  updateViewToggleLabel() {
    const btn = document.getElementById('toggle-view');
    if (!btn) {
      return;
    }
    btn.textContent = this.isInline ? 'View: Inline' : 'View: Side-by-Side';
    btn.setAttribute('aria-pressed', String(this.isInline));
  }

  matchKeyboardShortcut(e: KeyboardEvent): KeyboardAction | null {
    const modKey = IS_MAC ? e.metaKey : e.ctrlKey;

    for (const shortcut of KEYBOARD_SHORTCUTS) {
      for (const keyCombo of shortcutKeys(shortcut, this.isStacked)) {
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

    // Letter shortcuts use physical key positions.
    const isLetter = key.length === 1 && /[a-z]/i.test(key);
    if (isLetter) {
      const code = 'Key' + key.toUpperCase();
      return e.code === code;
    }
    // Use the character produced by the active layout for punctuation.
    return e.key === key;
  }

  nextFile() {
    if (this.currentFileIndex < this.files.length - 1) {
      this.openFile(this.currentFileIndex + 1);
    }
  }

  previousFile() {
    if (this.currentFileIndex > 0) {
      this.openFile(this.currentFileIndex - 1);
    }
  }

  /** Opens a file from the keyboard. Loading a file focuses its current hunk; so does this. */
  private openFile(index: number) {
    if (!this.isStacked) {
      this.loadFile(index);
      return;
    }
    void this.scrollToFileInStacked(index).then(() => {
      if (!this.isStacked || this.currentFileIndex !== index) {
        return;
      }
      const file = this.files[index]!;
      const hunks = this.hunksOf(file);
      const hunk = hunks[this.currentHunkIndex[file.path] ?? 0];
      // The file's top is already in view; centring a line near it would move the file header
      // out of view and make the scroll sync pick the previous file.
      if (hunk) {
        this.showStackedFocus(hunkStartFocus(hunk), 'nearest');
      }
    });
  }

  nextHunk() {
    this.jumpHunk(1);
  }

  previousHunk() {
    this.jumpHunk(-1);
  }

  /** Shift+J/K: the adjacent hunk, or the adjacent file past the file's first or last hunk. */
  private jumpHunk(delta: 1 | -1) {
    const file = this.getCurrentFile();
    const step = stepHunk(this.hunksOf(file), this.currentHunkIndex[file.path] ?? 0, delta);
    if (!step) {
      if (delta > 0) {
        this.nextFile();
      } else {
        this.previousFile();
      }
      return;
    }
    this.currentHunkIndex[file.path] = step.hunkIndex;
    if (this.isStacked) {
      this.showStackedFocus(step.focus, 'center');
    } else {
      this.jumpToHunk(step.hunkIndex);
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
    } else {
      const modifiedEditor = this.editor.getModifiedEditor();
      modifiedEditor.revealLineInCenter(
        hunkRange.start,
        reduceMotion ? monaco.editor.ScrollType.Immediate : smooth,
      );
      this.highlightFocusedHunk(hunkRange.start, hunkRange.end, 'new');
      this.setFocusedLine('new', hunkRange.start, false);
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
        revealWithMargin(originalEditor, monacoLine, scrollType);
      }
    } else {
      this.focusedLineDecorationsNew = modifiedEditor.deltaDecorations([], dec);
      if (reveal) {
        revealWithMargin(modifiedEditor, monacoLine, scrollType);
      }
    }
  }

  moveLine(delta: 1 | -1) {
    const file = this.getCurrentFile();
    const hunkIndex = this.currentHunkIndex[file.path] ?? 0;
    const step = stepFocus(this.hunksOf(file), hunkIndex, this.currentFocusedLine, delta);
    if (!step) {
      return;
    }
    this.currentHunkIndex[file.path] = step.hunkIndex;
    const hunkChanged = step.hunkIndex !== hunkIndex;
    if (this.isStacked) {
      this.showStackedFocus(step.focus, hunkChanged ? 'center' : 'nearest');
      return;
    }
    if (hunkChanged) {
      this.jumpToHunk(step.hunkIndex);
    }
    this.setFocusedLine(step.focus.side, step.focus.line, true);
  }

  /** h/l: focus the changed line opposite the focused one, on `side`. */
  moveSide(side: Side) {
    const focus = this.currentFocusedLine;
    if (!focus || focus.side === side) {
      return;
    }
    const file = this.getCurrentFile();
    const target = counterpartLine(file.hunks, focus);
    if (!target) {
      return;
    }
    const hunkIndex = this.hunksOf(file).findIndex(
      (hunk) => hunk.side === target.side && hunk.start <= target.line && target.line <= hunk.end,
    );
    if (hunkIndex !== -1) {
      this.currentHunkIndex[file.path] = hunkIndex;
    }
    if (this.isStacked) {
      this.showStackedFocus(target, 'nearest');
      return;
    }
    this.setFocusedLine(target.side, target.line, true);
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
    const file = this.getCurrentFile();
    const hunk = this.hunksOf(file)[this.currentHunkIndex[file.path] ?? 0];
    // Without a focused line, comment on the first line of the current hunk.
    const target = this.currentFocusedLine ?? (hunk ? hunkStartFocus(hunk) : null);
    if (!target) {
      return;
    }
    if (this.isStacked) {
      this.openStackedDraft(file.path, target.line, target.side);
    } else {
      this.showCommentDialog(file.path, target.line, target.line, target.side);
    }
  }
}

/** Shows `line` with `FOCUS_MARGIN_LINES` of room around it, so the comment form Enter opens
 * below it is on screen; centres it when it is off screen. */
function revealWithMargin(
  target: editor.IStandaloneCodeEditor,
  line: number,
  scrollType: editor.ScrollType,
) {
  target.revealLineInCenterIfOutsideViewport(line, scrollType);
  const lineCount = target.getModel()?.getLineCount() ?? line;
  // revealLine scrolls only as far as needed to show the given line.
  target.revealLine(Math.min(line + FOCUS_MARGIN_LINES, lineCount), scrollType);
  target.revealLine(Math.max(line - FOCUS_MARGIN_LINES, 1), scrollType);
}
