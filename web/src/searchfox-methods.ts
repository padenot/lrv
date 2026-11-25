import { el } from './dom';
import { openModal } from './modal';
import { detectLanguageFromPathAndContent } from './language';
import { DIFFS_THEME, DIFFS_TOKENIZE_MAX_LINE_LENGTH, themeTypeFor } from './stacked-view-methods';
import {
  resolveSearchfox,
  searchSearchfox,
  searchfoxSearchUrl,
  searchfoxSourceUrl,
  type SearchfoxGroup,
  type SearchfoxResolved,
  type SearchfoxResults,
  type SearchfoxTarget,
} from './searchfox';
import type { AppContext } from './types/app';

type SearchfoxPanel = { body: HTMLDivElement; close: () => void };

let pendingLookups = 0;
let busyIndicator: HTMLDivElement | null = null;

/** Shows a progress cursor and a "Searching" pill while any lookup waits on searchfox. */
function setSearchfoxBusy(busy: boolean) {
  pendingLookups += busy ? 1 : -1;
  const active = pendingLookups > 0;
  document.body.classList.toggle('searchfox-busy', active);
  if (active && !busyIndicator) {
    busyIndicator = el(
      'div',
      { className: 'searchfox-pill searchfox-busy-indicator', attrs: { role: 'status' } },
      [
        el('span', { className: 'searchfox-spinner' }),
        el('span', { text: 'Searching searchfox…' }),
      ],
    );
    document.body.appendChild(busyIndicator);
  } else if (!active) {
    busyIndicator?.remove();
    busyIndicator = null;
  }
}

let toast: { node: HTMLDivElement; timer: ReturnType<typeof setTimeout> } | null = null;

/** A brief message in the same pill as the busy indicator. */
function showSearchfoxToast(message: string) {
  if (toast) {
    clearTimeout(toast.timer);
    toast.node.remove();
  }
  const node = el('div', {
    className: 'searchfox-pill searchfox-toast',
    text: message,
    attrs: { role: 'status' },
  });
  document.body.appendChild(node);
  toast = {
    node,
    timer: setTimeout(() => {
      node.remove();
      toast = null;
    }, 2500),
  };
}

export class SearchfoxMethods {
  declare context: AppContext['context'];
  declare config: AppContext['config'];
  declare files: AppContext['files'];
  declare isStacked: AppContext['isStacked'];
  declare loadFile: AppContext['loadFile'];
  declare setFocusedLine: AppContext['setFocusedLine'];
  declare scrollToFileInStacked: AppContext['scrollToFileInStacked'];

  async searchfoxLookup(
    target: SearchfoxTarget,
    mode: 'definition' | 'uses',
    newTab: boolean,
  ): Promise<void> {
    const tree = this.context.searchfox_tree;
    if (!this.config.searchfox || !tree) {
      return;
    }
    setSearchfoxBusy(true);
    try {
      const resolved = await resolveSearchfox(target);
      if (newTab) {
        window.open(searchfoxSearchUrl(tree, resolved.query), '_blank', 'noopener');
        return;
      }
      const results = await searchSearchfox(resolved.query);
      if (results.groups.length === 0) {
        showSearchfoxToast(`No searchfox results for ${resolved.pretty ?? target.word}`);
        return;
      }
      if (mode === 'definition') {
        const definitions = searchfoxDefinitions(results);
        if (definitions.length === 1) {
          const hit = definitions[0]!;
          this.goToSearchfoxHit(tree, hit.path, hit.lno);
          return;
        }
      }
      const panel = this.openSearchfoxPanel(resolved, tree);
      this.renderSearchfoxResults(panel.body, tree, results, panel.close);
    } catch (error) {
      const panel = this.openSearchfoxPanel(
        { query: target.word, pretty: null, symbols: [] },
        tree,
      );
      panel.body.appendChild(
        el('p', { className: 'searchfox-status searchfox-error', text: (error as Error).message }),
      );
    } finally {
      setSearchfoxBusy(false);
    }
  }

  private openSearchfoxPanel(resolved: SearchfoxResolved, tree: string): SearchfoxPanel {
    const link = el('a', {
      className: 'btn-secondary searchfox-open-link',
      text: 'Open on searchfox ↗',
      attrs: {
        href: searchfoxSearchUrl(tree, resolved.query),
        target: '_blank',
        rel: 'noopener',
      },
    });
    const { body, close } = openModal({
      title: resolved.pretty ?? resolved.query,
      modalClass: 'searchfox-modal',
      footerContent: [link],
    });
    return { body, close };
  }

  private renderSearchfoxResults(
    body: HTMLDivElement,
    tree: string,
    results: SearchfoxResults,
    close: () => void,
  ) {
    for (const group of results.groups) {
      body.appendChild(this.searchfoxGroupNode(tree, group, close));
    }
  }

  private searchfoxGroupNode(tree: string, group: SearchfoxGroup, close: () => void) {
    const heading = el('h3', { className: 'searchfox-category', text: group.category });
    if (group.kind !== 'normal') {
      heading.appendChild(el('span', { className: 'searchfox-kind', text: group.kind }));
    }
    const section = el('section', { className: 'searchfox-group' }, [heading]);
    for (const file of group.files) {
      const inReview = this.files.some((reviewed) => reviewed.path === file.path);
      section.appendChild(
        el('div', { className: 'searchfox-file' }, [
          el('span', { className: 'searchfox-path', text: file.path }),
          inReview
            ? el('span', {
                className: 'searchfox-in-review',
                text: 'in review',
                attrs: { title: 'Part of this review' },
              })
            : null,
        ]),
      );
      for (const line of file.lines) {
        const code = el('code', { className: 'searchfox-code', text: line.line });
        markRange(code, line.bounds);
        void this.colorizeSearchfoxLine(code, file.path, line.line).then(() =>
          markRange(code, line.bounds),
        );
        const row = el('button', { className: 'searchfox-line', attrs: { type: 'button' } }, [
          el('span', { className: 'searchfox-lno', text: line.lno }),
          code,
          line.context ? el('span', { className: 'searchfox-context', text: line.context }) : null,
        ]);
        row.addEventListener('click', () => {
          close();
          this.goToSearchfoxHit(tree, file.path, line.lno);
        });
        section.appendChild(row);
      }
    }
    return section;
  }

  /** Colours a result line the way the view it was opened from colours code. */
  private async colorizeSearchfoxLine(code: HTMLElement, path: string, text: string) {
    if (this.isStacked) {
      code.classList.add('searchfox-pierre');
      code.style.colorScheme = themeTypeFor(this.config.color_scheme);
      code.replaceChildren(...(await pierreLineSpans(path, text)));
      return;
    }
    const html = await monaco.editor.colorize(text, detectLanguageFromPathAndContent(path), {});
    // Monaco escapes the text; its markup is token spans and a trailing <br>.
    code.innerHTML = html;
    code.querySelectorAll('br').forEach((br) => br.remove());
  }

  private goToSearchfoxHit(tree: string, path: string, lno: number) {
    const index = this.files.findIndex((file) => file.path === path);
    if (index === -1) {
      window.open(searchfoxSourceUrl(tree, path, lno), '_blank', 'noopener');
    } else if (this.isStacked) {
      void this.scrollToFileInStacked(index);
    } else {
      void this.loadFile(index).then(() => this.setFocusedLine('new', lno));
    }
  }
}

/** Hits of the "Definitions" categories of the normal (non-test, non-generated) results. */
function searchfoxDefinitions(results: SearchfoxResults) {
  return results.groups
    .filter((group) => group.kind === 'normal' && group.category.startsWith('Definitions'))
    .flatMap((group) =>
      group.files.flatMap((file) => file.lines.map((line) => ({ path: file.path, lno: line.lno }))),
    );
}

/** Token spans for one result line, highlighted like the stacked view highlights `path`. */
async function pierreLineSpans(path: string, text: string): Promise<HTMLSpanElement[]> {
  const {
    createSpanFromToken,
    formatCSSVariablePrefix,
    getFiletypeFromFileName,
    getSharedHighlighter,
  } = await import('../../node_modules/@pierre/diffs/dist/index.js');
  const lang = getFiletypeFromFileName(path);
  // Shares the highlighter the stacked view's worker pool already loaded on the main thread.
  const highlighter = await getSharedHighlighter({
    themes: Object.values(DIFFS_THEME),
    langs: [lang],
  });
  const { tokens } = highlighter.codeToTokens(text, {
    lang,
    themes: DIFFS_THEME,
    defaultColor: false,
    cssVariablePrefix: formatCSSVariablePrefix('token'),
    tokenizeMaxLineLength: DIFFS_TOKENIZE_MAX_LINE_LENGTH,
    tokenizeTimeLimit: 0,
  });
  return tokens.flat().map((token) => createSpanFromToken(token, false));
}

/** Wraps UTF-16 offsets `bounds` of `root`'s text in <mark>s, splitting text nodes as needed. */
function markRange(root: HTMLElement, bounds: [number, number] | null) {
  if (!bounds) {
    return;
  }
  const [start, end] = bounds;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    texts.push(node as Text);
  }
  let offset = 0;
  for (const text of texts) {
    const textStart = offset;
    offset += text.length;
    if (offset <= start || textStart >= end) {
      continue;
    }
    let piece = text;
    if (start > textStart) {
      piece = piece.splitText(start - textStart);
    }
    if (end < offset) {
      piece.splitText(end - Math.max(start, textStart));
    }
    const mark = el('mark');
    piece.replaceWith(mark);
    mark.appendChild(piece);
  }
}
