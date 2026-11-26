export const MONACO_HIDE_UNCHANGED = {
  enabled: true,
  contextLineCount: 8,
  minimumLineCount: 3,
  revealLineCount: 30,
};

import type { DiffHunk, DiffLine, HunkRange, Side } from './types/app';

export function computeHunkRanges(hunks: DiffHunk[]): { hunkRanges: HunkRange[] } {
  const hunkRanges: HunkRange[] = [];
  hunks.forEach((hunk) => {
    const newLines = hunk.lines
      // Deleted lines have no new line; the server sends it as null.
      .filter((l): l is DiffLine & { new_line: number } => typeof l.new_line === 'number')
      .map((l) => l.new_line);
    if (newLines.length > 0) {
      hunkRanges.push({
        side: 'new',
        start: Math.min(...newLines),
        end: Math.max(...newLines),
      });
    }
    const deletedOldLines = hunk.lines
      .filter(
        (l): l is DiffLine & { old_line: number } =>
          typeof l.old_line === 'number' && l.type === 'delete',
      )
      .map((l) => l.old_line);
    if (deletedOldLines.length > 0) {
      hunkRanges.push({
        side: 'old',
        start: Math.min(...deletedOldLines),
        end: Math.max(...deletedOldLines),
      });
    }
  });
  return { hunkRanges };
}

/** Lines kept visible below (and above) the focused line, so the comment form Enter opens
 * under it is on screen. */
export const FOCUS_MARGIN_LINES = 5;

/** A line keyboard focus rests on. */
export type FocusedLine = { side: Side; line: number };

/** Where keyboard focus lands within a file's hunk ranges. */
export type HunkStep = { hunkIndex: number; focus: FocusedLine };

export function hunkStartFocus(hunk: HunkRange): FocusedLine {
  return { side: hunk.side, line: hunk.start };
}

/**
 * Where j/k move the focus: one line within the current hunk range, then into the
 * neighbouring range (its end going backwards). Without a focused line, the start of
 * the current range. Null past the file's first or last range.
 */
export function stepFocus(
  hunks: HunkRange[],
  hunkIndex: number,
  focus: FocusedLine | null,
  delta: 1 | -1,
): HunkStep | null {
  const hunk = hunks[hunkIndex];
  if (!hunk) {
    return null;
  }
  if (!focus) {
    return { hunkIndex, focus: hunkStartFocus(hunk) };
  }

  let { side, line } = focus;
  // A focus outside the current range restarts at the range's start.
  if (side !== hunk.side || line < hunk.start || line > hunk.end) {
    side = hunk.side;
    line = hunk.start;
  }
  const next = line + delta;
  if (next >= hunk.start && next <= hunk.end) {
    return { hunkIndex, focus: { side, line: next } };
  }

  const adjacentIndex = hunkIndex + delta;
  const adjacent = hunks[adjacentIndex];
  if (!adjacent) {
    return null;
  }
  return {
    hunkIndex: adjacentIndex,
    focus: delta > 0 ? hunkStartFocus(adjacent) : { side: adjacent.side, line: adjacent.end },
  };
}

/** Shift+J/K: the start of the adjacent range. Null past the file's first or last range. */
export function stepHunk(hunks: HunkRange[], hunkIndex: number, delta: 1 | -1): HunkStep | null {
  const adjacentIndex = hunkIndex + delta;
  const adjacent = hunks[adjacentIndex];
  return adjacent ? { hunkIndex: adjacentIndex, focus: hunkStartFocus(adjacent) } : null;
}

/**
 * The line opposite `focus` on the other side, as side-by-side shows it: within a block of
 * consecutive changed lines, the i-th deleted line faces the i-th added line, and lines past
 * the shorter side face its last line. Null for unchanged lines and for a block with nothing on
 * the other side.
 */
export function counterpartLine(hunks: DiffHunk[], focus: FocusedLine): FocusedLine | null {
  for (const hunk of hunks) {
    let block: DiffLine[] = [];
    for (const line of [...hunk.lines, null]) {
      if (line && (line.type === 'add' || line.type === 'delete')) {
        block.push(line);
        continue;
      }
      const deleted = lineNumbers(block, 'delete', 'old_line');
      const added = lineNumbers(block, 'add', 'new_line');
      const [from, to] = focus.side === 'old' ? [deleted, added] : [added, deleted];
      const index = from.indexOf(focus.line);
      if (index !== -1) {
        const line = to[Math.min(index, to.length - 1)];
        return line === undefined ? null : { side: focus.side === 'old' ? 'new' : 'old', line };
      }
      block = [];
    }
  }
  return null;
}

function lineNumbers(block: DiffLine[], type: string, side: 'old_line' | 'new_line'): number[] {
  return block
    .filter((line) => line.type === type)
    .map((line) => line[side])
    .filter((line): line is number => typeof line === 'number');
}
