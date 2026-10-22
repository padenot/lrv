import type { CommentLine } from './comments';

export type Discussion = {
  id: string;
  thread_id?: string;
  summarize?: boolean;
  created_at: number;
  file: string;
  line: CommentLine;
  side: 'old' | 'new';
  body: string;
  commit_idx?: number;
};

export type DiscussionRequest =
  | Omit<Discussion, 'id' | 'created_at' | 'thread_id'>
  | { thread_id: string; body: string; summarize?: boolean };

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
    return this.discussions.filter((d) => d.thread_id === rootId && !d.summarize);
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  setDiscussions(discussions: Discussion[]): void {
    this.discussions = [...discussions];
    this.notifyListeners();
  }

  async send(req: DiscussionRequest): Promise<Discussion> {
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
    return discussion;
  }

  async delete(id: string, onDeleted?: () => void): Promise<void> {
    const response = await fetch(`/api/discussions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new DiscussionError(response.status);
    }
    this.discussions = this.discussions.filter((d) => d.id !== id && d.thread_id !== id);
    onDeleted?.();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}
