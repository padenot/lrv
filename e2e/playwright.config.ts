import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially since we're managing server lifecycle
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker since we manage server
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:9999',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true, // Always run headless by default
  },

  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    // Optionally test other browsers for compatibility
    // {
    //   name: 'chromium',
    //   use: { ...devices['Desktop Chrome'] },
    // },
  ],

  // Don't start server automatically - tests will manage it
  // This gives us full control over when server starts/stops
});
