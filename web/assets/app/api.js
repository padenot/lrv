import { el } from './dom.js';

let fileFetchPending = 0;
let fileFetchDelayTimer = null;
let fetchSpinnerEl = null;

function ensureFetchSpinner() {
  if (!fetchSpinnerEl) {
    const host = document.querySelector('.header .header-actions');
    if (!host) {
      return;
    }
    const spinner = el('span', { className: 'fetch-spinner', attrs: { id: 'fetch-spinner' } });
    host.insertBefore(spinner, host.firstChild);
    fetchSpinnerEl = spinner;
  }
}

function showFetchSpinnerDelayed() {
  ensureFetchSpinner();
  if (!fetchSpinnerEl) {
    return;
  }
  if (fileFetchDelayTimer) {
    return;
  }
  fileFetchDelayTimer = setTimeout(() => {
    if (fileFetchPending > 0) {
      fetchSpinnerEl.classList.add('visible');
      if (window.__APP && typeof window.__APP.eagerPrefetchAllFiles === 'function') {
        window.__APP.eagerPrefetchAllFiles();
      }
    }
    fileFetchDelayTimer = null;
  }, 400);
}

function hideFetchSpinnerMaybe() {
  if (fileFetchPending === 0) {
    if (fileFetchDelayTimer) {
      clearTimeout(fileFetchDelayTimer);
      fileFetchDelayTimer = null;
    }
    if (fetchSpinnerEl) {
      fetchSpinnerEl.classList.remove('visible');
    }
  }
}

export async function fetchJSON(url, options) {
  const isFile = typeof url === 'string' && url.startsWith('/api/file');
  if (isFile) {
    fileFetchPending++;
    if (fileFetchPending === 1) {
      showFetchSpinnerDelayed();
    }
  }
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Request failed ${res.status} ${res.statusText} at ${url}${text ? `: ${text.slice(0, 200)}` : ''}`,
      );
    }
    return res.json();
  } finally {
    if (isFile) {
      fileFetchPending = Math.max(0, fileFetchPending - 1);
      hideFetchSpinnerMaybe();
    }
  }
}
