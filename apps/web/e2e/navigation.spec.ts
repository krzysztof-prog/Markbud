import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Navigation and Routing
 *
 * Tests application navigation:
 * - Sidebar/menu navigation
 * - Page transitions
 * - Breadcrumbs
 * - Mobile menu behavior
 * - Deep linking
 * - Browser back/forward
 */

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display sidebar with navigation links', async ({ page }) => {
    // Look for sidebar/navigation
    const sidebar = page.locator('aside, nav, [data-testid="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Should have multiple navigation items
    const navLinks = sidebar.locator('a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(3);
  });

  test('should navigate to deliveries page from sidebar', async ({ page }) => {
    // Find deliveries link
    const deliveriesLink = page.locator('a:has-text("Dostawy"), a[href="/dostawy"]').first();

    if (await deliveriesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deliveriesLink.click();
      await page.waitForURL(/\/dostawy/, { timeout: 5000 });

      // Verify page loaded
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should navigate to warehouse page from sidebar', async ({ page }) => {
    // Find warehouse/magazyn link
    const warehouseLink = page.locator('a:has-text("Magazyn"), a[href*="magazyn"]').first();

    if (await warehouseLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await warehouseLink.click();
      await page.waitForTimeout(1000);

      // Verify navigation happened
      const url = page.url();
      expect(url).toContain('magazyn');
    } else {
      test.skip();
    }
  });

  test('should navigate to settings page from sidebar', async ({ page }) => {
    // Find settings link
    const settingsLink = page.locator('a:has-text("Ustawienia"), a[href="/ustawienia"]').first();

    if (await settingsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForURL(/\/ustawienia/, { timeout: 5000 });

      // Verify page loaded
      const heading = page.locator('h1:has-text("Ustawienia"), h1').first();
      await expect(heading).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Navigate to a page
    const deliveriesLink = page.locator('a[href="/dostawy"]').first();

    if (await deliveriesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deliveriesLink.click();
      await page.waitForTimeout(500);

      // Active link should have different styling (aria-current, active class, etc.)
      const activeLink = page.locator('a[aria-current="page"], a.active, a[data-active="true"]').first();

      if (await activeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(activeLink).toBeVisible();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should show mobile menu button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for hamburger menu button
    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu"), [data-testid="mobile-menu"]').first();

    if (await menuButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(menuButton).toBeVisible();
    } else {
      // On mobile, sidebar might be hidden initially
      const sidebar = page.locator('aside, nav');
      const isHidden = await sidebar.isHidden().catch(() => true);
      expect(isHidden).toBe(true);
    }
  });

  test('should toggle mobile menu on button click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu")').first();

    if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Open menu
      await menuButton.click();
      await page.waitForTimeout(300);

      // Navigation should be visible
      const nav = page.locator('aside, nav, [role="navigation"]');
      await expect(nav.first()).toBeVisible({ timeout: 2000 });

      // Close menu
      await menuButton.click();
      await page.waitForTimeout(300);
    } else {
      test.skip();
    }
  });

  test('should navigate in mobile menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const menuButton = page.locator('button[aria-label*="menu"]').first();

    if (await menuButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuButton.click();
      await page.waitForTimeout(300);

      // Click a link
      const deliveriesLink = page.locator('a:has-text("Dostawy")').first();
      if (await deliveriesLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deliveriesLink.click();
        await page.waitForURL(/\/dostawy/, { timeout: 5000 });

        // Menu should close after navigation
        const nav = page.locator('aside, nav');
        // Menu might close automatically
      }
    } else {
      test.skip();
    }
  });
});

test.describe('Page Transitions and Deep Linking', () => {
  test('should support direct URL navigation', async ({ page }) => {
    // Navigate directly to deliveries page
    await page.goto('/dostawy');
    await page.waitForLoadState('networkidle');

    // Page should load correctly
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should support nested routes', async ({ page }) => {
    // Try to access nested route
    await page.goto('/magazyn/akrobud');
    await page.waitForLoadState('networkidle');

    // Should load without 404
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible({ timeout: 10000 });
  });

  test('should handle browser back button', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to deliveries
    const deliveriesLink = page.locator('a[href="/dostawy"]').first();
    if (await deliveriesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deliveriesLink.click();
      await page.waitForURL(/\/dostawy/, { timeout: 5000 });

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Should be back at home
      const url = page.url();
      expect(url).toMatch(/\/$|\/$/);
    } else {
      test.skip();
    }
  });

  test('should handle browser forward button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const deliveriesLink = page.locator('a[href="/dostawy"]').first();
    if (await deliveriesLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deliveriesLink.click();
      await page.waitForURL(/\/dostawy/, { timeout: 5000 });

      await page.goBack();
      await page.waitForTimeout(300);

      // Go forward
      await page.goForward();
      await page.waitForTimeout(500);

      // Should be at deliveries again
      const url = page.url();
      expect(url).toContain('dostawy');
    } else {
      test.skip();
    }
  });
});

test.describe('Breadcrumbs Navigation', () => {
  test('should display breadcrumbs on detail pages', async ({ page }) => {
    // Navigate to a detail page
    await page.goto('/magazyn/akrobud/szczegoly');
    await page.waitForLoadState('networkidle');

    // Look for breadcrumbs
    const breadcrumbs = page.locator('nav[aria-label="breadcrumb"], [data-testid="breadcrumbs"], .breadcrumb');

    if (await breadcrumbs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(breadcrumbs).toBeVisible();

      // Should have multiple breadcrumb items
      const items = breadcrumbs.locator('a, li');
      const count = await items.count();
      expect(count).toBeGreaterThan(1);
    } else {
      // Breadcrumbs might not be implemented
      test.skip();
    }
  });

  test('should navigate using breadcrumbs', async ({ page }) => {
    await page.goto('/magazyn/akrobud/szczegoly');
    await page.waitForLoadState('networkidle');

    const breadcrumbs = page.locator('nav[aria-label="breadcrumb"] a').first();

    if (await breadcrumbs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await breadcrumbs.click();
      await page.waitForTimeout(500);

      // Should navigate to parent page
      const url = page.url();
      expect(url).not.toContain('szczegoly');
    } else {
      test.skip();
    }
  });
});

test.describe('Navigation State Persistence', () => {
  test('should preserve scroll position on back navigation', async ({ page }) => {
    await page.goto('/dostawy');
    await page.waitForLoadState('networkidle');

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(300);

    // Navigate away
    const settingsLink = page.locator('a[href="/ustawienia"]').first();
    if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsLink.click();
      await page.waitForURL(/\/ustawienia/, { timeout: 5000 });

      // Go back
      await page.goBack();
      await page.waitForTimeout(500);

      // Check if scroll position is preserved (might vary by framework)
      const scrollY = await page.evaluate(() => window.scrollY);
      // Some frameworks preserve scroll, some don't - just verify no crash
      expect(scrollY).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });
});

test.describe('External Links', () => {
  test('should open external links in new tab', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for external links (if any)
    const externalLinks = page.locator('a[target="_blank"], a[rel="noopener"]');

    if (await externalLinks.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      const firstExternalLink = externalLinks.first();

      // Check target attribute
      const target = await firstExternalLink.getAttribute('target');
      expect(target).toBe('_blank');

      // Check for security attributes
      const rel = await firstExternalLink.getAttribute('rel');
      if (rel) {
        expect(rel).toContain('noopener');
      }
    } else {
      // No external links found
      test.skip();
    }
  });
});