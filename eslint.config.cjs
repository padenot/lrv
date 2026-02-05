// Flat config for ESLint v9+/v10+
// Lints JS/TS and inline scripts in HTML; enforces curly braces on all blocks.
const html = require('eslint-plugin-html');
let tsParser, tsPlugin;
try {
  tsParser = require('@typescript-eslint/parser');
  tsPlugin = require('@typescript-eslint/eslint-plugin');
} catch (_) {
  // TS linting will be skipped if deps not installed; user can npm i -D @typescript-eslint/{parser,eslint-plugin}
}

module.exports = [
  {
    ignores: [
      'target/',
      'e2e/node_modules/',
      'e2e/playwright-report/',
      'e2e/test-results/',
      'web/assets/vendor/',
      'bench-results/',
    ],
  },
  {
    files: ['**/*.js', '**/*.ts', '**/*.html'],
    plugins: { html },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        performance: 'readonly',
        MutationObserver: 'readonly',
      },
    },
    rules: {
      curly: ['error', 'all'],
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
    },
  },
  // TypeScript-specific override (if deps installed)
  tsParser && tsPlugin
    ? {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
          parser: tsParser,
          ecmaVersion: 2020,
          sourceType: 'module',
        },
        plugins: { '@typescript-eslint': tsPlugin, html },
        rules: {
          curly: ['error', 'all'],
          'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
        },
      }
    : {},
];
