import { el } from './dom';

export type ContextMenuItem = { label: string; onSelect: () => void };

let dismissOpenMenu: (() => void) | null = null;

/** Opens a menu of `items` at the viewport point (x, y), replacing any open menu. */
export function openContextMenu(x: number, y: number, items: ContextMenuItem[]): void {
  dismissOpenMenu?.();
  const previouslyFocused = document.activeElement;
  const buttons = items.map(({ label, onSelect }) => {
    const button = el('button', {
      className: 'context-menu-item',
      text: label,
      attrs: { type: 'button', role: 'menuitem' },
    });
    button.addEventListener('click', () => {
      dismiss();
      onSelect();
    });
    return button;
  });
  const menu = el('div', { className: 'context-menu', attrs: { role: 'menu' } }, buttons);
  document.body.appendChild(menu);

  // The menu's size is only known once it is in the DOM, so clamp after appending.
  const { width, height } = menu.getBoundingClientRect();
  menu.style.left = `${Math.max(0, Math.min(x, window.innerWidth - width))}px`;
  menu.style.top = `${Math.max(0, Math.min(y, window.innerHeight - height))}px`;

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      dismiss();
      if (previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
    } else if (event.key === 'Tab') {
      dismiss();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(current + step + buttons.length) % buttons.length]!.focus();
    }
  };
  const onMousedown = (event: MouseEvent) => {
    if (!menu.contains(event.target as Node)) {
      dismiss();
    }
  };
  // Capture, so the menu closes before anything else handles the same event.
  const listenerOptions = { capture: true };
  const dismiss = () => {
    menu.remove();
    document.removeEventListener('keydown', onKeydown, listenerOptions);
    document.removeEventListener('mousedown', onMousedown, listenerOptions);
    window.removeEventListener('scroll', dismiss, listenerOptions);
    window.removeEventListener('blur', dismiss);
    dismissOpenMenu = null;
  };
  dismissOpenMenu = dismiss;
  document.addEventListener('keydown', onKeydown, listenerOptions);
  document.addEventListener('mousedown', onMousedown, listenerOptions);
  window.addEventListener('scroll', dismiss, { capture: true, passive: true });
  window.addEventListener('blur', dismiss);

  buttons[0]!.focus({ preventScroll: true });
}
