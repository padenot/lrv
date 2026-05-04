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
  declare currentCommitIdx: AppContext['currentCommitIdx'];
  declare seriesInfo: AppContext['seriesInfo'];

  private commitParam(): string {
    return this.seriesInfo?.is_series ? `&commit=${this.currentCommitIdx}` : '';
  }

  fileCacheKey(filePath: string): string {
    return this.seriesInfo?.is_series ? `${this.currentCommitIdx}:${filePath}` : filePath;
  }

  async fetchFilePair(filePath: string): Promise<FilePair> {
    // Capture both the cache key and commit param at call time so that if
    // currentCommitIdx changes mid-await (commit switch), the in-flight
    // response lands under the correct key and doesn't pollute another commit.
    const cacheKey = this.fileCacheKey(filePath);
    if (this.fileCache[cacheKey]) {
      return this.fileCache[cacheKey];
    }

    const cp = this.commitParam();
    const [oldData, newData] = await Promise.all([
      fetchJSON<FileContentResponse>(
        `/api/file?path=${encodeURIComponent(filePath)}&side=old${cp}`,
      ).catch((err) => {
        if (window.DEBUG) {
          console.error('[app] old fetch failed', err);
        }
        return { content: '' };
      }),
      fetchJSON<FileContentResponse>(
        `/api/file?path=${encodeURIComponent(filePath)}&side=new${cp}`,
      ).catch((err) => {
        if (window.DEBUG) {
          console.error('[app] new fetch failed', err);
        }
        return { content: '' };
      }),
    ]);

    this.fileCache[cacheKey] = {
      old: oldData.content ?? '',
      new: newData.content ?? '',
    };
    return this.fileCache[cacheKey];
  }

  // When we detect slow file fetches, eagerly prefetch the rest to warm caches
  async eagerPrefetchAllFiles() {
    if (this._eagerPrefetchStarted) {
      return;
    }
    this._eagerPrefetchStarted = true;
    const paths = this.files.map((f) => f.path);
    const toFetch = paths.filter((p) => !this.fileCache[this.fileCacheKey(p)]);
    if (toFetch.length === 0) {
      return;
    }
    if (window.DEBUG) {
      console.info('[prefetch] warming', toFetch.length, 'files');
    }
    const cp = this.commitParam();
    const concurrency = 8;
    let i = 0;
    const nextBatch = () => {
      const batch: Array<Promise<void>> = [];
      for (let k = 0; k < concurrency && i < toFetch.length; k++, i++) {
        const p = toFetch[i]!;
        batch.push(
          Promise.all([
            fetchJSON<FileContentResponse>(`/api/file?path=${encodeURIComponent(p)}&side=old${cp}`),
            fetchJSON<FileContentResponse>(`/api/file?path=${encodeURIComponent(p)}&side=new${cp}`),
          ])
            .then(([oldData, newData]) => {
              this.fileCache[this.fileCacheKey(p)] = { old: oldData.content ?? '', new: newData.content ?? '' };
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
      console.info('[prefetch] done');
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
