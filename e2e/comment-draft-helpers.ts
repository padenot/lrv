import type { Page } from '@playwright/test';

async function readCommentDraftRecords(page: Page): Promise<Array<{ comments?: unknown[] }>> {
  return page.evaluate(() => {
    return new Promise<Array<{ comments?: unknown[] }>>((resolve, reject) => {
      const request = indexedDB.open('lrv-comment-drafts', 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'key' });
        }
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to open draft DB'));
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('drafts', 'readonly');
        let records: Array<{ comments?: unknown[] }> = [];

        tx.oncomplete = () => {
          db.close();
          resolve(records);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error ?? new Error('Failed to read draft DB'));
        };

        const getAll = tx.objectStore('drafts').getAll();
        getAll.onsuccess = () => {
          records = getAll.result as Array<{ comments?: unknown[] }>;
        };
        getAll.onerror = () => reject(getAll.error ?? new Error('Failed to read draft records'));
      };
    });
  });
}

export async function commentDraftCount(page: Page): Promise<number> {
  const records = await readCommentDraftRecords(page);
  return records.reduce(
    (count, record) => count + (Array.isArray(record.comments) ? record.comments.length : 0),
    0,
  );
}
