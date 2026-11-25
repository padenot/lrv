import { fetchJSON } from './api';

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
