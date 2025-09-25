import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStockData } from '../useStockData';
import type { StockData, HistoricalData, NewsItem } from '../../types/stock';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

const mockHistoricalData: HistoricalData[] = [
  {
    date: '2024-01-01',
    open: 148.50,
    high: 152.00,
    low: 147.00,
    close: 150.25,
    volume: 45000000
  },
  {
    date: '2024-01-02',
    open: 150.25,
    high: 155.00,
    low: 149.50,
    close: 153.75,
    volume: 52000000
  }
];

const mockNewsData: NewsItem[] = [
  {
    id: '1',
    title: 'Apple Reports Strong Q4 Earnings',
    summary: 'Apple exceeded expectations with strong iPhone sales',
    url: 'https://example.com/news/1',
    publishedAt: '2024-01-01T10:00:00Z',
    source: 'TechNews',
    sentiment: 'positive',
    relatedSymbols: ['AAPL']
  },
  {
    id: '2',
    title: 'Apple Announces New Product Line',
    summary: 'Revolutionary new products coming this year',
    url: 'https://example.com/news/2',
    publishedAt: '2024-01-02T14:30:00Z',
    source: 'AppleInsider',
    sentiment: 'positive',
    relatedSymbols: ['AAPL']
  }
];

const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data))
});

describe('useStockData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useStockData());
      
      expect(result.current.stockData).toBeNull();
      expect(result.current.historicalData).toEqual([]);
      expect(result.current.news).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });

    it('should auto-fetch data when symbol is provided', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => useStockData('AAPL'));
      
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.stockData).toEqual(mockStockData);
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL');
    });

    it('should not auto-fetch when symbol is not provided', () => {
      renderHook(() => useStockData());
      
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Stock Data Fetching', () => {
    it('should fetch stock data successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(result.current.stockData).toEqual(mockStockData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeTruthy();
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Stock not found';
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: errorMessage }, false, 404)
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('INVALID');
      });
      
      expect(result.current.stockData).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(result.current.stockData).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should set loading state correctly', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(promise);
      
      const { result } = renderHook(() => useStockData());
      
      act(() => {
        result.current.fetchStockData('AAPL');
      });
      
      expect(result.current.loading).toBe(true);
      
      await act(async () => {
        resolvePromise!(createMockResponse({ data: mockStockData }));
        await promise;
      });
      
      expect(result.current.loading).toBe(false);
    });

    it('should clear error on successful fetch', async () => {
      const { result } = renderHook(() => useStockData());
      
      // First, cause an error
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: 'Error' }, false, 500)
      );
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(result.current.error).toBe('Error');
      
      // Then, successful fetch should clear error
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockStockData })
      );
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(result.current.error).toBeNull();
      expect(result.current.stockData).toEqual(mockStockData);
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: null })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(result.current.stockData).toBeNull();
      expect(result.current.error).toBe('No data received');
    });
  });

  describe('Historical Data Fetching', () => {
    it('should fetch historical data successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockHistoricalData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchHistoricalData('AAPL', '1M');
      });
      
      expect(result.current.historicalData).toEqual(mockHistoricalData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL/history?period=1M');
    });

    it('should handle historical data fetch errors', async () => {
      const errorMessage = 'Historical data not available';
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: errorMessage }, false, 404)
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchHistoricalData('AAPL', '1M');
      });
      
      expect(result.current.historicalData).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should fetch historical data with custom date range', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockHistoricalData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      
      await act(async () => {
        await result.current.fetchHistoricalData('AAPL', 'custom', startDate, endDate);
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/stocks/AAPL/history?period=custom&startDate=${startDate}&endDate=${endDate}`
      );
    });

    it('should validate date range for custom period', async () => {
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchHistoricalData('AAPL', 'custom');
      });
      
      expect(result.current.error).toBe('Start date and end date are required for custom period');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle malformed historical data', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: 'invalid data' })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchHistoricalData('AAPL', '1M');
      });
      
      expect(result.current.historicalData).toEqual([]);
      expect(result.current.error).toBe('Invalid historical data format');
    });
  });

  describe('News Data Fetching', () => {
    it('should fetch news data successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockNewsData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchNews('AAPL');
      });
      
      expect(result.current.news).toEqual(mockNewsData);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL/news?limit=20');
    });

    it('should fetch news with custom limit', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockNewsData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchNews('AAPL', 10);
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL/news?limit=10');
    });

    it('should handle news fetch errors', async () => {
      const errorMessage = 'News not available';
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: errorMessage }, false, 404)
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchNews('AAPL');
      });
      
      expect(result.current.news).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle malformed news data', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: 'invalid data' })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchNews('AAPL');
      });
      
      expect(result.current.news).toEqual([]);
      expect(result.current.error).toBe('Invalid news data format');
    });

    it('should sort news by publication date', async () => {
      const unsortedNews = [
        { ...mockNewsData[1] }, // Later date
        { ...mockNewsData[0] }  // Earlier date
      ];
      
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: unsortedNews })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchNews('AAPL');
      });
      
      // Should be sorted with most recent first
      expect(result.current.news[0].id).toBe('2');
      expect(result.current.news[1].id).toBe('1');
    });
  });

  describe('Data Management', () => {
    it('should refresh all data', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ data: mockStockData }))
        .mockResolvedValueOnce(createMockResponse({ data: mockHistoricalData }))
        .mockResolvedValueOnce(createMockResponse({ data: mockNewsData }));
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.refreshData('AAPL');
      });
      
      expect(result.current.stockData).toEqual(mockStockData);
      expect(result.current.historicalData).toEqual(mockHistoricalData);
      expect(result.current.news).toEqual(mockNewsData);
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL');
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL/history?period=1M');
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL/news?limit=20');
    });

    it('should refresh with custom parameters', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ data: mockStockData }))
        .mockResolvedValueOnce(createMockResponse({ data: mockHistoricalData }))
        .mockResolvedValueOnce(createMockResponse({ data: mockNewsData }));
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.refreshData('AAPL', {
          historicalPeriod: '3M',
          newsLimit: 50
        });
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL/history?period=3M');
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL/news?limit=50');
    });

    it('should handle partial refresh failures', async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ data: mockStockData }))
        .mockResolvedValueOnce(createMockResponse({ error: 'Historical data error' }, false, 500))
        .mockResolvedValueOnce(createMockResponse({ data: mockNewsData }));
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.refreshData('AAPL');
      });
      
      expect(result.current.stockData).toEqual(mockStockData);
      expect(result.current.historicalData).toEqual([]);
      expect(result.current.news).toEqual(mockNewsData);
      expect(result.current.error).toBe('Historical data error');
    });

    it('should clear all data', () => {
      const { result } = renderHook(() => useStockData());
      
      // Set some initial data
      act(() => {
        result.current.stockData = mockStockData;
        result.current.historicalData = mockHistoricalData;
        result.current.news = mockNewsData;
        result.current.error = 'Some error';
      });
      
      act(() => {
        result.current.clearData();
      });
      
      expect(result.current.stockData).toBeNull();
      expect(result.current.historicalData).toEqual([]);
      expect(result.current.news).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
    });

    it('should update last updated timestamp', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      const beforeFetch = Date.now();
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      const afterFetch = Date.now();
      
      expect(result.current.lastUpdated).toBeTruthy();
      const lastUpdatedTime = new Date(result.current.lastUpdated!).getTime();
      expect(lastUpdatedTime).toBeGreaterThanOrEqual(beforeFetch);
      expect(lastUpdatedTime).toBeLessThanOrEqual(afterFetch);
    });
  });

  describe('Caching and Performance', () => {
    it('should cache data and avoid duplicate requests', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      // First fetch
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second fetch within cache time should not make new request
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should force refresh when requested', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      // First fetch
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Force refresh should make new request
      await act(async () => {
        await result.current.fetchStockData('AAPL', true);
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent requests for same symbol', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(promise);
      
      const { result } = renderHook(() => useStockData());
      
      // Start two concurrent requests
      const promise1 = act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      const promise2 = act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      // Resolve the fetch
      await act(async () => {
        resolvePromise!(createMockResponse({ data: mockStockData }));
        await Promise.all([promise1, promise2]);
      });
      
      // Should only make one request
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.stockData).toEqual(mockStockData);
    });
  });

  describe('Error Recovery', () => {
    it('should retry failed requests', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse({ data: mockStockData }));
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      // Should have retried and succeeded
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.stockData).toEqual(mockStockData);
      expect(result.current.error).toBeNull();
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent network error');
      mockFetch.mockRejectedValue(error);
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      // Should have tried 3 times (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.current.error).toBe('Persistent network error');
      expect(result.current.stockData).toBeNull();
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockFetch.mockRejectedValueOnce(timeoutError);
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(result.current.error).toBe('Request timeout');
    });
  });

  describe('Symbol Validation', () => {
    it('should validate symbol format', async () => {
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('');
      });
      
      expect(result.current.error).toBe('Invalid symbol');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should normalize symbol case', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('aapl');
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/AAPL');
    });

    it('should handle special characters in symbols', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: { ...mockStockData, symbol: 'BRK.A' } })
      );
      
      const { result } = renderHook(() => useStockData());
      
      await act(async () => {
        await result.current.fetchStockData('BRK.A');
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/BRK.A');
    });
  });

  describe('Memory Management', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useStockData());
      
      // Start a fetch operation
      act(() => {
        result.current.fetchStockData('AAPL');
      });
      
      // Unmount should not cause memory leaks
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid symbol changes', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ data: mockStockData })
      );
      
      const { result, rerender } = renderHook(
        ({ symbol }) => useStockData(symbol),
        { initialProps: { symbol: 'AAPL' } }
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Change symbol rapidly
      rerender({ symbol: 'GOOGL' });
      rerender({ symbol: 'MSFT' });
      rerender({ symbol: 'TSLA' });
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      // Should handle without errors
      expect(result.current.error).toBeNull();
    });
  });

  describe('Custom Options', () => {
    it('should respect custom cache duration', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => 
        useStockData(undefined, { cacheDuration: 1000 }) // 1 second cache
      );
      
      // First fetch
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Wait for cache to expire
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });
      
      // Second fetch should make new request
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect custom retry options', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useStockData(undefined, { maxRetries: 1 })
      );
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      // Should only retry once (initial + 1 retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use custom API base URL', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockStockData })
      );
      
      const { result } = renderHook(() => 
        useStockData(undefined, { apiBaseUrl: 'https://custom-api.com' })
      );
      
      await act(async () => {
        await result.current.fetchStockData('AAPL');
      });
      
      expect(mockFetch).toHaveBeenCalledWith('https://custom-api.com/stocks/AAPL');
    });
  });
});