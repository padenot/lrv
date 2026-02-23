export const MONACO_HIDE_UNCHANGED = {
  enabled: true,
  contextLineCount: 3,
  minimumLineCount: 3,
  revealLineCount: 20,
};

export function computeHunkRanges(hunks) {
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
  });
  return { hunkRanges };
}
