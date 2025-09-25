import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMarketData } from '../useMarketData';
import type { MarketOverview, MarketIndex, MarketSector } from '../../types/market';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockMarketOverview: MarketOverview = {
  indices: [
    {
      symbol: 'SPY',
      name: 'S&P 500',
      value: 4500.25,
      change: 25.50,
      changePercent: 0.57,
      lastUpdated: new Date().toISOString()
    },
    {
      symbol: 'QQQ',
      name: 'NASDAQ 100',
      value: 380.75,
      change: -5.25,
      changePercent: -1.36,
      lastUpdated: new Date().toISOString()
    }
  ],
  sectors: [
    {
      name: 'Technology',
      change: 1.25,
      changePercent: 0.85,
      topGainers: ['AAPL', 'MSFT', 'GOOGL'],
      topLosers: ['NFLX', 'META']
    },
    {
      name: 'Healthcare',
      change: -0.75,
      changePercent: -0.45,
      topGainers: ['JNJ', 'PFE'],
      topLosers: ['MRNA', 'BNTX', 'NVAX']
    }
  ],
  marketStatus: 'open',
  tradingSession: 'regular',
  lastUpdated: new Date().toISOString()
};

const createMockResponse = (data: any, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data))
});

describe('useMarketData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMarketData());
      
      expect(result.current.marketOverview).toBeNull();
      expect(result.current.indices).toEqual([]);
      expect(result.current.sectors).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
      expect(result.current.marketStatus).toBe('unknown');
    });

    it('should auto-fetch data when autoFetch is enabled', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockMarketOverview })
      );
      
      const { result } = renderHook(() => useMarketData({ autoFetch: true }));
      
      expect(result.current.loading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should not auto-fetch when autoFetch is disabled', () => {
      renderHook(() => useMarketData({ autoFetch: false }));
      
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Market Overview Fetching', () => {
    it('should fetch market overview successfully', async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ data: mockMarketOverview })
      );
      
      const { result } = renderHook(() => useMarketData());
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(result.current.marketOverview).toEqual(mockMarketOverview);
      expect(result.current.marketStatus).toBe('open');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeTruthy();
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Market data unavailable';
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ error: errorMessage }, false, 503)
      );
      
      const { result } = renderHook(() => useMarketData());
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(result.current.marketOverview).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useMarketData());
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(result.current.marketOverview).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('Error Handling', () => {
    it('should retry on failure and succeed', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockResponse({ data: mockMarketOverview }));
      
      const { result } = renderHook(() => useMarketData());
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.marketOverview).toEqual(mockMarketOverview);
      expect(result.current.error).toBeNull();
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent network error');
      mockFetch.mockRejectedValue(error);
      
      const { result } = renderHook(() => useMarketData());
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.current.error).toBe('Persistent network error');
      expect(result.current.marketOverview).toBeNull();
    });
  });

  describe('Auto-refresh Management', () => {
    it('should start and stop auto-refresh', async () => {
      vi.useFakeTimers();
      
      mockFetch.mockResolvedValue(
        createMockResponse({ data: mockMarketOverview })
      );
      
      const { result } = renderHook(() => useMarketData());
      
      act(() => {
        result.current.startAutoRefresh(2000);
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
      
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
      
      act(() => {
        result.current.stopAutoRefresh();
      });
      
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      vi.useRealTimers();
    });
  });

  describe('Custom Options', () => {
    it('should respect custom cache duration', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ data: mockMarketOverview })
      );
      
      const { result } = renderHook(() => 
        useMarketData({ cacheDuration: 1000 })
      );
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect custom retry options', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const { result } = renderHook(() => 
        useMarketData({ maxRetries: 1 })
      );
      
      await act(async () => {
        await result.current.fetchMarketOverview();
      });
      
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useMarketData());
      
      act(() => {
        result.current.fetchMarketOverview();
      });
      
      expect(() => unmount()).not.toThrow();
    });
  });
});