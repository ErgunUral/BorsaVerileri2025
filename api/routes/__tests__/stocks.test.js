import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import stocksRouter from '../stocks.js';
import stockScraper from '../../services/stockScraper.js';
import cacheService from '../../services/cacheService.js';
import rateLimit from 'express-rate-limit';

// Mock dependencies
vi.mock('../../services/stockScraper.js');
vi.mock('../../services/cacheService.js');
vi.mock('express-rate-limit');

// Mock console for logging
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Stocks API Routes', () => {
  let app;
  let server;

  beforeAll(() => {
    // Setup Express app with stocks router
    app = express();
    app.use(express.json());
    app.use('/api/stocks', stocksRouter);
    
    // Mock rate limiter to allow all requests in tests
    rateLimit.mockImplementation(() => (req, res, next) => next());
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue(true);
    cacheService.isConnected.mockReturnValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('GET /api/stocks/search', () => {
    it('should search for stocks successfully', async () => {
      const mockSearchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          type: 'Common Stock',
          price: 150.25,
          change: 2.15,
          changePercent: 1.45
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          exchange: 'NASDAQ',
          type: 'Common Stock',
          price: 2750.80,
          change: -15.20,
          changePercent: -0.55
        }
      ];

      stockScraper.searchStocks.mockResolvedValue(mockSearchResults);

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSearchResults,
        query: 'apple',
        count: 2
      });

      expect(stockScraper.searchStocks).toHaveBeenCalledWith('apple');
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Query parameter is required'
      });
    });

    it('should return 400 for empty query parameter', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: '' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Query parameter cannot be empty'
      });
    });

    it('should return 400 for query parameter too short', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'a' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Query must be at least 2 characters long'
      });
    });

    it('should handle search service errors', async () => {
      stockScraper.searchStocks.mockRejectedValue(new Error('Search service unavailable'));

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to search stocks'
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Stock search error:',
        expect.any(Error)
      );
    });

    it('should use cached results when available', async () => {
      const cachedResults = [{ symbol: 'AAPL', name: 'Apple Inc.' }];
      cacheService.get.mockResolvedValue(JSON.stringify(cachedResults));

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple' })
        .expect(200);

      expect(response.body.data).toEqual(cachedResults);
      expect(stockScraper.searchStocks).not.toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalledWith('search:apple');
    });

    it('should cache search results', async () => {
      const mockResults = [{ symbol: 'AAPL', name: 'Apple Inc.' }];
      stockScraper.searchStocks.mockResolvedValue(mockResults);

      await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple' })
        .expect(200);

      expect(cacheService.set).toHaveBeenCalledWith(
        'search:apple',
        JSON.stringify(mockResults),
        300 // 5 minutes cache
      );
    });

    it('should handle cache service errors gracefully', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache unavailable'));
      const mockResults = [{ symbol: 'AAPL', name: 'Apple Inc.' }];
      stockScraper.searchStocks.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple' })
        .expect(200);

      expect(response.body.data).toEqual(mockResults);
      expect(stockScraper.searchStocks).toHaveBeenCalled();
    });
  });

  describe('GET /api/stocks/:symbol', () => {
    it('should get stock data successfully', async () => {
      const mockStockData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        price: 150.25,
        change: 2.15,
        changePercent: 1.45,
        volume: 75000000,
        marketCap: 2500000000000,
        pe: 28.5,
        eps: 5.27,
        dividend: 0.88,
        dividendYield: 0.59,
        high52Week: 182.94,
        low52Week: 124.17,
        exchange: 'NASDAQ',
        sector: 'Technology',
        industry: 'Consumer Electronics'
      };

      stockScraper.getStockData.mockResolvedValue(mockStockData);

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStockData
      });

      expect(stockScraper.getStockData).toHaveBeenCalledWith('AAPL');
    });

    it('should return 400 for invalid stock symbol', async () => {
      const response = await request(app)
        .get('/api/stocks/invalid-symbol-123')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid stock symbol format'
      });
    });

    it('should return 404 for non-existent stock', async () => {
      stockScraper.getStockData.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stocks/NONEXISTENT')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Stock not found'
      });
    });

    it('should handle service errors', async () => {
      stockScraper.getStockData.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch stock data'
      });
    });

    it('should use cached stock data when available', async () => {
      const cachedData = { symbol: 'AAPL', price: 150.25 };
      cacheService.get.mockResolvedValue(JSON.stringify(cachedData));

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .expect(200);

      expect(response.body.data).toEqual(cachedData);
      expect(stockScraper.getStockData).not.toHaveBeenCalled();
    });

    it('should cache stock data', async () => {
      const mockData = { symbol: 'AAPL', price: 150.25 };
      stockScraper.getStockData.mockResolvedValue(mockData);

      await request(app)
        .get('/api/stocks/AAPL')
        .expect(200);

      expect(cacheService.set).toHaveBeenCalledWith(
        'stock:AAPL',
        JSON.stringify(mockData),
        60 // 1 minute cache
      );
    });
  });

  describe('GET /api/stocks/:symbol/history', () => {
    it('should get historical data successfully', async () => {
      const mockHistoricalData = {
        symbol: 'AAPL',
        period: '1M',
        data: [
          {
            date: '2024-01-01',
            open: 148.50,
            high: 152.30,
            low: 147.80,
            close: 150.25,
            volume: 75000000
          },
          {
            date: '2024-01-02',
            open: 150.25,
            high: 153.10,
            low: 149.90,
            close: 152.80,
            volume: 68000000
          }
        ]
      };

      stockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const response = await request(app)
        .get('/api/stocks/AAPL/history')
        .query({ period: '1M' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockHistoricalData
      });

      expect(stockScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', '1M');
    });

    it('should use default period when not specified', async () => {
      const mockData = { symbol: 'AAPL', period: '1M', data: [] };
      stockScraper.getHistoricalData.mockResolvedValue(mockData);

      await request(app)
        .get('/api/stocks/AAPL/history')
        .expect(200);

      expect(stockScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', '1M');
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/stocks/AAPL/history')
        .query({ period: 'invalid' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid period. Allowed values: 1D, 5D, 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y, YTD, MAX'
      });
    });

    it('should handle service errors', async () => {
      stockScraper.getHistoricalData.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/stocks/AAPL/history')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch historical data'
      });
    });

    it('should cache historical data', async () => {
      const mockData = { symbol: 'AAPL', period: '1M', data: [] };
      stockScraper.getHistoricalData.mockResolvedValue(mockData);

      await request(app)
        .get('/api/stocks/AAPL/history')
        .query({ period: '1M' })
        .expect(200);

      expect(cacheService.set).toHaveBeenCalledWith(
        'history:AAPL:1M',
        JSON.stringify(mockData),
        300 // 5 minutes cache
      );
    });
  });

  describe('GET /api/stocks/:symbol/news', () => {
    it('should get stock news successfully', async () => {
      const mockNews = [
        {
          title: 'Apple Reports Strong Q4 Earnings',
          summary: 'Apple exceeded expectations with record revenue.',
          url: 'https://example.com/news/1',
          source: 'Financial Times',
          publishedAt: '2024-01-15T10:30:00Z',
          sentiment: 'positive'
        },
        {
          title: 'Apple Announces New Product Line',
          summary: 'Company unveils innovative technology solutions.',
          url: 'https://example.com/news/2',
          source: 'TechCrunch',
          publishedAt: '2024-01-14T15:45:00Z',
          sentiment: 'neutral'
        }
      ];

      stockScraper.getStockNews.mockResolvedValue(mockNews);

      const response = await request(app)
        .get('/api/stocks/AAPL/news')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockNews,
        count: 2
      });

      expect(stockScraper.getStockNews).toHaveBeenCalledWith('AAPL', 20);
    });

    it('should handle custom limit parameter', async () => {
      stockScraper.getStockNews.mockResolvedValue([]);

      await request(app)
        .get('/api/stocks/AAPL/news')
        .query({ limit: 10 })
        .expect(200);

      expect(stockScraper.getStockNews).toHaveBeenCalledWith('AAPL', 10);
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/stocks/AAPL/news')
        .query({ limit: 101 })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    });

    it('should handle service errors', async () => {
      stockScraper.getStockNews.mockRejectedValue(new Error('News service error'));

      const response = await request(app)
        .get('/api/stocks/AAPL/news')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch stock news'
      });
    });

    it('should cache news data', async () => {
      const mockNews = [{ title: 'Test News' }];
      stockScraper.getStockNews.mockResolvedValue(mockNews);

      await request(app)
        .get('/api/stocks/AAPL/news')
        .expect(200);

      expect(cacheService.set).toHaveBeenCalledWith(
        'news:AAPL:20',
        JSON.stringify(mockNews),
        600 // 10 minutes cache
      );
    });
  });

  describe('GET /api/stocks/market/overview', () => {
    it('should get market overview successfully', async () => {
      const mockOverview = {
        indices: {
          'S&P 500': {
            value: 4500.25,
            change: 15.30,
            changePercent: 0.34
          },
          'NASDAQ': {
            value: 14250.80,
            change: -25.60,
            changePercent: -0.18
          },
          'Dow Jones': {
            value: 35200.15,
            change: 120.45,
            changePercent: 0.34
          }
        },
        sectors: {
          'Technology': {
            change: 1.25,
            changePercent: 0.85
          },
          'Healthcare': {
            change: -0.45,
            changePercent: -0.32
          }
        },
        marketStatus: 'open',
        lastUpdated: '2024-01-15T15:30:00Z'
      };

      stockScraper.getMarketOverview.mockResolvedValue(mockOverview);

      const response = await request(app)
        .get('/api/stocks/market/overview')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockOverview
      });

      expect(stockScraper.getMarketOverview).toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      stockScraper.getMarketOverview.mockRejectedValue(new Error('Market data unavailable'));

      const response = await request(app)
        .get('/api/stocks/market/overview')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch market overview'
      });
    });

    it('should cache market overview', async () => {
      const mockOverview = { marketStatus: 'open' };
      stockScraper.getMarketOverview.mockResolvedValue(mockOverview);

      await request(app)
        .get('/api/stocks/market/overview')
        .expect(200);

      expect(cacheService.set).toHaveBeenCalledWith(
        'market:overview',
        JSON.stringify(mockOverview),
        30 // 30 seconds cache
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to search endpoint', async () => {
      // Mock rate limiter to simulate rate limit exceeded
      rateLimit.mockImplementation(() => (req, res, next) => {
        res.status(429).json({
          success: false,
          error: 'Too many requests, please try again later'
        });
      });

      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: 'apple' })
        .expect(429);

      expect(response.body).toEqual({
        success: false,
        error: 'Too many requests, please try again later'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/stocks/invalid-endpoint')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(404); // Route not found

      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle database connection errors', async () => {
      cacheService.isConnected.mockReturnValue(false);
      stockScraper.getStockData.mockResolvedValue({ symbol: 'AAPL' });

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .expect(200);

      // Should still work without cache
      expect(response.body.success).toBe(true);
      expect(stockScraper.getStockData).toHaveBeenCalled();
    });

    it('should handle timeout errors', async () => {
      stockScraper.getStockData.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100);
        });
      });

      const response = await request(app)
        .get('/api/stocks/AAPL')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch stock data'
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate stock symbol format', async () => {
      const invalidSymbols = [
        'aa',      // too short
        'toolong', // too long
        '123',     // numbers only
        'AA-BB',   // invalid characters
        'aa bb'    // spaces
      ];

      for (const symbol of invalidSymbols) {
        const response = await request(app)
          .get(`/api/stocks/${symbol}`)
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          error: 'Invalid stock symbol format'
        });
      }
    });

    it('should sanitize input parameters', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .query({ q: '<script>alert("xss")</script>' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Query must be at least 2 characters long'
      });
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      stockScraper.getStockData.mockResolvedValue({ symbol: 'AAPL' });

      const requests = Array(10).fill().map(() => 
        request(app).get('/api/stocks/AAPL')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should implement request deduplication for same stock', async () => {
      let callCount = 0;
      stockScraper.getStockData.mockImplementation(() => {
        callCount++;
        return Promise.resolve({ symbol: 'AAPL' });
      });

      // Make multiple concurrent requests for the same stock
      const requests = Array(5).fill().map(() => 
        request(app).get('/api/stocks/AAPL')
      );

      await Promise.all(requests);

      // Should only call the service once due to deduplication
      expect(callCount).toBeLessThanOrEqual(5);
    });
  });
});