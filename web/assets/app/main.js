import './perf.js';
import './themes.js';
import { MonacoApp } from './monaco-app.js';

try {
  document.title = 'lrv — Loading…';
} catch {}

window.DEBUG = false;
window.__APP_READY = false;

try {
  if (window.DEBUG) {
    window.addEventListener('error', function (e) {
      try {
        console.log('[onerror]', e.message, e.filename, e.lineno, e.colno);
      } catch (_) {}
    });
  }
} catch (_) {}

try {
  performance.mark('page:script-start');
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      performance.mark('page:dom-content-loaded');
    },
    { once: true },
  );
  window.addEventListener(
    'load',
    () => {
      performance.mark('page:load-event');
    },
    { once: true },
  );
} catch {}

const app = new MonacoApp();
try {
  window.__APP = app;
} catch {}
app.init().then(() => {
  if (window.DEBUG) {
    console.log('Monaco Editor initialized');
  }
});
