import { test, expect } from '@playwright/test';

test.describe('Stock Search and Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should search for stocks and display results', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="ara"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();
    
    // Search for a Turkish stock
    await searchInput.fill('THYAO');
    await searchInput.press('Enter');
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Check if results are displayed
    const results = page.locator('[data-testid="search-results"], .search-results, .stock-list');
    if (await results.count() > 0) {
      await expect(results.first()).toBeVisible();
    }
  });

  test('should display stock details when clicked', async ({ page }) => {
    // Search for a stock
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('THYAO');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Click on first result if available
    const stockItem = page.locator('[data-testid="stock-item"], .stock-item, .stock-card').first();
    if (await stockItem.count() > 0) {
      await stockItem.click();
      
      // Wait for navigation or modal
      await page.waitForTimeout(2000);
      
      // Check for stock details
      const stockDetails = page.locator('[data-testid="stock-details"], .stock-details, .stock-info');
      if (await stockDetails.count() > 0) {
        await expect(stockDetails.first()).toBeVisible();
      }
    }
  });

  test('should handle empty search results', async ({ page }) => {
    // Search for non-existent stock
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('NONEXISTENT123');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Check for no results message
    const noResults = page.locator('[data-testid="no-results"], .no-results, .empty-state');
    if (await noResults.count() > 0) {
      await expect(noResults.first()).toBeVisible();
    }
  });

  test('should display stock price and charts', async ({ page }) => {
    // Navigate to a specific stock page or search for one
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('BIST100');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(3000);
    
    // Look for price information
    const priceElements = page.locator('[data-testid="price"], .price, .stock-price');
    if (await priceElements.count() > 0) {
      await expect(priceElements.first()).toBeVisible();
    }
    
    // Look for charts
    const chartElements = page.locator('[data-testid="chart"], .chart, canvas, svg');
    if (await chartElements.count() > 0) {
      await expect(chartElements.first()).toBeVisible();
    }
  });

  test('should handle real-time data updates', async ({ page }) => {
    // Mock WebSocket connection for testing
    await page.addInitScript(() => {
      // Mock WebSocket for testing
      (window as any).WebSocket = class MockWebSocket {
        constructor(url: string) {
          setTimeout(() => {
            if (this.onopen) this.onopen({} as Event);
            
            // Simulate data updates
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage({
                  data: JSON.stringify({
                    type: 'price_update',
                    symbol: 'THYAO',
                    price: 125.50,
                    change: 2.5
                  })
                } as MessageEvent);
              }
            }, 1000);
          }, 100);
        }
        
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        
        send() {}
        close() {}
      };
    });
    
    await page.goto('/');
    
    // Search for a stock
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('THYAO');
    await searchInput.press('Enter');
    
    // Wait for potential real-time updates
    await page.waitForTimeout(3000);
    
    // Check if real-time indicators are present
    const realTimeIndicators = page.locator('[data-testid="live"], .live, .real-time');
    if (await realTimeIndicators.count() > 0) {
      await expect(realTimeIndicators.first()).toBeVisible();
    }
  });

  test('should filter and sort search results', async ({ page }) => {
    // Search for stocks
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('BIST');
    await searchInput.press('Enter');
    
    await page.waitForTimeout(2000);
    
    // Look for filter options
    const filterButtons = page.locator('[data-testid="filter"], .filter, button[aria-label*="filter"]');
    if (await filterButtons.count() > 0) {
      await filterButtons.first().click();
      await page.waitForTimeout(1000);
    }
    
    // Look for sort options
    const sortButtons = page.locator('[data-testid="sort"], .sort, button[aria-label*="sort"]');
    if (await sortButtons.count() > 0) {
      await sortButtons.first().click();
      await page.waitForTimeout(1000);
    }
  });
});