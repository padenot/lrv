import { fetchJSON } from './api';
import { IS_MAC } from './platform';

/** A click on an identifier, in either view. `line` is 1-based in the file
 * shown on the clicked side of commit `commit_idx`; `col` is the 0-based UTF-16
 * offset of the click within `text`, the full text of that line. */
export type SearchfoxTarget = {
  path: string;
  line: number;
  col: number;
  word: string;
  text: string;
  side: 'old' | 'new';
  commit_idx: number;
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
  /** The git revision searchfox's line numbers in `groups` refer to. */
  revision: string;
  groups: SearchfoxGroup[];
};

/** A line of searchfox's `revision`, and the reviewed line it corresponds to. */
export type SearchfoxHit = { path: string; lno: number; revision: string };

/** `line` is the reviewed new-side line; `exact` is false when the hit's line changed since
 * `revision`, so `line` is the nearest unchanged line before it. Null when none is unchanged. */
export type RevealedLine = { line: number | null; exact: boolean };

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

/** Maps a hit's line, at its searchfox revision, onto the new side of `commitIdx`. */
export function revealSearchfoxLine(hit: SearchfoxHit, commitIdx: number): Promise<RevealedLine> {
  const params = new URLSearchParams({
    path: hit.path,
    line: String(hit.lno),
    commit_idx: String(commitIdx),
    revision: hit.revision,
  });
  return fetchJSON(`/api/searchfox/line?${params}`);
}

/** The source of `path` at `revision`, so `line` is the line searchfox numbered. */
export function searchfoxSourceUrl(
  tree: string,
  revision: string,
  path: string,
  line: number,
): string {
  return `https://searchfox.org/${tree}/rev/${revision}/${path}#${line}`;
}

export function searchfoxSearchUrl(tree: string, query: string): string {
  return `https://searchfox.org/${tree}/search?q=${encodeURIComponent(query)}`;
}

/** Context-menu entries for a lookup, shared by the Monaco and stacked views. */
export const searchfoxMenuActions = [
  { label: 'Searchfox: Go to Definition', mode: 'definition' },
  { label: 'Searchfox: Find Uses', mode: 'uses' },
] as const;

/** How long a line reached from searchfox results flashes. */
export const SEARCHFOX_FLASH_MS = 1200;

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
