import { el } from './dom';

let fileFetchPending = 0;
let fileFetchDelayTimer: ReturnType<typeof setTimeout> | null = null;
let fetchSpinnerEl: HTMLSpanElement | null = null;

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
      const app = window.__APP;
      if (app && typeof app.eagerPrefetchAllFiles === 'function') {
        app.eagerPrefetchAllFiles();
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

export async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
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
    return (await res.json()) as T;
  } finally {
    if (isFile) {
      fileFetchPending = Math.max(0, fileFetchPending - 1);
      hideFetchSpinnerMaybe();
    }
  }
}
