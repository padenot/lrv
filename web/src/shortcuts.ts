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
  | 'submitLgtm'
  | 'showHelp'
  | 'findStackedDiff'
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
  { keys: ['Mod+Shift+Enter'], action: 'submitReview', description: 'Finish review' },
  { keys: ['Mod+Enter'], action: 'submitLgtm', description: 'LGTM' },
  { keys: ['?'], action: 'showHelp', description: 'Show keyboard shortcuts' },
  { keys: ['Mod+F'], action: 'findStackedDiff', description: 'Find in stacked diff' },
  {
    keys: ['Alt+ArrowDown', 'Mod+Shift+ArrowRight', 'Mod+Shift+L'],
    action: 'nextCommit',
    description: 'Next commit (series mode)',
  },
  {
    keys: ['Alt+ArrowUp', 'Mod+Shift+ArrowLeft', 'Mod+Shift+H'],
    action: 'previousCommit',
    description: 'Previous commit (series mode)',
  },
];

/** Searchfox mouse gestures, listed in the help only when the searchfox setting is on. */
export const SEARCHFOX_SHORTCUTS: Array<Pick<KeyboardShortcut, 'keys' | 'description'>> = [
  { keys: ['Mod+click'], description: 'Searchfox: go to definition' },
  { keys: ['Mod+Alt+click'], description: 'Searchfox: find uses' },
  { keys: ['Mod+Shift+click'], description: 'Searchfox: definition in a new tab' },
  { keys: ['Mod+Alt+Shift+click'], description: 'Searchfox: uses in a new tab' },
];
