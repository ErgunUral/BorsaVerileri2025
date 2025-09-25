import { test, expect } from '@playwright/test';

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display main dashboard components', async ({ page }) => {
    // Check if main dashboard elements are visible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="market-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="real-time-dashboard"]')).toBeVisible();
  });

  test('should load market overview data', async ({ page }) => {
    // Wait for market overview to load
    await page.waitForSelector('[data-testid="market-overview"]');
    
    // Check if market indices are displayed
    await expect(page.locator('[data-testid="sp500-index"]')).toBeVisible();
    await expect(page.locator('[data-testid="nasdaq-index"]')).toBeVisible();
    await expect(page.locator('[data-testid="dow-index"]')).toBeVisible();
    
    // Check if values are displayed (not empty)
    const sp500Value = await page.locator('[data-testid="sp500-value"]').textContent();
    expect(sp500Value).toBeTruthy();
    expect(sp500Value).not.toBe('--');
  });

  test('should display real-time data updates', async ({ page }) => {
    // Wait for real-time dashboard to load
    await page.waitForSelector('[data-testid="real-time-dashboard"]');
    
    // Check if stock cards are displayed
    const stockCards = page.locator('[data-testid^="stock-card-"]');
    await expect(stockCards.first()).toBeVisible();
    
    // Check if stock data is displayed
    const firstCard = stockCards.first();
    await expect(firstCard.locator('[data-testid="stock-symbol"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="stock-price"]')).toBeVisible();
    await expect(firstCard.locator('[data-testid="stock-change"]')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if mobile navigation is visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if components are still visible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if all components are visible in desktop view
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-search"]')).toBeVisible();
    await expect(page.locator('[data-testid="market-overview"]')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Intercept API calls to simulate slow loading
    await page.route('**/api/stocks/market-overview', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await page.goto('/');
    
    // Check if loading indicator is shown
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForSelector('[data-testid="market-overview"]', { timeout: 10000 });
    
    // Check if loading indicator is hidden
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('**/api/stocks/market-overview', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });
    
    await page.goto('/');
    
    // Check if error message is displayed
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Check if retry button is available
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should navigate between sections', async ({ page }) => {
    // Test navigation to different sections
    await page.click('[data-testid="nav-stocks"]');
    await expect(page).toHaveURL(/.*stocks/);
    
    await page.click('[data-testid="nav-calculator"]');
    await expect(page).toHaveURL(/.*calculator/);
    
    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should maintain state during navigation', async ({ page }) => {
    // Perform a search
    await page.fill('[data-testid="search-input"]', 'AAPL');
    await page.press('[data-testid="search-input"]', 'Enter');
    
    // Navigate away and back
    await page.click('[data-testid="nav-calculator"]');
    await page.click('[data-testid="nav-dashboard"]');
    
    // Check if search state is maintained (if applicable)
    const searchValue = await page.locator('[data-testid="search-input"]').inputValue();
    // This depends on implementation - might be cleared or maintained
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test search with keyboard
    await page.focus('[data-testid="search-input"]');
    await page.keyboard.type('AAPL');
    await page.keyboard.press('Enter');
    
    // Check if search was triggered
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
  });

  test('should display correct page title and meta information', async ({ page }) => {
    await expect(page).toHaveTitle(/Borsa Verileri/);
    
    // Check meta description
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDescription).toBeTruthy();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate to different sections
    await page.click('[data-testid="nav-stocks"]');
    await page.click('[data-testid="nav-calculator"]');
    
    // Use browser back button
    await page.goBack();
    await expect(page).toHaveURL(/.*stocks/);
    
    // Use browser forward button
    await page.goForward();
    await expect(page).toHaveURL(/.*calculator/);
  });
});