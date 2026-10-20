import { commentContainsLine } from './comments';
import type { CommentLine } from './comments';

export type ReviewNote = {
  id?: string;
  discussion_id?: string;
  file: string;
  line: CommentLine;
  side: 'old' | 'new';
  body: string;
  author?: string;
  date?: string;
  source_url?: string;
  commit_idx?: number;
  read_only?: boolean;
  disposition?: 'open' | 'addressed' | 'ignored';
};

export class ReviewNoteManager {
  private notes: ReviewNote[];
  private listeners: Array<() => void>;
  currentCommitIdx: number | null;

  constructor() {
    this.notes = [];
    this.listeners = [];
    this.currentCommitIdx = null;
  }

  setNotes(notes: ReviewNote[]): void {
    this.notes = [...notes];
    this.notifyListeners();
  }

  mergeNotes(notes: ReviewNote[]): void {
    let added = false;
    for (const note of notes) {
      if (!this.notes.some((existing) => this.isSameNote(existing, note))) {
        this.notes.push(note);
        added = true;
      }
    }
    if (added) {
      this.notifyListeners();
    }
  }

  addNote(note: ReviewNote): void {
    if (this.currentCommitIdx !== null && note.commit_idx === undefined) {
      note = { ...note, commit_idx: this.currentCommitIdx };
    }
    this.notes.push(note);
    this.notifyListeners();
  }

  getNotes(): ReviewNote[] {
    return this.notes.filter((n) => !n.discussion_id);
  }

  getNotesForFile(file: string): ReviewNote[] {
    return this.notes.filter(
      (n) =>
        !n.discussion_id &&
        n.file === file &&
        (this.currentCommitIdx === null || n.commit_idx === this.currentCommitIdx),
    );
  }

  getDiscussionReplies(discussionId: string): ReviewNote[] {
    return this.notes.filter((n) => n.discussion_id === discussionId);
  }

  removeDiscussionReplies(id: string): void {
    this.notes = this.notes.filter((note) => note.discussion_id !== id);
  }

  updateNote(target: ReviewNote, patch: Partial<ReviewNote>): void {
    const idx = this.notes.findIndex((note) => this.isSameNote(note, target));
    if (idx < 0) {
      return;
    }
    this.notes[idx] = { ...this.notes[idx]!, ...patch };
    this.notifyListeners();
  }

  findNote(file: string, line: number, side: 'old' | 'new'): number {
    return this.notes.findIndex(
      (n) =>
        !n.discussion_id &&
        n.file === file &&
        n.side === side &&
        commentContainsLine(n, line) &&
        (this.currentCommitIdx === null || n.commit_idx === this.currentCommitIdx),
    );
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  private isSameNote(a: ReviewNote, b: ReviewNote): boolean {
    // The server assigns every note an id, so it alone decides which notes are the same.
    return a === b || (a.id !== undefined && a.id === b.id);
  }
}
