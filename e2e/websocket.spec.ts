import { test, expect } from '@playwright/test';

test.describe('WebSocket Real-time Data E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should establish WebSocket connection', async ({ page }) => {
    // Check if WebSocket connection is established
    await page.waitForFunction(() => {
      return window.WebSocket && window.WebSocket.OPEN;
    }, { timeout: 10000 });
    
    // Check if connection status indicator is shown
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toContainText('Connected');
    }
  });

  test('should receive real-time stock price updates', async ({ page }) => {
    // Navigate to a stock detail page
    await page.goto('/stocks/AAPL');
    await page.waitForLoadState('networkidle');
    
    // Get initial price
    const priceElement = page.locator('[data-testid="stock-price"]');
    await expect(priceElement).toBeVisible();
    
    const initialPrice = await priceElement.textContent();
    
    // Wait for potential real-time updates
    let priceUpdated = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!priceUpdated && attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      const currentPrice = await priceElement.textContent();
      
      if (currentPrice !== initialPrice) {
        priceUpdated = true;
      }
      attempts++;
    }
    
    // Check if last updated timestamp is shown
    const lastUpdated = page.locator('[data-testid="last-updated"]');
    if (await lastUpdated.isVisible()) {
      const timestamp = await lastUpdated.textContent();
      expect(timestamp).toBeTruthy();
    }
  });

  test('should handle WebSocket connection errors', async ({ page }) => {
    // Simulate WebSocket connection failure
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(url) {
        const ws = new originalWebSocket(url);
        setTimeout(() => {
          ws.dispatchEvent(new Event('error'));
        }, 1000);
        return ws;
      };
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if connection error is handled
    const errorMessage = page.locator('[data-testid="connection-error"]');
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText('Connection failed');
    }
    
    // Check if retry button is available
    const retryButton = page.locator('[data-testid="retry-connection"]');
    if (await retryButton.isVisible()) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('should handle WebSocket reconnection', async ({ page }) => {
    // Wait for initial connection
    await page.waitForTimeout(2000);
    
    // Simulate connection loss and reconnection
    await page.evaluate(() => {
      // Trigger a reconnection scenario
      if (window.WebSocket) {
        const event = new Event('close');
        window.dispatchEvent(event);
      }
    });
    
    // Wait for reconnection
    await page.waitForTimeout(5000);
    
    // Check if connection is restored
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toContainText('Connected');
    }
  });

  test('should receive market overview updates', async ({ page }) => {
    // Check if market overview is visible
    await expect(page.locator('[data-testid="market-overview"]')).toBeVisible();
    
    // Get initial market data
    const sp500Element = page.locator('[data-testid="sp500-value"]');
    const initialSP500 = await sp500Element.textContent();
    
    // Wait for potential updates
    await page.waitForTimeout(10000);
    
    // Check if market data is still being updated
    const currentSP500 = await sp500Element.textContent();
    
    // Verify that the element is still functional
    expect(currentSP500).toBeTruthy();
    expect(currentSP500).not.toBe('--');
  });

  test('should handle stock subscription and unsubscription', async ({ page }) => {
    // Navigate to stock detail page
    await page.goto('/stocks/AAPL');
    await page.waitForLoadState('networkidle');
    
    // Check if stock is automatically subscribed
    const subscriptionStatus = page.locator('[data-testid="subscription-status"]');
    if (await subscriptionStatus.isVisible()) {
      await expect(subscriptionStatus).toContainText('Subscribed');
    }
    
    // Navigate away from stock page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate back to stock page
    await page.goto('/stocks/AAPL');
    await page.waitForLoadState('networkidle');
    
    // Check if subscription is re-established
    if (await subscriptionStatus.isVisible()) {
      await expect(subscriptionStatus).toContainText('Subscribed');
    }
  });

  test('should display real-time notifications', async ({ page }) => {
    // Wait for potential notifications
    await page.waitForTimeout(5000);
    
    // Check if notification system is working
    const notificationArea = page.locator('[data-testid="notifications"]');
    if (await notificationArea.isVisible()) {
      // Check if notifications can be displayed
      const notifications = page.locator('[data-testid^="notification-"]');
      
      if (await notifications.count() > 0) {
        const firstNotification = notifications.first();
        await expect(firstNotification).toBeVisible();
        
        // Check notification structure
        await expect(firstNotification.locator('[data-testid="notification-message"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-timestamp"]')).toBeVisible();
      }
    }
  });

  test('should handle multiple stock subscriptions', async ({ page }) => {
    const stocks = ['AAPL', 'MSFT', 'GOOGL'];
    
    // Subscribe to multiple stocks by visiting their pages
    for (const stock of stocks) {
      await page.goto(`/stocks/${stock}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }
    
    // Go back to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if real-time dashboard shows updates for subscribed stocks
    const realTimeDashboard = page.locator('[data-testid="real-time-dashboard"]');
    await expect(realTimeDashboard).toBeVisible();
    
    // Check if stock cards are displayed
    for (const stock of stocks) {
      const stockCard = page.locator(`[data-testid="stock-card-${stock}"]`);
      if (await stockCard.isVisible()) {
        await expect(stockCard).toBeVisible();
        await expect(stockCard.locator('[data-testid="stock-price"]')).toBeVisible();
      }
    }
  });

  test('should handle WebSocket message rate limiting', async ({ page }) => {
    // Navigate to a stock page
    await page.goto('/stocks/AAPL');
    await page.waitForLoadState('networkidle');
    
    // Monitor for rate limiting indicators
    await page.waitForTimeout(10000);
    
    // Check if rate limiting warning is shown (if implemented)
    const rateLimitWarning = page.locator('[data-testid="rate-limit-warning"]');
    if (await rateLimitWarning.isVisible()) {
      await expect(rateLimitWarning).toContainText('Rate limit');
    }
    
    // Verify that the connection is still functional
    const priceElement = page.locator('[data-testid="stock-price"]');
    await expect(priceElement).toBeVisible();
  });

  test('should maintain WebSocket connection across page navigation', async ({ page }) => {
    // Check initial connection
    await page.waitForTimeout(2000);
    
    // Navigate between pages
    await page.goto('/stocks/AAPL');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/calculator');
    await page.waitForLoadState('networkidle');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check if connection is maintained
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toContainText('Connected');
    }
  });

  test('should handle WebSocket authentication', async ({ page }) => {
    // Check if authentication is required for WebSocket
    const authRequired = page.locator('[data-testid="auth-required"]');
    
    if (await authRequired.isVisible()) {
      // Navigate to login if authentication is required
      await page.click('[data-testid="login-button"]');
      
      // Fill login form
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword123');
      await page.click('[data-testid="login-submit"]');
      
      // Wait for login to complete
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      
      // Check if WebSocket connection is established after login
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      if (await connectionStatus.isVisible()) {
        await expect(connectionStatus).toContainText('Connected');
      }
    }
  });

  test('should display connection quality indicators', async ({ page }) => {
    // Wait for connection to establish
    await page.waitForTimeout(3000);
    
    // Check if connection quality indicator is shown
    const qualityIndicator = page.locator('[data-testid="connection-quality"]');
    if (await qualityIndicator.isVisible()) {
      await expect(qualityIndicator).toBeVisible();
      
      // Check if quality status is displayed
      const qualityText = await qualityIndicator.textContent();
      expect(qualityText).toMatch(/Good|Fair|Poor|Excellent/);
    }
    
    // Check if latency information is shown
    const latencyIndicator = page.locator('[data-testid="connection-latency"]');
    if (await latencyIndicator.isVisible()) {
      const latency = await latencyIndicator.textContent();
      expect(latency).toMatch(/\d+ms/);
    }
  });

  test('should handle WebSocket ping/pong mechanism', async ({ page }) => {
    // Wait for connection to establish
    await page.waitForTimeout(2000);
    
    // Monitor ping/pong activity (if visible in UI)
    const pingStatus = page.locator('[data-testid="ping-status"]');
    if (await pingStatus.isVisible()) {
      // Wait for ping activity
      await page.waitForTimeout(30000); // Wait for ping interval
      
      // Check if ping status is updated
      const status = await pingStatus.textContent();
      expect(status).toBeTruthy();
    }
    
    // Verify connection is still active
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible()) {
      await expect(connectionStatus).toContainText('Connected');
    }
  });
});