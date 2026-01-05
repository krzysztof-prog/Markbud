import { test, expect } from '@playwright/test';

/**
 * E2E Test: Application loads without console errors
 *
 * This test verifies that the application loads cleanly without any
 * console errors, which could indicate runtime issues, broken imports,
 * or configuration problems.
 */

test.describe('Application Console Errors', () => {
  test('should load home page without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];

    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known benign warnings from React dev mode
        if (!isIgnoredError(text)) {
          consoleErrors.push(text);
        }
      }
      if (msg.type() === 'warning') {
        const text = msg.text();
        if (!isIgnoredWarning(text)) {
          consoleWarnings.push(text);
        }
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    });

    // Navigate to home page
    await page.goto('/');

    // Wait for the sidebar to load (indicates app is ready)
    await page.waitForSelector('[data-testid="sidebar"], nav, aside', {
      timeout: 10000,
    });

    // Wait a bit for any async operations to complete
    await page.waitForTimeout(2000);

    // Assert no console errors
    if (consoleErrors.length > 0) {
      console.error('Console errors found:', consoleErrors);
    }
    expect(consoleErrors, 'Page should load without console errors').toHaveLength(0);

    // Log warnings for visibility but don't fail the test
    if (consoleWarnings.length > 0) {
      console.warn('Console warnings found:', consoleWarnings);
    }
  });

  test('should load settings page without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!isIgnoredError(text)) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    });

    // Navigate to settings page
    await page.goto('/ustawienia');

    // Wait for page content to load
    await page.waitForSelector('main, [role="main"], h1', {
      timeout: 10000,
    });

    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.error('Console errors found on /ustawienia:', consoleErrors);
    }
    expect(consoleErrors, 'Settings page should load without console errors').toHaveLength(0);
  });

  test('should load deliveries page without console errors', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!isIgnoredError(text)) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('pageerror', (error) => {
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    });

    // Navigate to deliveries page
    await page.goto('/dostawy');

    // Wait for page content to load
    await page.waitForSelector('main, [role="main"], h1', {
      timeout: 10000,
    });

    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.error('Console errors found on /dostawy:', consoleErrors);
    }
    expect(consoleErrors, 'Deliveries page should load without console errors').toHaveLength(0);
  });
});

/**
 * Filter out known benign errors that don't indicate real problems
 */
function isIgnoredError(text: string): boolean {
  const ignoredPatterns = [
    // React DevTools warnings
    /Download the React DevTools/i,
    // React strict mode double render warnings
    /Detected multiple renderings/i,
    // Known Next.js dev warnings
    /Fast Refresh/i,
    // WebSocket connection warnings (common in dev)
    /WebSocket connection/i,
    /Failed to connect to websocket/i,
    // Image optimization warnings in dev
    /Image optimization/i,
  ];

  return ignoredPatterns.some((pattern) => pattern.test(text));
}

/**
 * Filter out known benign warnings
 */
function isIgnoredWarning(text: string): boolean {
  const ignoredPatterns = [
    // React key warnings (these should be fixed but don't break functionality)
    /Each child in a list should have a unique "key" prop/i,
    // findDOMNode deprecation (from third-party libraries)
    /findDOMNode is deprecated/i,
    // componentWillReceiveProps deprecation (from third-party libraries)
    /componentWillReceiveProps/i,
  ];

  return ignoredPatterns.some((pattern) => pattern.test(text));
}
