import { el } from './dom';
import { commentEndLine, commentLineLabel, commentStartLine } from './comments';
import type { ReviewComment } from './comments';
import { openModal } from './modal';
import { fetchJSON } from './api';
import { resolveAppConfig } from './config';
import { IS_MAC } from './platform';
import { KEYBOARD_SHORTCUTS } from './shortcuts';
import type { AppContext } from './types/app';
import { appendLinkifiedText } from './linkify';

type QueuedReviewNoteBody = {
  instruction?: string;
  author?: string;
  quote: string;
  source?: string;
};

function parseQueuedReviewNoteBody(body: string): QueuedReviewNoteBody | null {
  const lines = body.replace(/\r\n?/g, '\n').trim().split('\n');
  let source: string | undefined;

  for (let idx = lines.length - 1; idx >= 0; idx -= 1) {
    const line = lines[idx]?.trim() ?? '';
    if (!line) {
      continue;
    }
    const sourceMatch = line.match(/^Source:\s+(https?:\/\/\S+)$/);
    if (sourceMatch) {
      source = sourceMatch[1];
      lines.splice(idx, lines.length - idx);
    }
    break;
  }

  while (lines.length > 0 && !lines[lines.length - 1]?.trim()) {
    lines.pop();
  }

  const introIndex = lines.findIndex((line) =>
    /^(?:Address this review comment|Review comment)(?: from .+)?:$/.test(line.trim()),
  );
  if (introIndex === -1) {
    return null;
  }

  const intro = lines[introIndex]?.trim() ?? '';
  const quote = lines
    .slice(introIndex + 1)
    .map((line) => {
      if (line === '>') {
        return '';
      }
      if (line.startsWith('> ')) {
        return line.slice(2);
      }
      return line;
    })
    .join('\n')
    .trim();
  if (!quote) {
    return null;
  }

  const instruction = lines.slice(0, introIndex).join('\n').trim();
  const author = intro.match(/review comment from (.+):$/i)?.[1];

  const parsed: QueuedReviewNoteBody = { quote };
  if (instruction) {
    parsed.instruction = instruction;
  }
  if (author) {
    parsed.author = author;
  }
  if (source) {
    parsed.source = source;
  }
  return parsed;
}

export class DialogMethods {
  declare config: AppContext['config'];
  declare isInline: boolean;
  declare currentFileIndex: number;
  declare commentManager: AppContext['commentManager'];
  declare applyThemeToUI: (theme: string) => void;
  declare loadFile: (index: number) => Promise<void>;
  declare userThemes: AppContext['userThemes'];

  showKeyboardHelp() {
    const { overlay, modal, body, close } = openModal({
      title: 'Keyboard Shortcuts',
      titleId: 'kb-help-title',
      modalClass: 'help-modal',
      onKeydown: (e) => {
        if (e.key === '?') {
          e.preventDefault();
          close();
        }
      },
    });

    const thead = el('thead', {}, [
      el('tr', {}, [el('th', { text: 'Shortcut' }), el('th', { text: 'Action' })]),
    ]);
    const tbody = el('tbody');
    const table = el('table', { className: 'shortcuts-table' }, [thead, tbody]);

    KEYBOARD_SHORTCUTS.forEach((shortcut) => {
      const row = el('tr');

      const keysCell = el('td');
      const keyComboDiv = el('div', { className: 'key-combo' });

      shortcut.keys.forEach((combo, idx) => {
        if (idx > 0) {
          keyComboDiv.appendChild(el('span', { className: 'key-or', text: 'or' }));
        }

        const displayCombo = combo.replace('Mod', IS_MAC ? 'Cmd' : 'Ctrl');
        const parts = displayCombo.split('+');

        parts.forEach((part, partIdx) => {
          if (partIdx > 0) {
            const plus = el('span', { text: '+' });
            plus.style.margin = '0 2px';
            plus.style.color = '#888';
            keyComboDiv.appendChild(plus);
          }

          const key = el('span', { className: 'key' });
          const displayKey = part
            .replace('ArrowDown', '↓')
            .replace('ArrowUp', '↑')
            .replace('Enter', '⏎');
          key.textContent = displayKey;
          keyComboDiv.appendChild(key);
        });
      });

      keysCell.appendChild(keyComboDiv);

      const actionCell = el('td', { text: shortcut.description });

      row.appendChild(keysCell);
      row.appendChild(actionCell);
      tbody.appendChild(row);
    });

    body.appendChild(table);
  }

  showSettingsModal() {
    const footerContent = [
      el('button', { className: 'btn-secondary cancel-btn', text: 'Cancel' }),
      el('button', { className: 'btn-primary save-btn', text: 'Save' }),
    ];

    const { overlay, modal, body, footer, close } = openModal({
      title: 'Settings',
      titleId: 'settings-title',
      modalClass: 'help-modal',
      footerContent,
    });

    const form = el('form', { className: 'settings-form' });

    let currentColorScheme = this.config.color_scheme;
    const legacyThemeMap = {
      dark: 'vs-dark',
      light: 'vs',
      'high-contrast': 'hc-black',
    };
    if (legacyThemeMap[currentColorScheme]) {
      currentColorScheme = legacyThemeMap[currentColorScheme];
    }

    const currentFont = this.config.font;
    const currentSplitView = this.config.split_view;
    const currentAutoCloseTab = this.config.auto_close_tab;

    if (window.DEBUG) {
      console.info('Settings modal - current values:', {
        currentColorScheme,
        currentFont,
        currentSplitView,
        currentAutoCloseTab,
      });
    }

    const opt = (value: string, text: string) => el('option', { attrs: { value }, text });
    const optGroup = (label: string, options: Array<[string, string]>) =>
      el(
        'optgroup',
        { attrs: { label } },
        options.map(([value, text]) => opt(value, text)),
      );

    const userThemeGroup =
      this.userThemes.length > 0
        ? [
            optGroup(
              'Custom',
              this.userThemes.map((t) => [t.id, t.name] as [string, string]),
            ),
          ]
        : [];

    const colorSelect = el('select', { attrs: { id: 'color-scheme', name: 'color_scheme' } }, [
      optGroup('Standard', [
        ['vs-dark', 'VS Dark'],
        ['vs', 'VS Light'],
        ['hc-black', 'High Contrast Dark'],
        ['hc-light', 'High Contrast Light'],
      ]),
      optGroup('GitHub', [
        ['github-dark', 'GitHub Dark'],
        ['github-light', 'GitHub Light'],
      ]),
      optGroup('Firefox DevTools', [
        ['firefox-devtools-dark', 'Firefox DevTools Dark'],
        ['firefox-devtools-light', 'Firefox DevTools Light'],
      ]),
      optGroup('Solarized', [
        ['solarized-dark', 'Solarized Dark'],
        ['solarized-light', 'Solarized Light'],
      ]),
      optGroup('Phabricator', [['phabricator', 'Phabricator']]),
      ...userThemeGroup,
    ]);

    const themeHint = el('div', { className: 'settings-hint' });
    themeHint.innerHTML =
      'Custom themes: drop any VS Code theme <code>.json</code> into <code>&lt;config-dir&gt;/themes/</code>. Run <code>lrv --config-dir</code> for the path on your platform.';

    const themeField = el('div', { className: 'settings-field' }, [
      el('label', { attrs: { for: 'color-scheme' }, text: 'Theme' }),
      colorSelect,
      themeHint,
    ]);

    const fontField = el('div', { className: 'settings-field' }, [
      el('label', { attrs: { for: 'font' }, text: 'Editor Font' }),
      el('input', {
        attrs: {
          type: 'text',
          id: 'font',
          name: 'font',
          value: currentFont,
          placeholder: 'JetBrains Mono',
        },
      }),
    ]);

    const splitViewField = el('div', { className: 'settings-field' }, [
      el('label', { attrs: { for: 'split-view' }, text: 'Split View' }),
      el('div', { className: 'checkbox-wrapper' }, [
        el('input', {
          attrs: {
            type: 'checkbox',
            id: 'split-view',
            name: 'split_view',
            checked: currentSplitView,
          },
        }),
        el('span', { text: 'Show original and modified side-by-side' }),
      ]),
    ]);

    const autoCloseField = el('div', { className: 'settings-field' }, [
      el('label', { attrs: { for: 'auto-close-tab' }, text: 'Auto-Close Tab' }),
      el('div', { className: 'checkbox-wrapper' }, [
        el('input', {
          attrs: {
            type: 'checkbox',
            id: 'auto-close-tab',
            name: 'auto_close_tab',
            checked: currentAutoCloseTab,
          },
        }),
        el('span', { text: 'Automatically close tab after submitting review' }),
      ]),
    ]);

    form.appendChild(themeField);
    form.appendChild(fontField);
    form.appendChild(splitViewField);
    form.appendChild(autoCloseField);

    body.appendChild(form);
    const colorField = form.querySelector<HTMLSelectElement>('#color-scheme');
    if (colorField) {
      colorField.value = currentColorScheme;
    }

    const save = async () => {
      const saveBtn = footer.querySelector<HTMLButtonElement>('.save-btn');
      if (!saveBtn) {
        return;
      }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const formData = new FormData(form);
      const newConfig = resolveAppConfig({
        color_scheme: String(formData.get('color_scheme') ?? 'vs-dark'),
        font: String(formData.get('font') ?? ''),
        split_view: formData.get('split_view') === 'on',
        auto_close_tab: formData.get('auto_close_tab') === 'on',
        stacked_view: this.config.stacked_view,
      });

      try {
        const response = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        });

        if (response.ok) {
          this.config = newConfig;
          this.isInline = !this.config.split_view;
          monaco.editor.setTheme(this.config.color_scheme);
          this.applyThemeToUI(this.config.color_scheme);
          saveBtn.textContent = 'Saved!';

          setTimeout(() => {
            close();
            this.loadFile(this.currentFileIndex);
          }, 500);
        } else {
          alert('Failed to save settings');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      } catch (error) {
        alert(`Failed to save settings: ${error}`);
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    };

    const cancelBtn = footer.querySelector<HTMLButtonElement>('.cancel-btn');
    const saveBtn = footer.querySelector<HTMLButtonElement>('.save-btn');
    if (cancelBtn) {
      cancelBtn.onclick = close;
    }
    if (saveBtn) {
      saveBtn.onclick = save;
    }

    setTimeout(() => {
      const initial = form.querySelector<HTMLElement>('#color-scheme');
      if (initial) {
        initial.focus();
      }
    }, 0);
  }

  async showSubmitConfirmation() {
    const comments = this.commentManager.getComments();
    let submit: () => void | Promise<void> = () => {};

    const footerContent = [
      el('button', { className: 'btn-secondary cancel-submit-btn', text: 'Cancel' }),
      el('button', { className: 'btn-primary confirm-submit-btn', text: 'Submit Review' }),
    ];

    const { overlay, modal, body, footer, close } = openModal({
      title: comments.length === 0 ? 'Submit Review' : `Review Comments (${comments.length})`,
      titleId: 'submit-title',
      modalClass: 'submit-review-modal',
      footerContent,
      onKeydown: (e) => {
        if (e.key === 'Enter' && e.shiftKey && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submit();
        }
      },
    });

    if (comments.length === 0) {
      const noCommentsMsg = el('p', { text: 'No comments. Submit to approve this review.' });
      noCommentsMsg.style.padding = '20px';
      noCommentsMsg.style.textAlign = 'center';
      noCommentsMsg.style.color = 'var(--text-secondary)';
      body.appendChild(noCommentsMsg);
    }

    const commentsByFile: Record<string, ReviewComment[]> = {};
    comments.forEach((comment) => {
      commentsByFile[comment.file] ??= [];
      commentsByFile[comment.file]!.push(comment);
    });

    if (comments.length > 0) {
      const fileCount = Object.keys(commentsByFile).length;
      body.appendChild(
        el('div', { className: 'submit-review-summary' }, [
          el('div', { className: 'submit-review-summary-item' }, [
            el('strong', { text: comments.length }),
            el('span', { text: comments.length === 1 ? 'queued comment' : 'queued comments' }),
          ]),
          el('div', { className: 'submit-review-summary-item' }, [
            el('strong', { text: fileCount }),
            el('span', { text: fileCount === 1 ? 'location' : 'locations' }),
          ]),
          el('div', {
            className: 'submit-review-summary-hint',
            text: 'These comments will be sent to the agent when you submit.',
          }),
        ]),
      );
    }

    const fileContents: Record<string, string[]> = {};
    await Promise.all(
      Object.keys(commentsByFile).map(async (filePath) => {
        if (filePath === '(commit)') {
          return;
        }
        const fileComments = commentsByFile[filePath] ?? [];
        const sides = [...new Set(fileComments.map((c) => c.side))];

        for (const side of sides) {
          const key = `${filePath}:${side}`;
          // Use commit_idx from the first comment for this file to fetch correct content
          const commitParam =
            fileComments[0]?.commit_idx !== undefined
              ? `&commit=${fileComments[0].commit_idx}`
              : '';
          try {
            const data = await fetchJSON<{ content?: string }>(
              `/api/file?path=${encodeURIComponent(filePath)}&side=${side}${commitParam}`,
            );
            fileContents[key] = String(data.content ?? '').split('\n');
          } catch (err) {
            console.error(`Failed to fetch ${key}:`, err);
            fileContents[key] = [];
          }
        }
      }),
    );

    comments.forEach((comment) => {
      const preview = el('div', { className: 'comment-preview' });

      const isCommitComment = comment.file === '(commit)';
      const locationText = isCommitComment
        ? 'Review summary'
        : `${comment.file}:${commentLineLabel(comment)}`;
      const sideText = isCommitComment ? ' (global)' : ` (${comment.side})`;
      const previewHeader = el('div', { className: 'comment-preview-header' }, [
        el('span', { className: 'comment-preview-location', text: locationText }),
        el('span', { className: 'comment-preview-side', text: sideText }),
      ]);

      const fileKey = `${comment.file}:${comment.side}`;
      const lines = fileContents[fileKey] ?? [];
      const rangeStart = commentStartLine(comment);
      const rangeEnd = commentEndLine(comment);
      const startLine = Math.max(0, rangeStart - 2);
      const endLine = Math.min(lines.length, rangeEnd + 1);
      const excerpt = lines.slice(startLine, endLine);

      const codeBlock = el('div', { className: 'comment-preview-code' });
      excerpt.forEach((line, idx) => {
        const lineDiv = el('div', { className: 'comment-preview-code-line' });
        const lineNumber = startLine + idx + 1;
        if (lineNumber >= rangeStart && lineNumber <= rangeEnd) {
          lineDiv.classList.add('target');
        }
        lineDiv.appendChild(
          el('span', { className: 'comment-preview-code-line-number', text: lineNumber }),
        );
        lineDiv.appendChild(
          el('span', { className: 'comment-preview-code-line-text', text: line || ' ' }),
        );
        codeBlock.appendChild(lineDiv);
      });

      preview.appendChild(previewHeader);
      if (!isCommitComment && excerpt.length > 0) {
        preview.appendChild(codeBlock);
      }
      preview.appendChild(this.renderSubmitCommentBody(comment));
      body.appendChild(preview);
    });

    submit = async () => {
      const submitBtn = footer.querySelector<HTMLButtonElement>('.confirm-submit-btn');
      if (!submitBtn) {
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';

      try {
        const resp = await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comments }),
        });
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        submitBtn.textContent = 'Submitted!';
        const submitReviewBtn = document.getElementById(
          'submit-review',
        ) as HTMLButtonElement | null;
        if (submitReviewBtn) {
          submitReviewBtn.disabled = true;
          submitReviewBtn.textContent = 'Review Submitted';
        }

        setTimeout(() => {
          close();
          if (this.config.auto_close_tab) {
            window.close();
          }
        }, 1000);
      } catch (error) {
        alert(`Failed to submit review: ${error}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Review';
      }
    };

    const cancelSubmitBtn = footer.querySelector<HTMLButtonElement>('.cancel-submit-btn');
    const confirmSubmitBtn = footer.querySelector<HTMLButtonElement>('.confirm-submit-btn');
    if (cancelSubmitBtn) {
      cancelSubmitBtn.onclick = close;
    }
    if (confirmSubmitBtn) {
      confirmSubmitBtn.onclick = submit;
    }

    setTimeout(() => {
      const f = footer.querySelector<HTMLElement>('.confirm-submit-btn');
      if (f) {
        f.focus();
      }
    }, 0);
  }

  private renderSubmitCommentBody(comment: ReviewComment): HTMLElement {
    const container = el('div', { className: 'comment-preview-text' });
    const parsed = parseQueuedReviewNoteBody(comment.body);

    if (!parsed) {
      const plain = el('div', { className: 'comment-preview-body-plain' });
      appendLinkifiedText(plain, comment.body);
      container.appendChild(plain);
      return container;
    }

    const actionText = el('div', { className: 'comment-preview-action-text' });
    appendLinkifiedText(
      actionText,
      parsed.instruction ?? 'Ask the agent to address this review comment.',
    );
    container.appendChild(
      el('div', { className: 'comment-preview-action' }, [
        el('span', { className: 'comment-preview-action-badge', text: 'Queued' }),
        actionText,
      ]),
    );

    const reviewTitleChildren: Node[] = [
      el('span', { className: 'comment-preview-review-label', text: 'Reviewer comment' }),
    ];
    if (parsed.author) {
      reviewTitleChildren.push(
        el('span', { className: 'comment-preview-review-author', text: parsed.author }),
      );
    }

    const quote = el('blockquote', { className: 'comment-preview-quote' });
    appendLinkifiedText(quote, parsed.quote);

    const reviewChildren: Node[] = [
      el('div', { className: 'comment-preview-review-title' }, reviewTitleChildren),
      quote,
    ];

    if (parsed.source) {
      reviewChildren.push(
        el('div', { className: 'comment-preview-source' }, [
          el('span', { text: 'Source' }),
          el('a', {
            className: 'auto-link',
            text: 'Open in Phabricator',
            attrs: {
              href: parsed.source,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          }),
        ]),
      );
    }

    container.appendChild(el('div', { className: 'comment-preview-review' }, reviewChildren));
    return container;
  }
}
