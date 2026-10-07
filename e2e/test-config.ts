import type { Page } from '@playwright/test';

// XDG_CONFIG_HOME does not isolate dirs::config_dir() on macOS. Keep browser
// preferences local to each test instead of reading or changing the user's UI.
export async function isolateConfig(page: Page) {
  let config = {
    color_scheme: 'vs-dark',
    font: 'JetBrains Mono',
    split_view: true,
    auto_close_tab: true,
    stacked_view: false,
    word_wrap: false,
  };
  await page.route('**/api/config', async (route) => {
    if (route.request().method() === 'PUT') {
      config = route.request().postDataJSON();
    }
    await route.fulfill({ json: config });
  });
}
