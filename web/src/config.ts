import type { AppConfig, AppConfigInput } from './types/app';

export const DEFAULT_APP_CONFIG: AppConfig = {
  color_scheme: 'vs-dark',
  font: 'JetBrains Mono',
  split_view: true,
  auto_close_tab: true,
};

export function resolveAppConfig(input: AppConfigInput): AppConfig {
  return {
    color_scheme: input.color_scheme ?? DEFAULT_APP_CONFIG.color_scheme,
    font: input.font?.trim() || DEFAULT_APP_CONFIG.font,
    split_view: input.split_view ?? DEFAULT_APP_CONFIG.split_view,
    auto_close_tab: input.auto_close_tab ?? DEFAULT_APP_CONFIG.auto_close_tab,
  };
}
