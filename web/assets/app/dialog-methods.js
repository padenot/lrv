import { el } from './dom.js';
import { openModal } from './modal.js';
import { fetchJSON } from './api.js';
import { IS_MAC } from './platform.js';
import { KEYBOARD_SHORTCUTS } from './shortcuts.js';

export class DialogMethods {
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

    let currentColorScheme = this.config.color_scheme || 'vs-dark';
    const legacyThemeMap = {
      dark: 'vs-dark',
      light: 'vs',
      'high-contrast': 'hc-black',
    };
    if (legacyThemeMap[currentColorScheme]) {
      currentColorScheme = legacyThemeMap[currentColorScheme];
    }

    const currentFont = (this.config.font && this.config.font.trim()) || 'JetBrains Mono';
    const currentSplitView = this.config.split_view !== undefined ? this.config.split_view : true;
    const currentAutoCloseTab =
      this.config.auto_close_tab !== undefined ? this.config.auto_close_tab : true;

    if (window.DEBUG) {
      console.log('Settings modal - current values:', {
        currentColorScheme,
        currentFont,
        currentSplitView,
        currentAutoCloseTab,
      });
    }

    const opt = (value, text) => el('option', { attrs: { value }, text });
    const optGroup = (label, options) =>
      el(
        'optgroup',
        { attrs: { label } },
        options.map(([value, text]) => opt(value, text)),
      );

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
    ]);

    const themeField = el('div', { className: 'settings-field' }, [
      el('label', { attrs: { for: 'color-scheme' }, text: 'Theme' }),
      colorSelect,
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
    form.querySelector('#color-scheme').value = currentColorScheme;

    const save = async () => {
      const saveBtn = footer.querySelector('.save-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      const formData = new FormData(form);
      const newConfig = {
        color_scheme: formData.get('color_scheme'),
        font: (formData.get('font') || '').toString().trim() || 'JetBrains Mono',
        split_view: formData.get('split_view') === 'on',
        auto_close_tab: formData.get('auto_close_tab') === 'on',
      };

      try {
        const response = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        });

        if (response.ok) {
          this.config = newConfig;
          this.isInline = !this.config.split_view;
          try {
            monaco.editor.setTheme(this.config.color_scheme || 'vs-dark');
          } catch {}
          this.applyThemeToUI(this.config.color_scheme || 'vs-dark');
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

    footer.querySelector('.cancel-btn').onclick = close;
    footer.querySelector('.save-btn').onclick = save;

    setTimeout(() => {
      const initial = form.querySelector('#color-scheme');
      if (initial) {
        initial.focus();
      }
    }, 0);
  }

  async showSubmitConfirmation() {
    const comments = this.commentManager.getComments();

    const footerContent = [
      el('button', { className: 'btn-secondary cancel-submit-btn', text: 'Cancel' }),
      el('button', { className: 'btn-primary confirm-submit-btn', text: 'Submit Review' }),
    ];

    const { overlay, modal, body, footer, close } = openModal({
      title: comments.length === 0 ? 'Submit Review' : `Review Comments (${comments.length})`,
      titleId: 'submit-title',
      footerContent,
    });

    if (comments.length === 0) {
      const noCommentsMsg = el('p', { text: 'No comments. Submit to approve this review.' });
      noCommentsMsg.style.padding = '20px';
      noCommentsMsg.style.textAlign = 'center';
      noCommentsMsg.style.color = 'var(--text-secondary)';
      body.appendChild(noCommentsMsg);
    }

    const commentsByFile = {};
    comments.forEach((comment) => {
      if (!commentsByFile[comment.file]) {
        commentsByFile[comment.file] = [];
      }
      commentsByFile[comment.file].push(comment);
    });

    const fileContents = {};
    await Promise.all(
      Object.keys(commentsByFile).map(async (filePath) => {
        const fileComments = commentsByFile[filePath];
        const sides = [...new Set(fileComments.map((c) => c.side))];

        for (const side of sides) {
          const key = `${filePath}:${side}`;
          try {
            const data = await fetchJSON(
              `/api/file?path=${encodeURIComponent(filePath)}&side=${side}`,
            );
            fileContents[key] = data.content.split('\n');
          } catch (err) {
            console.error(`Failed to fetch ${key}:`, err);
            fileContents[key] = [];
          }
        }
      }),
    );

    comments.forEach((comment) => {
      const preview = el('div', { className: 'comment-preview' });

      const headerText = `${comment.file}:${comment.start_line} (${comment.side}) — ${comment.severity}`;
      const previewHeader = el('div', { className: 'comment-preview-header', text: headerText });

      const fileKey = `${comment.file}:${comment.side}`;
      const lines = fileContents[fileKey] || [];
      const lineIndex = comment.start_line - 1;
      const startLine = Math.max(0, lineIndex - 1);
      const endLine = Math.min(lines.length, lineIndex + 2);
      const excerpt = lines.slice(startLine, endLine);

      const codeBlock = el('div', { className: 'comment-preview-code' });
      excerpt.forEach((line, idx) => {
        const lineDiv = el('div', { className: 'comment-preview-code-line' });
        if (startLine + idx === lineIndex) {
          lineDiv.classList.add('target');
        }
        lineDiv.textContent = line || ' ';
        codeBlock.appendChild(lineDiv);
      });

      const commentText = el('div', { className: 'comment-preview-text', text: comment.body });

      preview.appendChild(previewHeader);
      preview.appendChild(codeBlock);
      preview.appendChild(commentText);
      body.appendChild(preview);
    });

    const submit = async () => {
      const submitBtn = footer.querySelector('.confirm-submit-btn');
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
        document.getElementById('submit-review').disabled = true;
        document.getElementById('submit-review').textContent = 'Review Submitted';

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

    footer.querySelector('.cancel-submit-btn').onclick = close;
    footer.querySelector('.confirm-submit-btn').onclick = submit;

    setTimeout(() => {
      const f = footer.querySelector('.confirm-submit-btn');
      if (f) {
        f.focus();
      }
    }, 0);
  }
}
