export const MONACO_HIDE_UNCHANGED = {
  enabled: true,
  contextLineCount: 3,
  minimumLineCount: 3,
  revealLineCount: 20,
};

type DiffLine = {
  new_line?: number;
  old_line?: number;
  type?: string;
};

type Hunk = {
  lines: DiffLine[];
};

type HunkRange = {
  side: 'old' | 'new';
  start: number;
  end: number;
};

export function computeHunkRanges(hunks: Hunk[] | null | undefined): { hunkRanges: HunkRange[] } {
  const hunkRanges: HunkRange[] = [];
  (hunks || []).forEach((hunk) => {
    const newLines = hunk.lines
      .filter((l): l is DiffLine & { new_line: number } => Boolean(l.new_line))
      .map((l) => l.new_line);
    if (newLines.length > 0) {
      hunkRanges.push({
        side: 'new',
        start: Math.min(...newLines),
        end: Math.max(...newLines),
      });
    }
    const deletedOldLines = hunk.lines
      .filter((l): l is DiffLine & { old_line: number } => Boolean(l.old_line) && l.type === 'delete')
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
