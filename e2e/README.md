# End-to-End Tests

Real browser tests using Playwright - no mocks, tests the actual application.

**Important:** Tests run in an isolated temporary git repository created for each test. This ensures the main repository is never modified during testing.

## Setup

```bash
cd e2e
npm install
npx playwright install firefox  # Install Firefox browser
```

## Running Tests

```bash
# Run all tests (headless)
npm test

# Run with visible browser (see what's happening)
npm run test:headed

# Interactive UI mode (debug tests)
npm run test:ui

# Run specific test
npx playwright test review-workflow.spec.ts
```

## What These Tests Do

1. **Build the Rust binary** - Uses the actual compiled code
2. **Create isolated test repo** - Each test gets a fresh temporary git repository with test files
3. **Start the server** - Spawns the real lrv server with test data from the isolated repo
4. **Test with real browser** - Firefox opens and interacts with the UI
5. **Verify behavior** - Clicks buttons, types text, checks results
6. **Clean up** - Stops the server and removes the temporary repository after each test

This approach ensures:
- Tests don't modify your actual codebase
- Each test runs in a clean, isolated environment
- Real git diffs are generated from actual files
- No side effects between tests

## Test Coverage

- ✅ Diff view loads correctly
- ✅ File content displays in both panels
- ✅ Adding comments via line number click
- ✅ Keyboard shortcuts (help modal)
- ✅ Complete workflow (add comment → submit review)
- ✅ Settings modal (change theme)

## Writing New Tests

```typescript
test('should do something', async ({ page }) => {
  await page.goto('/');

  // Wait for element
  await page.waitForSelector('.my-element');

  // Click something
  await page.locator('#my-button').click();

  // Check result
  await expect(page.locator('.result')).toHaveText('Success');
});
```

## Debugging Tips

1. **Use headed mode**: `npm run test:headed` - see browser while tests run
2. **Use UI mode**: `npm run test:ui` - step through tests, see screenshots
3. **Screenshots on failure**: Automatically saved to `test-results/`
4. **Slow down tests**: Add `await page.pause()` to stop and inspect

## Why No Mocks?

These tests use the **real stack**:
- Real Rust server
- Real HTTP requests
- Real Monaco editor
- Real browser interactions

This catches integration issues that unit tests miss.
