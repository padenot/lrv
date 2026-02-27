interface PerfHelpers {
  mark(name: string): void;
  measure(name: string, startMark: string, endMark: string): void;
  recordAppInitStart(): void;
  recordAppInitEnd(): void;
  recordFileSwitchStart(): void;
  recordFileSwitchEnd(): void;
  getMetrics(): Record<string, unknown>;
}

type RequireLike = {
  (deps: string[], callback: (...modules: unknown[]) => void): void;
  config(config: { paths?: Record<string, string> }): void;
};

declare global {
  const monaco: typeof import('monaco-editor/esm/vs/editor/editor.api');

  interface Window {
    DEBUG: boolean;
    __APP_READY: boolean;
    __APP?: { eagerPrefetchAllFiles?: () => Promise<void> };
    __ACCENT_READY?: boolean;
    MONACO_VS_BASE?: string;
    Perf: PerfHelpers;
    UI_THEME_DEFS?: Record<string, unknown>;
    UIThemeAccentsHex?: Record<string, string>;
    require?: RequireLike;
  }
}

export {};
