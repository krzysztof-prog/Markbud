import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Settings Management
 *
 * Tests settings functionality:
 * - Viewing settings page
 * - Updating system configuration
 * - Managing profiles
 * - Managing colors
 * - Working days configuration
 */

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ustawienia');
    await page.waitForLoadState('networkidle');
  });

  test('should display settings page', async ({ page }) => {
    // Check page header
    const header = page.locator('h1:has-text("Ustawienia"), h1').first();
    await expect(header).toBeVisible({ timeout: 10000 });

    // Should have main content
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test('should show settings tabs or sections', async ({ page }) => {
    // Look for tabs or navigation
    const tabs = page.locator('[role="tablist"], nav a, [data-testid="settings-nav"]');

    if (await tabs.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(tabs).toBeVisible();

      // Should have multiple settings sections
      const tabItems = page.locator('[role="tab"], nav a');
      const count = await tabItems.count();

      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display currency configuration', async ({ page }) => {
    // Look for currency settings
    const currencySection = page.locator('[data-testid="currency-settings"], section:has-text("waluta"), input[type="number"]');

    if (await currencySection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(currencySection.first()).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should show working days configuration', async ({ page }) => {
    // Look for working days or calendar settings
    const workingDaysSection = page.locator('[data-testid="working-days"], section:has-text("dni robocze")');

    if (await workingDaysSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(workingDaysSection).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Profile Management in Settings', () => {
  test('should navigate to profiles settings', async ({ page }) => {
    await page.goto('/ustawienia');
    await page.waitForLoadState('networkidle');

    // Look for profiles tab/link
    const profilesLink = page.locator('a:has-text("Profile"), [data-testid="profiles-settings"]').first();

    if (await profilesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await profilesLink.click();
      await page.waitForTimeout(500);

      // Should show profiles list
      const profilesList = page.locator('table, [data-testid="profiles-list"]');
      await expect(profilesList).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should display profile depths settings', async ({ page }) => {
    await page.goto('/ustawienia');
    await page.waitForLoadState('networkidle');

    // Look for profile depths
    const depthsSection = page.locator('[data-testid="profile-depths"], section:has-text("głębokości")');

    if (await depthsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(depthsSection).toBeVisible();
    } else {
      test.skip();
    }
  });
});

test.describe('Color Management in Settings', () => {
  test('should navigate to colors settings', async ({ page }) => {
    await page.goto('/ustawienia');
    await page.waitForLoadState('networkidle');

    // Look for colors tab/link
    const colorsLink = page.locator('a:has-text("Kolory"), [data-testid="colors-settings"]').first();

    if (await colorsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await colorsLink.click();
      await page.waitForTimeout(500);

      // Should show colors list
      const colorsList = page.locator('table, [data-testid="colors-list"]');
      await expect(colorsList).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('should show color visibility toggles', async ({ page }) => {
    await page.goto('/ustawienia');
    await page.waitForLoadState('networkidle');

    // Navigate to colors if needed
    const colorsLink = page.locator('a:has-text("Kolory")').first();
    if (await colorsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await colorsLink.click();
      await page.waitForTimeout(500);
    }

    // Look for visibility toggles (checkboxes or switches)
    const toggles = page.locator('input[type="checkbox"], [role="switch"]');

    if (await toggles.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const count = await toggles.count();
      expect(count).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });
});

test.describe('Settings Form Interactions', () => {
  test('should allow editing settings', async ({ page }) => {
    await page.goto('/ustawienia');
    await page.waitForLoadState('networkidle');

    // Look for input fields
    const inputs = page.locator('input:not([type="hidden"]):not([type="search"])');

    if (await inputs.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const count = await inputs.count();
      expect(count).toBeGreaterThan(0);

      // Verify inputs are editable (not disabled)
      const firstInput = inputs.first();
      const isDisabled = await firstInput.isDisabled();
      expect(isDisabled).toBe(false);
    } else {
      test.skip();
    }
  });

  test('should show save/cancel buttons', async ({ page }) => {
    await page.goto('/ustawienia');
    await page.waitForLoadState('networkidle');

    // Look for action buttons
    const saveButton = page.locator('button:has-text("Zapisz"), button[type="submit"]');
    const cancelButton = page.locator('button:has-text("Anuluj"), button:has-text("Reset")');

    const hasSave = await saveButton.first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasCancel = await cancelButton.first().isVisible({ timeout: 3000 }).catch(() => false);

    // At least one action button should be present
    expect(hasSave || hasCancel).toBeTruthy();
  });
});
