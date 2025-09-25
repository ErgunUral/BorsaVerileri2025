import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import stockScraper from '../stockScraper.js';
import cacheService from '../cacheService.js';

// Mock external dependencies
vi.mock('../cacheService.js');
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

// Mock cheerio
vi.mock('cheerio', () => ({
  load: vi.fn()
}));

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn()
    }))
  }
}));

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import axios from 'axios';

describe('StockScraper Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Reset cache mock
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue(true);
    cacheService.del.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('getStockData', () => {
    const mockStockData = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 175.25,
      change: 8.50,
      changePercent: 5.10,
      volume: 85000000,
      marketCap: 2750000000000,
      peRatio: 28.5,
      eps: 6.15,
      high52Week: 198.23,
      low52Week: 124.17,
      dividendYield: 0.52,
      beta: 1.25,
      lastUpdate: new Date().toISOString()
    };

    it('should fetch stock data successfully', async () => {
      // Mock successful API response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '175.25',
            '09. change': '8.50',
            '10. change percent': '5.10%'
          }
        })
      });

      const result = await stockScraper.getStockData('AAPL');

      expect(result).toEqual(expect.objectContaining({
        symbol: 'AAPL',
        price: 175.25,
        change: 8.50,
        changePercent: 5.10
      }));
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('AAPL')
      );
    });

    it('should return cached data when available', async () => {
      cacheService.get.mockResolvedValueOnce(JSON.stringify(mockStockData));

      const result = await stockScraper.getStockData('AAPL');

      expect(result).toEqual(mockStockData);
      expect(fetch).not.toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalledWith('stock:AAPL');
    });

    it('should cache fetched data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '175.25',
            '09. change': '8.50',
            '10. change percent': '5.10%'
          }
        })
      });

      await stockScraper.getStockData('AAPL');

      expect(cacheService.set).toHaveBeenCalledWith(
        'stock:AAPL',
        expect.any(String),
        300 // 5 minutes cache
      );
    });

    it('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('Network error');
    });

    it('should handle invalid symbol', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'Error Message': 'Invalid API call'
        })
      });

      await expect(stockScraper.getStockData('INVALID')).rejects.toThrow('Invalid symbol');
    });

    it('should validate symbol format', async () => {
      await expect(stockScraper.getStockData('')).rejects.toThrow('Symbol is required');
      await expect(stockScraper.getStockData('123')).rejects.toThrow('Invalid symbol format');
      await expect(stockScraper.getStockData('TOOLONGSYMBOL')).rejects.toThrow('Symbol too long');
    });

    it('should handle rate limiting', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ message: 'Rate limit exceeded' })
      });

      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('Rate limit exceeded');
    });

    it('should retry failed requests', async () => {
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            'Global Quote': {
              '01. symbol': 'AAPL',
              '05. price': '175.25'
            }
          })
        });

      const result = await stockScraper.getStockData('AAPL', { retries: 1 });

      expect(result.symbol).toBe('AAPL');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getHistoricalData', () => {
    const mockHistoricalData = [
      {
        date: '2024-01-15',
        open: 170.00,
        high: 175.50,
        low: 169.25,
        close: 175.25,
        volume: 85000000
      },
      {
        date: '2024-01-14',
        open: 168.50,
        high: 171.00,
        low: 167.75,
        close: 170.25,
        volume: 92000000
      }
    ];

    it('should fetch historical data successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'Time Series (Daily)': {
            '2024-01-15': {
              '1. open': '170.00',
              '2. high': '175.50',
              '3. low': '169.25',
              '4. close': '175.25',
              '5. volume': '85000000'
            },
            '2024-01-14': {
              '1. open': '168.50',
              '2. high': '171.00',
              '3. low': '167.75',
              '4. close': '170.25',
              '5. volume': '92000000'
            }
          }
        })
      });

      const result = await stockScraper.getHistoricalData('AAPL', '1d');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        date: '2024-01-15',
        close: 175.25,
        volume: 85000000
      }));
    });

    it('should handle different time periods', async () => {
      const periods = ['1d', '5d', '1m', '3m', '6m', '1y', '2y', '5y', 'max'];
      
      for (const period of periods) {
        fetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 'Time Series (Daily)': {} })
        });

        await stockScraper.getHistoricalData('AAPL', period);
        
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining(period === '1d' ? 'DAILY' : 'DAILY')
        );
      }
    });

    it('should cache historical data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 'Time Series (Daily)': {} })
      });

      await stockScraper.getHistoricalData('AAPL', '1d');

      expect(cacheService.set).toHaveBeenCalledWith(
        'historical:AAPL:1d',
        expect.any(String),
        1800 // 30 minutes cache
      );
    });

    it('should return cached historical data', async () => {
      cacheService.get.mockResolvedValueOnce(JSON.stringify(mockHistoricalData));

      const result = await stockScraper.getHistoricalData('AAPL', '1d');

      expect(result).toEqual(mockHistoricalData);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should validate time period', async () => {
      await expect(stockScraper.getHistoricalData('AAPL', 'invalid'))
        .rejects.toThrow('Invalid time period');
    });
  });

  describe('searchStocks', () => {
    const mockSearchResults = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'Equity',
        region: 'United States',
        marketOpen: '09:30',
        marketClose: '16:00',
        timezone: 'UTC-04',
        currency: 'USD',
        matchScore: 1.0
      },
      {
        symbol: 'AAPLF',
        name: 'Apple Inc. (Frankfurt)',
        type: 'Equity',
        region: 'Germany',
        marketOpen: '08:00',
        marketClose: '20:00',
        timezone: 'UTC+01',
        currency: 'EUR',
        matchScore: 0.8
      }
    ];

    it('should search stocks successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
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
            }
          ]
        })
      });

      const result = await stockScraper.searchStocks('Apple');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'Equity'
      }));
    });

    it('should cache search results', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bestMatches: [] })
      });

      await stockScraper.searchStocks('Apple');

      expect(cacheService.set).toHaveBeenCalledWith(
        'search:apple',
        expect.any(String),
        3600 // 1 hour cache
      );
    });

    it('should return cached search results', async () => {
      cacheService.get.mockResolvedValueOnce(JSON.stringify(mockSearchResults));

      const result = await stockScraper.searchStocks('Apple');

      expect(result).toEqual(mockSearchResults);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should validate search query', async () => {
      await expect(stockScraper.searchStocks('')).rejects.toThrow('Search query is required');
      await expect(stockScraper.searchStocks('a')).rejects.toThrow('Search query too short');
      await expect(stockScraper.searchStocks('a'.repeat(101))).rejects.toThrow('Search query too long');
    });

    it('should handle no results', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ bestMatches: [] })
      });

      const result = await stockScraper.searchStocks('NONEXISTENT');

      expect(result).toEqual([]);
    });

    it('should sort results by match score', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          bestMatches: [
            {
              '1. symbol': 'AAPLF',
              '2. name': 'Apple Inc. (Frankfurt)',
              '9. matchScore': '0.8000'
            },
            {
              '1. symbol': 'AAPL',
              '2. name': 'Apple Inc.',
              '9. matchScore': '1.0000'
            }
          ]
        })
      });

      const result = await stockScraper.searchStocks('Apple');

      expect(result[0].symbol).toBe('AAPL'); // Higher match score first
      expect(result[1].symbol).toBe('AAPLF');
    });
  });

  describe('getStockNews', () => {
    const mockNews = [
      {
        title: 'Apple reports strong quarterly earnings',
        summary: 'Apple Inc. reported better than expected earnings...',
        source: 'Financial Times',
        publishedAt: '2024-01-15T10:30:00Z',
        url: 'https://example.com/news/1',
        sentiment: 'positive',
        relevanceScore: 0.95
      },
      {
        title: 'iPhone sales decline in China',
        summary: 'Apple faces challenges in the Chinese market...',
        source: 'Reuters',
        publishedAt: '2024-01-15T08:15:00Z',
        url: 'https://example.com/news/2',
        sentiment: 'negative',
        relevanceScore: 0.87
      }
    ];

    it('should fetch stock news successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          feed: [
            {
              title: 'Apple reports strong quarterly earnings',
              summary: 'Apple Inc. reported better than expected earnings...',
              source: 'Financial Times',
              time_published: '20240115T103000',
              url: 'https://example.com/news/1',
              overall_sentiment_score: 0.25,
              relevance_score: '0.95'
            }
          ]
        })
      });

      const result = await stockScraper.getStockNews('AAPL');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        title: 'Apple reports strong quarterly earnings',
        source: 'Financial Times',
        sentiment: 'positive'
      }));
    });

    it('should cache news data', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ feed: [] })
      });

      await stockScraper.getStockNews('AAPL');

      expect(cacheService.set).toHaveBeenCalledWith(
        'news:AAPL',
        expect.any(String),
        900 // 15 minutes cache
      );
    });

    it('should return cached news', async () => {
      cacheService.get.mockResolvedValueOnce(JSON.stringify(mockNews));

      const result = await stockScraper.getStockNews('AAPL');

      expect(result).toEqual(mockNews);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should classify sentiment correctly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          feed: [
            {
              title: 'Positive news',
              overall_sentiment_score: 0.3,
              relevance_score: '0.9'
            },
            {
              title: 'Negative news',
              overall_sentiment_score: -0.3,
              relevance_score: '0.8'
            },
            {
              title: 'Neutral news',
              overall_sentiment_score: 0.05,
              relevance_score: '0.7'
            }
          ]
        })
      });

      const result = await stockScraper.getStockNews('AAPL');

      expect(result[0].sentiment).toBe('positive');
      expect(result[1].sentiment).toBe('negative');
      expect(result[2].sentiment).toBe('neutral');
    });

    it('should limit number of news items', async () => {
      const manyNews = Array.from({ length: 50 }, (_, i) => ({
        title: `News ${i}`,
        relevance_score: '0.5'
      }));

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ feed: manyNews })
      });

      const result = await stockScraper.getStockNews('AAPL', { limit: 10 });

      expect(result).toHaveLength(10);
    });

    it('should sort news by relevance and recency', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          feed: [
            {
              title: 'Old relevant news',
              time_published: '20240114T100000',
              relevance_score: '0.9'
            },
            {
              title: 'Recent less relevant news',
              time_published: '20240115T100000',
              relevance_score: '0.7'
            },
            {
              title: 'Recent very relevant news',
              time_published: '20240115T110000',
              relevance_score: '0.95'
            }
          ]
        })
      });

      const result = await stockScraper.getStockNews('AAPL');

      expect(result[0].title).toBe('Recent very relevant news');
    });
  });

  describe('getMarketOverview', () => {
    const mockMarketData = {
      indices: {
        sp500: { value: 4500.25, change: 15.75, changePercent: 0.35 },
        nasdaq: { value: 14250.80, change: -25.40, changePercent: -0.18 },
        dow: { value: 35000.15, change: 125.60, changePercent: 0.36 }
      },
      sectors: {
        technology: { change: 1.25 },
        healthcare: { change: -0.45 },
        finance: { change: 0.85 }
      },
      volume: {
        total: 12500000000,
        leaders: [
          { symbol: 'SPY', volume: 85000000 },
          { symbol: 'QQQ', volume: 65000000 }
        ]
      }
    };

    it('should fetch market overview successfully', async () => {
      // Mock multiple API calls for different indices
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            'Global Quote': {
              '01. symbol': 'SPY',
              '05. price': '450.25',
              '09. change': '1.75',
              '10. change percent': '0.39%'
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            'Global Quote': {
              '01. symbol': 'QQQ',
              '05. price': '380.50',
              '09. change': '-2.25',
              '10. change percent': '-0.59%'
            }
          })
        });

      const result = await stockScraper.getMarketOverview();

      expect(result).toHaveProperty('indices');
      expect(result.indices).toHaveProperty('sp500');
      expect(result.indices).toHaveProperty('nasdaq');
    });

    it('should cache market overview', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'Global Quote': {} })
      });

      await stockScraper.getMarketOverview();

      expect(cacheService.set).toHaveBeenCalledWith(
        'market:overview',
        expect.any(String),
        300 // 5 minutes cache
      );
    });

    it('should return cached market overview', async () => {
      cacheService.get.mockResolvedValueOnce(JSON.stringify(mockMarketData));

      const result = await stockScraper.getMarketOverview();

      expect(result).toEqual(mockMarketData);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle partial data failures', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 'Global Quote': {} })
        })
        .mockRejectedValueOnce(new Error('API error'));

      const result = await stockScraper.getMarketOverview();

      // Should still return partial data
      expect(result).toHaveProperty('indices');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      fetch.mockRejectedValueOnce(timeoutError);

      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('Request timeout');
    });

    it('should handle malformed JSON responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('Invalid JSON');
    });

    it('should handle API quota exceeded', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          'Note': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute'
        })
      });

      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('API quota exceeded');
    });

    it('should implement exponential backoff for retries', async () => {
      const startTime = Date.now();
      
      fetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 'Global Quote': { '01. symbol': 'AAPL' } })
        });

      await stockScraper.getStockData('AAPL', { retries: 2, backoff: true });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have waited for backoff (simplified check)
      expect(duration).toBeGreaterThan(100);
    });

    it('should validate API responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': 'invalid_price' // Invalid price format
          }
        })
      });

      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('Invalid price data');
    });

    it('should handle cache failures gracefully', async () => {
      cacheService.get.mockRejectedValueOnce(new Error('Cache error'));
      cacheService.set.mockRejectedValueOnce(new Error('Cache error'));
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '175.25'
          }
        })
      });

      // Should still work without cache
      const result = await stockScraper.getStockData('AAPL');
      expect(result.symbol).toBe('AAPL');
    });
  });

  describe('Performance and Optimization', () => {
    it('should batch multiple requests efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'Global Quote': { '01. symbol': 'TEST' } })
      });

      const promises = symbols.map(symbol => stockScraper.getStockData(symbol));
      await Promise.all(promises);

      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should implement request deduplication', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'Global Quote': { '01. symbol': 'AAPL' } })
      });

      // Make multiple simultaneous requests for the same symbol
      const promises = [
        stockScraper.getStockData('AAPL'),
        stockScraper.getStockData('AAPL'),
        stockScraper.getStockData('AAPL')
      ];
      
      await Promise.all(promises);

      // Should only make one actual API call
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should respect rate limits', async () => {
      const startTime = Date.now();
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 'Global Quote': { '01. symbol': 'TEST' } })
      });

      // Make multiple requests quickly
      for (let i = 0; i < 6; i++) {
        await stockScraper.getStockData(`TEST${i}`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have been rate limited (5 calls per minute = 12 seconds minimum)
      expect(duration).toBeGreaterThan(1000);
    });
  });
});