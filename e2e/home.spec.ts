import { test, expect } from '@playwright/test';
import { HomePage } from './pages/HomePage';
import { TestHelpers } from './utils/testHelpers';
import { mockMarketSummary, mockNewsData, mockStockData } from './fixtures/testData';

test.describe('Home Page E2E Tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    
    // Setup mocks
    await TestHelpers.mockMarketSummary(page);
    await TestHelpers.mockStockData(page);
    await TestHelpers.mockNewsData(page);
    await TestHelpers.mockWebSocketConnection(page);
    
    // Navigate to home page
    await homePage.goto();
  });

  test.afterEach(async ({ page }) => {
    await TestHelpers.clearBrowserData(page);
  });

  test('should load home page successfully', async () => {
    await homePage.waitForPageLoad();
    
    // Verify main sections are visible
    await expect(homePage.welcomeMessage).toBeVisible();
    await expect(homePage.heroSection).toBeVisible();
    await expect(homePage.marketSummaryCards).toBeVisible();
  });

  test('should display market summary data', async () => {
    await homePage.waitForPageLoad();
    await homePage.waitForMarketData();
    
    // Verify market summary cards are displayed
    await expect(homePage.marketSummaryCards).toBeVisible();
    
    // Check for market indices
    const summaryText = await homePage.marketSummaryCards.textContent();
    expect(summaryText).toContain('S&P 500');
    expect(summaryText).toContain('NASDAQ');
    expect(summaryText).toContain('Dow Jones');
  });

  test('should display top gainers section', async () => {
    await homePage.waitForPageLoad();
    await homePage.waitForMarketData();
    
    await expect(homePage.topGainersSection).toBeVisible();
    
    // Verify top gainers content
    const gainersText = await homePage.topGainersSection.textContent();
    expect(gainersText).toBeTruthy();
  });

  test('should show market sentiment indicator', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyMarketSentiment();
  });

  test('should display connection status', async () => {
    await homePage.waitForPageLoad();
    
    // Wait for WebSocket connection
    await TestHelpers.waitForWebSocketConnection(homePage.page);
    
    // Verify connection status
    await homePage.verifyConnectionStatus('connected');
  });

  test('should handle search functionality', async () => {
    await homePage.waitForPageLoad();
    
    // Test stock search
    await homePage.searchStock('AAPL');
    
    // Wait for navigation or search results
    await homePage.page.waitForTimeout(2000);
    
    // Verify search was executed (URL change or results display)
    const currentUrl = homePage.page.url();
    expect(currentUrl).toContain('search');
  });

  test('should refresh market data', async () => {
    await homePage.waitForPageLoad();
    await homePage.waitForMarketData();
    
    // Get initial data
    const initialData = await homePage.marketSummaryCards.textContent();
    
    // Click refresh button
    await homePage.clickRefresh();
    
    // Wait for refresh to complete
    await homePage.page.waitForTimeout(2000);
    
    // Verify data is still displayed (may or may not have changed)
    await expect(homePage.marketSummaryCards).toBeVisible();
  });

  test('should display latest news section', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyLatestNews();
  });

  test('should display trending stocks', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyTrendingStocks();
  });

  test('should show quick access navigation', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyQuickAccessNavigation();
  });

  test('should display watchlist preview', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyWatchlistPreview();
  });

  test('should show alerts section', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyAlertsSection();
  });

  test('should display footer and social links', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyFooterAndSocialLinks();
  });

  test('should handle real-time data updates', async () => {
    await homePage.waitForPageLoad();
    
    // Wait for WebSocket connection
    await TestHelpers.waitForWebSocketConnection(homePage.page);
    
    // Verify real-time updates
    await homePage.verifyRealTimeUpdates();
  });

  test('should be responsive on different screen sizes', async () => {
    await homePage.waitForPageLoad();
    await homePage.verifyResponsiveDesign();
  });

  test('should handle loading states', async () => {
    // Simulate slow network
    await TestHelpers.simulateSlowNetwork(homePage.page, '/api/market/summary', 3000);
    
    await homePage.goto();
    
    // Check for loading indicators
    const loadingIndicator = homePage.page.getByTestId('loading-indicator');
    if (await loadingIndicator.count() > 0) {
      await expect(loadingIndicator).toBeVisible();
    }
    
    // Wait for loading to complete
    await TestHelpers.waitForStableNetwork(homePage.page);
    await homePage.waitForPageLoad();
  });

  test('should handle network errors gracefully', async () => {
    // Simulate network error
    await TestHelpers.simulateNetworkError(homePage.page, '/api/market/summary');
    
    await homePage.goto();
    
    // Check for error handling
    const errorMessage = homePage.page.getByTestId('error-message');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should maintain accessibility standards', async () => {
    await homePage.waitForPageLoad();
    
    // Run accessibility checks
    const accessibilityIssues = await TestHelpers.verifyAccessibility(homePage.page);
    
    // Log any accessibility issues found
    if (accessibilityIssues.length > 0) {
      console.warn('Accessibility issues found:', accessibilityIssues);
    }
    
    // Basic accessibility checks should pass
    expect(accessibilityIssues.length).toBeLessThan(5);
  });

  test('should perform well under normal conditions', async () => {
    await homePage.waitForPageLoad();
    
    // Measure performance
    const performanceMetrics = await TestHelpers.verifyPerformance(homePage.page);
    
    // Log performance metrics
    console.log('Performance metrics:', performanceMetrics);
    
    // Verify reasonable performance
    expect(performanceMetrics.loadTime).toBeLessThan(5000);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000);
  });

  test('should handle WebSocket connection loss and recovery', async () => {
    await homePage.waitForPageLoad();
    
    // Wait for initial connection
    await TestHelpers.waitForWebSocketConnection(homePage.page);
    await homePage.verifyConnectionStatus('connected');
    
    // Simulate connection loss
    await homePage.page.evaluate(() => {
      // Close WebSocket connection if it exists
      if ((window as any).webSocketConnection) {
        (window as any).webSocketConnection.close();
      }
    });
    
    // Wait for reconnection attempt
    await homePage.page.waitForTimeout(3000);
    
    // Verify connection status updates
    const connectionStatus = homePage.connectionStatus;
    if (await connectionStatus.count() > 0) {
      const statusText = await connectionStatus.textContent();
      expect(statusText).toMatch(/(connecting|connected|disconnected)/);
    }
  });

  test('should display market hours indicator', async () => {
    await homePage.waitForPageLoad();
    
    // Check for market hours indicator
    const marketHours = homePage.page.getByTestId('market-hours');
    if (await marketHours.count() > 0) {
      await expect(marketHours).toBeVisible();
      
      const hoursText = await marketHours.textContent();
      expect(hoursText).toMatch(/(Open|Closed|Pre-Market|After-Hours)/);
    }
  });

  test('should show price change indicators with correct styling', async () => {
    await homePage.waitForPageLoad();
    await homePage.waitForMarketData();
    
    // Check for price change indicators
    const priceChanges = homePage.page.locator('[data-testid*="price-change"]');
    const changeCount = await priceChanges.count();
    
    if (changeCount > 0) {
      for (let i = 0; i < Math.min(changeCount, 3); i++) {
        const changeElement = priceChanges.nth(i);
        await expect(changeElement).toBeVisible();
        
        const changeText = await changeElement.textContent();
        if (changeText) {
          // Verify styling based on positive/negative change
          if (changeText.includes('+')) {
            await expect(changeElement).toHaveClass(/positive|green|up/);
          } else if (changeText.includes('-')) {
            await expect(changeElement).toHaveClass(/negative|red|down/);
          }
        }
      }
    }
  });

  test('should handle multiple concurrent data requests', async () => {
    // Navigate to page and trigger multiple data requests
    await homePage.goto();
    
    // Trigger multiple refresh actions quickly
    await Promise.all([
      homePage.clickRefresh(),
      homePage.page.reload(),
      homePage.searchStock('AAPL')
    ]);
    
    // Wait for all requests to settle
    await TestHelpers.waitForStableNetwork(homePage.page);
    
    // Verify page is still functional
    await homePage.waitForPageLoad();
    await expect(homePage.marketSummaryCards).toBeVisible();
  });

  test('should take screenshot for visual regression', async () => {
    await homePage.waitForPageLoad();
    await homePage.waitForMarketData();
    
    // Take screenshot for visual regression testing
    await TestHelpers.takeScreenshot(homePage.page, 'home-page-full');
    
    // Take screenshot of specific sections
    await homePage.marketSummaryCards.screenshot({ 
      path: 'test-results/screenshots/market-summary-cards.png' 
    });
    
    await homePage.topGainersSection.screenshot({ 
      path: 'test-results/screenshots/top-gainers-section.png' 
    });
  });
});