import './perf.js';
import './themes.js';
import { MonacoApp } from './monaco-app.js';

document.title = 'lrv — Loading…';

window.DEBUG = false;
window.__APP_READY = false;

if (window.DEBUG) {
  window.addEventListener('error', function (e) {
    console.log('[onerror]', e.message, e.filename, e.lineno, e.colno);
  });
}

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

const app = new MonacoApp();
window.__APP = app;
app.init().then(() => {
  if (window.DEBUG) {
    console.log('Monaco Editor initialized');
  }
});
