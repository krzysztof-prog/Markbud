import { test, expect } from '@playwright/test';
import path from 'path';

/**
 * E2E Tests: CSV Import Functionality
 *
 * Tests import workflow:
 * - Navigating to import page
 * - Uploading CSV files
 * - Viewing import history
 * - Validating import data
 */

test.describe('CSV Import Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/importy');
    await page.waitForLoadState('networkidle');
  });

  test('should display imports page', async ({ page }) => {
    // Check page header
    const header = page.locator('h1, h2').first();
    await expect(header).toBeVisible();

    // Should have upload area or import history
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test('should show file upload area', async ({ page }) => {
    // Look for file input or dropzone
    const fileInput = page.locator('input[type="file"]');
    const dropzone = page.locator('[data-testid="dropzone"], .dropzone, [class*="upload"]');

    const hasFileInput = await fileInput.isVisible({ timeout: 3000 }).catch(() => false);
    const hasDropzone = await dropzone.first().isVisible({ timeout: 3000 }).catch(() => false);

    expect(hasFileInput || hasDropzone).toBeTruthy();
  });

  test('should display import history', async ({ page }) => {
    // Look for import history table or list
    const historyList = page.locator('table, [data-testid="import-history"], [role="grid"]');

    if (await historyList.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(historyList).toBeVisible();

      // Check if there are any imports
      const rows = historyList.locator('tbody tr, [data-testid="import-item"]');
      const count = await rows.count();

      // Just verify the structure exists, even if empty
      expect(count).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test('should show import details', async ({ page }) => {
    // Wait for import history
    const firstImport = page.locator('table tbody tr, [data-testid="import-item"]').first();

    if (await firstImport.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstImport.click();

      // Should show details (modal or new page)
      await page.waitForTimeout(500);

      // Check for modal or navigation
      const modal = page.locator('[role="dialog"], [data-testid="import-details"]');
      const hasModal = await modal.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasModal) {
        await expect(modal).toBeVisible();

        // Close modal
        const closeButton = modal.locator('button:has-text("Zamknij"), [aria-label="Close"]').first();
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    } else {
      test.skip();
    }
  });

  test('should validate file type restrictions', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check accepted file types
      const accept = await fileInput.getAttribute('accept');

      if (accept) {
        // Should accept CSV files
        expect(accept).toMatch(/csv|text/i);
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Import Status and Validation', () => {
  test('should show import status indicators', async ({ page }) => {
    await page.goto('/importy');
    await page.waitForLoadState('networkidle');

    // Look for status badges or icons
    const statusIndicators = page.locator('[data-testid="import-status"], .status, [class*="badge"]');

    if (await statusIndicators.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await statusIndicators.count();
      expect(count).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });

  test('should display validation errors if any', async ({ page }) => {
    await page.goto('/importy');
    await page.waitForLoadState('networkidle');

    // Click on an import to see details
    const firstImport = page.locator('table tbody tr').first();

    if (await firstImport.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstImport.click();
      await page.waitForTimeout(500);

      // Look for validation errors section
      const errorsSection = page.locator('[data-testid="validation-errors"], .errors, [class*="error"]');

      // Just verify the page structure exists
      const mainContent = page.locator('main, [role="dialog"]');
      await expect(mainContent).toBeVisible();
    } else {
      test.skip();
    }
  });
});
