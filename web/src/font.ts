import { el } from './dom';

const MONO_FALLBACK = "'Monaco', 'Menlo', 'Consolas', monospace";
const DEFAULT_MONO_STACK = `'JetBrains Mono', ${MONO_FALLBACK}`;

function isMonospace(fontName: string): boolean {
  const canvas = el('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return false;
  }
  ctx.font = `72px '${fontName}'`;
  return Math.abs(ctx.measureText('m').width - ctx.measureText('i').width) < 1;
}

export function monoFontStack(font: string | null | undefined): string {
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
