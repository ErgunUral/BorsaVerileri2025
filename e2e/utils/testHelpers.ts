import { Page, expect } from '@playwright/test';

/**
 * Test helper utilities for E2E tests
 */
export class TestHelpers {
  static async waitForWebSocketConnection(page: Page, timeout: number = 10000) {
    // Wait for WebSocket connection to be established
    await page.waitForFunction(
      () => {
        return window.WebSocket && 
               document.querySelector('[data-testid="connection-status"]')?.textContent?.includes('connected');
      },
      { timeout }
    );
  }

  static async waitForRealTimeData(page: Page, timeout: number = 15000) {
    // Wait for real-time data to start flowing
    await page.waitForFunction(
      () => {
        const marketData = document.querySelector('[data-testid="market-summary-cards"]');
        return marketData && marketData.textContent && marketData.textContent.length > 0;
      },
      { timeout }
    );
  }

  static async mockWebSocketConnection(page: Page) {
    // Mock WebSocket for testing
    await page.addInitScript(() => {
      class MockWebSocket {
        readyState = 1; // OPEN
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;

        constructor(url: string) {
          setTimeout(() => {
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
          }, 100);
        }

        send(data: string) {
          // Mock sending data
          console.log('Mock WebSocket send:', data);
        }

        close() {
          if (this.onclose) {
            this.onclose(new CloseEvent('close'));
          }
        }

        // Mock receiving messages
        mockReceive(data: any) {
          if (this.onmessage) {
            this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
          }
        }
      }

      (window as any).MockWebSocket = MockWebSocket;
      (window as any).WebSocket = MockWebSocket;
    });
  }

  static async mockStockData(page: Page) {
    // Mock stock data API responses
    await page.route('**/api/stocks**', async route => {
      const mockStocks = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          price: 150.25,
          change: 2.15,
          changePercent: 1.45,
          volume: 45678900,
          marketCap: 2500000000000,
          sector: 'Technology'
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          price: 2750.80,
          change: -15.30,
          changePercent: -0.55,
          volume: 1234567,
          marketCap: 1800000000000,
          sector: 'Technology'
        },
        {
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          price: 850.45,
          change: 25.60,
          changePercent: 3.10,
          volume: 23456789,
          marketCap: 850000000000,
          sector: 'Automotive'
        }
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ stocks: mockStocks, total: mockStocks.length })
      });
    });
  }

  static async mockMarketSummary(page: Page) {
    // Mock market summary API response
    await page.route('**/api/market/summary**', async route => {
      const mockSummary = {
        indices: {
          sp500: { value: 4150.25, change: 15.30, changePercent: 0.37 },
          nasdaq: { value: 12850.75, change: -25.60, changePercent: -0.20 },
          dow: { value: 33750.45, change: 125.80, changePercent: 0.37 }
        },
        marketStatus: 'open',
        lastUpdated: new Date().toISOString(),
        sentiment: 'bullish',
        volume: 2500000000
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSummary)
      });
    });
  }

  static async mockStockDetail(page: Page, symbol: string) {
    // Mock individual stock detail API response
    await page.route(`**/api/stocks/${symbol}**`, async route => {
      const mockStock = {
        symbol: symbol,
        name: `${symbol} Company`,
        price: 125.75,
        change: 3.25,
        changePercent: 2.65,
        volume: 1500000,
        marketCap: 50000000000,
        peRatio: 18.5,
        dividendYield: 2.1,
        sector: 'Technology',
        fundamentals: {
          eps: 6.78,
          revenue: 25000000000,
          grossMargin: 0.38,
          operatingMargin: 0.25
        },
        technicalIndicators: {
          rsi: 65.2,
          macd: 1.25,
          movingAverage50: 120.30,
          movingAverage200: 115.80
        },
        priceHistory: [
          { date: '2024-01-01', open: 120, high: 125, low: 118, close: 122, volume: 1000000 },
          { date: '2024-01-02', open: 122, high: 128, low: 121, close: 125.75, volume: 1500000 }
        ]
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockStock)
      });
    });
  }

  static async mockSearchResults(page: Page, query: string) {
    // Mock search API response
    await page.route(`**/api/stocks/search**`, async route => {
      const allStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.', price: 150.25, sector: 'Technology' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 2750.80, sector: 'Technology' },
        { symbol: 'TSLA', name: 'Tesla Inc.', price: 850.45, sector: 'Automotive' },
        { symbol: 'MSFT', name: 'Microsoft Corp.', price: 310.20, sector: 'Technology' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 3200.15, sector: 'E-commerce' }
      ];

      // Filter stocks based on query
      const filteredStocks = allStocks.filter(stock => 
        stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
        stock.name.toLowerCase().includes(query.toLowerCase())
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          results: filteredStocks, 
          total: filteredStocks.length,
          query: query
        })
      });
    });
  }

  static async mockNewsData(page: Page) {
    // Mock news API response
    await page.route('**/api/news**', async route => {
      const mockNews = [
        {
          id: '1',
          title: 'Market Reaches New Highs',
          summary: 'Stock market continues its upward trend...',
          source: 'Financial Times',
          publishedAt: new Date().toISOString(),
          url: 'https://example.com/news/1'
        },
        {
          id: '2',
          title: 'Tech Stocks Lead Rally',
          summary: 'Technology sector shows strong performance...',
          source: 'Reuters',
          publishedAt: new Date(Date.now() - 3600000).toISOString(),
          url: 'https://example.com/news/2'
        }
      ];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ news: mockNews })
      });
    });
  }

  static async simulateNetworkError(page: Page, endpoint: string) {
    // Simulate network error for testing error handling
    await page.route(`**${endpoint}**`, async route => {
      await route.abort('failed');
    });
  }

  static async simulateSlowNetwork(page: Page, endpoint: string, delay: number = 5000) {
    // Simulate slow network for testing loading states
    await page.route(`**${endpoint}**`, async route => {
      await new Promise(resolve => setTimeout(resolve, delay));
      await route.continue();
    });
  }

  static async verifyAccessibility(page: Page) {
    // Basic accessibility checks
    const axeResults = await page.evaluate(() => {
      // Simple accessibility checks
      const issues = [];
      
      // Check for alt text on images
      const images = document.querySelectorAll('img');
      images.forEach((img, index) => {
        if (!img.getAttribute('alt')) {
          issues.push(`Image ${index} missing alt text`);
        }
      });
      
      // Check for form labels
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input, index) => {
        const id = input.getAttribute('id');
        if (id && !document.querySelector(`label[for="${id}"]`)) {
          issues.push(`Input ${index} missing associated label`);
        }
      });
      
      return issues;
    });

    return axeResults;
  }

  static async takeScreenshot(page: Page, name: string) {
    // Take screenshot for visual regression testing
    await page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    });
  }

  static async verifyPerformance(page: Page) {
    // Basic performance checks
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });

    // Assert reasonable performance thresholds
    expect(performanceMetrics.loadTime).toBeLessThan(5000); // 5 seconds
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000); // 3 seconds
    
    return performanceMetrics;
  }

  static async clearBrowserData(page: Page) {
    // Clear browser storage for clean test state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear cookies
    const context = page.context();
    await context.clearCookies();
  }

  static async waitForStableNetwork(page: Page, timeout: number = 10000) {
    // Wait for network to be stable (no pending requests)
    await page.waitForLoadState('networkidle', { timeout });
  }

  static generateRandomStockSymbol(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  }

  static generateRandomPrice(): number {
    return Math.round((Math.random() * 1000 + 10) * 100) / 100;
  }

  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  static formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }
}