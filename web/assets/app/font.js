import { el } from './dom.js';

const MONO_FALLBACK = "'Monaco', 'Menlo', 'Consolas', monospace";
const DEFAULT_MONO_STACK = `'JetBrains Mono', ${MONO_FALLBACK}`;

function isMonospace(fontName) {
  const canvas = el('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = `72px '${fontName}'`;
  return Math.abs(ctx.measureText('m').width - ctx.measureText('i').width) < 1;
}

export function monoFontStack(font) {
  const name = (font || '').toString().trim();
  if (!name) {
    return DEFAULT_MONO_STACK;
  }
  if (name.includes(',')) {
    return name;
  }
  if (!isMonospace(name)) {
    return DEFAULT_MONO_STACK;
  }
  return `'${name}', ${MONO_FALLBACK}`;
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
