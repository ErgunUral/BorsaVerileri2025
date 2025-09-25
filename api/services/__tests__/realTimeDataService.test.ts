import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealTimeDataService } from '../realTimeDataService';
import { CacheService } from '../cacheService';
import { StockScraper } from '../stockScraper';
import { WebSocketManager } from '../webSocketManager';
import { logger } from '../../utils/logger';

// Mock dependencies
vi.mock('../cacheService');
vi.mock('../stockScraper');
vi.mock('../webSocketManager');
vi.mock('../../utils/logger');

const MockedCacheService = vi.mocked(CacheService);
const MockedStockScraper = vi.mocked(StockScraper);
const MockedWebSocketManager = vi.mocked(WebSocketManager);
const mockedLogger = vi.mocked(logger);

describe('RealTimeDataService', () => {
  let realTimeDataService: RealTimeDataService;
  let mockCacheService: any;
  let mockStockScraper: any;
  let mockWebSocketManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      mget: vi.fn(),
      mset: vi.fn(),
      keys: vi.fn(),
      isHealthy: vi.fn().mockResolvedValue(true),
      getStats: vi.fn().mockReturnValue({ hits: 0, misses: 0 })
    };

    mockStockScraper = {
      getQuote: vi.fn(),
      searchStocks: vi.fn(),
      getHistoricalData: vi.fn(),
      getMultipleQuotes: vi.fn(),
      getMarketOverview: vi.fn(),
      isHealthy: vi.fn().mockResolvedValue(true)
    };

    mockWebSocketManager = {
      broadcast: vi.fn(),
      broadcastToRoom: vi.fn(),
      getConnectedClients: vi.fn().mockReturnValue(0),
      getRoomClients: vi.fn().mockReturnValue(0),
      isHealthy: vi.fn().mockResolvedValue(true)
    };

    MockedCacheService.mockImplementation(() => mockCacheService);
    MockedStockScraper.mockImplementation(() => mockStockScraper);
    MockedWebSocketManager.mockImplementation(() => mockWebSocketManager);

    realTimeDataService = new RealTimeDataService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(realTimeDataService).toBeDefined();
      expect(MockedCacheService).toHaveBeenCalled();
      expect(MockedStockScraper).toHaveBeenCalled();
      expect(MockedWebSocketManager).toHaveBeenCalled();
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        updateInterval: 5000,
        maxSubscriptions: 200,
        cacheTimeout: 120
      };

      const customService = new RealTimeDataService(customConfig);
      expect(customService).toBeDefined();
    });

    it('should start update intervals on initialization', () => {
      const startSpy = vi.spyOn(realTimeDataService, 'start');
      realTimeDataService.start();
      
      expect(startSpy).toHaveBeenCalled();
    });
  });

  describe('Stock Data Management', () => {
    const mockStockData = {
      symbol: 'AAPL',
      price: 150.25,
      change: 2.50,
      changePercent: 1.69,
      volume: 1000000,
      timestamp: Date.now()
    };

    beforeEach(() => {
      mockStockScraper.getQuote.mockResolvedValue(mockStockData);
    });

    it('should get stock quote from cache first', async () => {
      const cachedData = JSON.stringify(mockStockData);
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await realTimeDataService.getStockQuote('AAPL');

      expect(mockCacheService.get).toHaveBeenCalledWith('stock:quote:AAPL');
      expect(result).toEqual(mockStockData);
      expect(mockStockScraper.getQuote).not.toHaveBeenCalled();
    });

    it('should fetch from scraper if not in cache', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await realTimeDataService.getStockQuote('AAPL');

      expect(mockStockScraper.getQuote).toHaveBeenCalledWith('AAPL');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'stock:quote:AAPL',
        JSON.stringify(mockStockData),
        60 // default cache timeout
      );
      expect(result).toEqual(mockStockData);
    });

    it('should handle multiple stock quotes', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const mockQuotes = symbols.map(symbol => ({
        ...mockStockData,
        symbol
      }));

      mockStockScraper.getMultipleQuotes.mockResolvedValue(mockQuotes);
      mockCacheService.mget.mockResolvedValue({});
      mockCacheService.mset.mockResolvedValue(undefined);

      const result = await realTimeDataService.getMultipleQuotes(symbols);

      expect(mockStockScraper.getMultipleQuotes).toHaveBeenCalledWith(symbols);
      expect(result).toEqual(mockQuotes);
    });

    it('should validate stock symbols', async () => {
      await expect(realTimeDataService.getStockQuote(''))
        .rejects.toThrow('Invalid stock symbol');
      
      await expect(realTimeDataService.getStockQuote('INVALID_SYMBOL_TOO_LONG'))
        .rejects.toThrow('Invalid stock symbol');
    });

    it('should handle scraper errors gracefully', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockStockScraper.getQuote.mockRejectedValue(new Error('API Error'));

      await expect(realTimeDataService.getStockQuote('AAPL'))
        .rejects.toThrow('API Error');
      
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to stock updates', async () => {
      const clientId = 'client-123';
      const symbol = 'AAPL';

      await realTimeDataService.subscribe(clientId, symbol);

      const subscriptions = realTimeDataService.getSubscriptions(clientId);
      expect(subscriptions).toContain(symbol);
    });

    it('should unsubscribe from stock updates', async () => {
      const clientId = 'client-123';
      const symbol = 'AAPL';

      await realTimeDataService.subscribe(clientId, symbol);
      await realTimeDataService.unsubscribe(clientId, symbol);

      const subscriptions = realTimeDataService.getSubscriptions(clientId);
      expect(subscriptions).not.toContain(symbol);
    });

    it('should handle multiple subscriptions per client', async () => {
      const clientId = 'client-123';
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      for (const symbol of symbols) {
        await realTimeDataService.subscribe(clientId, symbol);
      }

      const subscriptions = realTimeDataService.getSubscriptions(clientId);
      expect(subscriptions).toEqual(expect.arrayContaining(symbols));
    });

    it('should prevent duplicate subscriptions', async () => {
      const clientId = 'client-123';
      const symbol = 'AAPL';

      await realTimeDataService.subscribe(clientId, symbol);
      await realTimeDataService.subscribe(clientId, symbol); // Duplicate

      const subscriptions = realTimeDataService.getSubscriptions(clientId);
      expect(subscriptions.filter(s => s === symbol)).toHaveLength(1);
    });

    it('should enforce subscription limits', async () => {
      const clientId = 'client-123';
      const maxSubscriptions = 100; // Default limit

      // Subscribe to maximum allowed
      for (let i = 0; i < maxSubscriptions; i++) {
        await realTimeDataService.subscribe(clientId, `STOCK${i}`);
      }

      // Try to exceed limit
      await expect(realTimeDataService.subscribe(clientId, 'EXCESS'))
        .rejects.toThrow('Subscription limit exceeded');
    });

    it('should clean up client subscriptions on disconnect', async () => {
      const clientId = 'client-123';
      const symbols = ['AAPL', 'GOOGL'];

      for (const symbol of symbols) {
        await realTimeDataService.subscribe(clientId, symbol);
      }

      await realTimeDataService.unsubscribeAll(clientId);

      const subscriptions = realTimeDataService.getSubscriptions(clientId);
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('Real-time Updates', () => {
    const mockStockData = {
      symbol: 'AAPL',
      price: 150.25,
      change: 2.50,
      changePercent: 1.69,
      volume: 1000000,
      timestamp: Date.now()
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should broadcast updates to subscribed clients', async () => {
      const clientId = 'client-123';
      const symbol = 'AAPL';

      await realTimeDataService.subscribe(clientId, symbol);
      
      mockStockScraper.getQuote.mockResolvedValue(mockStockData);
      mockCacheService.set.mockResolvedValue(undefined);

      await realTimeDataService.broadcastUpdate(symbol, mockStockData);

      expect(mockWebSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        `stock:${symbol}`,
        {
          type: 'stock_update',
          data: mockStockData
        }
      );
    });

    it('should update cache with new data', async () => {
      const symbol = 'AAPL';
      
      await realTimeDataService.broadcastUpdate(symbol, mockStockData);

      expect(mockCacheService.set).toHaveBeenCalledWith(
        `stock:quote:${symbol}`,
        JSON.stringify(mockStockData),
        60
      );
    });

    it('should handle periodic updates', async () => {
      const symbols = ['AAPL', 'GOOGL'];
      
      // Subscribe clients to symbols
      await realTimeDataService.subscribe('client-1', 'AAPL');
      await realTimeDataService.subscribe('client-2', 'GOOGL');

      mockStockScraper.getMultipleQuotes.mockResolvedValue([
        { ...mockStockData, symbol: 'AAPL' },
        { ...mockStockData, symbol: 'GOOGL' }
      ]);

      // Start periodic updates
      realTimeDataService.start();
      
      // Fast-forward time to trigger update
      vi.advanceTimersByTime(10000); // Default update interval
      
      await vi.runAllTimersAsync();

      expect(mockStockScraper.getMultipleQuotes).toHaveBeenCalled();
    });

    it('should throttle rapid updates', async () => {
      const symbol = 'AAPL';
      const throttleMs = 1000;

      // Send multiple rapid updates
      await realTimeDataService.broadcastUpdate(symbol, mockStockData);
      await realTimeDataService.broadcastUpdate(symbol, mockStockData);
      await realTimeDataService.broadcastUpdate(symbol, mockStockData);

      // Should only broadcast once due to throttling
      expect(mockWebSocketManager.broadcastToRoom).toHaveBeenCalledTimes(1);
    });

    it('should detect significant price changes', async () => {
      const symbol = 'AAPL';
      const oldData = { ...mockStockData, price: 100 };
      const newData = { ...mockStockData, price: 110 }; // 10% increase

      mockCacheService.get.mockResolvedValue(JSON.stringify(oldData));

      await realTimeDataService.broadcastUpdate(symbol, newData);

      expect(mockWebSocketManager.broadcastToRoom).toHaveBeenCalledWith(
        `stock:${symbol}`,
        {
          type: 'significant_change',
          data: {
            ...newData,
            previousPrice: oldData.price,
            changePercent: 10
          }
        }
      );
    });
  });

  describe('Market Data', () => {
    const mockMarketData = {
      indices: {
        'S&P 500': { value: 4500, change: 25.5 },
        'NASDAQ': { value: 15000, change: -12.3 },
        'DOW': { value: 35000, change: 45.2 }
      },
      sectors: {
        'Technology': { change: 2.1 },
        'Healthcare': { change: -0.5 },
        'Finance': { change: 1.8 }
      },
      topGainers: [
        { symbol: 'AAPL', change: 5.2 },
        { symbol: 'GOOGL', change: 4.8 }
      ],
      topLosers: [
        { symbol: 'TSLA', change: -3.1 },
        { symbol: 'NFLX', change: -2.9 }
      ]
    };

    it('should get market overview', async () => {
      mockStockScraper.getMarketOverview.mockResolvedValue(mockMarketData);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await realTimeDataService.getMarketOverview();

      expect(mockStockScraper.getMarketOverview).toHaveBeenCalled();
      expect(result).toEqual(mockMarketData);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'market:overview',
        JSON.stringify(mockMarketData),
        300 // 5 minutes cache
      );
    });

    it('should broadcast market updates', async () => {
      await realTimeDataService.broadcastMarketUpdate(mockMarketData);

      expect(mockWebSocketManager.broadcast).toHaveBeenCalledWith({
        type: 'market_update',
        data: mockMarketData
      });
    });

    it('should cache market data', async () => {
      const cachedData = JSON.stringify(mockMarketData);
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await realTimeDataService.getMarketOverview();

      expect(result).toEqual(mockMarketData);
      expect(mockStockScraper.getMarketOverview).not.toHaveBeenCalled();
    });
  });

  describe('Historical Data', () => {
    const mockHistoricalData = {
      symbol: 'AAPL',
      period: '1M',
      data: [
        { date: '2024-01-01', open: 180, high: 185, low: 178, close: 182, volume: 1000000 },
        { date: '2024-01-02', open: 182, high: 188, low: 181, close: 186, volume: 1200000 }
      ]
    };

    it('should get historical data', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      const result = await realTimeDataService.getHistoricalData('AAPL', '1M');

      expect(mockStockScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', '1M');
      expect(result).toEqual(mockHistoricalData);
    });

    it('should cache historical data with longer TTL', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue(undefined);

      await realTimeDataService.getHistoricalData('AAPL', '1M');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'stock:historical:AAPL:1M',
        JSON.stringify(mockHistoricalData),
        3600 // 1 hour cache for historical data
      );
    });

    it('should validate period parameter', async () => {
      await expect(realTimeDataService.getHistoricalData('AAPL', 'INVALID'))
        .rejects.toThrow('Invalid period');
    });
  });

  describe('Performance Monitoring', () => {
    it('should track service metrics', async () => {
      const metrics = realTimeDataService.getMetrics();

      expect(metrics).toEqual({
        activeSubscriptions: expect.any(Number),
        connectedClients: expect.any(Number),
        cacheHitRate: expect.any(Number),
        updateFrequency: expect.any(Number),
        errorRate: expect.any(Number)
      });
    });

    it('should monitor update performance', async () => {
      const symbol = 'AAPL';
      const startTime = Date.now();
      
      mockStockScraper.getQuote.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            symbol,
            price: 150,
            change: 1,
            changePercent: 0.67,
            volume: 1000000,
            timestamp: Date.now()
          }), 100);
        });
      });

      await realTimeDataService.getStockQuote(symbol);
      
      const metrics = realTimeDataService.getMetrics();
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track error rates', async () => {
      mockStockScraper.getQuote.mockRejectedValue(new Error('API Error'));

      try {
        await realTimeDataService.getStockQuote('AAPL');
      } catch (error) {
        // Expected error
      }

      const metrics = realTimeDataService.getMetrics();
      expect(metrics.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    it('should check service health', async () => {
      const health = await realTimeDataService.getHealth();

      expect(health).toEqual({
        status: 'healthy',
        cache: { status: 'healthy' },
        scraper: { status: 'healthy' },
        websocket: { status: 'healthy' },
        uptime: expect.any(Number)
      });
    });

    it('should detect unhealthy dependencies', async () => {
      mockCacheService.isHealthy.mockResolvedValue(false);

      const health = await realTimeDataService.getHealth();

      expect(health.status).toBe('degraded');
      expect(health.cache.status).toBe('unhealthy');
    });

    it('should handle health check errors', async () => {
      mockStockScraper.isHealthy.mockRejectedValue(new Error('Health check failed'));

      const health = await realTimeDataService.getHealth();

      expect(health.scraper.status).toBe('unhealthy');
      expect(health.scraper.error).toBe('Health check failed');
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start and stop update intervals', () => {
      realTimeDataService.start();
      expect(realTimeDataService.isRunning()).toBe(true);

      realTimeDataService.stop();
      expect(realTimeDataService.isRunning()).toBe(false);
    });

    it('should clean up resources on shutdown', async () => {
      realTimeDataService.start();
      
      await realTimeDataService.shutdown();

      expect(realTimeDataService.isRunning()).toBe(false);
      expect(mockedLogger.info).toHaveBeenCalledWith('RealTimeDataService shutdown complete');
    });

    it('should handle graceful shutdown with active subscriptions', async () => {
      await realTimeDataService.subscribe('client-1', 'AAPL');
      await realTimeDataService.subscribe('client-2', 'GOOGL');

      await realTimeDataService.shutdown();

      // Should clean up all subscriptions
      expect(realTimeDataService.getActiveSubscriptions()).toBe(0);
    });

    it('should prevent memory leaks from old subscriptions', async () => {
      const clientId = 'client-123';
      
      // Subscribe and unsubscribe many times
      for (let i = 0; i < 1000; i++) {
        await realTimeDataService.subscribe(clientId, `STOCK${i}`);
        await realTimeDataService.unsubscribe(clientId, `STOCK${i}`);
      }

      const subscriptions = realTimeDataService.getSubscriptions(clientId);
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed operations', async () => {
      mockStockScraper.getQuote
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          symbol: 'AAPL',
          price: 150,
          change: 1,
          changePercent: 0.67,
          volume: 1000000,
          timestamp: Date.now()
        });

      const result = await realTimeDataService.getStockQuote('AAPL');
      
      expect(result.symbol).toBe('AAPL');
      expect(mockStockScraper.getQuote).toHaveBeenCalledTimes(2);
    });

    it('should fallback to cache on scraper failure', async () => {
      const cachedData = {
        symbol: 'AAPL',
        price: 145,
        change: -2,
        changePercent: -1.36,
        volume: 800000,
        timestamp: Date.now() - 30000 // 30 seconds old
      };

      mockCacheService.get.mockResolvedValue(JSON.stringify(cachedData));
      mockStockScraper.getQuote.mockRejectedValue(new Error('API Error'));

      const result = await realTimeDataService.getStockQuote('AAPL', { allowStale: true });
      
      expect(result).toEqual(cachedData);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Using stale cache data')
      );
    });

    it('should handle circuit breaker pattern', async () => {
      // Simulate multiple failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        mockStockScraper.getQuote.mockRejectedValue(new Error('API Error'));
        try {
          await realTimeDataService.getStockQuote('AAPL');
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should be open, subsequent calls should fail fast
      const startTime = Date.now();
      try {
        await realTimeDataService.getStockQuote('AAPL');
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(100); // Should fail fast
      }
    });
  });
});