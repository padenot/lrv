export const MONACO_HIDE_UNCHANGED = {
  enabled: true,
  contextLineCount: 8,
  minimumLineCount: 3,
  revealLineCount: 20,
};

import type { DiffHunk, DiffLine, HunkRange } from './types/app';

export function computeHunkRanges(hunks: DiffHunk[]): { hunkRanges: HunkRange[] } {
  const hunkRanges: HunkRange[] = [];
  hunks.forEach((hunk) => {
    const newLines = hunk.lines
      .filter((l): l is DiffLine & { new_line: number } => l.new_line !== undefined)
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
          l.old_line !== undefined && l.type === 'delete',
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
