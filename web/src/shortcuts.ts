// @ts-nocheck
export const KEYBOARD_SHORTCUTS = [
  { keys: ['Mod+ArrowDown', 'Mod+J'], action: 'nextFile', description: 'Next file' },
  { keys: ['Mod+ArrowUp', 'Mod+K'], action: 'previousFile', description: 'Previous file' },
  { keys: ['Shift+ArrowDown', 'Shift+J'], action: 'nextHunk', description: 'Next hunk' },
  { keys: ['Shift+ArrowUp', 'Shift+K'], action: 'previousHunk', description: 'Previous hunk' },
  { keys: ['ArrowDown', 'j'], action: 'lineDown', description: 'Next changed line' },
  { keys: ['ArrowUp', 'k'], action: 'lineUp', description: 'Previous changed line' },
  { keys: ['s'], action: 'toggleView', description: 'Toggle inline/side-by-side' },
  { keys: ['Enter'], action: 'openComment', description: 'Comment on focused line' },
  { keys: ['Escape'], action: 'clearFocus', description: 'Clear focus' },
  { keys: ['Mod+Shift+Enter'], action: 'submitReview', description: 'Submit review' },
  { keys: ['?'], action: 'showHelp', description: 'Show keyboard shortcuts' },
];
