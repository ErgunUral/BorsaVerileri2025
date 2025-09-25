import { test, expect } from '@playwright/test';

test.describe('Stock Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific stock detail page
    await page.goto('/stock/AAPL');
  });

  test('should display stock information', async ({ page }) => {
    // Check for stock header with symbol and name
    await expect(page.locator('[data-testid="stock-symbol"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-name"]')).toBeVisible();
    
    // Check for current price
    await expect(page.locator('[data-testid="current-price"]')).toBeVisible();
    
    // Check for price change
    await expect(page.locator('[data-testid="price-change"]')).toBeVisible();
    
    // Check for percentage change
    await expect(page.locator('[data-testid="percentage-change"]')).toBeVisible();
  });

  test('should display stock metrics', async ({ page }) => {
    // Wait for metrics to load
    await expect(page.locator('[data-testid="stock-metrics"]')).toBeVisible({ timeout: 10000 });
    
    // Check for key metrics
    await expect(page.locator('[data-testid="market-cap"]')).toBeVisible();
    await expect(page.locator('[data-testid="pe-ratio"]')).toBeVisible();
    await expect(page.locator('[data-testid="52-week-high"]')).toBeVisible();
    await expect(page.locator('[data-testid="52-week-low"]')).toBeVisible();
    await expect(page.locator('[data-testid="volume"]')).toBeVisible();
    await expect(page.locator('[data-testid="dividend-yield"]')).toBeVisible();
  });

  test('should display price chart', async ({ page }) => {
    // Check for chart container
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible({ timeout: 10000 });
    
    // Check for chart canvas or SVG
    await expect(page.locator('[data-testid="price-chart"] canvas, [data-testid="price-chart"] svg')).toBeVisible();
    
    // Check for time period buttons
    await expect(page.locator('[data-testid="chart-period-1D"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-period-1W"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-period-1M"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-period-1Y"]')).toBeVisible();
  });

  test('should change chart time period', async ({ page }) => {
    // Wait for chart to load
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible({ timeout: 10000 });
    
    // Click on 1W period
    await page.locator('[data-testid="chart-period-1W"]').click();
    
    // Check if period is selected
    await expect(page.locator('[data-testid="chart-period-1W"]')).toHaveClass(/active|selected/);
    
    // Click on 1M period
    await page.locator('[data-testid="chart-period-1M"]').click();
    
    // Check if period changed
    await expect(page.locator('[data-testid="chart-period-1M"]')).toHaveClass(/active|selected/);
    await expect(page.locator('[data-testid="chart-period-1W"]')).not.toHaveClass(/active|selected/);
  });

  test('should display real-time price updates', async ({ page }) => {
    // Get initial price
    const priceElement = page.locator('[data-testid="current-price"]');
    await expect(priceElement).toBeVisible();
    
    const initialPrice = await priceElement.textContent();
    
    // Wait for potential price update (simulate real-time data)
    await page.waitForTimeout(3000);
    
    // Check if connection status shows connected
    await expect(page.locator('[data-testid="connection-status"]')).toContainText(/connected/i);
  });

  test('should handle watchlist functionality', async ({ page }) => {
    // Check for add to watchlist button
    const watchlistButton = page.locator('[data-testid="add-to-watchlist"]');
    await expect(watchlistButton).toBeVisible();
    
    // Click to add to watchlist
    await watchlistButton.click();
    
    // Should show success message or change button state
    await expect(page.locator('[data-testid="watchlist-success"]')).toBeVisible({ timeout: 3000 });
    
    // Button should change to "Remove from Watchlist"
    await expect(page.locator('[data-testid="remove-from-watchlist"]')).toBeVisible();
  });

  test('should handle share functionality', async ({ page }) => {
    // Check for share button
    const shareButton = page.locator('[data-testid="share-stock"]');
    await expect(shareButton).toBeVisible();
    
    // Click share button
    await shareButton.click();
    
    // Should show share modal or copy link
    await expect(page.locator('[data-testid="share-modal"], [data-testid="link-copied"]')).toBeVisible({ timeout: 3000 });
  });

  test('should display loading states', async ({ page }) => {
    // Reload page to see loading states
    await page.reload();
    
    // Check for skeleton loaders
    await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible();
    
    // Wait for data to load
    await expect(page.locator('[data-testid="current-price"]')).toBeVisible({ timeout: 10000 });
    
    // Skeleton should disappear
    await expect(page.locator('[data-testid="skeleton-loader"]')).not.toBeVisible();
  });

  test('should handle stock not found', async ({ page }) => {
    // Navigate to non-existent stock
    await page.goto('/stock/NONEXISTENT123');
    
    // Should show not found message
    await expect(page.locator('[data-testid="stock-not-found"]')).toBeVisible({ timeout: 5000 });
    
    // Should show back to search button
    await expect(page.getByRole('button', { name: /back to search/i })).toBeVisible();
  });

  test('should handle network errors', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/stocks/**', route => route.abort());
    
    await page.reload();
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 5000 });
    
    // Should show retry button
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should display price change indicators', async ({ page }) => {
    const priceChange = page.locator('[data-testid="price-change"]');
    const percentageChange = page.locator('[data-testid="percentage-change"]');
    
    await expect(priceChange).toBeVisible();
    await expect(percentageChange).toBeVisible();
    
    // Check for color coding (green for positive, red for negative)
    const priceChangeClass = await priceChange.getAttribute('class');
    const percentageChangeClass = await percentageChange.getAttribute('class');
    
    // Should have color classes
    expect(priceChangeClass).toMatch(/(text-green|text-red|positive|negative)/);
    expect(percentageChangeClass).toMatch(/(text-green|text-red|positive|negative)/);
  });

  test('should handle refresh functionality', async ({ page }) => {
    // Check for refresh button
    const refreshButton = page.locator('[data-testid="refresh-data"]');
    await expect(refreshButton).toBeVisible();
    
    // Click refresh
    await refreshButton.click();
    
    // Should show loading indicator
    await expect(page.locator('[data-testid="refreshing"]')).toBeVisible();
    
    // Loading should disappear
    await expect(page.locator('[data-testid="refreshing"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[data-testid="stock-symbol"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-price"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="stock-metrics"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="price-chart"]')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test Enter key on watchlist button
    const watchlistButton = page.locator('[data-testid="add-to-watchlist"]');
    await watchlistButton.focus();
    await page.keyboard.press('Enter');
    
    // Should trigger watchlist action
    await expect(page.locator('[data-testid="watchlist-success"], [data-testid="remove-from-watchlist"]')).toBeVisible({ timeout: 3000 });
  });

  test('should display technical indicators', async ({ page }) => {
    // Check for technical indicators section
    await expect(page.locator('[data-testid="technical-indicators"]')).toBeVisible({ timeout: 10000 });
    
    // Check for common indicators
    await expect(page.locator('[data-testid="rsi"]')).toBeVisible();
    await expect(page.locator('[data-testid="macd"]')).toBeVisible();
    await expect(page.locator('[data-testid="moving-average"]')).toBeVisible();
  });
});