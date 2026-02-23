let navTimer = null;

export function showNavIndicator(text) {
  const indicatorEl = document.getElementById('nav-indicator');
  if (!indicatorEl) {
    return;
  }
  indicatorEl.textContent = text;
  indicatorEl.style.display = 'inline-block';
  if (navTimer) {
    clearTimeout(navTimer);
  }
  navTimer = setTimeout(() => {
    indicatorEl.style.display = 'none';
  }, 900);
}

export function markAppReady() {
  if (window.__APP_READY) {
    return;
  }
  const hasLines = document.querySelectorAll('.monaco-editor .view-lines .view-line').length > 0;
  if (hasLines) {
    if (performance.getEntriesByName('init:first-line-visible').length === 0) {
      window.Perf.mark('init:first-line-visible');
      if (performance.getEntriesByName('init:start').length > 0) {
        window.Perf.measure('init:to-first-line-visible', 'init:start', 'init:first-line-visible');
      }
      if (performance.getEntriesByName('page:script-start').length > 0) {
        window.Perf.measure(
          'page:script-to-first-line-visible',
          'page:script-start',
          'init:first-line-visible',
        );
      }
    }
    window.__APP_READY = true;
    window.Perf.mark('init:app-ready');
    if (performance.getEntriesByName('appInit').length > 0) {
      window.Perf.measure('init:app-ready-after-appInit', 'appInitEnd', 'init:app-ready');
    }
    if (window.DEBUG) {
      console.log('[app] APP_READY: diff lines visible');
    }
    return;
  }
  const container = document.querySelector('.monaco-editor .view-lines');
  if (container && !window.__APP_READY) {
    if (window.DEBUG) {
      console.log('[app] Waiting for first view-line via MutationObserver');
    }
    const obs = new MutationObserver(() => {
      if (document.querySelectorAll('.monaco-editor .view-lines .view-line').length > 0) {
        if (performance.getEntriesByName('init:first-line-visible').length === 0) {
          window.Perf.mark('init:first-line-visible');
          if (performance.getEntriesByName('init:start').length > 0) {
            window.Perf.measure('init:to-first-line-visible', 'init:start', 'init:first-line-visible');
          }
          if (performance.getEntriesByName('page:script-start').length > 0) {
            window.Perf.measure(
              'page:script-to-first-line-visible',
              'page:script-start',
              'init:first-line-visible',
            );
          }
        }
        window.__APP_READY = true;
        window.Perf.mark('init:app-ready');
        if (performance.getEntriesByName('appInit').length > 0) {
          window.Perf.measure('init:app-ready-after-appInit', 'appInitEnd', 'init:app-ready');
        }
        if (window.DEBUG) {
          console.log('[app] APP_READY: observer saw first line');
        }
        obs.disconnect();
      }
    });
    obs.observe(container, { childList: true, subtree: true });
  }
}
