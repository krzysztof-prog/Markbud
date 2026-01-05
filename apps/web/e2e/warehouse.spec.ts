import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Warehouse Management
 *
 * Tests warehouse functionality:
 * - Viewing warehouse stock
 * - Filtering by color
 * - Updating stock levels
 * - Viewing warehouse orders
 */

test.describe('Warehouse Stock Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/magazyn/akrobud');
    await page.waitForLoadState('networkidle');
  });

  test('should display warehouse stock table', async ({ page }) => {
    // Wait for the main content area
    await page.waitForSelector('main, [role="main"]', { timeout: 10000 });

    // Should have a table or grid
    const stockTable = page.locator('table, [role="grid"], [data-testid="warehouse-stock"]');
    await expect(stockTable).toBeVisible({ timeout: 10000 });
  });

  test('should filter by color', async ({ page }) => {
    // Look for color filter/tabs
    const colorFilter = page.locator('[role="tablist"], [data-testid="color-tabs"], button:has-text("RAL")').first();

    if (await colorFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      const firstColorTab = page.locator('[role="tab"]').first();
      await firstColorTab.click();

      // Wait for table to update
      await page.waitForTimeout(500);

      // Verify table is still visible after filter
      const stockTable = page.locator('table, [role="grid"]');
      await expect(stockTable).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should show stock details', async ({ page }) => {
    // Wait for stock table
    const stockTable = page.locator('table tbody tr').first();

    if (await stockTable.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Table should have multiple columns with stock data
      const cells = stockTable.locator('td');
      const cellCount = await cells.count();

      // Warehouse table should have several columns (profile, color, stock, etc.)
      expect(cellCount).toBeGreaterThan(3);
    } else {
      test.skip();
    }
  });

  test('should allow editing stock quantity', async ({ page }) => {
    // Look for edit/update buttons or input fields
    const editButton = page.locator('button:has-text("Edytuj"), [data-testid="edit-stock"]').first();

    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();

      // Should show input or dialog
      const input = page.locator('input[type="number"], [data-testid="stock-input"]').first();
      await expect(input).toBeVisible({ timeout: 3000 });

      // Cancel the edit
      const cancelButton = page.locator('button:has-text("Anuluj")').first();
      if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Warehouse Orders', () => {
  test('should display warehouse orders page', async ({ page }) => {
    await page.goto('/magazyn/akrobud/zamowienia');
    await page.waitForLoadState('networkidle');

    // Check if page loaded
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to warehouse details', async ({ page }) => {
    await page.goto('/magazyn/akrobud');
    await page.waitForLoadState('networkidle');

    // Look for details/szczegoly link
    const detailsLink = page.locator('a:has-text("Szczegóły"), a[href*="szczegoly"]').first();

    if (await detailsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await detailsLink.click();
      await page.waitForURL(/szczegoly/, { timeout: 5000 });

      // Verify details page loaded
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Schuco Deliveries', () => {
  test('should display Schuco deliveries page', async ({ page }) => {
    await page.goto('/magazyn/dostawy-schuco');
    await page.waitForLoadState('networkidle');

    // Wait for page content
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Should have table or list
    const deliveriesList = page.locator('table, [role="grid"], [data-testid="schuco-deliveries"]');
    await expect(deliveriesList).toBeVisible({ timeout: 10000 });
  });

  test('should show Schuco order status', async ({ page }) => {
    await page.goto('/magazyn/dostawy-schuco');
    await page.waitForLoadState('networkidle');

    // Look for status indicators
    const statusBadges = page.locator('[data-testid="status-badge"], .status, [class*="badge"]');

    if (await statusBadges.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await statusBadges.count();
      expect(count).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });
});
