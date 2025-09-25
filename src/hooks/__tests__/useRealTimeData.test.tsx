import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealTimeData } from '../useRealTimeData';
import { useWebSocket } from '../useWebSocket';

// Mock useWebSocket hook
vi.mock('../useWebSocket');

const mockUseWebSocket = vi.mocked(useWebSocket);

// Mock console
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('useRealTimeData Hook', () => {
  let mockWebSocketReturn;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock WebSocket return
    mockWebSocketReturn = {
      connectionStatus: 'connected',
      sendMessage: vi.fn(),
      lastMessage: null,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnect: vi.fn()
    };
    
    mockUseWebSocket.mockReturnValue(mockWebSocketReturn);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useRealTimeData());

      expect(result.current.stocks).toEqual({});
      expect(result.current.marketOverview).toBeNull();
      expect(result.current.news).toEqual([]);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.subscribedSymbols).toEqual(new Set());
      expect(result.current.error).toBeNull();
    });

    it('should initialize WebSocket with correct URL', () => {
      renderHook(() => useRealTimeData());

      expect(mockUseWebSocket).toHaveBeenCalledWith(
        'ws://localhost:8080',
        expect.objectContaining({
          onMessage: expect.any(Function),
          onOpen: expect.any(Function),
          onClose: expect.any(Function),
          onError: expect.any(Function),
          reconnectAttempts: 5,
          reconnectInterval: 3000
        })
      );
    });

    it('should handle custom WebSocket URL', () => {
      const customUrl = 'ws://custom-server:9090';
      renderHook(() => useRealTimeData({ wsUrl: customUrl }));

      expect(mockUseWebSocket).toHaveBeenCalledWith(
        customUrl,
        expect.any(Object)
      );
    });

    it('should handle custom options', () => {
      const options = {
        reconnectAttempts: 10,
        reconnectInterval: 5000,
        autoSubscribe: false
      };
      
      renderHook(() => useRealTimeData(options));

      expect(mockUseWebSocket).toHaveBeenCalledWith(
        'ws://localhost:8080',
        expect.objectContaining({
          reconnectAttempts: 10,
          reconnectInterval: 5000
        })
      );
    });
  });

  describe('Stock Subscription Management', () => {
    it('should subscribe to stock updates', () => {
      const { result } = renderHook(() => useRealTimeData());

      act(() => {
        result.current.subscribeToStock('AAPL');
      });

      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledWith({
        type: 'subscribe',
        symbol: 'AAPL'
      });
      expect(result.current.subscribedSymbols.has('AAPL')).toBe(true);
    });

    it('should not subscribe to same stock twice', () => {
      const { result } = renderHook(() => useRealTimeData());

      act(() => {
        result.current.subscribeToStock('AAPL');
        result.current.subscribeToStock('AAPL'); // Duplicate
      });

      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledTimes(1);
      expect(result.current.subscribedSymbols.size).toBe(1);
    });

    it('should validate stock symbol before subscribing', () => {
      const { result } = renderHook(() => useRealTimeData());

      act(() => {
        result.current.subscribeToStock(''); // Invalid symbol
      });

      expect(mockWebSocketReturn.sendMessage).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid stock symbol:',
        ''
      );
    });

    it('should unsubscribe from stock updates', () => {
      const { result } = renderHook(() => useRealTimeData());

      // First subscribe
      act(() => {
        result.current.subscribeToStock('AAPL');
      });

      // Then unsubscribe
      act(() => {
        result.current.unsubscribeFromStock('AAPL');
      });

      expect(mockWebSocketReturn.sendMessage).toHaveBeenLastCalledWith({
        type: 'unsubscribe',
        symbol: 'AAPL'
      });
      expect(result.current.subscribedSymbols.has('AAPL')).toBe(false);
    });

    it('should handle unsubscribing from non-subscribed stock', () => {
      const { result } = renderHook(() => useRealTimeData());

      act(() => {
        result.current.unsubscribeFromStock('AAPL');
      });

      expect(mockWebSocketReturn.sendMessage).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Not subscribed to stock:',
        'AAPL'
      );
    });

    it('should subscribe to multiple stocks', () => {
      const { result } = renderHook(() => useRealTimeData());
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      act(() => {
        result.current.subscribeToMultipleStocks(symbols);
      });

      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledTimes(3);
      symbols.forEach(symbol => {
        expect(result.current.subscribedSymbols.has(symbol)).toBe(true);
      });
    });

    it('should unsubscribe from all stocks', () => {
      const { result } = renderHook(() => useRealTimeData());
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      // Subscribe to multiple stocks
      act(() => {
        result.current.subscribeToMultipleStocks(symbols);
      });

      // Unsubscribe from all
      act(() => {
        result.current.unsubscribeFromAll();
      });

      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledTimes(6); // 3 subscribe + 3 unsubscribe
      expect(result.current.subscribedSymbols.size).toBe(0);
    });
  });

  describe('Message Handling', () => {
    it('should handle stock price updates', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const stockUpdate = {
        type: 'stockUpdate',
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 1000000,
        timestamp: Date.now()
      };

      // Simulate receiving message
      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(stockUpdate);
      });

      expect(result.current.stocks['AAPL']).toEqual(stockUpdate);
    });

    it('should handle market overview updates', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const marketUpdate = {
        type: 'marketOverview',
        indices: {
          'S&P 500': { value: 4200.50, change: 15.25 },
          'NASDAQ': { value: 13500.75, change: -25.50 }
        },
        timestamp: Date.now()
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(marketUpdate);
      });

      expect(result.current.marketOverview).toEqual(marketUpdate);
    });

    it('should handle news updates', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const newsUpdate = {
        type: 'newsUpdate',
        articles: [
          {
            id: '1',
            title: 'Market News 1',
            summary: 'Summary 1',
            timestamp: Date.now(),
            source: 'Reuters'
          },
          {
            id: '2',
            title: 'Market News 2',
            summary: 'Summary 2',
            timestamp: Date.now(),
            source: 'Bloomberg'
          }
        ]
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(newsUpdate);
      });

      expect(result.current.news).toEqual(newsUpdate.articles);
    });

    it('should handle connection status messages', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const statusMessage = {
        type: 'connectionStatus',
        status: 'connected',
        clientId: 'client-123',
        timestamp: Date.now()
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(statusMessage);
      });

      expect(result.current.clientId).toBe('client-123');
    });

    it('should handle error messages', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const errorMessage = {
        type: 'error',
        message: 'Subscription failed',
        code: 'SUBSCRIPTION_ERROR',
        symbol: 'INVALID'
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(errorMessage);
      });

      expect(result.current.error).toEqual(errorMessage);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Real-time data error:',
        errorMessage
      );
    });

    it('should handle unknown message types gracefully', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const unknownMessage = {
        type: 'unknownType',
        data: 'some data'
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(unknownMessage);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown message type:',
        'unknownType',
        unknownMessage
      );
    });

    it('should handle malformed messages', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const malformedMessage = {
        // Missing type field
        data: 'some data'
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(malformedMessage);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Malformed message received:',
        malformedMessage
      );
    });
  });

  describe('Connection Status Handling', () => {
    it('should update connection status on WebSocket events', () => {
      mockWebSocketReturn.connectionStatus = 'connecting';
      const { result } = renderHook(() => useRealTimeData());

      expect(result.current.connectionStatus).toBe('connecting');
      expect(result.current.isConnected).toBe(false);
    });

    it('should handle connection open', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        const onOpen = mockUseWebSocket.mock.calls[0][1].onOpen;
        onOpen(new Event('open'));
      });

      expect(result.current.lastConnectedAt).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith('Real-time data connection established');
    });

    it('should handle connection close', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        const onClose = mockUseWebSocket.mock.calls[0][1].onClose;
        onClose({ code: 1000, reason: 'Normal closure', wasClean: true });
      });

      expect(result.current.lastDisconnectedAt).toBeGreaterThan(0);
      expect(consoleSpy).toHaveBeenCalledWith('Real-time data connection closed:', {
        code: 1000,
        reason: 'Normal closure',
        wasClean: true
      });
    });

    it('should handle connection errors', () => {
      const { result } = renderHook(() => useRealTimeData());
      const error = new Error('Connection failed');
      
      act(() => {
        const onError = mockUseWebSocket.mock.calls[0][1].onError;
        onError(error);
      });

      expect(result.current.error).toEqual(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Real-time data connection error:',
        error
      );
    });

    it('should resubscribe on reconnection', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      // Subscribe to some stocks
      act(() => {
        result.current.subscribeToMultipleStocks(['AAPL', 'GOOGL']);
      });

      // Clear previous calls
      mockWebSocketReturn.sendMessage.mockClear();

      // Simulate reconnection
      act(() => {
        const onOpen = mockUseWebSocket.mock.calls[0][1].onOpen;
        onOpen(new Event('open'));
      });

      // Should resubscribe to all previously subscribed stocks
      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledWith({
        type: 'subscribe',
        symbol: 'AAPL'
      });
      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledWith({
        type: 'subscribe',
        symbol: 'GOOGL'
      });
    });
  });

  describe('Data Management', () => {
    it('should get stock data by symbol', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const stockData = {
        type: 'stockUpdate',
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69
      };

      // Add stock data
      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(stockData);
      });

      expect(result.current.getStockData('AAPL')).toEqual(stockData);
      expect(result.current.getStockData('GOOGL')).toBeNull();
    });

    it('should check if stock is subscribed', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      act(() => {
        result.current.subscribeToStock('AAPL');
      });

      expect(result.current.isSubscribed('AAPL')).toBe(true);
      expect(result.current.isSubscribed('GOOGL')).toBe(false);
    });

    it('should get all subscribed symbols as array', () => {
      const { result } = renderHook(() => useRealTimeData());
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      
      act(() => {
        result.current.subscribeToMultipleStocks(symbols);
      });

      const subscribedArray = result.current.getSubscribedSymbols();
      expect(subscribedArray).toHaveLength(3);
      expect(subscribedArray.sort()).toEqual(symbols.sort());
    });

    it('should clear all data', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      // Add some data
      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage({
          type: 'stockUpdate',
          symbol: 'AAPL',
          price: 150.25
        });
        onMessage({
          type: 'marketOverview',
          indices: { 'S&P 500': { value: 4200 } }
        });
        onMessage({
          type: 'newsUpdate',
          articles: [{ id: '1', title: 'News' }]
        });
      });

      // Clear all data
      act(() => {
        result.current.clearAllData();
      });

      expect(result.current.stocks).toEqual({});
      expect(result.current.marketOverview).toBeNull();
      expect(result.current.news).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should limit news articles to maximum count', () => {
      const { result } = renderHook(() => useRealTimeData({ maxNewsItems: 2 }));
      
      const newsUpdate = {
        type: 'newsUpdate',
        articles: [
          { id: '1', title: 'News 1' },
          { id: '2', title: 'News 2' },
          { id: '3', title: 'News 3' },
          { id: '4', title: 'News 4' }
        ]
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(newsUpdate);
      });

      expect(result.current.news).toHaveLength(2);
      expect(result.current.news[0]).toEqual({ id: '3', title: 'News 3' });
      expect(result.current.news[1]).toEqual({ id: '4', title: 'News 4' });
    });
  });

  describe('Performance and Optimization', () => {
    it('should throttle subscription requests', () => {
      const { result } = renderHook(() => 
        useRealTimeData({ subscriptionThrottle: 100 })
      );

      // Send multiple rapid subscription requests
      act(() => {
        result.current.subscribeToStock('AAPL');
        result.current.subscribeToStock('GOOGL');
        result.current.subscribeToStock('MSFT');
      });

      // Only first request should be sent immediately
      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledTimes(1);

      // Advance timer to allow throttled requests
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledTimes(3);
    });

    it('should debounce rapid data updates', () => {
      const onStockUpdate = vi.fn();
      const { result } = renderHook(() => 
        useRealTimeData({ 
          onStockUpdate,
          updateDebounce: 50
        })
      );

      // Send multiple rapid updates for same stock
      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage({ type: 'stockUpdate', symbol: 'AAPL', price: 150.00 });
        onMessage({ type: 'stockUpdate', symbol: 'AAPL', price: 150.25 });
        onMessage({ type: 'stockUpdate', symbol: 'AAPL', price: 150.50 });
      });

      // Callback should not be called immediately
      expect(onStockUpdate).not.toHaveBeenCalled();

      // Advance timer to trigger debounced callback
      act(() => {
        vi.advanceTimersByTime(60);
      });

      expect(onStockUpdate).toHaveBeenCalledTimes(1);
      expect(onStockUpdate).toHaveBeenCalledWith({
        type: 'stockUpdate',
        symbol: 'AAPL',
        price: 150.50
      });
    });

    it('should handle memory cleanup for old data', () => {
      const { result } = renderHook(() => 
        useRealTimeData({ maxStockHistory: 2 })
      );

      // Add multiple stock updates
      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage({ type: 'stockUpdate', symbol: 'AAPL', price: 150.00, timestamp: 1 });
        onMessage({ type: 'stockUpdate', symbol: 'GOOGL', price: 2500.00, timestamp: 2 });
        onMessage({ type: 'stockUpdate', symbol: 'MSFT', price: 300.00, timestamp: 3 });
      });

      // Should only keep the latest 2 stocks
      expect(Object.keys(result.current.stocks)).toHaveLength(2);
      expect(result.current.stocks['AAPL']).toBeUndefined();
      expect(result.current.stocks['GOOGL']).toBeDefined();
      expect(result.current.stocks['MSFT']).toBeDefined();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle WebSocket not connected', () => {
      mockWebSocketReturn.connectionStatus = 'disconnected';
      const { result } = renderHook(() => useRealTimeData());

      act(() => {
        result.current.subscribeToStock('AAPL');
      });

      expect(mockWebSocketReturn.sendMessage).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Cannot subscribe: WebSocket not connected'
      );
    });

    it('should handle subscription errors gracefully', () => {
      mockWebSocketReturn.sendMessage.mockImplementation(() => {
        throw new Error('Send failed');
      });

      const { result } = renderHook(() => useRealTimeData());

      act(() => {
        result.current.subscribeToStock('AAPL');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to subscribe to stock:',
        'AAPL',
        expect.any(Error)
      );
    });

    it('should recover from temporary connection loss', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      // Subscribe to stocks
      act(() => {
        result.current.subscribeToMultipleStocks(['AAPL', 'GOOGL']);
      });

      // Simulate connection loss
      mockWebSocketReturn.connectionStatus = 'disconnected';
      act(() => {
        const onClose = mockUseWebSocket.mock.calls[0][1].onClose;
        onClose({ code: 1006, reason: 'Abnormal closure', wasClean: false });
      });

      // Simulate reconnection
      mockWebSocketReturn.connectionStatus = 'connected';
      mockWebSocketReturn.sendMessage.mockClear();
      
      act(() => {
        const onOpen = mockUseWebSocket.mock.calls[0][1].onOpen;
        onOpen(new Event('open'));
      });

      // Should resubscribe to all stocks
      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid stock data gracefully', () => {
      const { result } = renderHook(() => useRealTimeData());
      
      const invalidStockUpdate = {
        type: 'stockUpdate',
        // Missing required fields like symbol, price
        timestamp: Date.now()
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(invalidStockUpdate);
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid stock update received:',
        invalidStockUpdate
      );
    });
  });

  describe('Custom Event Callbacks', () => {
    it('should call onStockUpdate callback', () => {
      const onStockUpdate = vi.fn();
      const { result } = renderHook(() => 
        useRealTimeData({ onStockUpdate })
      );
      
      const stockUpdate = {
        type: 'stockUpdate',
        symbol: 'AAPL',
        price: 150.25
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(stockUpdate);
      });

      expect(onStockUpdate).toHaveBeenCalledWith(stockUpdate);
    });

    it('should call onMarketUpdate callback', () => {
      const onMarketUpdate = vi.fn();
      const { result } = renderHook(() => 
        useRealTimeData({ onMarketUpdate })
      );
      
      const marketUpdate = {
        type: 'marketOverview',
        indices: { 'S&P 500': { value: 4200 } }
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(marketUpdate);
      });

      expect(onMarketUpdate).toHaveBeenCalledWith(marketUpdate);
    });

    it('should call onNewsUpdate callback', () => {
      const onNewsUpdate = vi.fn();
      const { result } = renderHook(() => 
        useRealTimeData({ onNewsUpdate })
      );
      
      const newsUpdate = {
        type: 'newsUpdate',
        articles: [{ id: '1', title: 'News' }]
      };

      act(() => {
        const onMessage = mockUseWebSocket.mock.calls[0][1].onMessage;
        onMessage(newsUpdate);
      });

      expect(onNewsUpdate).toHaveBeenCalledWith(newsUpdate);
    });

    it('should call onConnectionChange callback', () => {
      const onConnectionChange = vi.fn();
      const { result } = renderHook(() => 
        useRealTimeData({ onConnectionChange })
      );

      // Simulate connection status change
      mockWebSocketReturn.connectionStatus = 'connecting';
      
      act(() => {
        const onOpen = mockUseWebSocket.mock.calls[0][1].onOpen;
        onOpen(new Event('open'));
      });

      expect(onConnectionChange).toHaveBeenCalledWith('connected');
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup on unmount', () => {
      const { result, unmount } = renderHook(() => useRealTimeData());
      
      // Subscribe to some stocks
      act(() => {
        result.current.subscribeToMultipleStocks(['AAPL', 'GOOGL']);
      });

      unmount();

      // Should unsubscribe from all stocks
      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledWith({
        type: 'unsubscribe',
        symbol: 'AAPL'
      });
      expect(mockWebSocketReturn.sendMessage).toHaveBeenCalledWith({
        type: 'unsubscribe',
        symbol: 'GOOGL'
      });
    });

    it('should clear timers on cleanup', () => {
      const { unmount } = renderHook(() => 
        useRealTimeData({ 
          subscriptionThrottle: 100,
          updateDebounce: 50
        })
      );

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});