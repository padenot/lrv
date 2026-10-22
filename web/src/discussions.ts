import type { CommentLine } from './comments';

export type Discussion = {
  id: string;
  thread_id?: string;
  created_at: number;
  file: string;
  line: CommentLine;
  side: 'old' | 'new';
  body: string;
  commit_idx?: number;
};

export type DiscussionRequest =
  Omit<Discussion, 'id' | 'created_at' | 'thread_id'> | { thread_id: string; body: string };

export class DiscussionError extends Error {
  constructor(public status: number) {
    super(`Discussion request failed (${status})`);
  }
}

export class DiscussionManager {
  private discussions: Discussion[] = [];
  private listeners: Array<() => void> = [];
  currentCommitIdx: number | null = null;

  getForFile(file: string): Discussion[] {
    return this.discussions.filter(
      (d) =>
        !d.thread_id &&
        d.file === file &&
        (this.currentCommitIdx === null || d.commit_idx === this.currentCommitIdx),
    );
  }

  getFollowUps(rootId: string): Discussion[] {
    return this.discussions.filter((d) => d.thread_id === rootId);
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  setDiscussions(discussions: Discussion[]): void {
    this.discussions = [...discussions];
    this.notifyListeners();
  }

  async send(req: DiscussionRequest): Promise<void> {
    const response = await fetch('/api/discussions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        this.currentCommitIdx === null || 'thread_id' in req
          ? req
          : { ...req, commit_idx: this.currentCommitIdx },
      ),
    });
    if (!response.ok) {
      throw new DiscussionError(response.status);
    }
    const discussion: Discussion = await response.json();
    this.discussions.push(discussion);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}
