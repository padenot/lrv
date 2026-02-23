export class CommentManager {
  constructor() {
    this.comments = [];
    this.listeners = [];
  }

  addComment(comment) {
    this.comments.push(comment);
    this.notifyListeners();
  }

  removeComment(index) {
    this.comments.splice(index, 1);
    this.notifyListeners();
  }

  findComment(file, line, side) {
    return this.comments.findIndex((c) => c.file === file && c.start_line === line && c.side === side);
  }

  updateComment(index, newBody) {
    if (index >= 0 && index < this.comments.length) {
      this.comments[index].body = newBody;
      this.notifyListeners();
    }
  }

  getComments() {
    return [...this.comments];
  }

  getCommentsForFile(file) {
    return this.comments.filter((c) => c.file === file);
  }

  onChange(listener) {
    this.listeners.push(listener);
  }

  notifyListeners() {
    this.listeners.forEach((l) => l());
  }
}
