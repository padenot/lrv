import { el } from './dom';
import { appendLinkifiedText } from './linkify';
import { commentEndLine, commentLineLabel } from './comments';
import { DiscussionError, type Discussion } from './discussions';
import type { AppContext } from './types/app';

export class DiscussionMethods {
  declare discussionManager: AppContext['discussionManager'];
  declare reviewNoteManager: AppContext['reviewNoteManager'];
  declare isStacked: AppContext['isStacked'];
  declare showCommentDialog: AppContext['showCommentDialog'];
  declare showStackedDiscussionDraft: AppContext['showStackedDiscussionDraft'];

  deleteDiscussion(root: Discussion): Promise<void> {
    return this.discussionManager.delete(root.id, () => {
      this.reviewNoteManager.removeDiscussionReplies(root.id);
    });
  }

  async summarizeDiscussion(root: Discussion): Promise<string> {
    // Wait from before sending, so a fast reply can't be missed.
    const summary = this.reviewNoteManager.nextSummary(root.id);
    await this.discussionManager.send({
      thread_id: root.id,
      body: 'Summarize this thread as a review comment.',
      summarize: true,
    });
    return (await summary).body;
  }

  buildDiscussionNode(root: Discussion) {
    const box = el('div', { className: 'discussion' });
    for (const eventName of ['pointerdown', 'mousedown', 'click', 'dblclick']) {
      box.addEventListener(eventName, (event) => event.stopPropagation());
    }
    const entries = [
      { body: root.body, time: root.created_at, author: 'You', agent: false },
      ...this.discussionManager.getFollowUps(root.id).map((d) => ({
        body: d.body,
        time: d.created_at,
        author: 'You',
        agent: false,
      })),
      ...this.reviewNoteManager.getDiscussionReplies(root.id).map((note) => ({
        body: note.body,
        time: Date.parse(note.date!),
        author: note.author || 'Agent',
        agent: true,
      })),
    ].sort((a, b) => a.time - b.time);
    for (const entry of entries) {
      const node = el('div', {
        className: `discussion-entry${entry.agent ? ' discussion-entry-agent' : ''}`,
      });
      const meta = el('div', {
        className: 'discussion-meta',
        text: `${entry.author} · ${new Date(entry.time).toLocaleTimeString()} · ${root.side} line ${commentLineLabel(root)}`,
      });
      const body = el('div', { className: 'discussion-body' });
      appendLinkifiedText(body, entry.body);
      node.append(meta, body);
      box.appendChild(node);
    }
    const reply = el('button', {
      className: 'btn-secondary discussion-reply-btn',
      text: 'Reply',
    });
    reply.addEventListener('click', () => {
      if (box.querySelector('.discussion-reply')) {
        return;
      }
      const form = el('div', { className: 'discussion-reply' });
      const textarea = el('textarea', {
        className: 'discussion-reply-text',
        attrs: { placeholder: 'Follow up with the agent...' },
      });
      const controls = el('div', { className: 'discussion-reply-actions' });
      const send = el('button', { className: 'btn-primary', text: 'Send' });
      const cancel = el('button', { className: 'btn-secondary', text: 'Cancel' });
      const error = el('div', { className: 'comment-error' });
      error.hidden = true;
      const resize = () => {
        box.dispatchEvent(new Event('discussion-layout'));
        box.scrollTop = box.scrollHeight;
      };
      const close = () => {
        form.remove();
        reply.hidden = false;
        resize();
      };
      const submit = async () => {
        const body = textarea.value.trim();
        if (!body || send.disabled) {
          textarea.focus();
          return;
        }
        send.disabled = true;
        error.hidden = true;
        try {
          await this.discussionManager.send({ thread_id: root.id, body });
        } catch (err) {
          error.textContent =
            err instanceof DiscussionError && err.status === 409
              ? 'No agent is listening any more'
              : 'Failed to send discussion';
          error.hidden = false;
          send.disabled = false;
          resize();
        }
      };
      send.addEventListener('click', () => void submit());
      cancel.addEventListener('click', close);
      textarea.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close();
        } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          void submit();
        }
      });
      controls.append(send, cancel);
      form.append(textarea, error, controls);
      box.appendChild(form);
      reply.hidden = true;
      resize();
      textarea.focus();
    });
    const actions = el('div', { className: 'discussion-actions' });
    const deleteButton = el('button', {
      className: 'btn-danger discussion-delete-btn',
      text: 'Delete',
    });
    const deleteError = el('div', { className: 'comment-error' });
    deleteError.hidden = true;
    deleteButton.addEventListener('click', async () => {
      deleteButton.disabled = true;
      deleteError.hidden = true;
      try {
        await this.deleteDiscussion(root);
      } catch (err) {
        deleteButton.disabled = false;
        deleteError.textContent =
          err instanceof Error ? err.message : 'Failed to delete discussion';
        deleteError.hidden = false;
        box.dispatchEvent(new Event('discussion-layout'));
      }
    });
    const convert = el('button', {
      className: 'btn-secondary discussion-convert-btn',
      text: 'Convert',
    });
    convert.addEventListener('click', () => {
      if (this.isStacked) {
        this.showStackedDiscussionDraft(root);
      } else {
        this.showCommentDialog(root.file, root.line, commentEndLine(root), root.side, root);
      }
    });
    actions.append(reply, convert, deleteButton);
    box.append(actions, deleteError);
    requestAnimationFrame(() => {
      box.scrollTop = box.scrollHeight;
    });
    return box;
  }
}
