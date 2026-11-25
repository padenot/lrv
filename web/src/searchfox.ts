import { fetchJSON } from './api';
import { IS_MAC } from './platform';

/** A click on an identifier, in either view. `line` is 1-based in the file
 * shown on the clicked side; `col` is the 0-based UTF-16 offset of the click
 * within `text`, the full text of that line. */
export type SearchfoxTarget = {
  path: string;
  line: number;
  col: number;
  word: string;
  text: string;
};

/** `query` is `symbol:A,B` when the token was matched against searchfox's
 * analysis, otherwise `id:<word>`. */
export type SearchfoxResolved = {
  query: string;
  pretty: string | null;
  symbols: string[];
};

export type SearchfoxLine = {
  lno: number;
  line: string;
  bounds: [number, number] | null;
  context: string | null;
};

export type SearchfoxGroup = {
  /** "normal", "test" or "generated". */
  kind: string;
  /** e.g. "Definitions (mozilla::dom::AudioNode::Disconnect)", "Uses (...)". */
  category: string;
  files: { path: string; lines: SearchfoxLine[] }[];
};

export type SearchfoxResults = {
  query: string;
  groups: SearchfoxGroup[];
};

export function resolveSearchfox(target: SearchfoxTarget): Promise<SearchfoxResolved> {
  return fetchJSON('/api/searchfox/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(target),
  });
}

export function searchSearchfox(query: string): Promise<SearchfoxResults> {
  return fetchJSON(`/api/searchfox/search?q=${encodeURIComponent(query)}`);
}

export function searchfoxSourceUrl(tree: string, path: string, line?: number): string {
  return `https://searchfox.org/${tree}/source/${path}${line ? `#${line}` : ''}`;
}

export function searchfoxSearchUrl(tree: string, query: string): string {
  return `https://searchfox.org/${tree}/search?q=${encodeURIComponent(query)}`;
}

export type SearchfoxClick = { mode: 'definition' | 'uses'; newTab: boolean };

/** Mod+click: definition; Mod+Alt+click: uses; add Shift to open
 * searchfox.org in a new tab. Returns null when Mod isn't held. */
export function searchfoxClick(event: MouseEvent): SearchfoxClick | null {
  if (!(IS_MAC ? event.metaKey : event.ctrlKey)) {
    return null;
  }
  return { mode: event.altKey ? 'uses' : 'definition', newTab: event.shiftKey };
}

const IDENTIFIER_CHAR = /[\p{L}\p{N}_$]/u;

/** The identifier of `text` covering offset `col`, or null. */
export function identifierAt(text: string, col: number): { word: string; start: number } | null {
  let start = col;
  while (start > 0 && IDENTIFIER_CHAR.test(text.charAt(start - 1))) {
    start--;
  }
  let end = col;
  while (end < text.length && IDENTIFIER_CHAR.test(text.charAt(end))) {
    end++;
  }
  if (start === end || /\p{N}/u.test(text.charAt(start))) {
    return null;
  }
  return { word: text.slice(start, end), start };
}
