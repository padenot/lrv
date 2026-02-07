import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Run with half of available CPUs by default
  workers: '50%',
  // Use a lightweight reporter to keep runs fast
  reporter: 'line',

  use: {
    baseURL: 'http://localhost:9999',
    // Disable tracing/screenshots by default to speed up local runs
    trace: 'off',
    screenshot: 'off',
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
