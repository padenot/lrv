export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const el = (tag, { className, text, attrs } = {}, children = null) => {
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

export const clearEl = (node) => {
  node.textContent = '';
  return node;
};
