import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealTimeData } from '../useRealTimeData';
import { useWebSocket } from '../useWebSocket';

// Mock the useWebSocket hook
vi.mock('../useWebSocket');

const mockUseWebSocket = vi.mocked(useWebSocket);

const createMockWebSocket = () => ({
  isConnected: false,
  connectionStatus: 'disconnected' as const,
  lastMessage: null,
  sendMessage: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
});

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useRealTimeData Hook', () => {
  let mockWebSocket: ReturnType<typeof createMockWebSocket>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocket = createMockWebSocket();
    mockUseWebSocket.mockReturnValue(mockWebSocket);
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      expect(result.current.stockData).toEqual({});
      expect(result.current.marketData).toBe(null);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.lastUpdate).toBe(null);
      expect(typeof result.current.subscribeToStock).toBe('function');
      expect(typeof result.current.unsubscribeFromStock).toBe('function');
      expect(typeof result.current.subscribeToMarket).toBe('function');
      expect(typeof result.current.unsubscribeFromMarket).toBe('function');
      expect(typeof result.current.getStockQuote).toBe('function');
      expect(typeof result.current.getMarketOverview).toBe('function');
      expect(typeof result.current.searchStocks).toBe('function');
    });

    it('should connect to WebSocket on mount', () => {
      renderHook(() => useRealTimeData());
      
      expect(mockWebSocket.connect).toHaveBeenCalled();
    });

    it('should disconnect from WebSocket on unmount', () => {
      const { unmount } = renderHook(() => useRealTimeData());
      
      unmount();
      
      expect(mockWebSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Stock Data Management', () => {
    it('should subscribe to stock updates', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.subscribeToStock('AAPL');
      });
      
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('AAPL');
    });

    it('should unsubscribe from stock updates', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.unsubscribeFromStock('AAPL');
      });
      
      expect(mockWebSocket.unsubscribe).toHaveBeenCalledWith('AAPL');
    });

    it('should handle stock price updates from WebSocket', () => {
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69,
          volume: 1000000,
          timestamp: '2024-01-15T10:30:00Z'
        }
      };
      
      const { result } = renderHook(() => useRealTimeData());
      
      expect(result.current.stockData['AAPL']).toEqual({
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 1000000,
        timestamp: '2024-01-15T10:30:00Z'
      });
      expect(result.current.lastUpdate).toBe('2024-01-15T10:30:00Z');
    });

    it('should handle multiple stock updates', () => {
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      // First stock update
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69,
          timestamp: '2024-01-15T10:30:00Z'
        }
      };
      rerender();
      
      // Second stock update
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'GOOGL',
          price: 2800.50,
          change: -15.25,
          changePercent: -0.54,
          timestamp: '2024-01-15T10:31:00Z'
        }
      };
      rerender();
      
      expect(result.current.stockData['AAPL']).toBeDefined();
      expect(result.current.stockData['GOOGL']).toBeDefined();
      expect(result.current.stockData['GOOGL'].price).toBe(2800.50);
    });

    it('should update existing stock data', () => {
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      // Initial stock data
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69,
          timestamp: '2024-01-15T10:30:00Z'
        }
      };
      rerender();
      
      // Updated stock data
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 151.00,
          change: 3.25,
          changePercent: 2.20,
          timestamp: '2024-01-15T10:31:00Z'
        }
      };
      rerender();
      
      expect(result.current.stockData['AAPL'].price).toBe(151.00);
      expect(result.current.stockData['AAPL'].change).toBe(3.25);
      expect(result.current.lastUpdate).toBe('2024-01-15T10:31:00Z');
    });
  });

  describe('Market Data Management', () => {
    it('should subscribe to market updates', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.subscribeToMarket();
      });
      
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('market');
    });

    it('should unsubscribe from market updates', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.unsubscribeFromMarket();
      });
      
      expect(mockWebSocket.unsubscribe).toHaveBeenCalledWith('market');
    });

    it('should handle market overview updates from WebSocket', () => {
      mockWebSocket.lastMessage = {
        type: 'market-update',
        data: {
          indices: {
            SPY: { price: 485.20, change: 3.15, changePercent: 0.65 },
            QQQ: { price: 395.80, change: -2.40, changePercent: -0.60 },
            IWM: { price: 198.50, change: 1.25, changePercent: 0.63 }
          },
          sectors: {
            Technology: { change: 1.2, changePercent: 0.8 },
            Healthcare: { change: -0.5, changePercent: -0.3 }
          },
          timestamp: '2024-01-15T10:30:00Z'
        }
      };
      
      const { result } = renderHook(() => useRealTimeData());
      
      expect(result.current.marketData).toEqual({
        indices: {
          SPY: { price: 485.20, change: 3.15, changePercent: 0.65 },
          QQQ: { price: 395.80, change: -2.40, changePercent: -0.60 },
          IWM: { price: 198.50, change: 1.25, changePercent: 0.63 }
        },
        sectors: {
          Technology: { change: 1.2, changePercent: 0.8 },
          Healthcare: { change: -0.5, changePercent: -0.3 }
        },
        timestamp: '2024-01-15T10:30:00Z'
      });
      expect(result.current.lastUpdate).toBe('2024-01-15T10:30:00Z');
    });
  });

  describe('API Integration', () => {
    it('should fetch stock quote from API', async () => {
      const mockQuoteData = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 1000000,
        marketCap: 2500000000000,
        pe: 25.5,
        eps: 5.89
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockQuoteData
      });
      
      const { result } = renderHook(() => useRealTimeData());
      
      let quoteResult;
      await act(async () => {
        quoteResult = await result.current.getStockQuote('AAPL');
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/quote/AAPL');
      expect(quoteResult).toEqual(mockQuoteData);
    });

    it('should handle API errors for stock quote', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const { result } = renderHook(() => useRealTimeData());
      
      await act(async () => {
        try {
          await result.current.getStockQuote('INVALID');
        } catch (error) {
          expect(error.message).toBe('Network error');
        }
      });
      
      expect(result.current.error).toBe('Failed to fetch stock quote');
    });

    it('should fetch market overview from API', async () => {
      const mockMarketData = {
        indices: {
          SPY: { price: 485.20, change: 3.15, changePercent: 0.65 }
        },
        sectors: {
          Technology: { change: 1.2, changePercent: 0.8 }
        },
        timestamp: '2024-01-15T10:30:00Z'
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMarketData
      });
      
      const { result } = renderHook(() => useRealTimeData());
      
      let marketResult;
      await act(async () => {
        marketResult = await result.current.getMarketOverview();
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/market-overview');
      expect(marketResult).toEqual(mockMarketData);
    });

    it('should search stocks via API', async () => {
      const mockSearchResults = [
        {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          exchange: 'NASDAQ',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69
        },
        {
          symbol: 'GOOGL',
          name: 'Alphabet Inc.',
          exchange: 'NASDAQ',
          price: 2800.50,
          change: -15.25,
          changePercent: -0.54
        }
      ];
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResults
      });
      
      const { result } = renderHook(() => useRealTimeData());
      
      let searchResult;
      await act(async () => {
        searchResult = await result.current.searchStocks('apple');
      });
      
      expect(mockFetch).toHaveBeenCalledWith('/api/stocks/search?q=apple');
      expect(searchResult).toEqual(mockSearchResults);
    });

    it('should handle loading states during API calls', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(promise);
      
      const { result } = renderHook(() => useRealTimeData());
      
      // Start API call
      act(() => {
        result.current.getStockQuote('AAPL');
      });
      
      // Should be loading
      expect(result.current.isLoading).toBe(true);
      
      // Resolve the promise
      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({ symbol: 'AAPL', price: 150.25 })
        });
        await promise;
      });
      
      // Should not be loading anymore
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Connection Status Management', () => {
    it('should reflect WebSocket connection status', () => {
      mockWebSocket.connectionStatus = 'connected';
      mockWebSocket.isConnected = true;
      
      const { result } = renderHook(() => useRealTimeData());
      
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should handle connection status changes', () => {
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      // Initially disconnected
      expect(result.current.connectionStatus).toBe('disconnected');
      
      // Change to connecting
      mockWebSocket.connectionStatus = 'connecting';
      rerender();
      expect(result.current.connectionStatus).toBe('connecting');
      
      // Change to connected
      mockWebSocket.connectionStatus = 'connected';
      mockWebSocket.isConnected = true;
      rerender();
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should handle connection errors', () => {
      mockWebSocket.connectionStatus = 'error';
      mockWebSocket.isConnected = false;
      
      const { result } = renderHook(() => useRealTimeData());
      
      expect(result.current.connectionStatus).toBe('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed WebSocket messages', () => {
      mockWebSocket.lastMessage = {
        type: 'invalid-type',
        data: 'malformed data'
      };
      
      const { result } = renderHook(() => useRealTimeData());
      
      // Should not crash and should not update data
      expect(result.current.stockData).toEqual({});
      expect(result.current.marketData).toBe(null);
    });

    it('should handle API response errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      const { result } = renderHook(() => useRealTimeData());
      
      await act(async () => {
        try {
          await result.current.getStockQuote('INVALID');
        } catch (error) {
          expect(error.message).toContain('404');
        }
      });
      
      expect(result.current.error).toBe('Failed to fetch stock quote');
    });

    it('should clear errors on successful operations', async () => {
      const { result } = renderHook(() => useRealTimeData());
      
      // Set an error
      act(() => {
        result.current.error = 'Previous error';
      });
      
      // Successful API call should clear error
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ symbol: 'AAPL', price: 150.25 })
      });
      
      await act(async () => {
        await result.current.getStockQuote('AAPL');
      });
      
      expect(result.current.error).toBe(null);
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockFetch.mockRejectedValueOnce(timeoutError);
      
      const { result } = renderHook(() => useRealTimeData());
      
      await act(async () => {
        try {
          await result.current.getStockQuote('AAPL');
        } catch (error) {
          expect(error.message).toBe('Request timeout');
        }
      });
      
      expect(result.current.error).toBe('Failed to fetch stock quote');
    });
  });

  describe('Data Persistence and Caching', () => {
    it('should maintain stock data across re-renders', () => {
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50,
          changePercent: 1.69,
          timestamp: '2024-01-15T10:30:00Z'
        }
      };
      
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      expect(result.current.stockData['AAPL']).toBeDefined();
      
      // Re-render should maintain data
      rerender();
      
      expect(result.current.stockData['AAPL']).toBeDefined();
      expect(result.current.stockData['AAPL'].price).toBe(150.25);
    });

    it('should update timestamp on new data', () => {
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      const firstTimestamp = '2024-01-15T10:30:00Z';
      const secondTimestamp = '2024-01-15T10:31:00Z';
      
      // First update
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 150.25,
          timestamp: firstTimestamp
        }
      };
      rerender();
      
      expect(result.current.lastUpdate).toBe(firstTimestamp);
      
      // Second update
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 151.00,
          timestamp: secondTimestamp
        }
      };
      rerender();
      
      expect(result.current.lastUpdate).toBe(secondTimestamp);
    });

    it('should handle stale data gracefully', () => {
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      const newerTimestamp = '2024-01-15T10:31:00Z';
      const olderTimestamp = '2024-01-15T10:30:00Z';
      
      // Newer data first
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 151.00,
          timestamp: newerTimestamp
        }
      };
      rerender();
      
      // Older data should not overwrite newer data
      mockWebSocket.lastMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 150.00,
          timestamp: olderTimestamp
        }
      };
      rerender();
      
      // Should keep the newer data
      expect(result.current.stockData['AAPL'].price).toBe(151.00);
      expect(result.current.lastUpdate).toBe(newerTimestamp);
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce rapid API calls', async () => {
      const { result } = renderHook(() => useRealTimeData());
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ symbol: 'AAPL', price: 150.25 })
      });
      
      // Make multiple rapid calls
      await act(async () => {
        result.current.getStockQuote('AAPL');
        result.current.getStockQuote('AAPL');
        result.current.getStockQuote('AAPL');
      });
      
      // Should only make one actual API call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle high-frequency updates efficiently', () => {
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      // Simulate 100 rapid updates
      for (let i = 0; i < 100; i++) {
        mockWebSocket.lastMessage = {
          type: 'stock-update',
          data: {
            symbol: 'AAPL',
            price: 150 + i * 0.01,
            timestamp: new Date(Date.now() + i * 1000).toISOString()
          }
        };
        rerender();
      }
      
      // Should only keep the latest data
      expect(result.current.stockData['AAPL'].price).toBe(150.99);
    });

    it('should limit memory usage for large datasets', () => {
      const { result, rerender } = renderHook(() => useRealTimeData());
      
      // Add many stocks
      for (let i = 0; i < 1000; i++) {
        mockWebSocket.lastMessage = {
          type: 'stock-update',
          data: {
            symbol: `STOCK${i}`,
            price: 100 + i,
            timestamp: new Date().toISOString()
          }
        };
        rerender();
      }
      
      // Should limit the number of stored stocks
      const stockCount = Object.keys(result.current.stockData).length;
      expect(stockCount).toBeLessThanOrEqual(500); // Assuming a limit of 500
    });
  });

  describe('Subscription Management', () => {
    it('should track active subscriptions', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.subscribeToStock('AAPL');
        result.current.subscribeToStock('GOOGL');
        result.current.subscribeToMarket();
      });
      
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('AAPL');
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('GOOGL');
      expect(mockWebSocket.subscribe).toHaveBeenCalledWith('market');
    });

    it('should prevent duplicate subscriptions', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.subscribeToStock('AAPL');
        result.current.subscribeToStock('AAPL'); // Duplicate
      });
      
      expect(mockWebSocket.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should clean up subscriptions on unmount', () => {
      const { result, unmount } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.subscribeToStock('AAPL');
        result.current.subscribeToMarket();
      });
      
      unmount();
      
      expect(mockWebSocket.unsubscribe).toHaveBeenCalledWith('AAPL');
      expect(mockWebSocket.unsubscribe).toHaveBeenCalledWith('market');
    });
  });
});