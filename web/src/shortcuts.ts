export type KeyboardAction =
  | 'nextFile'
  | 'previousFile'
  | 'nextHunk'
  | 'previousHunk'
  | 'lineDown'
  | 'lineUp'
  | 'toggleView'
  | 'openComment'
  | 'clearFocus'
  | 'submitReview'
  | 'showHelp'
  | 'nextCommit'
  | 'previousCommit';

export type KeyboardShortcut = {
  keys: string[];
  action: KeyboardAction;
  description: string;
};

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
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
  { keys: ['Mod+Shift+ArrowRight', 'Mod+Shift+L'], action: 'nextCommit', description: 'Next commit (series mode)' },
  { keys: ['Mod+Shift+ArrowLeft', 'Mod+Shift+H'], action: 'previousCommit', description: 'Previous commit (series mode)' },
];
