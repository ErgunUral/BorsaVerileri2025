import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { realTimeDataService } from '../../services/realTimeDataService';
import { stockScraper } from '../../services/stockScraper';
import { cacheService } from '../../services/cacheService';
import { logger } from '../../utils/logger';
import type { StockData, MarketOverview } from '../../types/stock';

// Mock dependencies
vi.mock('../../services/stockScraper');
vi.mock('../../services/cacheService');
vi.mock('../../utils/logger');
vi.mock('events');

const mockStockScraper = vi.mocked(stockScraper);
const mockCacheService = vi.mocked(cacheService);
const mockLogger = vi.mocked(logger);
const mockEventEmitter = vi.mocked(EventEmitter);

const mockStockData: StockData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150.25,
  change: 2.50,
  changePercent: 1.69,
  volume: 50000000,
  marketCap: 2500000000000,
  peRatio: 25.5,
  dividendYield: 0.5,
  week52High: 180.00,
  week52Low: 120.00,
  avgVolume: 45000000,
  beta: 1.2,
  eps: 6.05,
  lastUpdated: new Date().toISOString()
};

const mockMarketOverview: MarketOverview = {
  totalVolume: 15000000000,
  advancingStocks: 1250,
  decliningStocks: 850,
  unchangedStocks: 100,
  marketSentiment: 'bullish',
  topGainers: [
    { symbol: 'AAPL', change: 5.25, changePercent: 3.5 },
    { symbol: 'GOOGL', change: 45.80, changePercent: 2.1 }
  ],
  topLosers: [
    { symbol: 'TSLA', change: -8.50, changePercent: -3.2 },
    { symbol: 'MSFT', change: -5.25, changePercent: -1.8 }
  ],
  lastUpdated: new Date().toISOString()
};

const mockNews = [
  {
    id: '1',
    title: 'Apple Reports Strong Q4 Earnings',
    summary: 'Apple exceeded expectations with strong iPhone sales.',
    url: 'https://example.com/news/1',
    publishedAt: new Date().toISOString(),
    source: 'TechNews',
    sentiment: 'positive' as const,
    relatedSymbols: ['AAPL']
  },
  {
    id: '2',
    title: 'Market Volatility Continues',
    summary: 'Stock market shows continued volatility amid economic uncertainty.',
    url: 'https://example.com/news/2',
    publishedAt: new Date().toISOString(),
    source: 'MarketWatch',
    sentiment: 'neutral' as const,
    relatedSymbols: ['SPY', 'QQQ']
  }
];

describe('realTimeDataService', () => {
  let mockEmitter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock EventEmitter instance
    mockEmitter = {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
      listenerCount: vi.fn().mockReturnValue(0),
      listeners: vi.fn().mockReturnValue([]),
      eventNames: vi.fn().mockReturnValue([])
    };
    
    mockEventEmitter.mockImplementation(() => mockEmitter);
    
    // Default mock implementations
    mockStockScraper.getStockData.mockResolvedValue(mockStockData);
    mockStockScraper.getMarketOverview.mockResolvedValue(mockMarketOverview);
    mockStockScraper.getStockNews.mockResolvedValue(mockNews);
    
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue();
    mockCacheService.del.mockResolvedValue(true);
    mockCacheService.keys.mockResolvedValue([]);
    
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service successfully', () => {
      expect(mockEventEmitter).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Real-time data service initialized');
    });

    it('should set up event emitter correctly', () => {
      expect(mockEmitter.on).toHaveBeenCalled();
    });
  });

  describe('Stock Data Management', () => {
    describe('getStockData', () => {
      it('should get stock data successfully', async () => {
        const result = await realTimeDataService.getStockData('AAPL');
        
        expect(mockStockScraper.getStockData).toHaveBeenCalledWith('AAPL');
        expect(result).toEqual(mockStockData);
      });

      it('should cache stock data after fetching', async () => {
        await realTimeDataService.getStockData('AAPL');
        
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'stock:AAPL',
          mockStockData,
          300 // 5 minutes TTL
        );
      });

      it('should return cached data when available', async () => {
        mockCacheService.get.mockResolvedValueOnce(mockStockData);
        
        const result = await realTimeDataService.getStockData('AAPL');
        
        expect(mockStockScraper.getStockData).not.toHaveBeenCalled();
        expect(result).toEqual(mockStockData);
      });

      it('should handle invalid symbol format', async () => {
        await expect(realTimeDataService.getStockData(''))
          .rejects.toThrow('Invalid stock symbol');
        
        await expect(realTimeDataService.getStockData('123'))
          .rejects.toThrow('Invalid stock symbol');
      });

      it('should handle scraper errors', async () => {
        mockStockScraper.getStockData.mockRejectedValueOnce(
          new Error('API rate limit exceeded')
        );
        
        await expect(realTimeDataService.getStockData('AAPL'))
          .rejects.toThrow('Failed to fetch stock data for AAPL');
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error fetching stock data for AAPL:',
          expect.any(Error)
        );
      });

      it('should emit stock data update event', async () => {
        await realTimeDataService.getStockData('AAPL');
        
        expect(mockEmitter.emit).toHaveBeenCalledWith(
          'stockUpdate',
          {
            symbol: 'AAPL',
            data: mockStockData,
            timestamp: expect.any(String)
          }
        );
      });
    });

    describe('getMultipleStocks', () => {
      it('should get multiple stocks successfully', async () => {
        const symbols = ['AAPL', 'GOOGL', 'MSFT'];
        const mockResults = {
          AAPL: mockStockData,
          GOOGL: { ...mockStockData, symbol: 'GOOGL', name: 'Alphabet Inc.' },
          MSFT: { ...mockStockData, symbol: 'MSFT', name: 'Microsoft Corp.' }
        };
        
        mockStockScraper.getStockData
          .mockResolvedValueOnce(mockResults.AAPL)
          .mockResolvedValueOnce(mockResults.GOOGL)
          .mockResolvedValueOnce(mockResults.MSFT);
        
        const result = await realTimeDataService.getMultipleStocks(symbols);
        
        expect(result).toEqual(mockResults);
        expect(mockStockScraper.getStockData).toHaveBeenCalledTimes(3);
      });

      it('should handle partial failures gracefully', async () => {
        const symbols = ['AAPL', 'INVALID', 'GOOGL'];
        
        mockStockScraper.getStockData
          .mockResolvedValueOnce(mockStockData)
          .mockRejectedValueOnce(new Error('Invalid symbol'))
          .mockResolvedValueOnce({ ...mockStockData, symbol: 'GOOGL' });
        
        const result = await realTimeDataService.getMultipleStocks(symbols);
        
        expect(result).toEqual({
          AAPL: mockStockData,
          GOOGL: { ...mockStockData, symbol: 'GOOGL' }
        });
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error fetching stock data for INVALID:',
          expect.any(Error)
        );
      });

      it('should limit concurrent requests', async () => {
        const symbols = new Array(20).fill(0).map((_, i) => `STOCK${i}`);
        
        mockStockScraper.getStockData.mockResolvedValue(mockStockData);
        
        await realTimeDataService.getMultipleStocks(symbols);
        
        // Should batch requests to avoid overwhelming the API
        expect(mockStockScraper.getStockData).toHaveBeenCalledTimes(20);
      });

      it('should use cached data when available', async () => {
        const symbols = ['AAPL', 'GOOGL'];
        
        mockCacheService.get
          .mockResolvedValueOnce(mockStockData) // AAPL cached
          .mockResolvedValueOnce(null); // GOOGL not cached
        
        mockStockScraper.getStockData.mockResolvedValueOnce(
          { ...mockStockData, symbol: 'GOOGL' }
        );
        
        const result = await realTimeDataService.getMultipleStocks(symbols);
        
        expect(mockStockScraper.getStockData).toHaveBeenCalledTimes(1);
        expect(mockStockScraper.getStockData).toHaveBeenCalledWith('GOOGL');
        expect(result.AAPL).toEqual(mockStockData);
      });
    });
  });

  describe('Market Overview', () => {
    describe('getMarketOverview', () => {
      it('should get market overview successfully', async () => {
        const result = await realTimeDataService.getMarketOverview();
        
        expect(mockStockScraper.getMarketOverview).toHaveBeenCalled();
        expect(result).toEqual(mockMarketOverview);
      });

      it('should cache market overview data', async () => {
        await realTimeDataService.getMarketOverview();
        
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'market:overview',
          mockMarketOverview,
          180 // 3 minutes TTL
        );
      });

      it('should return cached market overview when available', async () => {
        mockCacheService.get.mockResolvedValueOnce(mockMarketOverview);
        
        const result = await realTimeDataService.getMarketOverview();
        
        expect(mockStockScraper.getMarketOverview).not.toHaveBeenCalled();
        expect(result).toEqual(mockMarketOverview);
      });

      it('should handle market overview fetch errors', async () => {
        mockStockScraper.getMarketOverview.mockRejectedValueOnce(
          new Error('Market data unavailable')
        );
        
        await expect(realTimeDataService.getMarketOverview())
          .rejects.toThrow('Failed to fetch market overview');
      });

      it('should emit market overview update event', async () => {
        await realTimeDataService.getMarketOverview();
        
        expect(mockEmitter.emit).toHaveBeenCalledWith(
          'marketUpdate',
          {
            data: mockMarketOverview,
            timestamp: expect.any(String)
          }
        );
      });
    });
  });

  describe('News Management', () => {
    describe('getStockNews', () => {
      it('should get stock news successfully', async () => {
        const result = await realTimeDataService.getStockNews('AAPL');
        
        expect(mockStockScraper.getStockNews).toHaveBeenCalledWith('AAPL', 10);
        expect(result).toEqual(mockNews);
      });

      it('should cache news data', async () => {
        await realTimeDataService.getStockNews('AAPL');
        
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'news:AAPL',
          mockNews,
          600 // 10 minutes TTL
        );
      });

      it('should return cached news when available', async () => {
        mockCacheService.get.mockResolvedValueOnce(mockNews);
        
        const result = await realTimeDataService.getStockNews('AAPL');
        
        expect(mockStockScraper.getStockNews).not.toHaveBeenCalled();
        expect(result).toEqual(mockNews);
      });

      it('should handle custom limit parameter', async () => {
        await realTimeDataService.getStockNews('AAPL', 20);
        
        expect(mockStockScraper.getStockNews).toHaveBeenCalledWith('AAPL', 20);
      });

      it('should handle news fetch errors', async () => {
        mockStockScraper.getStockNews.mockRejectedValueOnce(
          new Error('News service unavailable')
        );
        
        await expect(realTimeDataService.getStockNews('AAPL'))
          .rejects.toThrow('Failed to fetch news for AAPL');
      });

      it('should emit news update event', async () => {
        await realTimeDataService.getStockNews('AAPL');
        
        expect(mockEmitter.emit).toHaveBeenCalledWith(
          'newsUpdate',
          {
            symbol: 'AAPL',
            data: mockNews,
            timestamp: expect.any(String)
          }
        );
      });
    });

    describe('getGeneralNews', () => {
      it('should get general market news successfully', async () => {
        const result = await realTimeDataService.getGeneralNews();
        
        expect(mockStockScraper.getStockNews).toHaveBeenCalledWith(undefined, 20);
        expect(result).toEqual(mockNews);
      });

      it('should cache general news data', async () => {
        await realTimeDataService.getGeneralNews();
        
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'news:general',
          mockNews,
          600 // 10 minutes TTL
        );
      });
    });
  });

  describe('Subscription Management', () => {
    describe('subscribe', () => {
      it('should add subscriber successfully', () => {
        const callback = vi.fn();
        
        realTimeDataService.subscribe('stockUpdate', callback);
        
        expect(mockEmitter.on).toHaveBeenCalledWith('stockUpdate', callback);
      });

      it('should handle multiple subscribers for same event', () => {
        const callback1 = vi.fn();
        const callback2 = vi.fn();
        
        realTimeDataService.subscribe('stockUpdate', callback1);
        realTimeDataService.subscribe('stockUpdate', callback2);
        
        expect(mockEmitter.on).toHaveBeenCalledTimes(2);
      });

      it('should validate event types', () => {
        const callback = vi.fn();
        
        expect(() => {
          realTimeDataService.subscribe('invalidEvent' as any, callback);
        }).toThrow('Invalid event type: invalidEvent');
      });
    });

    describe('unsubscribe', () => {
      it('should remove subscriber successfully', () => {
        const callback = vi.fn();
        
        realTimeDataService.unsubscribe('stockUpdate', callback);
        
        expect(mockEmitter.off).toHaveBeenCalledWith('stockUpdate', callback);
      });

      it('should handle unsubscribing non-existent callback', () => {
        const callback = vi.fn();
        
        expect(() => {
          realTimeDataService.unsubscribe('stockUpdate', callback);
        }).not.toThrow();
      });
    });

    describe('unsubscribeAll', () => {
      it('should remove all subscribers for event', () => {
        realTimeDataService.unsubscribeAll('stockUpdate');
        
        expect(mockEmitter.removeAllListeners).toHaveBeenCalledWith('stockUpdate');
      });

      it('should remove all subscribers when no event specified', () => {
        realTimeDataService.unsubscribeAll();
        
        expect(mockEmitter.removeAllListeners).toHaveBeenCalledWith();
      });
    });
  });

  describe('Real-time Updates', () => {
    describe('startRealTimeUpdates', () => {
      it('should start real-time updates for symbols', async () => {
        const symbols = ['AAPL', 'GOOGL'];
        
        await realTimeDataService.startRealTimeUpdates(symbols);
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Started real-time updates for symbols:',
          symbols
        );
      });

      it('should update data at specified intervals', async () => {
        vi.useFakeTimers();
        
        const symbols = ['AAPL'];
        await realTimeDataService.startRealTimeUpdates(symbols, 5000);
        
        // Fast-forward time
        vi.advanceTimersByTime(5000);
        
        expect(mockStockScraper.getStockData).toHaveBeenCalledWith('AAPL');
        
        vi.useRealTimers();
      });

      it('should handle update errors gracefully', async () => {
        vi.useFakeTimers();
        
        mockStockScraper.getStockData.mockRejectedValue(
          new Error('Update failed')
        );
        
        const symbols = ['AAPL'];
        await realTimeDataService.startRealTimeUpdates(symbols, 1000);
        
        vi.advanceTimersByTime(1000);
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error in real-time update for AAPL:',
          expect.any(Error)
        );
        
        vi.useRealTimers();
      });

      it('should not start duplicate updates for same symbol', async () => {
        const symbols = ['AAPL'];
        
        await realTimeDataService.startRealTimeUpdates(symbols);
        await realTimeDataService.startRealTimeUpdates(symbols);
        
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Real-time updates already active for symbol: AAPL'
        );
      });
    });

    describe('stopRealTimeUpdates', () => {
      it('should stop real-time updates for specific symbols', async () => {
        const symbols = ['AAPL', 'GOOGL'];
        
        await realTimeDataService.startRealTimeUpdates(symbols);
        await realTimeDataService.stopRealTimeUpdates(['AAPL']);
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Stopped real-time updates for symbols:',
          ['AAPL']
        );
      });

      it('should stop all real-time updates when no symbols specified', async () => {
        const symbols = ['AAPL', 'GOOGL'];
        
        await realTimeDataService.startRealTimeUpdates(symbols);
        await realTimeDataService.stopRealTimeUpdates();
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Stopped all real-time updates'
        );
      });

      it('should handle stopping non-existent updates', async () => {
        await realTimeDataService.stopRealTimeUpdates(['NONEXISTENT']);
        
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'No active real-time updates found for symbol: NONEXISTENT'
        );
      });
    });
  });

  describe('Cache Management', () => {
    describe('clearCache', () => {
      it('should clear cache for specific symbol', async () => {
        await realTimeDataService.clearCache('AAPL');
        
        expect(mockCacheService.del).toHaveBeenCalledWith([
          'stock:AAPL',
          'news:AAPL'
        ]);
      });

      it('should clear all cache when no symbol specified', async () => {
        mockCacheService.keys.mockResolvedValueOnce([
          'stock:AAPL',
          'stock:GOOGL',
          'news:AAPL',
          'market:overview'
        ]);
        
        await realTimeDataService.clearCache();
        
        expect(mockCacheService.keys).toHaveBeenCalledWith('*');
        expect(mockCacheService.del).toHaveBeenCalledWith([
          'stock:AAPL',
          'stock:GOOGL',
          'news:AAPL',
          'market:overview'
        ]);
      });

      it('should handle cache clear errors', async () => {
        mockCacheService.del.mockRejectedValueOnce(
          new Error('Cache clear failed')
        );
        
        await expect(realTimeDataService.clearCache('AAPL'))
          .rejects.toThrow('Failed to clear cache');
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        mockCacheService.keys.mockResolvedValueOnce([
          'stock:AAPL',
          'stock:GOOGL',
          'news:AAPL',
          'market:overview'
        ]);
        
        const stats = await realTimeDataService.getCacheStats();
        
        expect(stats).toEqual({
          totalKeys: 4,
          stockKeys: 2,
          newsKeys: 1,
          marketKeys: 1,
          otherKeys: 0
        });
      });
    });
  });

  describe('Health Check', () => {
    describe('getHealth', () => {
      it('should return healthy status when all services are working', async () => {
        mockCacheService.health = vi.fn().mockResolvedValue({
          status: 'healthy',
          connected: true
        });
        
        const health = await realTimeDataService.getHealth();
        
        expect(health).toEqual({
          status: 'healthy',
          cache: {
            status: 'healthy',
            connected: true
          },
          scraper: 'healthy',
          activeSubscriptions: 0,
          activeUpdates: 0
        });
      });

      it('should return unhealthy status when cache is down', async () => {
        mockCacheService.health = vi.fn().mockResolvedValue({
          status: 'unhealthy',
          connected: false,
          error: 'Connection failed'
        });
        
        const health = await realTimeDataService.getHealth();
        
        expect(health.status).toBe('degraded');
        expect(health.cache.status).toBe('unhealthy');
      });

      it('should return unhealthy status when scraper is down', async () => {
        mockStockScraper.getStockData.mockRejectedValueOnce(
          new Error('Scraper unavailable')
        );
        
        const health = await realTimeDataService.getHealth();
        
        expect(health.scraper).toBe('unhealthy');
      });
    });
  });

  describe('Performance Optimization', () => {
    describe('Rate Limiting', () => {
      it('should implement rate limiting for API calls', async () => {
        vi.useFakeTimers();
        
        // Make multiple rapid requests
        const promises = [];
        for (let i = 0; i < 10; i++) {
          promises.push(realTimeDataService.getStockData('AAPL'));
        }
        
        await Promise.all(promises);
        
        // Should not exceed rate limit
        expect(mockStockScraper.getStockData).toHaveBeenCalledTimes(1);
        
        vi.useRealTimers();
      });
    });

    describe('Request Deduplication', () => {
      it('should deduplicate concurrent requests for same symbol', async () => {
        const promises = [
          realTimeDataService.getStockData('AAPL'),
          realTimeDataService.getStockData('AAPL'),
          realTimeDataService.getStockData('AAPL')
        ];
        
        const results = await Promise.all(promises);
        
        expect(mockStockScraper.getStockData).toHaveBeenCalledTimes(1);
        expect(results).toHaveLength(3);
        expect(results[0]).toEqual(results[1]);
        expect(results[1]).toEqual(results[2]);
      });
    });

    describe('Memory Management', () => {
      it('should clean up old cache entries', async () => {
        vi.useFakeTimers();
        
        // Simulate cache cleanup interval
        vi.advanceTimersByTime(3600000); // 1 hour
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Running cache cleanup'
        );
        
        vi.useRealTimers();
      });

      it('should limit memory usage for large datasets', async () => {
        const largeSymbolList = new Array(1000).fill(0).map((_, i) => `STOCK${i}`);
        
        await realTimeDataService.getMultipleStocks(largeSymbolList);
        
        // Should process in batches to avoid memory issues
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Processing large symbol list in batches'
        );
      });
    });
  });

  describe('Error Recovery', () => {
    it('should implement exponential backoff for failed requests', async () => {
      vi.useFakeTimers();
      
      mockStockScraper.getStockData
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(mockStockData);
      
      const promise = realTimeDataService.getStockData('AAPL');
      
      // Should retry with exponential backoff
      vi.advanceTimersByTime(1000); // First retry
      vi.advanceTimersByTime(2000); // Second retry
      
      const result = await promise;
      
      expect(result).toEqual(mockStockData);
      expect(mockStockScraper.getStockData).toHaveBeenCalledTimes(3);
      
      vi.useRealTimers();
    });

    it('should fallback to cached data when API is unavailable', async () => {
      mockStockScraper.getStockData.mockRejectedValue(
        new Error('API unavailable')
      );
      
      mockCacheService.get.mockResolvedValueOnce({
        ...mockStockData,
        lastUpdated: new Date(Date.now() - 600000).toISOString() // 10 minutes old
      });
      
      const result = await realTimeDataService.getStockData('AAPL');
      
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Using stale cache data for AAPL due to API failure'
      );
    });
  });

  describe('Data Validation', () => {
    it('should validate stock data format', async () => {
      const invalidData = {
        symbol: 'AAPL',
        // Missing required fields
      };
      
      mockStockScraper.getStockData.mockResolvedValueOnce(invalidData as any);
      
      await expect(realTimeDataService.getStockData('AAPL'))
        .rejects.toThrow('Invalid stock data format');
    });

    it('should sanitize and normalize data', async () => {
      const dirtyData = {
        ...mockStockData,
        price: '150.25', // String instead of number
        change: null, // Null value
        volume: undefined // Undefined value
      };
      
      mockStockScraper.getStockData.mockResolvedValueOnce(dirtyData as any);
      
      const result = await realTimeDataService.getStockData('AAPL');
      
      expect(result.price).toBe(150.25);
      expect(result.change).toBe(0);
      expect(result.volume).toBe(0);
    });
  });
});