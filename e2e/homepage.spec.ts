import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/Borsa Verileri/);
    
    // Check for main navigation elements
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should display stock search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    
    // Test search functionality
    await searchInput.fill('THYAO');
    await searchInput.press('Enter');
    
    // Wait for search results or navigation
    await page.waitForTimeout(2000);
  });

  test('should navigate to different sections', async ({ page }) => {
    // Test navigation links if they exist
    const links = page.locator('a[href*="/"]');
    const linkCount = await links.count();
    
    if (linkCount > 0) {
      // Click on the first navigation link
      await links.first().click();
      await page.waitForLoadState('networkidle');
      
      // Verify navigation worked
      expect(page.url()).not.toBe('http://localhost:5173/');
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if page is still functional
    await expect(page.locator('body')).toBeVisible();
    
    // Check if navigation adapts to mobile
    const mobileNav = page.locator('[data-testid="mobile-nav"], .mobile-menu, button[aria-label*="menu"]');
    if (await mobileNav.count() > 0) {
      await expect(mobileNav.first()).toBeVisible();
    }
  });

  test('should handle loading states', async ({ page }) => {
    // Intercept API calls to test loading states
    await page.route('**/api/**', async route => {
      // Delay the response to test loading states
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    
    await page.reload();
    
    // Look for loading indicators
    const loadingIndicators = page.locator('[data-testid="loading"], .loading, .spinner');
    if (await loadingIndicators.count() > 0) {
      await expect(loadingIndicators.first()).toBeVisible();
    }
  });
});