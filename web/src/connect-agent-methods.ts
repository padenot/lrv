import { $ } from './dom';
import { launchAgent } from './api';
import type { AgentState, AppContext, LaunchRequest } from './types/app';

const storageKey = 'lrv.connect-agent';

export class ConnectAgentMethods {
  setAgentState(this: AppContext, state: AgentState): void {
    this.agentState = state;
    this.agentAttached = state.attached;
    document.body.classList.toggle('agent-attached', state.attached);
    const available = this.context?.launch_available === true;
    const active = state.attached || state.launch === 'running';
    const button = $<HTMLButtonElement>('#connect-agent')!;
    const badge = $<HTMLElement>('#agent-status')!;
    button.hidden = !available || active;
    badge.hidden = !available || !active;
    const busy =
      state.busy || state.initial_review || (!state.attached && state.launch === 'running');
    badge.classList.toggle('busy', busy);
    badge.title = busy ? 'The agent is working' : 'The agent is waiting for discussion comments';
    if (active) {
      $<HTMLElement>('#connect-agent-popover')!.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  }

  setupConnectAgent(this: AppContext): void {
    const button = $<HTMLButtonElement>('#connect-agent')!;
    const popover = $<HTMLElement>('#connect-agent-popover')!;
    const form = $<HTMLFormElement>('#connect-agent-form')!;
    const provider = $<HTMLSelectElement>('#agent-provider')!;
    const model = $<HTMLInputElement>('#agent-model')!;
    const effort = $<HTMLInputElement>('#agent-effort')!;
    const review = $<HTMLInputElement>('#agent-initial-review')!;
    const error = $<HTMLElement>('#agent-launch-error')!;
    const submit = $<HTMLButtonElement>('#agent-launch-submit')!;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null') as LaunchRequest | null;
      if (saved) {
        provider.value = saved.provider === 'codex' ? 'codex' : 'claude';
        model.value = typeof saved.model === 'string' ? saved.model : '';
        effort.value = typeof saved.effort === 'string' ? saved.effort : '';
        review.checked = saved.initial_review !== false;
      }
    } catch {
      /* Storage may be unavailable. */
    }
    const values = (): LaunchRequest => ({
      provider: provider.value as LaunchRequest['provider'],
      model: model.value.trim(),
      effort: effort.value.trim(),
      initial_review: review.checked,
    });
    const save = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(values()));
      } catch {
        /* Storage may be unavailable. */
      }
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);
    const close = () => {
      popover.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    };
    button.addEventListener('click', () => {
      popover.hidden = !popover.hidden;
      button.setAttribute('aria-expanded', String(!popover.hidden));
      if (!popover.hidden) {
        error.textContent = this.agentState.error || '';
        provider.focus();
      }
    });
    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Node) || !button.parentElement?.contains(event.target)) {
        close();
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !popover.hidden) {
        event.stopPropagation();
        close();
        button.focus();
      }
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      save();
      submit.disabled = true;
      error.textContent = '';
      const req = values();
      const previousState = this.agentState;
      void launchAgent(req)
        .then(() => {
          // SSE can report a fast failure before the HTTP response arrives.
          if (this.agentState === previousState) {
            this.setAgentState({
              attached: this.agentAttached,
              busy: true,
              launch: 'running',
              initial_review: req.initial_review,
            });
          }
          close();
        })
        .catch((reason: unknown) => {
          error.textContent = reason instanceof Error ? reason.message : String(reason);
        })
        .finally(() => {
          submit.disabled = false;
        });
    });
    this.setAgentState(this.agentState);
  }
}
