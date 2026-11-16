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
    const split = $<HTMLElement>('#connect-agent-split')!;
    const badge = $<HTMLElement>('#agent-status')!;
    split.hidden = !available || active;
    badge.hidden = !available || !active;
    const busy = state.busy || (!state.attached && state.launch === 'running');
    badge.classList.toggle('busy', busy);
    badge.title = busy ? 'The agent is working' : 'The agent is waiting for discussion comments';
    if (active) {
      $<HTMLElement>('#connect-agent-popover')!.hidden = true;
      $<HTMLButtonElement>('#connect-agent-options')!.setAttribute('aria-expanded', 'false');
    }
    this.updateCommitBarVisibility();
  }

  setupConnectAgent(this: AppContext): void {
    const button = $<HTMLButtonElement>('#connect-agent')!;
    const options = $<HTMLButtonElement>('#connect-agent-options')!;
    const popover = $<HTMLElement>('#connect-agent-popover')!;
    const form = $<HTMLFormElement>('#connect-agent-form')!;
    const provider = $<HTMLSelectElement>('#agent-provider')!;
    const model = $<HTMLInputElement>('#agent-model')!;
    const effort = $<HTMLInputElement>('#agent-effort')!;
    const error = $<HTMLElement>('#agent-launch-error')!;
    const submit = $<HTMLButtonElement>('#agent-launch-submit')!;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null') as LaunchRequest | null;
      if (saved) {
        provider.value = saved.provider === 'codex' ? 'codex' : 'claude';
        model.value = typeof saved.model === 'string' ? saved.model : '';
        effort.value = typeof saved.effort === 'string' ? saved.effort : '';
      }
    } catch {
      /* Storage may be unavailable. */
    }
    const values = (): LaunchRequest => ({
      provider: provider.value as LaunchRequest['provider'],
      model: model.value.trim(),
      effort: effort.value.trim(),
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
    const open = (message: string) => {
      popover.hidden = false;
      options.setAttribute('aria-expanded', 'true');
      error.textContent = message;
      provider.focus();
    };
    const close = () => {
      popover.hidden = true;
      options.setAttribute('aria-expanded', 'false');
    };
    const launch = () => {
      save();
      button.disabled = true;
      submit.disabled = true;
      error.textContent = '';
      const previousState = this.agentState;
      void launchAgent(values())
        .then(() => {
          // SSE can report a fast failure before the HTTP response arrives.
          if (this.agentState === previousState) {
            this.setAgentState({
              attached: this.agentAttached,
              busy: true,
              launch: 'running',
            });
          }
          close();
        })
        .catch((reason: unknown) => {
          // Surface the failure in the options popover so it can be corrected.
          open(reason instanceof Error ? reason.message : String(reason));
        })
        .finally(() => {
          button.disabled = false;
          submit.disabled = false;
        });
    };
    button.addEventListener('click', () => {
      close();
      launch();
    });
    options.addEventListener('click', () => {
      if (popover.hidden) {
        open(this.agentState.error || '');
      } else {
        close();
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
        options.focus();
      }
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      launch();
    });
    this.setAgentState(this.agentState);
  }
}
