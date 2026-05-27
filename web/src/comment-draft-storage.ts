import type { ReviewComment, CommentLine } from './comments';
import type { AppContextData, DiffFile, DiffStats, SeriesInfo } from './types/app';

type DiffSnapshot = {
  files: DiffFile[];
  stats: DiffStats;
  commit_message?: string;
  commit_hash?: string;
  jj_change_id?: string;
};

type CommentDraftRecord = {
  key: string;
  schemaVersion: 1;
  savedAt: number;
  comments: ReviewComment[];
};

const DB_NAME = 'lrv-comment-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

let dbPromise: Promise<IDBDatabase | null> | null = null;

export function buildCommentDraftKey(
  context: AppContextData,
  diff: DiffSnapshot,
  seriesInfo: SeriesInfo | null,
): string {
  // Key on stable identifiers only (not diff content) so comments survive
  // incremental edits between lrv runs.
  const fingerprint = JSON.stringify({
    working_directory: context.working_directory ?? null,
    git_branch: context.git_branch ?? null,
    // Prefer jj change ID (stable across amends) over git commit hash.
    commit_id: diff.jj_change_id ?? diff.commit_hash ?? null,
    series: seriesInfo?.is_series
      ? seriesInfo.commits.map((c) => c.jj_change_id ?? c.commit_hash ?? null)
      : null,
  });

  return `review-comments:v2:${hashString(fingerprint)}:${fingerprint.length.toString(36)}`;
}

export async function loadCommentDraft(key: string): Promise<ReviewComment[]> {
  const db = await openDraftDb();
  if (!db) {
    return [];
  }

  try {
    const record = await runTransaction<CommentDraftRecord | undefined>(db, 'readonly', (store) =>
      store.get(key),
    );
    if (!record || record.schemaVersion !== 1 || !Array.isArray(record.comments)) {
      return [];
    }
    return sanitizeComments(record.comments);
  } catch (error) {
    console.warn('Failed to load persisted review comments:', error);
    return [];
  }
}

export async function saveCommentDraft(key: string, comments: ReviewComment[]): Promise<void> {
  const sanitized = sanitizeComments(comments);
  if (sanitized.length === 0) {
    await clearCommentDraft(key);
    return;
  }

  const db = await openDraftDb();
  if (!db) {
    return;
  }

  const record: CommentDraftRecord = {
    key,
    schemaVersion: 1,
    savedAt: Date.now(),
    comments: sanitized,
  };

  try {
    await runTransaction(db, 'readwrite', (store) => store.put(record));
  } catch (error) {
    console.warn('Failed to persist review comments:', error);
  }
}

export async function clearCommentDraft(key: string): Promise<void> {
  const db = await openDraftDb();
  if (!db) {
    return;
  }

  try {
    await runTransaction(db, 'readwrite', (store) => store.delete(key));
  } catch (error) {
    console.warn('Failed to clear persisted review comments:', error);
  }
}

function openDraftDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  dbPromise ??= new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('Failed to open review comment draft database:', request.error);
      resolve(null);
    };
    request.onblocked = () => {
      console.warn('Review comment draft database open is blocked by another tab');
      resolve(null);
    };
  });

  return dbPromise;
}

function runTransaction<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    let result: T;

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));

    try {
      const request = action(tx.objectStore(STORE_NAME));
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    } catch (error) {
      reject(error);
    }
  });
}

function fingerprintFile(file: DiffFile) {
  return {
    path: file.path,
    old_path: file.old_path ?? null,
    status: file.status,
    hunks: file.hunks.map((hunk) => ({
      old_start: hunk.old_start ?? null,
      new_start: hunk.new_start ?? null,
      lines: hunk.lines.map((line) => [
        line.old_line ?? null,
        line.new_line ?? null,
        line.type ?? null,
        line.content ?? null,
      ]),
    })),
  };
}

function sanitizeComments(value: unknown): ReviewComment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const comments: ReviewComment[] = [];
  for (const item of value) {
    const comment = sanitizeComment(item);
    if (comment) {
      comments.push(comment);
    }
  }
  return comments;
}

function sanitizeComment(value: unknown): ReviewComment | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<ReviewComment>;
  if (
    typeof raw.file !== 'string' ||
    !isCommentLine(raw.line) ||
    (raw.side !== 'old' && raw.side !== 'new') ||
    typeof raw.body !== 'string'
  ) {
    return null;
  }

  const comment: ReviewComment = {
    file: raw.file,
    line: cloneCommentLine(raw.line),
    side: raw.side,
    body: raw.body,
  };

  if (typeof raw.commit_idx === 'number' && Number.isInteger(raw.commit_idx)) {
    comment.commit_idx = raw.commit_idx;
  }

  return comment;
}

function isCommentLine(value: unknown): value is CommentLine {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return true;
  }
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  const start = value[0];
  const end = value[1];
  return (
    typeof start === 'number' &&
    typeof end === 'number' &&
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start > 0 &&
    end >= start
  );
}

function cloneCommentLine(line: CommentLine): CommentLine {
  return Array.isArray(line) ? [line[0], line[1]] : line;
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
