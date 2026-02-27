import { fetchJSON } from './api';
import { computeHunkRanges } from './diff-utils';
import type { AppContext, DiffFile, FilePair } from './types/app';

type FileContentResponse = { content?: string };

export class FileDataMethods {
  declare fileCache: AppContext['fileCache'];
  declare _eagerPrefetchStarted: boolean;
  declare files: AppContext['files'];
  declare fileHunks: AppContext['fileHunks'];
  declare currentHunkIndex: AppContext['currentHunkIndex'];

  async fetchFilePair(filePath: string): Promise<FilePair> {
    if (this.fileCache[filePath]) {
      return this.fileCache[filePath];
    }

    const [oldData, newData] = await Promise.all([
      fetchJSON<FileContentResponse>(`/api/file?path=${encodeURIComponent(filePath)}&side=old`).catch((err) => {
        if (window.DEBUG) {
          console.error('[app] old fetch failed', err);
        }
        return { content: '' };
      }),
      fetchJSON<FileContentResponse>(`/api/file?path=${encodeURIComponent(filePath)}&side=new`).catch((err) => {
        if (window.DEBUG) {
          console.error('[app] new fetch failed', err);
        }
        return { content: '' };
      }),
    ]);

    this.fileCache[filePath] = {
      old: oldData.content ?? '',
      new: newData.content ?? '',
    };
    return this.fileCache[filePath];
  }

  // When we detect slow file fetches, eagerly prefetch the rest to warm caches
  async eagerPrefetchAllFiles() {
    if (this._eagerPrefetchStarted) {
      return;
    }
    this._eagerPrefetchStarted = true;
    const paths = this.files.map((f) => f.path);
    const toFetch = paths.filter((p) => !this.fileCache[p]);
    if (toFetch.length === 0) {
      return;
    }
    if (window.DEBUG) {
      console.log('[prefetch] warming', toFetch.length, 'files');
    }
    const concurrency = 8;
    let i = 0;
    const nextBatch = () => {
      const batch = [];
      for (let k = 0; k < concurrency && i < toFetch.length; k++, i++) {
        const p = toFetch[i];
        batch.push(
          Promise.all([
            fetchJSON<FileContentResponse>(`/api/file?path=${encodeURIComponent(p)}&side=old`),
            fetchJSON<FileContentResponse>(`/api/file?path=${encodeURIComponent(p)}&side=new`),
          ])
            .then(([oldData, newData]) => {
              this.fileCache[p] = { old: oldData.content ?? '', new: newData.content ?? '' };
            })
            .catch(() => {}),
        );
      }
      return Promise.all(batch);
    };
    while (i < toFetch.length) {
      await nextBatch();
    }
    if (window.DEBUG) {
      console.log('[prefetch] done');
    }
  }

  initFileHunks(file: DiffFile): void {
    if (!this.fileHunks[file.path]) {
      const { hunkRanges } = computeHunkRanges(file.hunks);
      this.fileHunks[file.path] = hunkRanges;
      this.currentHunkIndex[file.path] = 0;
    }
  }
}
