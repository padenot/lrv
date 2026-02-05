import { commentContainsLine } from './comments';
import type { CommentLine } from './comments';

export type ReviewNote = {
  id?: string;
  file: string;
  line: CommentLine;
  side: 'old' | 'new';
  body: string;
  author?: string;
  date?: string;
  source_url?: string;
  commit_idx?: number;
  disposition?: 'open' | 'addressed' | 'ignored';
  instruction?: string | undefined;
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

  addNote(note: ReviewNote): void {
    if (this.currentCommitIdx !== null && note.commit_idx === undefined) {
      note = { ...note, commit_idx: this.currentCommitIdx };
    }
    this.notes.push(note);
    this.notifyListeners();
  }

  getNotes(): ReviewNote[] {
    return [...this.notes];
  }

  getNotesForFile(file: string): ReviewNote[] {
    return this.notes.filter(
      (n) =>
        n.file === file &&
        (this.currentCommitIdx === null || n.commit_idx === this.currentCommitIdx),
    );
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
    if (a.id && b.id) {
      return a.id === b.id;
    }
    return (
      a.file === b.file &&
      a.side === b.side &&
      JSON.stringify(a.line) === JSON.stringify(b.line) &&
      a.body === b.body &&
      a.commit_idx === b.commit_idx
    );
  }
}
