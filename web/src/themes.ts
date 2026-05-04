import type { editor } from 'monaco-editor';

type ThemeMap = Record<string, editor.IStandaloneThemeData>;
export type UIThemeDefinition = {
  rules?: Array<{ token?: string; foreground?: string }>;
};
export type UIThemeDefinitionMap = Record<string, UIThemeDefinition>;

export const CUSTOM_THEMES: ThemeMap = {
  'solarized-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '7b9ea6', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'number', foreground: 'd33682' },
      { token: 'string', foreground: '2aa198' },
      { token: 'type', foreground: 'b58900' },
      { token: 'class', foreground: 'b58900' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '268bd2' },
      { token: 'constant', foreground: 'd33682' },
    ],
    colors: {
      'editor.background': '#002b36',
      'editor.foreground': '#839496',
      'editor.lineHighlightBackground': '#073642',
      'editorCursor.foreground': '#839496',
      'editor.selectionBackground': '#073642',
      'editor.inactiveSelectionBackground': '#073642',
    },
  },
  'solarized-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '546e75', fontStyle: 'italic' },
      { token: 'keyword', foreground: '859900' },
      { token: 'number', foreground: 'd33682' },
      { token: 'string', foreground: '2aa198' },
      { token: 'type', foreground: 'b58900' },
      { token: 'class', foreground: 'b58900' },
      { token: 'function', foreground: '268bd2' },
      { token: 'variable', foreground: '268bd2' },
      { token: 'constant', foreground: 'd33682' },
    ],
    colors: {
      'editor.background': '#fdf6e3',
      'editor.foreground': '#657b83',
      'editor.lineHighlightBackground': '#eee8d5',
      'editorCursor.foreground': '#657b83',
      'editor.selectionBackground': '#eee8d5',
      'editor.inactiveSelectionBackground': '#eee8d5',
    },
  },
  'firefox-devtools-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5c6773', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7de9' },
      { token: 'number', foreground: '75bfff' },
      { token: 'string', foreground: '86de74' },
      { token: 'type', foreground: '75bfff' },
      { token: 'class', foreground: 'ff9400' },
      { token: 'function', foreground: 'ff9400' },
      { token: 'variable', foreground: 'b1b1b3' },
      { token: 'constant', foreground: '75bfff' },
    ],
    colors: {
      'editor.background': '#0c0c0d',
      'editor.foreground': '#b1b1b3',
      'editor.lineHighlightBackground': '#1c1b22',
      'editorCursor.foreground': '#b1b1b3',
      'editor.selectionBackground': '#2b2a33',
      'editor.inactiveSelectionBackground': '#1c1b22',
    },
  },
  'firefox-devtools-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '737373', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'd92bb4' },
      { token: 'number', foreground: '0074e8' },
      { token: 'string', foreground: '058b00' },
      { token: 'type', foreground: '0074e8' },
      { token: 'class', foreground: 'c43500' },
      { token: 'function', foreground: 'c43500' },
      { token: 'variable', foreground: '222222' },
      { token: 'constant', foreground: '0074e8' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#222222',
      'editor.lineHighlightBackground': '#f5f5f5',
      'editorCursor.foreground': '#222222',
      'editor.selectionBackground': '#e6e6e6',
      'editor.inactiveSelectionBackground': '#f0f0f0',
    },
  },
  'github-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '8b949e', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'ff7b72' },
      { token: 'number', foreground: '79c0ff' },
      { token: 'string', foreground: 'a5d6ff' },
      { token: 'type', foreground: 'ffa657' },
      { token: 'class', foreground: 'ffa657' },
      { token: 'function', foreground: 'd2a8ff' },
      { token: 'variable', foreground: 'ffa657' },
      { token: 'constant', foreground: '79c0ff' },
    ],
    colors: {
      'editor.background': '#0d1117',
      'editor.foreground': '#c9d1d9',
      'editor.lineHighlightBackground': '#161b22',
      'editorCursor.foreground': '#c9d1d9',
      'editor.selectionBackground': '#1f6feb',
      'editor.inactiveSelectionBackground': '#1f6feb40',
    },
  },
  'github-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6e7781', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'cf222e' },
      { token: 'number', foreground: '0550ae' },
      { token: 'string', foreground: '0a3069' },
      { token: 'type', foreground: '8250df' },
      { token: 'class', foreground: '8250df' },
      { token: 'function', foreground: '8250df' },
      { token: 'variable', foreground: '953800' },
      { token: 'constant', foreground: '0550ae' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292f',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorCursor.foreground': '#24292f',
      'editor.selectionBackground': '#0969da30',
      'editor.inactiveSelectionBackground': '#0969da20',
    },
  },
};

export const UI_THEME_ACCENTS_HEX = {
  'firefox-devtools-dark': '#ff7de9',
  'firefox-devtools-light': '#d92bb4',
  'github-dark': '#58a6ff',
  'github-light': '#0969da',
  'solarized-dark': '#268bd2',
  'solarized-light': '#268bd2',
  'vs-dark': '#007acc',
  'hc-black': '#007acc',
  vs: '#007acc',
  'hc-light': '#007acc',
} as const;
window.UIThemeAccentsHex = UI_THEME_ACCENTS_HEX;
