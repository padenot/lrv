import { el } from './dom';

const BUG_RE = /\b([bB]ug)\s+(\d{6,})\b/g;
const PHAB_RE = /\b(D\d{6,})\b/g;

type Match = {
  start: number;
  end: number;
  text: string;
  href: string;
};

export function appendLinkifiedText(target: HTMLElement, text: string): void {
  target.textContent = '';
  target.appendChild(linkifyText(text));
}

export function linkifyText(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const matches: Match[] = [];

  for (const match of text.matchAll(BUG_RE)) {
    const full = match[0];
    const id = match[2];
    if (!full || !id || match.index === undefined) {
      continue;
    }
    matches.push({
      start: match.index,
      end: match.index + full.length,
      text: full,
      href: `https://bugzilla.mozilla.org/show_bug.cgi?id=${id}`,
    });
  }

  for (const match of text.matchAll(PHAB_RE)) {
    const full = match[1];
    if (!full || match.index === undefined) {
      continue;
    }
    matches.push({
      start: match.index,
      end: match.index + full.length,
      text: full,
      href: `https://phabricator.services.mozilla.com/${full}`,
    });
  }

  if (matches.length === 0) {
    fragment.appendChild(document.createTextNode(text));
    return fragment;
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const filtered: Match[] = [];
  let cursor = -1;
  matches.forEach((match) => {
    if (match.start < cursor) {
      return;
    }
    filtered.push(match);
    cursor = match.end;
  });

  let pos = 0;
  filtered.forEach((match) => {
    if (match.start > pos) {
      fragment.appendChild(document.createTextNode(text.slice(pos, match.start)));
    }
    const anchor = el('a', {
      className: 'auto-link',
      text: match.text,
      attrs: {
        href: match.href,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    });
    fragment.appendChild(anchor);
    pos = match.end;
  });

  if (pos < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(pos)));
  }

  return fragment;
}
