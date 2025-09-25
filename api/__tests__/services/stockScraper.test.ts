import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { stockScraper } from '../../services/stockScraper';
import { cacheService } from '../../services/cacheService';
import { logger } from '../../utils/logger';

// Mock dependencies
vi.mock('axios');
vi.mock('../../services/cacheService');
vi.mock('../../utils/logger');

const mockAxios = vi.mocked(axios);
const mockCacheService = vi.mocked(cacheService);
const mockLogger = vi.mocked(logger);

const mockStockData = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150.25,
  change: 2.50,
  changePercent: 1.69,
  volume: 45678900,
  marketCap: 2450000000000,
  high: 152.00,
  low: 148.50,
  open: 149.00,
  previousClose: 147.75,
  pe: 28.5,
  eps: 5.27,
  dividend: 0.92,
  dividendYield: 0.61,
  week52High: 182.94,
  week52Low: 124.17,
  avgVolume: 58000000,
  beta: 1.24,
  lastUpdate: Date.now()
};

const mockHistoricalData = [
  {
    date: '2024-01-15',
    open: 149.00,
    high: 152.00,
    low: 148.50,
    close: 150.25,
    volume: 45678900
  },
  {
    date: '2024-01-14',
    open: 147.50,
    high: 149.25,
    low: 146.75,
    close: 147.75,
    volume: 52000000
  }
];

const mockSearchResults = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'Common Stock',
    region: 'United States',
    marketOpen: '09:30',
    marketClose: '16:00',
    timezone: 'UTC-05',
    currency: 'USD',
    matchScore: 1.0
  },
  {
    symbol: 'AAPLW',
    name: 'Apple Inc. Warrants',
    type: 'Warrant',
    region: 'United States',
    marketOpen: '09:30',
    marketClose: '16:00',
    timezone: 'UTC-05',
    currency: 'USD',
    matchScore: 0.8
  }
];

const mockMarketOverview = {
  totalVolume: 125000000,
  advancingStocks: 1250,
  decliningStocks: 850,
  unchangedStocks: 100,
  marketCap: 45000000000000,
  lastUpdate: Date.now()
};

const mockNews = [
  {
    id: '1',
    title: 'Apple Reports Strong Q4 Earnings',
    summary: 'Apple Inc. reported better than expected earnings for Q4.',
    url: 'https://example.com/news/1',
    timestamp: Date.now() - 3600000,
    source: 'Financial Times',
    symbols: ['AAPL'],
    sentiment: 'positive'
  },
  {
    id: '2',
    title: 'iPhone Sales Decline in China',
    summary: 'Apple faces challenges in the Chinese market.',
    url: 'https://example.com/news/2',
    timestamp: Date.now() - 7200000,
    source: 'Reuters',
    symbols: ['AAPL'],
    sentiment: 'negative'
  }
];

describe('stockScraper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default cache behavior
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);
    
    // Default logger behavior
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStockData', () => {
    it('should fetch stock data successfully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25',
            '09. change': '2.50',
            '10. change percent': '1.69%'
          }
        }
      });
      
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Time Series (Daily)': {
            '2024-01-15': {
              '1. open': '149.00',
              '2. high': '152.00',
              '3. low': '148.50',
              '4. close': '150.25',
              '5. volume': '45678900'
            }
          }
        }
      });
      
      const result = await stockScraper.getStockData('AAPL');
      
      expect(result).toEqual(expect.objectContaining({
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69
      }));
      
      expect(mockAxios.get).toHaveBeenCalledTimes(2);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'stock:AAPL',
        expect.any(Object),
        300 // 5 minutes
      );
    });

    it('should return cached data when available', async () => {
      mockCacheService.get.mockResolvedValueOnce(mockStockData);
      
      const result = await stockScraper.getStockData('AAPL');
      
      expect(result).toEqual(mockStockData);
      expect(mockAxios.get).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Returning cached stock data for AAPL');
    });

    it('should handle API errors gracefully', async () => {
      mockAxios.get.mockRejectedValueOnce(new Error('API rate limit exceeded'));
      
      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('Failed to fetch stock data for AAPL');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching stock data for AAPL:',
        expect.any(Error)
      );
    });

    it('should validate stock symbol format', async () => {
      await expect(stockScraper.getStockData('')).rejects.toThrow('Invalid stock symbol');
      await expect(stockScraper.getStockData('TOOLONG')).rejects.toThrow('Invalid stock symbol');
      await expect(stockScraper.getStockData('123')).rejects.toThrow('Invalid stock symbol');
    });

    it('should handle malformed API response', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Error Message': 'Invalid API call'
        }
      });
      
      await expect(stockScraper.getStockData('INVALID')).rejects.toThrow('API returned error');
    });

    it('should retry failed requests', async () => {
      mockAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            'Global Quote': {
              '01. symbol': 'AAPL',
              '05. price': '150.25'
            }
          }
        });
      
      const result = await stockScraper.getStockData('AAPL');
      
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
      expect(result.symbol).toBe('AAPL');
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch historical data successfully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Time Series (Daily)': {
            '2024-01-15': {
              '1. open': '149.00',
              '2. high': '152.00',
              '3. low': '148.50',
              '4. close': '150.25',
              '5. volume': '45678900'
            },
            '2024-01-14': {
              '1. open': '147.50',
              '2. high': '149.25',
              '3. low': '146.75',
              '4. close': '147.75',
              '5. volume': '52000000'
            }
          }
        }
      });
      
      const result = await stockScraper.getHistoricalData('AAPL', '1D');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        date: '2024-01-15',
        open: 149.00,
        high: 152.00,
        low: 148.50,
        close: 150.25,
        volume: 45678900
      }));
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'historical:AAPL:1D',
        expect.any(Array),
        1800 // 30 minutes
      );
    });

    it('should return cached historical data when available', async () => {
      mockCacheService.get.mockResolvedValueOnce(mockHistoricalData);
      
      const result = await stockScraper.getHistoricalData('AAPL', '1D');
      
      expect(result).toEqual(mockHistoricalData);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should handle different timeframes', async () => {
      const timeframes = ['1D', '5D', '1M', '3M', '6M', '1Y', '2Y', '5Y'];
      
      for (const timeframe of timeframes) {
        mockAxios.get.mockResolvedValueOnce({
          data: {
            'Time Series (Daily)': {
              '2024-01-15': {
                '1. open': '149.00',
                '2. high': '152.00',
                '3. low': '148.50',
                '4. close': '150.25',
                '5. volume': '45678900'
              }
            }
          }
        });
        
        await stockScraper.getHistoricalData('AAPL', timeframe);
        
        expect(mockCacheService.set).toHaveBeenCalledWith(
          `historical:AAPL:${timeframe}`,
          expect.any(Array),
          expect.any(Number)
        );
      }
    });

    it('should validate timeframe parameter', async () => {
      await expect(stockScraper.getHistoricalData('AAPL', 'INVALID')).rejects.toThrow('Invalid timeframe');
    });

    it('should limit data points based on timeframe', async () => {
      const largeDataSet = {};
      for (let i = 0; i < 1000; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        largeDataSet[date] = {
          '1. open': '149.00',
          '2. high': '152.00',
          '3. low': '148.50',
          '4. close': '150.25',
          '5. volume': '45678900'
        };
      }
      
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Time Series (Daily)': largeDataSet
        }
      });
      
      const result = await stockScraper.getHistoricalData('AAPL', '1M');
      
      expect(result.length).toBeLessThanOrEqual(30); // 1 month = ~30 days
    });
  });

  describe('searchStocks', () => {
    it('should search stocks successfully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          bestMatches: [
            {
              '1. symbol': 'AAPL',
              '2. name': 'Apple Inc.',
              '3. type': 'Equity',
              '4. region': 'United States',
              '8. currency': 'USD',
              '9. matchScore': '1.0000'
            },
            {
              '1. symbol': 'AAPLW',
              '2. name': 'Apple Inc. Warrants',
              '3. type': 'Warrant',
              '4. region': 'United States',
              '8. currency': 'USD',
              '9. matchScore': '0.8000'
            }
          ]
        }
      });
      
      const result = await stockScraper.searchStocks('Apple');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(expect.objectContaining({
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'Equity',
        matchScore: 1.0
      }));
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'search:Apple',
        expect.any(Array),
        600 // 10 minutes
      );
    });

    it('should return cached search results when available', async () => {
      mockCacheService.get.mockResolvedValueOnce(mockSearchResults);
      
      const result = await stockScraper.searchStocks('Apple');
      
      expect(result).toEqual(mockSearchResults);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should validate search query', async () => {
      await expect(stockScraper.searchStocks('')).rejects.toThrow('Search query cannot be empty');
      await expect(stockScraper.searchStocks('a')).rejects.toThrow('Search query must be at least 2 characters');
    });

    it('should handle no search results', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          bestMatches: []
        }
      });
      
      const result = await stockScraper.searchStocks('NONEXISTENT');
      
      expect(result).toEqual([]);
    });

    it('should sort results by match score', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          bestMatches: [
            {
              '1. symbol': 'AAPLW',
              '2. name': 'Apple Inc. Warrants',
              '9. matchScore': '0.8000'
            },
            {
              '1. symbol': 'AAPL',
              '2. name': 'Apple Inc.',
              '9. matchScore': '1.0000'
            }
          ]
        }
      });
      
      const result = await stockScraper.searchStocks('Apple');
      
      expect(result[0].symbol).toBe('AAPL'); // Higher match score first
      expect(result[1].symbol).toBe('AAPLW');
    });
  });

  describe('getMarketOverview', () => {
    it('should fetch market overview successfully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          marketOverview: {
            totalVolume: 125000000,
            advancingStocks: 1250,
            decliningStocks: 850,
            unchangedStocks: 100,
            marketCap: 45000000000000
          }
        }
      });
      
      const result = await stockScraper.getMarketOverview();
      
      expect(result).toEqual(expect.objectContaining({
        totalVolume: 125000000,
        advancingStocks: 1250,
        decliningStocks: 850,
        unchangedStocks: 100,
        marketCap: 45000000000000
      }));
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'market:overview',
        expect.any(Object),
        300 // 5 minutes
      );
    });

    it('should return cached market overview when available', async () => {
      mockCacheService.get.mockResolvedValueOnce(mockMarketOverview);
      
      const result = await stockScraper.getMarketOverview();
      
      expect(result).toEqual(mockMarketOverview);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should calculate market sentiment', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          marketOverview: {
            advancingStocks: 1250,
            decliningStocks: 850,
            unchangedStocks: 100
          }
        }
      });
      
      const result = await stockScraper.getMarketOverview();
      
      expect(result.sentiment).toBe('bullish'); // More advancing than declining
    });
  });

  describe('getStockNews', () => {
    it('should fetch stock news successfully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          feed: [
            {
              title: 'Apple Reports Strong Q4 Earnings',
              summary: 'Apple Inc. reported better than expected earnings for Q4.',
              url: 'https://example.com/news/1',
              time_published: '20240115T160000',
              source: 'Financial Times',
              ticker_sentiment: [
                {
                  ticker: 'AAPL',
                  relevance_score: '0.9',
                  ticker_sentiment_score: '0.5',
                  ticker_sentiment_label: 'Bullish'
                }
              ]
            }
          ]
        }
      });
      
      const result = await stockScraper.getStockNews('AAPL');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        title: 'Apple Reports Strong Q4 Earnings',
        summary: 'Apple Inc. reported better than expected earnings for Q4.',
        url: 'https://example.com/news/1',
        source: 'Financial Times',
        symbols: ['AAPL'],
        sentiment: 'positive'
      }));
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'news:AAPL',
        expect.any(Array),
        900 // 15 minutes
      );
    });

    it('should return cached news when available', async () => {
      mockCacheService.get.mockResolvedValueOnce(mockNews);
      
      const result = await stockScraper.getStockNews('AAPL');
      
      expect(result).toEqual(mockNews);
      expect(mockAxios.get).not.toHaveBeenCalled();
    });

    it('should handle news without sentiment data', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          feed: [
            {
              title: 'Market Update',
              summary: 'General market news.',
              url: 'https://example.com/news/3',
              time_published: '20240115T160000',
              source: 'Market Watch'
            }
          ]
        }
      });
      
      const result = await stockScraper.getStockNews('AAPL');
      
      expect(result[0].sentiment).toBe('neutral');
    });

    it('should filter news by relevance score', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          feed: [
            {
              title: 'Highly Relevant News',
              ticker_sentiment: [
                {
                  ticker: 'AAPL',
                  relevance_score: '0.9'
                }
              ]
            },
            {
              title: 'Low Relevance News',
              ticker_sentiment: [
                {
                  ticker: 'AAPL',
                  relevance_score: '0.1'
                }
              ]
            }
          ]
        }
      });
      
      const result = await stockScraper.getStockNews('AAPL');
      
      expect(result).toHaveLength(1); // Only high relevance news
      expect(result[0].title).toBe('Highly Relevant News');
    });
  });

  describe('Rate Limiting', () => {
    it('should respect API rate limits', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            'Note': 'Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute'
          }
        }
      };
      
      mockAxios.get.mockRejectedValueOnce(rateLimitError);
      
      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('API rate limit exceeded');
      
      expect(mockLogger.warn).toHaveBeenCalledWith('API rate limit exceeded, waiting before retry');
    });

    it('should implement exponential backoff for retries', async () => {
      const networkError = new Error('Network timeout');
      
      mockAxios.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: {
            'Global Quote': {
              '01. symbol': 'AAPL',
              '05. price': '150.25'
            }
          }
        });
      
      const startTime = Date.now();
      await stockScraper.getStockData('AAPL');
      const endTime = Date.now();
      
      // Should have waited for backoff delays
      expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second for retries
    });
  });

  describe('Data Validation', () => {
    it('should validate stock data format', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': 'invalid_price'
          }
        }
      });
      
      await expect(stockScraper.getStockData('AAPL')).rejects.toThrow('Invalid stock data format');
    });

    it('should sanitize and normalize data', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Global Quote': {
            '01. symbol': '  AAPL  ',
            '05. price': '150.25000',
            '09. change': '+2.50',
            '10. change percent': '+1.69%'
          }
        }
      });
      
      const result = await stockScraper.getStockData('AAPL');
      
      expect(result.symbol).toBe('AAPL'); // Trimmed
      expect(result.price).toBe(150.25); // Parsed as number
      expect(result.change).toBe(2.50); // Positive sign removed
      expect(result.changePercent).toBe(1.69); // Percentage sign removed
    });

    it('should handle missing data fields gracefully', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25'
            // Missing other fields
          }
        }
      });
      
      const result = await stockScraper.getStockData('AAPL');
      
      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150.25);
      expect(result.change).toBe(0); // Default value
      expect(result.changePercent).toBe(0); // Default value
    });
  });

  describe('Error Recovery', () => {
    it('should fallback to alternative data sources', async () => {
      // Primary source fails
      mockAxios.get.mockRejectedValueOnce(new Error('Primary API failed'));
      
      // Fallback source succeeds
      mockAxios.get.mockResolvedValueOnce({
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50
        }
      });
      
      const result = await stockScraper.getStockData('AAPL');
      
      expect(result.symbol).toBe('AAPL');
      expect(mockLogger.info).toHaveBeenCalledWith('Using fallback data source for AAPL');
    });

    it('should handle partial data corruption', async () => {
      mockAxios.get.mockResolvedValueOnce({
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25',
            '09. change': null, // Corrupted field
            '10. change percent': undefined // Missing field
          }
        }
      });
      
      const result = await stockScraper.getStockData('AAPL');
      
      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150.25);
      expect(result.change).toBe(0); // Default for corrupted data
      expect(result.changePercent).toBe(0); // Default for missing data
    });
  });

  describe('Performance Optimization', () => {
    it('should batch multiple requests efficiently', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      
      // Mock responses for each symbol
      symbols.forEach(symbol => {
        mockAxios.get.mockResolvedValueOnce({
          data: {
            'Global Quote': {
              '01. symbol': symbol,
              '05. price': '150.25'
            }
          }
        });
      });
      
      const promises = symbols.map(symbol => stockScraper.getStockData(symbol));
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results.every(result => result.price === 150.25)).toBe(true);
    });

    it('should implement request deduplication', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          'Global Quote': {
            '01. symbol': 'AAPL',
            '05. price': '150.25'
          }
        }
      });
      
      // Make multiple simultaneous requests for the same symbol
      const promises = [
        stockScraper.getStockData('AAPL'),
        stockScraper.getStockData('AAPL'),
        stockScraper.getStockData('AAPL')
      ];
      
      await Promise.all(promises);
      
      // Should only make one actual API call due to deduplication
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });
  });
});