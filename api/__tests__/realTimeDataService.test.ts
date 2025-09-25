import { realTimeDataService } from '../services/realTimeDataService';
import { WebSocketManager } from '../services/WebSocketManager';
import { cacheService } from '../services/cacheService';
import { stockScraper } from '../services/stockScraper';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';

// Mock dependencies
vi.mock('../services/WebSocketManager');
vi.mock('../services/cacheService');
vi.mock('../services/stockScraper');

const MockedWebSocketManager = WebSocketManager as any;
const mockedCacheService = cacheService as any;
const mockedStockScraper = stockScraper as any;

const mockWebSocketInstance = {
  broadcast: vi.fn(),
  broadcastToRoom: vi.fn(),
  getConnectedClients: vi.fn(),
  addClientToRoom: vi.fn(),
  removeClientFromRoom: vi.fn(),
  isClientConnected: vi.fn(),
  getClientRooms: vi.fn(),
  getRoomClients: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn()
};

MockedWebSocketManager.mockImplementation(() => mockWebSocketInstance as any);

const mockStockData = {
  symbol: 'THYAO',
  name: 'Türk Hava Yolları',
  price: 147.5,
  change: 3.2,
  changePercent: 2.22,
  volume: 1500000,
  high: 150.0,
  low: 144.0,
  open: 145.0,
  close: 147.5,
  marketCap: 20000000000,
  timestamp: '2024-01-01T12:00:00Z'
};

const mockMarketSummary = {
  totalStocks: 100,
  gainers: 45,
  losers: 35,
  unchanged: 20,
  totalVolume: 1000000000,
  averageChange: 1.5,
  topGainer: { symbol: 'THYAO', changePercent: 5.5 },
  topLoser: { symbol: 'AKBNK', changePercent: -3.2 },
  lastUpdate: '2024-01-01T12:00:00Z'
};

const mockPriceHistory = [
  { timestamp: '2024-01-01T10:00:00Z', price: 145.0 },
  { timestamp: '2024-01-01T11:00:00Z', price: 146.5 },
  { timestamp: '2024-01-01T12:00:00Z', price: 147.5 }
];

describe('Real Time Data Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Setup default mock implementations
    mockedCacheService.getStockData.mockResolvedValue(null);
    mockedCacheService.setStockData.mockResolvedValue(true);
    mockedCacheService.getMarketData.mockResolvedValue(null);
    mockedCacheService.setMarketData.mockResolvedValue(true);
    mockedStockScraper.scrapeStockData.mockResolvedValue([mockStockData]);
    mockedStockScraper.getMarketSummary.mockResolvedValue(mockMarketSummary);
    mockWebSocketInstance.getConnectedClients.mockReturnValue(5);
    mockWebSocketInstance.broadcast.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    test('initializes service with default configuration', () => {
      expect(realTimeDataService).toBeDefined();
      expect(MockedWebSocketManager).toHaveBeenCalledWith({
        updateInterval: expect.any(Number),
        maxRetries: expect.any(Number),
        retryDelay: expect.any(Number)
      });
    });

    test('starts data streaming on initialization', async () => {
      await realTimeDataService.start();
      
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalled();
      expect(mockWebSocketInstance.broadcast).toHaveBeenCalled();
    });

    test('stops data streaming on shutdown', async () => {
      await realTimeDataService.start();
      await realTimeDataService.stop();
      
      // Verify that intervals are cleared
      vi.advanceTimersByTime(60000);
      
      // Should not call scraper after stop
      const initialCallCount = mockedStockScraper.scrapeStockData.mock.calls.length;
      vi.advanceTimersByTime(60000);
      
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('stock data management', () => {
    test('fetches and caches stock data', async () => {
      const symbol = 'THYAO';
      
      mockedStockScraper.scrapeSpecificStock.mockResolvedValueOnce(mockStockData);
      
      const result = await realTimeDataService.getStockData(symbol);
      
      expect(mockedCacheService.getStockData).toHaveBeenCalledWith(symbol);
      expect(mockedStockScraper.scrapeSpecificStock).toHaveBeenCalledWith(symbol);
      expect(mockedCacheService.setStockData).toHaveBeenCalledWith(symbol, mockStockData);
      expect(result).toEqual(mockStockData);
    });

    test('returns cached data when available', async () => {
      const symbol = 'THYAO';
      
      mockedCacheService.getStockData.mockResolvedValueOnce(mockStockData);
      
      const result = await realTimeDataService.getStockData(symbol);
      
      expect(mockedCacheService.getStockData).toHaveBeenCalledWith(symbol);
      expect(mockedStockScraper.scrapeSpecificStock).not.toHaveBeenCalled();
      expect(result).toEqual(mockStockData);
    });

    test('handles stock data fetch errors', async () => {
      const symbol = 'INVALID';
      
      mockedStockScraper.scrapeSpecificStock.mockRejectedValueOnce(
        new Error('Stock not found')
      );
      
      await expect(realTimeDataService.getStockData(symbol))
        .rejects.toThrow('Failed to fetch stock data for INVALID');
    });

    test('updates multiple stocks simultaneously', async () => {
      const symbols = ['THYAO', 'AKBNK', 'GARAN'];
      const stockDataArray = symbols.map(symbol => ({
        ...mockStockData,
        symbol
      }));
      
      mockedStockScraper.scrapeStockData.mockResolvedValueOnce(stockDataArray);
      
      await realTimeDataService.updateAllStocks();
      
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalled();
      expect(mockedCacheService.setStockData).toHaveBeenCalledTimes(3);
      expect(mockWebSocketInstance.broadcast).toHaveBeenCalledWith(
        'stockUpdate',
        expect.objectContaining({
          stocks: stockDataArray,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('market data management', () => {
    test('fetches and caches market summary', async () => {
      mockedStockScraper.getMarketSummary.mockResolvedValueOnce(mockMarketSummary);
      
      const result = await realTimeDataService.getMarketSummary();
      
      expect(mockedCacheService.getMarketData).toHaveBeenCalled();
      expect(mockedStockScraper.getMarketSummary).toHaveBeenCalled();
      expect(mockedCacheService.setMarketData).toHaveBeenCalledWith(mockMarketSummary);
      expect(result).toEqual(mockMarketSummary);
    });

    test('returns cached market data when available', async () => {
      mockedCacheService.getMarketData.mockResolvedValueOnce(mockMarketSummary);
      
      const result = await realTimeDataService.getMarketSummary();
      
      expect(mockedCacheService.getMarketData).toHaveBeenCalled();
      expect(mockedStockScraper.getMarketSummary).not.toHaveBeenCalled();
      expect(result).toEqual(mockMarketSummary);
    });

    test('broadcasts market updates to clients', async () => {
      await realTimeDataService.broadcastMarketUpdate(mockMarketSummary);
      
      expect(mockWebSocketInstance.broadcast).toHaveBeenCalledWith(
        'marketUpdate',
        expect.objectContaining({
          summary: mockMarketSummary,
          timestamp: expect.any(String)
        })
      );
    });
  });

  describe('real-time updates', () => {
    test('starts periodic data updates', async () => {
      await realTimeDataService.startPeriodicUpdates();
      
      // Fast forward time to trigger updates
      vi.advanceTimersByTime(30000); // 30 seconds
      
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalled();
      expect(mockWebSocketInstance.broadcast).toHaveBeenCalled();
    });

    test('stops periodic updates', async () => {
      await realTimeDataService.startPeriodicUpdates();
      await realTimeDataService.stopPeriodicUpdates();
      
      const initialCallCount = mockedStockScraper.scrapeStockData.mock.calls.length;
      
      vi.advanceTimersByTime(60000);
      
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalledTimes(initialCallCount);
    });

    test('handles update errors gracefully', async () => {
      mockedStockScraper.scrapeStockData.mockRejectedValueOnce(
        new Error('Scraping failed')
      );
      
      await realTimeDataService.startPeriodicUpdates();
      
      vi.advanceTimersByTime(30000);
      
      // Should continue running despite errors
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalled();
    });

    test('adjusts update frequency based on client count', async () => {
      // High client count should increase update frequency
      mockWebSocketInstance.getConnectedClients.mockReturnValue(100);
      
      await realTimeDataService.adjustUpdateFrequency();
      
      // Verify that update interval is reduced for more frequent updates
      expect(realTimeDataService.getUpdateInterval()).toBeLessThan(30000);
    });

    test('reduces update frequency with fewer clients', async () => {
      // Low client count should decrease update frequency
      mockWebSocketInstance.getConnectedClients.mockReturnValue(1);
      
      await realTimeDataService.adjustUpdateFrequency();
      
      // Verify that update interval is increased for less frequent updates
      expect(realTimeDataService.getUpdateInterval()).toBeGreaterThan(30000);
    });
  });

  describe('client subscription management', () => {
    test('subscribes client to stock updates', async () => {
      const clientId = 'client123';
      const symbol = 'THYAO';
      
      await realTimeDataService.subscribeToStock(clientId, symbol);
      
      expect(mockWebSocketInstance.addClientToRoom).toHaveBeenCalledWith(
        clientId,
        `stock:${symbol}`
      );
    });

    test('unsubscribes client from stock updates', async () => {
      const clientId = 'client123';
      const symbol = 'THYAO';
      
      await realTimeDataService.unsubscribeFromStock(clientId, symbol);
      
      expect(mockWebSocketInstance.removeClientFromRoom).toHaveBeenCalledWith(
        clientId,
        `stock:${symbol}`
      );
    });

    test('broadcasts stock-specific updates to subscribers', async () => {
      const symbol = 'THYAO';
      const updatedData = { ...mockStockData, price: 150.0 };
      
      await realTimeDataService.broadcastStockUpdate(symbol, updatedData);
      
      expect(mockWebSocketInstance.broadcastToRoom).toHaveBeenCalledWith(
        `stock:${symbol}`,
        'stockUpdate',
        expect.objectContaining({
          symbol,
          data: updatedData,
          timestamp: expect.any(String)
        })
      );
    });

    test('gets client subscription list', async () => {
      const clientId = 'client123';
      const rooms = ['stock:THYAO', 'stock:AKBNK', 'market:summary'];
      
      mockWebSocketInstance.getClientRooms.mockReturnValue(rooms);
      
      const subscriptions = await realTimeDataService.getClientSubscriptions(clientId);
      
      expect(mockWebSocketInstance.getClientRooms).toHaveBeenCalledWith(clientId);
      expect(subscriptions).toEqual({
        stocks: ['THYAO', 'AKBNK'],
        market: true
      });
    });
  });

  describe('price history management', () => {
    test('stores price history for stocks', async () => {
      const symbol = 'THYAO';
      const priceData = { price: 147.5, timestamp: '2024-01-01T12:00:00Z' };
      
      await realTimeDataService.storePriceHistory(symbol, priceData);
      
      expect(mockedCacheService.zadd).toHaveBeenCalledWith(
        `history:${symbol}`,
        expect.any(Number), // timestamp as score
        JSON.stringify(priceData)
      );
    });

    test('retrieves price history for stocks', async () => {
      const symbol = 'THYAO';
      const historyData = mockPriceHistory.map(item => JSON.stringify(item));
      
      mockedCacheService.zrange.mockResolvedValueOnce(historyData);
      
      const result = await realTimeDataService.getPriceHistory(symbol, 24); // 24 hours
      
      expect(mockedCacheService.zrange).toHaveBeenCalledWith(
        `history:${symbol}`,
        expect.any(Number), // start timestamp
        expect.any(Number)  // end timestamp
      );
      
      expect(result).toEqual(mockPriceHistory);
    });

    test('cleans up old price history', async () => {
      const symbol = 'THYAO';
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      await realTimeDataService.cleanupPriceHistory(symbol, cutoffTime);
      
      expect(mockedCacheService.zremrangebyscore).toHaveBeenCalledWith(
        `history:${symbol}`,
        0,
        cutoffTime
      );
    });
  });

  describe('performance monitoring', () => {
    test('tracks update performance metrics', async () => {
      const startTime = Date.now();
      
      await realTimeDataService.updateAllStocks();
      
      const metrics = await realTimeDataService.getPerformanceMetrics();
      
      expect(metrics).toEqual({
        lastUpdateDuration: expect.any(Number),
        averageUpdateDuration: expect.any(Number),
        totalUpdates: expect.any(Number),
        successRate: expect.any(Number),
        connectedClients: expect.any(Number),
        lastUpdateTime: expect.any(String)
      });
    });

    test('monitors memory usage', async () => {
      const memoryUsage = await realTimeDataService.getMemoryUsage();
      
      expect(memoryUsage).toEqual({
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
        external: expect.any(Number),
        rss: expect.any(Number)
      });
    });

    test('tracks error rates', async () => {
      // Simulate some errors
      mockedStockScraper.scrapeStockData
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce([mockStockData]);
      
      // Attempt updates
      try { await realTimeDataService.updateAllStocks(); } catch {}
      try { await realTimeDataService.updateAllStocks(); } catch {}
      await realTimeDataService.updateAllStocks();
      
      const errorRate = await realTimeDataService.getErrorRate();
      
      expect(errorRate).toBeCloseTo(0.67, 2); // 2 errors out of 3 attempts
    });
  });

  describe('data validation and sanitization', () => {
    test('validates stock data before broadcasting', async () => {
      const invalidStockData = {
        symbol: '', // Invalid empty symbol
        price: 'invalid', // Invalid price
        change: null
      };
      
      mockedStockScraper.scrapeStockData.mockResolvedValueOnce([invalidStockData]);
      
      await realTimeDataService.updateAllStocks();
      
      // Should not broadcast invalid data
      expect(mockWebSocketInstance.broadcast).not.toHaveBeenCalledWith(
        'stockUpdate',
        expect.objectContaining({
          stocks: expect.arrayContaining([invalidStockData])
        })
      );
    });

    test('sanitizes stock data before storage', async () => {
      const stockDataWithExtraFields = {
        ...mockStockData,
        extraField: 'should be removed',
        anotherField: 123
      };
      
      mockedStockScraper.scrapeSpecificStock.mockResolvedValueOnce(stockDataWithExtraFields);
      
      await realTimeDataService.getStockData('THYAO');
      
      expect(mockedCacheService.setStockData).toHaveBeenCalledWith(
        'THYAO',
        expect.not.objectContaining({
          extraField: expect.anything(),
          anotherField: expect.anything()
        })
      );
    });

    test('handles malformed data gracefully', async () => {
      const malformedData = {
        symbol: 'THYAO',
        price: undefined,
        change: NaN,
        volume: Infinity
      };
      
      mockedStockScraper.scrapeSpecificStock.mockResolvedValueOnce(malformedData);
      
      const result = await realTimeDataService.getStockData('THYAO');
      
      // Should return normalized data or null
      expect(result).toEqual(
        expect.objectContaining({
          symbol: 'THYAO',
          price: expect.any(Number),
          change: expect.any(Number),
          volume: expect.any(Number)
        })
      );
    });
  });

  describe('rate limiting and throttling', () => {
    test('implements rate limiting for API calls', async () => {
      const symbol = 'THYAO';
      
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map(() => 
        realTimeDataService.getStockData(symbol)
      );
      
      await Promise.all(promises);
      
      // Should not exceed rate limit
      expect(mockedStockScraper.scrapeSpecificStock).toHaveBeenCalledTimes(1);
    });

    test('throttles broadcast updates', async () => {
      const symbol = 'THYAO';
      
      // Send multiple rapid updates
      for (let i = 0; i < 5; i++) {
        await realTimeDataService.broadcastStockUpdate(symbol, mockStockData);
      }
      
      // Should throttle broadcasts
      expect(mockWebSocketInstance.broadcastToRoom).toHaveBeenCalledTimes(1);
    });

    test('queues updates during high load', async () => {
      // Simulate high load
      mockedStockScraper.scrapeStockData.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([mockStockData]), 100))
      );
      
      // Start multiple updates
      const promises = Array(5).fill(null).map(() => 
        realTimeDataService.updateAllStocks()
      );
      
      await Promise.all(promises);
      
      // Should queue and process updates sequentially
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalledTimes(1);
    });
  });

  describe('error recovery and resilience', () => {
    test('recovers from temporary network failures', async () => {
      mockedStockScraper.scrapeStockData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([mockStockData]);
      
      await realTimeDataService.updateAllStocks();
      
      // Should eventually succeed after retries
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalledTimes(3);
      expect(mockWebSocketInstance.broadcast).toHaveBeenCalled();
    });

    test('implements circuit breaker pattern', async () => {
      // Simulate repeated failures
      for (let i = 0; i < 5; i++) {
        mockedStockScraper.scrapeStockData.mockRejectedValueOnce(
          new Error('Service unavailable')
        );
        
        try {
          await realTimeDataService.updateAllStocks();
        } catch {}
      }
      
      // Circuit breaker should be open
      const isCircuitOpen = await realTimeDataService.isCircuitBreakerOpen();
      expect(isCircuitOpen).toBe(true);
      
      // Should not make more calls when circuit is open
      await realTimeDataService.updateAllStocks();
      expect(mockedStockScraper.scrapeStockData).toHaveBeenCalledTimes(5);
    });

    test('falls back to cached data during outages', async () => {
      const symbol = 'THYAO';
      
      // Setup cached data
      mockedCacheService.getStockData.mockResolvedValueOnce(mockStockData);
      
      // Simulate service outage
      mockedStockScraper.scrapeSpecificStock.mockRejectedValue(
        new Error('Service unavailable')
      );
      
      const result = await realTimeDataService.getStockDataWithFallback(symbol);
      
      expect(result).toEqual(mockStockData);
      expect(result.cached).toBe(true);
    });
  });
});