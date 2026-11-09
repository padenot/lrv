import { commentContainsLine } from './comments';
import type { CommentLine } from './comments';

export type NoteDisposition = 'open' | 'accepted' | 'ignored';
export type NoteDispositions = Record<string, NoteDisposition>;
export type NoteEdits = Record<string, string>;

export type ReviewNote = {
  origin?: 'agent' | 'host';
  id?: string;
  discussion_id?: string;
  summary?: boolean;
  file: string;
  line: CommentLine;
  side: 'old' | 'new';
  body: string;
  author?: string;
  date?: string;
  source_url?: string;
  commit_idx?: number;
  read_only?: boolean;
  disposition?: NoteDisposition;
  accepted_body?: string | undefined;
};

export function acceptedBody(note: ReviewNote): string {
  return note.accepted_body ?? note.body;
}

export class ReviewNoteManager {
  private notes: ReviewNote[];
  private dispositions: NoteDispositions = {};
  private edits: NoteEdits = {};
  private listeners: Array<() => void>;
  private summaryWaiters: Array<() => boolean> = [];
  currentCommitIdx: number | null;

  constructor() {
    this.notes = [];
    this.listeners = [];
    this.currentCommitIdx = null;
  }

  setNotes(notes: ReviewNote[]): void {
    this.notes = notes.map((note) => this.withDisposition(note));
    this.notifyListeners();
  }

  mergeNotes(notes: ReviewNote[]): void {
    let added = false;
    for (const note of notes) {
      if (!this.notes.some((existing) => this.isSameNote(existing, note))) {
        this.notes.push(this.withDisposition(note));
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
    this.notes.push(this.withDisposition(note));
    this.notifyListeners();
  }

  getDispositions(): NoteDispositions {
    return { ...this.dispositions };
  }

  getEdits(): NoteEdits {
    return { ...this.edits };
  }

  applyDispositions(map: NoteDispositions, edits: NoteEdits = {}): void {
    this.dispositions = { ...map };
    this.edits = { ...edits };
    this.notes = this.notes.map((note) => this.withDisposition(note));
    this.notifyListeners();
  }

  private withDisposition(note: ReviewNote): ReviewNote {
    return {
      ...note,
      disposition: (note.id && this.dispositions[note.id]) || 'open',
      accepted_body: note.id ? this.edits[note.id] : undefined,
    };
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
    return this.notes.filter((n) => n.discussion_id === discussionId && !n.summary);
  }

  // Resolves with the first summary of the thread added after this call.
  nextSummary(rootId: string): Promise<ReviewNote> {
    const isSummary = (note: ReviewNote) => note.discussion_id === rootId && note.summary;
    const known = new Set(this.notes.filter(isSummary));
    return new Promise((resolve) => {
      const check = () => {
        const summary = this.notes.find((note) => isSummary(note) && !known.has(note));
        if (summary) {
          resolve(summary);
        }
        return !!summary;
      };
      this.summaryWaiters.push(check);
    });
  }

  removeDiscussionReplies(id: string): void {
    this.notes = this.notes.filter((note) => note.discussion_id !== id);
  }

  updateNote(target: ReviewNote, patch: Partial<ReviewNote>): void {
    const idx = this.notes.findIndex((note) => this.isSameNote(note, target));
    if (idx < 0) {
      return;
    }
    if (target.id && patch.disposition) {
      this.dispositions[target.id] = patch.disposition;
    }
    const note = this.notes[idx]!;
    if (note.id) {
      if ('accepted_body' in patch) {
        if (patch.accepted_body === undefined || patch.accepted_body === note.body) {
          delete this.edits[note.id];
        } else {
          this.edits[note.id] = patch.accepted_body;
        }
      }
      if (patch.disposition === 'open' || patch.disposition === 'ignored') {
        delete this.edits[note.id];
      }
    }
    this.notes[idx] = this.withDisposition({ ...note, ...patch });
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
    this.summaryWaiters = this.summaryWaiters.filter((check) => !check());
    this.listeners.forEach((l) => l());
  }

  private isSameNote(a: ReviewNote, b: ReviewNote): boolean {
    // The server assigns every note an id, so it alone decides which notes are the same.
    return a === b || (a.id !== undefined && a.id === b.id);
  }
}
