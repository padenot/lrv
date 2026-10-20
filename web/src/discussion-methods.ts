import { el } from './dom';
import { appendLinkifiedText } from './linkify';
import { commentLineLabel } from './comments';
import type { Discussion } from './discussions';

export class DiscussionMethods {
  buildDiscussionNode(discussion: Discussion) {
    const box = el('div', { className: 'discussion' });
    for (const eventName of ['pointerdown', 'mousedown', 'click', 'dblclick']) {
      box.addEventListener(eventName, (event) => event.stopPropagation());
    }
    const meta = el('div', {
      className: 'discussion-meta',
      text: `You · ${new Date(discussion.created_at).toLocaleTimeString()} · ${discussion.side} line ${commentLineLabel(discussion)} · Sent to agent`,
    });
    const body = el('div', { className: 'discussion-body' });
    appendLinkifiedText(body, discussion.body);
    box.append(meta, body);
    return box;
  }
}
