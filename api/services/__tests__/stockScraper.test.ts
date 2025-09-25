import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { StockScraper } from '../stockScraper';
import { CacheService } from '../cacheService';
import { logger } from '../../utils/logger';

// Mock dependencies
vi.mock('axios');
vi.mock('../cacheService');
vi.mock('../../utils/logger');

const mockedAxios = vi.mocked(axios);
const MockedCacheService = vi.mocked(CacheService);
const mockedLogger = vi.mocked(logger);

// Mock data
const mockStockData = {
  symbol: 'AAPL',
  price: 150.25,
  change: 2.15,
  changePercent: 1.45,
  volume: 1000000,
  marketCap: 2500000000000,
  pe: 28.5,
  eps: 5.27,
  high52Week: 180.95,
  low52Week: 124.17,
  dividendYield: 0.66,
  beta: 1.2,
  timestamp: Date.now()
};

const mockQuoteResponse = {
  data: {
    'Global Quote': {
      '01. symbol': 'AAPL',
      '05. price': '150.25',
      '09. change': '2.15',
      '10. change percent': '1.45%',
      '06. volume': '1000000',
      '03. high': '152.30',
      '04. low': '148.90',
      '02. open': '149.50',
      '08. previous close': '148.10',
      '07. latest trading day': '2024-01-15'
    }
  }
};

const mockTimeSeriesResponse = {
  data: {
    'Time Series (Daily)': {
      '2024-01-15': {
        '1. open': '149.50',
        '2. high': '152.30',
        '3. low': '148.90',
        '4. close': '150.25',
        '5. volume': '1000000'
      },
      '2024-01-14': {
        '1. open': '147.80',
        '2. high': '149.20',
        '3. low': '147.10',
        '4. close': '148.10',
        '5. volume': '950000'
      }
    }
  }
};

const mockSearchResponse = {
  data: {
    bestMatches: [
      {
        '1. symbol': 'AAPL',
        '2. name': 'Apple Inc.',
        '3. type': 'Equity',
        '4. region': 'United States',
        '5. marketOpen': '09:30',
        '6. marketClose': '16:00',
        '7. timezone': 'UTC-04',
        '8. currency': 'USD',
        '9. matchScore': '1.0000'
      },
      {
        '1. symbol': 'APLE',
        '2. name': 'Apple Hospitality REIT Inc.',
        '3. type': 'Equity',
        '4. region': 'United States',
        '5. marketOpen': '09:30',
        '6. marketClose': '16:00',
        '7. timezone': 'UTC-04',
        '8. currency': 'USD',
        '9. matchScore': '0.8000'
      }
    ]
  }
};

describe('StockScraper Service', () => {
  let stockScraper: StockScraper;
  let mockCacheService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      clear: vi.fn(),
      has: vi.fn()
    };
    
    MockedCacheService.mockImplementation(() => mockCacheService);
    stockScraper = new StockScraper();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(stockScraper).toBeDefined();
      expect(MockedCacheService).toHaveBeenCalledWith({
        ttl: 60000, // 1 minute
        maxSize: 1000
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        apiKey: 'custom-key',
        baseUrl: 'https://custom-api.com',
        cacheTtl: 120000,
        maxCacheSize: 2000,
        rateLimitDelay: 500
      };

      const customScraper = new StockScraper(customConfig);
      expect(customScraper).toBeDefined();
    });
  });

  describe('Stock Quote Fetching', () => {
    it('should fetch stock quote successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockQuoteResponse);
      mockCacheService.get.mockReturnValue(null);

      const result = await stockScraper.getStockQuote('AAPL');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.25,
        change: 2.15,
        changePercent: 1.45,
        volume: 1000000,
        high: 152.30,
        low: 148.90,
        open: 149.50,
        previousClose: 148.10,
        lastUpdated: '2024-01-15'
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('function=GLOBAL_QUOTE'),
        expect.objectContaining({
          params: expect.objectContaining({
            symbol: 'AAPL'
          })
        })
      );

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'quote:AAPL',
        expect.any(Object)
      );
    });

    it('should return cached data when available', async () => {
      const cachedData = { symbol: 'AAPL', price: 149.50 };
      mockCacheService.get.mockReturnValue(cachedData);

      const result = await stockScraper.getStockQuote('AAPL');

      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));
      mockCacheService.get.mockReturnValue(null);

      await expect(stockScraper.getStockQuote('AAPL')).rejects.toThrow('Failed to fetch stock quote for AAPL');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should handle invalid symbol', async () => {
      const invalidResponse = {
        data: {
          'Error Message': 'Invalid API call. Please retry or visit the documentation'
        }
      };
      
      mockedAxios.get.mockResolvedValueOnce(invalidResponse);
      mockCacheService.get.mockReturnValue(null);

      await expect(stockScraper.getStockQuote('INVALID')).rejects.toThrow('Invalid symbol or API error');
    });

    it('should handle rate limiting', async () => {
      mockedAxios.get.mockRejectedValueOnce({ response: { status: 429 } });
      mockCacheService.get.mockReturnValue(null);

      await expect(stockScraper.getStockQuote('AAPL')).rejects.toThrow('Rate limit exceeded');
    });

    it('should validate symbol format', async () => {
      await expect(stockScraper.getStockQuote('')).rejects.toThrow('Invalid symbol');
      await expect(stockScraper.getStockQuote('123')).rejects.toThrow('Invalid symbol');
      await expect(stockScraper.getStockQuote('TOOLONGSYMBOL')).rejects.toThrow('Invalid symbol');
    });
  });

  describe('Historical Data Fetching', () => {
    it('should fetch historical data successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTimeSeriesResponse);
      mockCacheService.get.mockReturnValue(null);

      const result = await stockScraper.getHistoricalData('AAPL', '1d');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: '2024-01-15',
        open: 149.50,
        high: 152.30,
        low: 148.90,
        close: 150.25,
        volume: 1000000
      });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'historical:AAPL:1d',
        expect.any(Array)
      );
    });

    it('should handle different time periods', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTimeSeriesResponse);
      mockCacheService.get.mockReturnValue(null);

      await stockScraper.getHistoricalData('AAPL', '1w');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('function=TIME_SERIES_WEEKLY')
      );

      await stockScraper.getHistoricalData('AAPL', '1m');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('function=TIME_SERIES_MONTHLY')
      );
    });

    it('should return cached historical data', async () => {
      const cachedData = [{ date: '2024-01-15', close: 150.25 }];
      mockCacheService.get.mockReturnValue(cachedData);

      const result = await stockScraper.getHistoricalData('AAPL', '1d');

      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle invalid time period', async () => {
      await expect(stockScraper.getHistoricalData('AAPL', 'invalid' as any))
        .rejects.toThrow('Invalid time period');
    });
  });

  describe('Stock Search', () => {
    it('should search stocks successfully', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockSearchResponse);
      mockCacheService.get.mockReturnValue(null);

      const result = await stockScraper.searchStocks('AAPL');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'Equity',
        region: 'United States',
        currency: 'USD',
        matchScore: 1.0
      });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'search:aapl',
        expect.any(Array)
      );
    });

    it('should return cached search results', async () => {
      const cachedResults = [{ symbol: 'AAPL', name: 'Apple Inc.' }];
      mockCacheService.get.mockReturnValue(cachedResults);

      const result = await stockScraper.searchStocks('AAPL');

      expect(result).toEqual(cachedResults);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      const emptyResponse = { data: { bestMatches: [] } };
      mockedAxios.get.mockResolvedValueOnce(emptyResponse);
      mockCacheService.get.mockReturnValue(null);

      const result = await stockScraper.searchStocks('NONEXISTENT');

      expect(result).toEqual([]);
    });

    it('should validate search query', async () => {
      await expect(stockScraper.searchStocks('')).rejects.toThrow('Search query cannot be empty');
      await expect(stockScraper.searchStocks('a')).rejects.toThrow('Search query too short');
    });
  });

  describe('Batch Operations', () => {
    it('should fetch multiple stock quotes', async () => {
      mockedAxios.get.mockResolvedValue(mockQuoteResponse);
      mockCacheService.get.mockReturnValue(null);

      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const result = await stockScraper.getMultipleQuotes(symbols);

      expect(result).toHaveLength(3);
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch operations', async () => {
      mockedAxios.get
        .mockResolvedValueOnce(mockQuoteResponse)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockQuoteResponse);
      
      mockCacheService.get.mockReturnValue(null);

      const symbols = ['AAPL', 'INVALID', 'MSFT'];
      const result = await stockScraper.getMultipleQuotes(symbols);

      expect(result).toHaveLength(2); // Only successful requests
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should respect rate limits in batch operations', async () => {
      const rateLimitedScraper = new StockScraper({ rateLimitDelay: 100 });
      mockedAxios.get.mockResolvedValue(mockQuoteResponse);
      mockCacheService.get.mockReturnValue(null);

      const startTime = Date.now();
      await rateLimitedScraper.getMultipleQuotes(['AAPL', 'GOOGL']);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100); // Should have delay
    });
  });

  describe('Market Data', () => {
    it('should fetch market overview', async () => {
      const marketResponse = {
        data: {
          'Global Quote': {
            '01. symbol': 'SPY',
            '05. price': '420.15',
            '09. change': '5.25',
            '10. change percent': '1.26%'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(marketResponse);
      mockCacheService.get.mockReturnValue(null);

      const result = await stockScraper.getMarketOverview();

      expect(result).toBeDefined();
      expect(result.indices).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'market:overview',
        expect.any(Object)
      );
    });

    it('should fetch sector performance', async () => {
      const sectorResponse = {
        data: {
          'Rank A: Real-Time Performance': [
            {
              'Technology': '1.25%'
            },
            {
              'Healthcare': '-0.45%'
            }
          ]
        }
      };

      mockedAxios.get.mockResolvedValueOnce(sectorResponse);
      mockCacheService.get.mockReturnValue(null);

      const result = await stockScraper.getSectorPerformance();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Data Validation and Transformation', () => {
    it('should validate and transform stock data', () => {
      const rawData = {
        '01. symbol': 'AAPL',
        '05. price': '150.25',
        '09. change': '2.15',
        '10. change percent': '1.45%'
      };

      const transformed = (stockScraper as any).transformQuoteData(rawData);

      expect(transformed.symbol).toBe('AAPL');
      expect(transformed.price).toBe(150.25);
      expect(transformed.change).toBe(2.15);
      expect(transformed.changePercent).toBe(1.45);
    });

    it('should handle missing or invalid data fields', () => {
      const invalidData = {
        '01. symbol': 'AAPL',
        '05. price': 'N/A',
        '09. change': '',
        '10. change percent': 'invalid%'
      };

      const transformed = (stockScraper as any).transformQuoteData(invalidData);

      expect(transformed.symbol).toBe('AAPL');
      expect(transformed.price).toBe(0);
      expect(transformed.change).toBe(0);
      expect(transformed.changePercent).toBe(0);
    });

    it('should sanitize symbol input', () => {
      const sanitized = (stockScraper as any).sanitizeSymbol('  aapl  ');
      expect(sanitized).toBe('AAPL');

      const sanitized2 = (stockScraper as any).sanitizeSymbol('goog.l');
      expect(sanitized2).toBe('GOOGL');
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed requests', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValueOnce(mockQuoteResponse);
      
      mockCacheService.get.mockReturnValue(null);

      const result = await stockScraper.getStockQuote('AAPL');

      expect(result).toBeDefined();
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Persistent Error'));
      mockCacheService.get.mockReturnValue(null);

      await expect(stockScraper.getStockQuote('AAPL')).rejects.toThrow();
      expect(mockedAxios.get).toHaveBeenCalledTimes(3); // Default max retries
    });

    it('should use fallback data when available', async () => {
      const fallbackData = { symbol: 'AAPL', price: 149.00, stale: true };
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      mockCacheService.get.mockReturnValue(null);
      
      // Mock fallback cache
      (stockScraper as any).fallbackCache = {
        get: vi.fn().mockReturnValue(fallbackData)
      };

      const result = await stockScraper.getStockQuoteWithFallback('AAPL');

      expect(result).toEqual(fallbackData);
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Using fallback data')
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track API call metrics', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockQuoteResponse);
      mockCacheService.get.mockReturnValue(null);

      await stockScraper.getStockQuote('AAPL');

      const metrics = stockScraper.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    it('should track cache performance', async () => {
      const cachedData = { symbol: 'AAPL', price: 150.25 };
      mockCacheService.get.mockReturnValue(cachedData);

      await stockScraper.getStockQuote('AAPL');

      const metrics = stockScraper.getMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheHitRate).toBe(1);
    });

    it('should track error rates', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));
      mockCacheService.get.mockReturnValue(null);

      try {
        await stockScraper.getStockQuote('AAPL');
      } catch (error) {
        // Expected error
      }

      const metrics = stockScraper.getMetrics();
      expect(metrics.failedRequests).toBe(1);
      expect(metrics.errorRate).toBeGreaterThan(0);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should cleanup resources on shutdown', async () => {
      await stockScraper.shutdown();

      expect(mockCacheService.clear).toHaveBeenCalled();
      expect(mockedLogger.info).toHaveBeenCalledWith('StockScraper shutdown completed');
    });

    it('should handle concurrent shutdown calls', async () => {
      const shutdownPromises = [
        stockScraper.shutdown(),
        stockScraper.shutdown(),
        stockScraper.shutdown()
      ];

      await Promise.all(shutdownPromises);

      expect(mockCacheService.clear).toHaveBeenCalledTimes(1);
    });

    it('should reject new requests after shutdown', async () => {
      await stockScraper.shutdown();

      await expect(stockScraper.getStockQuote('AAPL'))
        .rejects.toThrow('StockScraper has been shutdown');
    });
  });
});