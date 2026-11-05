import type { DiffFile } from './types/app';

type SortToken = string | number;

function naturalTokens(value: string): SortToken[] {
  const tokens: SortToken[] = [];
  let start = 0;
  let index = 0;

  while (index < value.length) {
    while (index < value.length && !/[0-9]/.test(value[index]!)) {
      index += 1;
    }
    if (index >= value.length) {
      break;
    }
    if (index > start) {
      tokens.push(value.slice(start, index));
    }

    let number = 0;
    while (index < value.length && /[0-9]/.test(value[index]!)) {
      number = number * 10 + Number(value[index]);
      index += 1;
    }
    tokens.push(number);
    start = index;
  }

  if (start < value.length || tokens.length === 0) {
    tokens.push(value.slice(start));
  }
  return tokens;
}

function compareSegment(left: string, right: string): number {
  const leftLower = left.toLowerCase();
  const rightLower = right.toLowerCase();
  const leftTokens = naturalTokens(leftLower);
  const rightTokens = naturalTokens(rightLower);

  if (
    leftTokens.length === 1 &&
    rightTokens.length === 1 &&
    typeof leftTokens[0] === 'string' &&
    typeof rightTokens[0] === 'string'
  ) {
    if (leftLower !== rightLower) {
      return leftLower < rightLower ? -1 : 1;
    }
  } else {
    const count = Math.min(leftTokens.length, rightTokens.length);
    for (let index = 0; index < count; index += 1) {
      const leftToken = leftTokens[index]!;
      const rightToken = rightTokens[index]!;
      if (leftToken === rightToken) {
        continue;
      }
      if (typeof leftToken === 'number' && typeof rightToken === 'number') {
        return leftToken < rightToken ? -1 : 1;
      }
      const leftString = String(leftToken);
      const rightString = String(rightToken);
      if (leftString !== rightString) {
        return leftString < rightString ? -1 : 1;
      }
    }
    if (leftTokens.length !== rightTokens.length) {
      return leftTokens.length < rightTokens.length ? -1 : 1;
    }
    if (leftLower !== rightLower) {
      return leftLower < rightLower ? -1 : 1;
    }
  }

  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

/** Orders both the stacked view and the file tree, so they must stay identical. */
export function compareFilePaths(left: string, right: string): number {
  if (left === right) {
    return 0;
  }

  const leftSegments = left.split('/');
  const rightSegments = right.split('/');
  const count = Math.min(leftSegments.length, rightSegments.length);
  for (let index = 0; index < count; index += 1) {
    const comparison = compareSegment(leftSegments[index]!, rightSegments[index]!);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return leftSegments.length < rightSegments.length ? -1 : 1;
}

export function sortDiffFiles(files: DiffFile[]): DiffFile[] {
  return [...files].sort((left, right) => compareFilePaths(left.path, right.path));
}
