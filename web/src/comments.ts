export type CommentLine = number | [number, number];

export type ReviewComment = {
  file: string;
  line: CommentLine;
  side: 'old' | 'new';
  body: string;
};

export function commentStartLine(comment: ReviewComment): number {
  return Array.isArray(comment.line) ? comment.line[0] : comment.line;
}

export function commentEndLine(comment: ReviewComment): number {
  return Array.isArray(comment.line) ? comment.line[1] : comment.line;
}

export function commentContainsLine(comment: ReviewComment, line: number): boolean {
  const start = commentStartLine(comment);
  const end = commentEndLine(comment);
  return line >= start && line <= end;
}

export function commentLineLabel(comment: ReviewComment): string {
  const start = commentStartLine(comment);
  const end = commentEndLine(comment);
  return start === end ? String(start) : `${start}-${end}`;
}

export class CommentManager {
  private comments: ReviewComment[];
  private listeners: Array<() => void>;

  constructor() {
    this.comments = [];
    this.listeners = [];
  }

  addComment(comment: ReviewComment): void {
    this.comments.push(comment);
    this.notifyListeners();
  }

  removeComment(index: number): void {
    this.comments.splice(index, 1);
    this.notifyListeners();
  }

  findComment(file: string, line: number, side: 'old' | 'new'): number {
    return this.comments.findIndex(
      (c) => c.file === file && c.side === side && commentContainsLine(c, line),
    );
  }

  updateComment(index: number, newBody: string): void {
    const comment = this.comments[index];
    if (!comment) {
      return;
    }
    comment.body = newBody;
    this.notifyListeners();
  }

  getComments(): ReviewComment[] {
    return [...this.comments];
  }

  getCommentsForFile(file: string): ReviewComment[] {
    return this.comments.filter((c) => c.file === file);
  }

  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }
}
