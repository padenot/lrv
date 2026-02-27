export const $ = <T extends Element = Element>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);
export const $$ = <T extends Element = Element>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

type ElOptions = {
  className?: string;
  text?: string | number;
  attrs?: Record<string, string | number | boolean | null | undefined>;
};

type ElChild = Node | string | number | null | undefined;

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  { className, text, attrs }: ElOptions = {},
  children: ElChild[] | null = null,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined && text !== null) {
    node.textContent = String(text);
  }
  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) {
        return;
      }
      node.setAttribute(key, value === true ? '' : String(value));
    });
  }
  if (children) {
    children.forEach((child) => {
      if (child === undefined || child === null) {
        return;
      }
      if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
        return;
      }
      node.appendChild(child);
    });
  }
  return node;
};

export const clearEl = <T extends Element>(node: T): T => {
  node.textContent = '';
  return node;
};
