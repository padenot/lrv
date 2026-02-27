import { el } from './dom';

type OpenModalParams = {
  title: string;
  titleId?: string;
  modalClass?: string;
  footerContent?: Node | Node[];
  onKeydown?: (e: KeyboardEvent) => void;
};

type OpenModalResult = {
  overlay: HTMLDivElement;
  modal: HTMLDivElement;
  body: HTMLDivElement;
  footer: HTMLDivElement;
  close: () => void;
};

export function openModal({
  title,
  titleId,
  modalClass = '',
  footerContent = [],
  onKeydown,
}: OpenModalParams): OpenModalResult {
  const overlay = el('div', { className: 'submit-modal-overlay' });

  const modal = el('div', { className: `submit-modal${modalClass ? ' ' + modalClass : ''}` });

  const header = el('div', { className: 'submit-modal-header' }, [
    el('h2', titleId ? { text: title, attrs: { id: titleId } } : { text: title }),
    el('button', {
      className: 'submit-modal-close',
      text: '×',
      attrs: { 'aria-label': 'Close' },
    }),
  ]);

  const body = el('div', { className: 'submit-modal-body' });

  const footer = el('div', { className: 'submit-modal-footer' });
  const nodes = Array.isArray(footerContent) ? footerContent : [footerContent];
  nodes.forEach((node) => {
    if (node) {
      footer.appendChild(node);
    }
  });

  modal.appendChild(header);
  modal.appendChild(body);
  modal.appendChild(footer);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const previouslyFocused = document.activeElement as HTMLElement | null;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  if (titleId) {
    modal.setAttribute('aria-labelledby', titleId);
  }

  const focusable = () =>
    Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((focusEl) => !focusEl.hasAttribute('disabled')) as HTMLElement[];

  const onTrap = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      const nodes = focusable();
      if (nodes.length === 0) {
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', onTrap);

  let handleEscape: ((e: KeyboardEvent) => void) | undefined;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onTrap);
    if (handleEscape) {
      document.removeEventListener('keydown', handleEscape);
    }
    if (onKeydown) {
      document.removeEventListener('keydown', onKeydown);
    }
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  };

  handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
    }
  };
  document.addEventListener('keydown', handleEscape);

  if (onKeydown) {
    document.addEventListener('keydown', onKeydown);
  }

  const closeButton = header.querySelector<HTMLButtonElement>('.submit-modal-close');
  if (closeButton) {
    closeButton.onclick = close;
  }

  overlay.addEventListener('click', (e: MouseEvent) => {
    if (e.target === overlay) {
      close();
    }
  });

  setTimeout(() => {
    const f = focusable()[0];
    if (f) {
      f.focus();
    }
  }, 0);

  return { overlay, modal, body, footer, close };
}
