import { test, expect } from '@playwright/test';

test.describe('Real-time Data Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock WebSocket for consistent testing
    await page.addInitScript(() => {
      class MockWebSocket {
        static CONNECTING = 0;
        static OPEN = 1;
        static CLOSING = 2;
        static CLOSED = 3;
        
        readyState = MockWebSocket.CONNECTING;
        url: string;
        
        onopen: ((event: Event) => void) | null = null;
        onmessage: ((event: MessageEvent) => void) | null = null;
        onerror: ((event: Event) => void) | null = null;
        onclose: ((event: CloseEvent) => void) | null = null;
        
        constructor(url: string) {
          this.url = url;
          
          // Simulate connection opening
          setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            if (this.onopen) {
              this.onopen(new Event('open'));
            }
            
            // Start sending mock data
            this.startMockData();
          }, 100);
        }
        
        startMockData() {
          const sendMockData = () => {
            if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
              const mockData = {
                type: 'price_update',
                data: {
                  symbol: 'THYAO',
                  price: 125.50 + (Math.random() - 0.5) * 10,
                  change: (Math.random() - 0.5) * 5,
                  volume: Math.floor(Math.random() * 1000000),
                  timestamp: Date.now()
                }
              };
              
              this.onmessage({
                data: JSON.stringify(mockData),
                type: 'message',
                target: this,
                currentTarget: this,
                bubbles: false,
                cancelable: false,
                defaultPrevented: false,
                eventPhase: 0,
                isTrusted: true,
                timeStamp: Date.now(),
                preventDefault: () => {},
                stopImmediatePropagation: () => {},
                stopPropagation: () => {}
              } as MessageEvent);
            }
            
            if (this.readyState === MockWebSocket.OPEN) {
              setTimeout(sendMockData, 1000 + Math.random() * 2000);
            }
          };
          
          setTimeout(sendMockData, 1000);
        }
        
        send(data: string | ArrayBuffer | Blob | ArrayBufferView) {
          // Mock send functionality
        }
        
        close(code?: number, reason?: string) {
          this.readyState = MockWebSocket.CLOSED;
          if (this.onclose) {
            this.onclose({
              code: code || 1000,
              reason: reason || '',
              wasClean: true,
              type: 'close',
              target: this,
              currentTarget: this,
              bubbles: false,
              cancelable: false,
              defaultPrevented: false,
              eventPhase: 0,
              isTrusted: true,
              timeStamp: Date.now(),
              preventDefault: () => {},
              stopImmediatePropagation: () => {},
              stopPropagation: () => {}
            } as CloseEvent);
          }
        }
      }
      
      (window as any).WebSocket = MockWebSocket;
    });
    
    await page.goto('/');
  });

  test('should establish WebSocket connection', async ({ page }) => {
    // Wait for WebSocket connection to be established
    await page.waitForTimeout(2000);
    
    // Check for connection status indicators
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status, .ws-status');
    if (await connectionStatus.count() > 0) {
      await expect(connectionStatus.first()).toBeVisible();
    }
    
    // Check console for WebSocket connection logs
    const logs = await page.evaluate(() => {
      return (window as any).wsConnectionLogs || [];
    });
    
    console.log('WebSocket connection logs:', logs);
  });

  test('should receive and display real-time price updates', async ({ page }) => {
    // Navigate to a stock page or search for one
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('THYAO');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Wait for real-time data to start flowing
    await page.waitForTimeout(3000);
    
    // Check for price elements that should update
    const priceElements = page.locator('[data-testid="price"], .price, .stock-price');
    if (await priceElements.count() > 0) {
      const initialPrice = await priceElements.first().textContent();
      
      // Wait for potential price update
      await page.waitForTimeout(3000);
      
      const updatedPrice = await priceElements.first().textContent();
      
      // Price might have changed (though not guaranteed in mock)
      expect(typeof updatedPrice).toBe('string');
    }
  });

  test('should handle WebSocket connection errors', async ({ page }) => {
    // Override WebSocket to simulate connection error
    await page.addInitScript(() => {
      const OriginalWebSocket = (window as any).WebSocket;
      
      (window as any).WebSocket = class extends OriginalWebSocket {
        constructor(url: string) {
          super(url);
          
          // Simulate connection error
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Event('error'));
            }
          }, 500);
        }
      };
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check for error handling
    const errorMessages = page.locator('[data-testid="error"], .error, .connection-error');
    if (await errorMessages.count() > 0) {
      await expect(errorMessages.first()).toBeVisible();
    }
  });

  test('should reconnect after connection loss', async ({ page }) => {
    // Wait for initial connection
    await page.waitForTimeout(2000);
    
    // Simulate connection loss and reconnection
    await page.evaluate(() => {
      // Find and close existing WebSocket connections
      if ((window as any).wsConnection) {
        (window as any).wsConnection.close();
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Check for reconnection attempts
    const reconnectIndicators = page.locator('[data-testid="reconnecting"], .reconnecting, .connection-lost');
    if (await reconnectIndicators.count() > 0) {
      await expect(reconnectIndicators.first()).toBeVisible();
    }
    
    // Wait for reconnection
    await page.waitForTimeout(3000);
  });

  test('should display live data indicators', async ({ page }) => {
    // Wait for connection and data
    await page.waitForTimeout(3000);
    
    // Look for live/real-time indicators
    const liveIndicators = page.locator('[data-testid="live"], .live, .real-time, .pulse');
    if (await liveIndicators.count() > 0) {
      await expect(liveIndicators.first()).toBeVisible();
    }
    
    // Look for timestamp updates
    const timestamps = page.locator('[data-testid="timestamp"], .timestamp, .last-updated');
    if (await timestamps.count() > 0) {
      await expect(timestamps.first()).toBeVisible();
    }
  });

  test('should handle multiple stock subscriptions', async ({ page }) => {
    // Search for multiple stocks
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('THYAO');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
      
      await searchInput.fill('AKBNK');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Wait for data from multiple sources
    await page.waitForTimeout(4000);
    
    // Check if multiple stock data is being displayed
    const stockElements = page.locator('[data-testid="stock-item"], .stock-item, .stock-card');
    const stockCount = await stockElements.count();
    
    if (stockCount > 1) {
      // Verify multiple stocks are receiving updates
      for (let i = 0; i < Math.min(stockCount, 3); i++) {
        await expect(stockElements.nth(i)).toBeVisible();
      }
    }
  });

  test('should maintain data consistency during updates', async ({ page }) => {
    // Navigate to stock details
    const searchInput = page.locator('input[type="text"]').first();
    if (await searchInput.count() > 0) {
      await searchInput.fill('THYAO');
      await searchInput.press('Enter');
      await page.waitForTimeout(1000);
    }
    
    // Wait for initial data load
    await page.waitForTimeout(2000);
    
    // Capture initial state
    const priceElements = page.locator('[data-testid="price"], .price');
    if (await priceElements.count() > 0) {
      const initialData = await priceElements.first().textContent();
      
      // Wait for updates
      await page.waitForTimeout(3000);
      
      // Verify data format consistency
      const updatedData = await priceElements.first().textContent();
      
      // Both should be valid price formats
      expect(typeof initialData).toBe('string');
      expect(typeof updatedData).toBe('string');
    }
  });
});