import { fetchJSON } from './api';
import type { ReviewNote } from './review-notes';
import type { AgentState, AppContext } from './types/app';

export function startLiveEvents(
  app: Pick<AppContext, 'reviewNoteManager' | 'setAgentState' | 'agentState'>,
): void {
  const source = new EventSource('/api/events');
  let pending: ReviewNote[] | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let fetching = false;
  let refreshAgain = false;

  const merge = () => {
    timer = null;
    if (!pending) {
      return;
    }
    if (document.querySelector('.review-note-reply, .discussion-reply')) {
      timer = setTimeout(merge, 500);
      return;
    }
    app.reviewNoteManager.mergeNotes(pending);
    pending = null;
  };

  const refresh = async () => {
    if (fetching) {
      refreshAgain = true;
      return;
    }
    fetching = true;
    try {
      do {
        refreshAgain = false;
        pending = await fetchJSON<ReviewNote[]>('/api/review-notes');
        if (timer === null) {
          merge();
        }
      } while (refreshAgain);
    } catch (error) {
      console.warn('Failed to load live review notes', error);
    } finally {
      fetching = false;
    }
  };

  source.addEventListener('agent', (e) => app.setAgentState(JSON.parse(e.data) as AgentState));
  source.addEventListener('error', () =>
    app.setAgentState({
      ...app.agentState,
      attached: false,
      busy: app.agentState.launch === 'running',
    }),
  );
  source.addEventListener('notes', () => void refresh());
  window.addEventListener(
    'pagehide',
    () => {
      source.close();
      if (timer !== null) {
        clearTimeout(timer);
      }
    },
    { once: true },
  );
}
