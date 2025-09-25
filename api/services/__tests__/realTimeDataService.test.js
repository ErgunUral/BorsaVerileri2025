import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import realTimeDataService from '../realTimeDataService.js';
import WebSocketManager from '../WebSocketManager.js';
import cacheService from '../cacheService.js';
import stockScraper from '../stockScraper.js';

// Mock dependencies
vi.mock('../WebSocketManager.js');
vi.mock('../cacheService.js');
vi.mock('../stockScraper.js');

// Mock console for logging
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('RealTimeDataService', () => {
  let mockWebSocketManager;
  let mockCacheService;
  let mockStockScraper;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup WebSocketManager mock
    mockWebSocketManager = {
      broadcast: vi.fn(),
      broadcastToRoom: vi.fn(),
      getConnectedClients: vi.fn().mockReturnValue(0),
      getRoomClients: vi.fn().mockReturnValue(0),
      on: vi.fn(),
      emit: vi.fn()
    };
    WebSocketManager.mockImplementation(() => mockWebSocketManager);

    // Setup cacheService mock
    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      getJSON: vi.fn(),
      setJSON: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      keys: vi.fn(),
      mget: vi.fn(),
      mset: vi.fn()
    };
    Object.assign(cacheService, mockCacheService);

    // Setup stockScraper mock
    mockStockScraper = {
      getStockData: vi.fn(),
      getMarketOverview: vi.fn(),
      getStockNews: vi.fn(),
      searchStocks: vi.fn()
    };
    Object.assign(stockScraper, mockStockScraper);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service correctly', () => {
      expect(realTimeDataService).toBeDefined();
      expect(typeof realTimeDataService.startPriceUpdates).toBe('function');
      expect(typeof realTimeDataService.stopPriceUpdates).toBe('function');
      expect(typeof realTimeDataService.subscribeToStock).toBe('function');
    });

    it('should setup WebSocket event handlers', () => {
      realTimeDataService.initialize();
      
      expect(mockWebSocketManager.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockWebSocketManager.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('Price Updates', () => {
    describe('startPriceUpdates', () => {
      it('should start price update interval', () => {
        vi.useFakeTimers();
        const setIntervalSpy = vi.spyOn(global, 'setInterval');

        realTimeDataService.startPriceUpdates();

        expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
        
        vi.useRealTimers();
      });

      it('should not start multiple intervals', () => {
        vi.useFakeTimers();
        const setIntervalSpy = vi.spyOn(global, 'setInterval');

        realTimeDataService.startPriceUpdates();
        realTimeDataService.startPriceUpdates();

        expect(setIntervalSpy).toHaveBeenCalledTimes(1);
        
        vi.useRealTimers();
      });

      it('should update prices for subscribed stocks', async () => {
        vi.useFakeTimers();
        
        const mockStockData = {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69,
          timestamp: Date.now()
        };

        mockStockScraper.getStockData.mockResolvedValue(mockStockData);
        mockCacheService.keys.mockResolvedValue(['subscription:AAPL', 'subscription:GOOGL']);
        
        realTimeDataService.startPriceUpdates();
        
        // Fast-forward time to trigger the interval
        vi.advanceTimersByTime(5000);
        
        // Wait for async operations
        await vi.runAllTimersAsync();

        expect(mockStockScraper.getStockData).toHaveBeenCalledWith('AAPL');
        expect(mockWebSocketManager.broadcastToRoom).toHaveBeenCalledWith(
          'stock:AAPL',
          'priceUpdate',
          mockStockData
        );
        
        vi.useRealTimers();
      });

      it('should handle errors during price updates', async () => {
        vi.useFakeTimers();
        
        const error = new Error('API Error');
        mockStockScraper.getStockData.mockRejectedValue(error);
        mockCacheService.keys.mockResolvedValue(['subscription:AAPL']);
        
        realTimeDataService.startPriceUpdates();
        
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error updating price for AAPL:',
          error
        );
        
        vi.useRealTimers();
      });

      it('should cache updated stock data', async () => {
        vi.useFakeTimers();
        
        const mockStockData = {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69,
          timestamp: Date.now()
        };

        mockStockScraper.getStockData.mockResolvedValue(mockStockData);
        mockCacheService.keys.mockResolvedValue(['subscription:AAPL']);
        
        realTimeDataService.startPriceUpdates();
        
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();

        expect(mockCacheService.setJSON).toHaveBeenCalledWith(
          'stock:AAPL',
          mockStockData,
          300 // 5 minutes cache
        );
        
        vi.useRealTimers();
      });
    });

    describe('stopPriceUpdates', () => {
      it('should stop price update interval', () => {
        vi.useFakeTimers();
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        
        realTimeDataService.startPriceUpdates();
        realTimeDataService.stopPriceUpdates();

        expect(clearIntervalSpy).toHaveBeenCalled();
        
        vi.useRealTimers();
      });

      it('should handle stopping when not started', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        
        realTimeDataService.stopPriceUpdates();

        expect(clearIntervalSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Stock Subscriptions', () => {
    describe('subscribeToStock', () => {
      it('should subscribe client to stock updates', async () => {
        const clientId = 'client-123';
        const symbol = 'AAPL';
        
        mockCacheService.exists.mockResolvedValue(false);
        mockCacheService.set.mockResolvedValue(true);
        
        await realTimeDataService.subscribeToStock(clientId, symbol);

        expect(mockCacheService.set).toHaveBeenCalledWith(
          `subscription:${symbol}`,
          'active',
          3600
        );
        expect(mockCacheService.set).toHaveBeenCalledWith(
          `client:${clientId}:${symbol}`,
          'subscribed',
          3600
        );
      });

      it('should not create duplicate subscriptions', async () => {
        const clientId = 'client-123';
        const symbol = 'AAPL';
        
        mockCacheService.exists.mockResolvedValue(true);
        
        await realTimeDataService.subscribeToStock(clientId, symbol);

        expect(mockCacheService.set).toHaveBeenCalledTimes(1); // Only client subscription
      });

      it('should validate input parameters', async () => {
        await expect(realTimeDataService.subscribeToStock()).rejects.toThrow(
          'Client ID and symbol are required'
        );
        
        await expect(realTimeDataService.subscribeToStock('client-123')).rejects.toThrow(
          'Client ID and symbol are required'
        );
        
        await expect(realTimeDataService.subscribeToStock('', 'AAPL')).rejects.toThrow(
          'Client ID and symbol cannot be empty'
        );
      });

      it('should send initial stock data to subscriber', async () => {
        const clientId = 'client-123';
        const symbol = 'AAPL';
        const mockStockData = {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69
        };
        
        mockCacheService.exists.mockResolvedValue(false);
        mockCacheService.set.mockResolvedValue(true);
        mockCacheService.getJSON.mockResolvedValue(mockStockData);
        
        await realTimeDataService.subscribeToStock(clientId, symbol);

        expect(mockWebSocketManager.emit).toHaveBeenCalledWith(
          clientId,
          'initialStockData',
          mockStockData
        );
      });

      it('should fetch fresh data if not cached', async () => {
        const clientId = 'client-123';
        const symbol = 'AAPL';
        const mockStockData = {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69
        };
        
        mockCacheService.exists.mockResolvedValue(false);
        mockCacheService.set.mockResolvedValue(true);
        mockCacheService.getJSON.mockResolvedValue(null);
        mockStockScraper.getStockData.mockResolvedValue(mockStockData);
        
        await realTimeDataService.subscribeToStock(clientId, symbol);

        expect(mockStockScraper.getStockData).toHaveBeenCalledWith(symbol);
        expect(mockCacheService.setJSON).toHaveBeenCalledWith(
          `stock:${symbol}`,
          mockStockData,
          300
        );
      });
    });

    describe('unsubscribeFromStock', () => {
      it('should unsubscribe client from stock updates', async () => {
        const clientId = 'client-123';
        const symbol = 'AAPL';
        
        mockCacheService.del.mockResolvedValue(true);
        mockCacheService.keys.mockResolvedValue([]);
        
        await realTimeDataService.unsubscribeFromStock(clientId, symbol);

        expect(mockCacheService.del).toHaveBeenCalledWith(`client:${clientId}:${symbol}`);
      });

      it('should remove stock subscription if no clients left', async () => {
        const clientId = 'client-123';
        const symbol = 'AAPL';
        
        mockCacheService.del.mockResolvedValue(true);
        mockCacheService.keys.mockResolvedValue([]); // No other clients
        
        await realTimeDataService.unsubscribeFromStock(clientId, symbol);

        expect(mockCacheService.del).toHaveBeenCalledWith(`subscription:${symbol}`);
      });

      it('should keep stock subscription if other clients exist', async () => {
        const clientId = 'client-123';
        const symbol = 'AAPL';
        
        mockCacheService.del.mockResolvedValue(true);
        mockCacheService.keys.mockResolvedValue(['client:other-client:AAPL']);
        
        await realTimeDataService.unsubscribeFromStock(clientId, symbol);

        expect(mockCacheService.del).not.toHaveBeenCalledWith(`subscription:${symbol}`);
      });
    });

    describe('getSubscribedStocks', () => {
      it('should return list of subscribed stocks for client', async () => {
        const clientId = 'client-123';
        const mockKeys = [
          'client:client-123:AAPL',
          'client:client-123:GOOGL',
          'client:client-123:MSFT'
        ];
        
        mockCacheService.keys.mockResolvedValue(mockKeys);
        
        const result = await realTimeDataService.getSubscribedStocks(clientId);

        expect(result).toEqual(['AAPL', 'GOOGL', 'MSFT']);
        expect(mockCacheService.keys).toHaveBeenCalledWith(`client:${clientId}:*`);
      });

      it('should return empty array for client with no subscriptions', async () => {
        const clientId = 'client-123';
        
        mockCacheService.keys.mockResolvedValue([]);
        
        const result = await realTimeDataService.getSubscribedStocks(clientId);

        expect(result).toEqual([]);
      });
    });
  });

  describe('Market Data Updates', () => {
    describe('updateMarketOverview', () => {
      it('should fetch and broadcast market overview', async () => {
        const mockMarketData = {
          indices: {
            'S&P 500': { value: 4500, change: 25.5, changePercent: 0.57 },
            'NASDAQ': { value: 15000, change: -30.2, changePercent: -0.20 }
          },
          sectors: {
            'Technology': { change: 1.2 },
            'Healthcare': { change: -0.5 }
          }
        };
        
        mockStockScraper.getMarketOverview.mockResolvedValue(mockMarketData);
        
        await realTimeDataService.updateMarketOverview();

        expect(mockStockScraper.getMarketOverview).toHaveBeenCalled();
        expect(mockWebSocketManager.broadcast).toHaveBeenCalledWith(
          'marketOverview',
          mockMarketData
        );
        expect(mockCacheService.setJSON).toHaveBeenCalledWith(
          'market:overview',
          mockMarketData,
          300
        );
      });

      it('should handle market overview fetch errors', async () => {
        const error = new Error('Market data unavailable');
        mockStockScraper.getMarketOverview.mockRejectedValue(error);
        
        await realTimeDataService.updateMarketOverview();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error updating market overview:',
          error
        );
      });
    });

    describe('updateStockNews', () => {
      it('should fetch and broadcast stock news', async () => {
        const symbol = 'AAPL';
        const mockNews = [
          {
            title: 'Apple Reports Strong Q4 Earnings',
            summary: 'Apple exceeded expectations...',
            url: 'https://example.com/news/1',
            timestamp: Date.now(),
            sentiment: 'positive'
          }
        ];
        
        mockStockScraper.getStockNews.mockResolvedValue(mockNews);
        
        await realTimeDataService.updateStockNews(symbol);

        expect(mockStockScraper.getStockNews).toHaveBeenCalledWith(symbol);
        expect(mockWebSocketManager.broadcastToRoom).toHaveBeenCalledWith(
          `stock:${symbol}`,
          'stockNews',
          mockNews
        );
        expect(mockCacheService.setJSON).toHaveBeenCalledWith(
          `news:${symbol}`,
          mockNews,
          600 // 10 minutes cache
        );
      });

      it('should validate symbol parameter', async () => {
        await expect(realTimeDataService.updateStockNews()).rejects.toThrow(
          'Symbol is required'
        );
        
        await expect(realTimeDataService.updateStockNews('')).rejects.toThrow(
          'Symbol cannot be empty'
        );
      });
    });
  });

  describe('Client Management', () => {
    describe('handleClientConnection', () => {
      it('should handle new client connection', async () => {
        const clientId = 'client-123';
        const mockSocket = {
          id: clientId,
          join: vi.fn(),
          on: vi.fn(),
          emit: vi.fn()
        };
        
        await realTimeDataService.handleClientConnection(mockSocket);

        expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      });

      it('should send welcome message to new client', async () => {
        const clientId = 'client-123';
        const mockSocket = {
          id: clientId,
          join: vi.fn(),
          on: vi.fn(),
          emit: vi.fn()
        };
        
        await realTimeDataService.handleClientConnection(mockSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
          message: 'Connected to real-time data service',
          clientId: clientId
        });
      });
    });

    describe('handleClientDisconnection', () => {
      it('should clean up client subscriptions on disconnect', async () => {
        const clientId = 'client-123';
        const mockSubscriptions = ['AAPL', 'GOOGL', 'MSFT'];
        
        mockCacheService.keys.mockResolvedValue([
          'client:client-123:AAPL',
          'client:client-123:GOOGL',
          'client:client-123:MSFT'
        ]);
        mockCacheService.del.mockResolvedValue(true);
        
        await realTimeDataService.handleClientDisconnection(clientId);

        expect(mockCacheService.del).toHaveBeenCalledWith('client:client-123:AAPL');
        expect(mockCacheService.del).toHaveBeenCalledWith('client:client-123:GOOGL');
        expect(mockCacheService.del).toHaveBeenCalledWith('client:client-123:MSFT');
      });

      it('should log client disconnection', async () => {
        const clientId = 'client-123';
        
        mockCacheService.keys.mockResolvedValue([]);
        
        await realTimeDataService.handleClientDisconnection(clientId);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Client ${clientId} disconnected and cleaned up`
        );
      });
    });
  });

  describe('Performance and Optimization', () => {
    describe('batch operations', () => {
      it('should batch multiple stock updates', async () => {
        vi.useFakeTimers();
        
        const mockStocks = ['AAPL', 'GOOGL', 'MSFT'];
        const mockStockData = {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69
        };
        
        mockCacheService.keys.mockResolvedValue(
          mockStocks.map(symbol => `subscription:${symbol}`)
        );
        mockStockScraper.getStockData.mockResolvedValue(mockStockData);
        
        realTimeDataService.startPriceUpdates();
        
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();

        expect(mockStockScraper.getStockData).toHaveBeenCalledTimes(3);
        expect(mockWebSocketManager.broadcastToRoom).toHaveBeenCalledTimes(3);
        
        vi.useRealTimers();
      });

      it('should handle rate limiting for API calls', async () => {
        vi.useFakeTimers();
        
        const mockStocks = Array.from({ length: 100 }, (_, i) => `STOCK${i}`);
        mockCacheService.keys.mockResolvedValue(
          mockStocks.map(symbol => `subscription:${symbol}`)
        );
        
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.status = 429;
        mockStockScraper.getStockData.mockRejectedValue(rateLimitError);
        
        realTimeDataService.startPriceUpdates();
        
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error updating price'),
          rateLimitError
        );
        
        vi.useRealTimers();
      });
    });

    describe('memory management', () => {
      it('should clean up expired subscriptions', async () => {
        const expiredKeys = [
          'subscription:EXPIRED1',
          'subscription:EXPIRED2'
        ];
        
        mockCacheService.keys.mockResolvedValue(expiredKeys);
        mockCacheService.ttl.mockResolvedValue(-2); // Expired
        mockCacheService.del.mockResolvedValue(true);
        
        await realTimeDataService.cleanupExpiredSubscriptions();

        expect(mockCacheService.del).toHaveBeenCalledWith('subscription:EXPIRED1');
        expect(mockCacheService.del).toHaveBeenCalledWith('subscription:EXPIRED2');
      });

      it('should not clean up active subscriptions', async () => {
        const activeKeys = [
          'subscription:ACTIVE1',
          'subscription:ACTIVE2'
        ];
        
        mockCacheService.keys.mockResolvedValue(activeKeys);
        mockCacheService.ttl.mockResolvedValue(3600); // Active
        
        await realTimeDataService.cleanupExpiredSubscriptions();

        expect(mockCacheService.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle WebSocket connection errors', async () => {
      const error = new Error('WebSocket connection failed');
      mockWebSocketManager.broadcast.mockImplementation(() => {
        throw error;
      });
      
      await realTimeDataService.updateMarketOverview();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating market overview:',
        error
      );
    });

    it('should handle cache service errors gracefully', async () => {
      const clientId = 'client-123';
      const symbol = 'AAPL';
      const cacheError = new Error('Cache service unavailable');
      
      mockCacheService.exists.mockRejectedValue(cacheError);
      
      await expect(realTimeDataService.subscribeToStock(clientId, symbol))
        .rejects.toThrow('Cache service unavailable');
    });

    it('should implement circuit breaker for external API calls', async () => {
      vi.useFakeTimers();
      
      // Simulate multiple failures
      const apiError = new Error('API service down');
      mockStockScraper.getStockData.mockRejectedValue(apiError);
      mockCacheService.keys.mockResolvedValue(['subscription:AAPL']);
      
      realTimeDataService.startPriceUpdates();
      
      // Trigger multiple failed updates
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(5000);
        await vi.runAllTimersAsync();
      }

      expect(consoleErrorSpy).toHaveBeenCalledTimes(5);
      
      vi.useRealTimers();
    });

    it('should handle malformed data gracefully', async () => {
      const clientId = 'client-123';
      const symbol = 'AAPL';
      
      // Mock malformed stock data
      const malformedData = {
        symbol: 'AAPL',
        price: 'invalid-price',
        change: null
      };
      
      mockCacheService.exists.mockResolvedValue(false);
      mockCacheService.set.mockResolvedValue(true);
      mockStockScraper.getStockData.mockResolvedValue(malformedData);
      
      await realTimeDataService.subscribeToStock(clientId, symbol);

      // Should still cache the data even if malformed
      expect(mockCacheService.setJSON).toHaveBeenCalledWith(
        `stock:${symbol}`,
        malformedData,
        300
      );
    });
  });

  describe('Monitoring and Metrics', () => {
    it('should track subscription metrics', async () => {
      const metrics = realTimeDataService.getMetrics();
      
      expect(metrics).toHaveProperty('totalSubscriptions');
      expect(metrics).toHaveProperty('activeClients');
      expect(metrics).toHaveProperty('updatesSent');
      expect(metrics).toHaveProperty('errorsCount');
    });

    it('should reset metrics', () => {
      realTimeDataService.resetMetrics();
      const metrics = realTimeDataService.getMetrics();
      
      expect(metrics.totalSubscriptions).toBe(0);
      expect(metrics.activeClients).toBe(0);
      expect(metrics.updatesSent).toBe(0);
      expect(metrics.errorsCount).toBe(0);
    });

    it('should track performance metrics', async () => {
      vi.useFakeTimers();
      
      const mockStockData = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69
      };
      
      mockStockScraper.getStockData.mockResolvedValue(mockStockData);
      mockCacheService.keys.mockResolvedValue(['subscription:AAPL']);
      
      realTimeDataService.startPriceUpdates();
      
      vi.advanceTimersByTime(5000);
      await vi.runAllTimersAsync();
      
      const metrics = realTimeDataService.getMetrics();
      expect(metrics.updatesSent).toBeGreaterThan(0);
      
      vi.useRealTimers();
    });
  });
});