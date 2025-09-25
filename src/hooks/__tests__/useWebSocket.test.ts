import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

const mockIo = vi.mocked(io);

const createMockSocket = () => {
  const mockSocket = {
    connected: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
    id: 'mock-socket-id'
  };
  
  return mockSocket;
};

describe('useWebSocket Hook', () => {
  let mockSocket: ReturnType<typeof createMockSocket>;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket = createMockSocket();
    mockIo.mockReturnValue(mockSocket as any);
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useWebSocket());
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.lastMessage).toBe(null);
      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.subscribe).toBe('function');
      expect(typeof result.current.unsubscribe).toBe('function');
    });

    it('should create socket instance with default URL', () => {
      renderHook(() => useWebSocket());
      
      expect(mockIo).toHaveBeenCalledWith('ws://localhost:3001', {
        autoConnect: false,
        transports: ['websocket'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
    });

    it('should create socket instance with custom URL', () => {
      const customUrl = 'ws://custom-server:8080';
      renderHook(() => useWebSocket(customUrl));
      
      expect(mockIo).toHaveBeenCalledWith(customUrl, expect.any(Object));
    });

    it('should create socket instance with custom options', () => {
      const customOptions = {
        timeout: 10000,
        reconnectionAttempts: 10
      };
      
      renderHook(() => useWebSocket(undefined, customOptions));
      
      expect(mockIo).toHaveBeenCalledWith('ws://localhost:3001', 
        expect.objectContaining(customOptions)
      );
    });
  });

  describe('Connection Management', () => {
    it('should connect to WebSocket server', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        result.current.connect();
      });
      
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should disconnect from WebSocket server', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        result.current.disconnect();
      });
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should update connection status on connect', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      // Simulate connection event
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      });
      
      expect(result.current.isConnected).toBe(true);
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should update connection status on disconnect', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      // First connect
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      });
      
      // Then disconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1];
        disconnectHandler?.('transport close');
      });
      
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
    });

    it('should handle connection errors', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const errorMessage = 'Connection failed';
      
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect_error'
        )?.[1];
        errorHandler?.(new Error(errorMessage));
      });
      
      expect(result.current.connectionStatus).toBe('error');
      expect(result.current.isConnected).toBe(false);
    });

    it('should handle reconnection attempts', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        const reconnectingHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'reconnecting'
        )?.[1];
        reconnectingHandler?.(1);
      });
      
      expect(result.current.connectionStatus).toBe('reconnecting');
    });

    it('should handle successful reconnection', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        const reconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'reconnect'
        )?.[1];
        reconnectHandler?.(2);
      });
      
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });

    it('should handle failed reconnection', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        const reconnectFailedHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'reconnect_failed'
        )?.[1];
        reconnectFailedHandler?.();
      });
      
      expect(result.current.connectionStatus).toBe('failed');
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Message Handling', () => {
    it('should send messages through WebSocket', () => {
      const { result } = renderHook(() => useWebSocket());
      
      const message = { type: 'test', data: 'hello' };
      
      act(() => {
        result.current.sendMessage('test-event', message);
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('test-event', message);
    });

    it('should receive and store last message', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const testMessage = {
        type: 'stock-update',
        data: {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.50
        }
      };
      
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'message'
        )?.[1];
        messageHandler?.(testMessage);
      });
      
      expect(result.current.lastMessage).toEqual(testMessage);
    });

    it('should handle stock price updates', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const stockUpdate = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        timestamp: '2024-01-15T10:30:00Z'
      };
      
      act(() => {
        const stockUpdateHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'stock-update'
        )?.[1];
        stockUpdateHandler?.(stockUpdate);
      });
      
      expect(result.current.lastMessage).toEqual({
        type: 'stock-update',
        data: stockUpdate
      });
    });

    it('should handle market overview updates', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const marketUpdate = {
        indices: {
          SPY: { price: 485.20, change: 3.15 }
        },
        timestamp: '2024-01-15T10:30:00Z'
      };
      
      act(() => {
        const marketUpdateHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'market-update'
        )?.[1];
        marketUpdateHandler?.(marketUpdate);
      });
      
      expect(result.current.lastMessage).toEqual({
        type: 'market-update',
        data: marketUpdate
      });
    });

    it('should handle ping-pong messages', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        const pingHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'ping'
        )?.[1];
        pingHandler?.();
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('pong');
    });

    it('should not send messages when disconnected', () => {
      const { result } = renderHook(() => useWebSocket());
      
      // Ensure socket is disconnected
      mockSocket.connected = false;
      
      const message = { type: 'test', data: 'hello' };
      
      act(() => {
        result.current.sendMessage('test-event', message);
      });
      
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to stock updates', () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        result.current.subscribe('AAPL');
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        type: 'stock',
        symbol: 'AAPL'
      });
    });

    it('should unsubscribe from stock updates', () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        result.current.unsubscribe('AAPL');
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe', {
        type: 'stock',
        symbol: 'AAPL'
      });
    });

    it('should subscribe to market updates', () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        result.current.subscribe('market');
      });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        type: 'market'
      });
    });

    it('should handle subscription confirmations', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const subscriptionConfirm = {
        type: 'stock',
        symbol: 'AAPL',
        status: 'subscribed'
      };
      
      act(() => {
        const subscribeHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'subscribed'
        )?.[1];
        subscribeHandler?.(subscriptionConfirm);
      });
      
      expect(result.current.lastMessage).toEqual({
        type: 'subscribed',
        data: subscriptionConfirm
      });
    });

    it('should handle unsubscription confirmations', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const unsubscriptionConfirm = {
        type: 'stock',
        symbol: 'AAPL',
        status: 'unsubscribed'
      };
      
      act(() => {
        const unsubscribeHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'unsubscribed'
        )?.[1];
        unsubscribeHandler?.(unsubscriptionConfirm);
      });
      
      expect(result.current.lastMessage).toEqual({
        type: 'unsubscribed',
        data: unsubscriptionConfirm
      });
    });

    it('should handle subscription errors', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const subscriptionError = {
        type: 'stock',
        symbol: 'INVALID',
        error: 'Invalid stock symbol'
      };
      
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'subscription-error'
        )?.[1];
        errorHandler?.(subscriptionError);
      });
      
      expect(result.current.lastMessage).toEqual({
        type: 'subscription-error',
        data: subscriptionError
      });
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup event listeners on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket());
      
      unmount();
      
      expect(mockSocket.removeAllListeners).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should not create multiple socket instances', () => {
      const { rerender } = renderHook(() => useWebSocket());
      
      rerender();
      rerender();
      
      expect(mockIo).toHaveBeenCalledTimes(1);
    });

    it('should handle component re-renders gracefully', () => {
      const { result, rerender } = renderHook(() => useWebSocket());
      
      const initialConnect = result.current.connect;
      
      rerender();
      
      // Functions should remain stable
      expect(result.current.connect).toBe(initialConnect);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed messages gracefully', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const malformedMessage = 'invalid-json';
      
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'message'
        )?.[1];
        messageHandler?.(malformedMessage);
      });
      
      // Should not crash and should not update lastMessage
      expect(result.current.lastMessage).toBe(null);
    });

    it('should handle socket errors gracefully', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const socketError = new Error('Socket error');
      
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'error'
        )?.[1];
        errorHandler?.(socketError);
      });
      
      expect(result.current.connectionStatus).toBe('error');
    });

    it('should handle network timeouts', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      act(() => {
        const timeoutHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect_timeout'
        )?.[1];
        timeoutHandler?.();
      });
      
      expect(result.current.connectionStatus).toBe('timeout');
    });

    it('should recover from temporary network issues', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      // Simulate network error
      act(() => {
        const errorHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect_error'
        )?.[1];
        errorHandler?.(new Error('Network error'));
      });
      
      expect(result.current.connectionStatus).toBe('error');
      
      // Simulate successful reconnection
      act(() => {
        const reconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'reconnect'
        )?.[1];
        reconnectHandler?.(1);
      });
      
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should debounce rapid subscription changes', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      // Rapidly subscribe and unsubscribe
      act(() => {
        result.current.subscribe('AAPL');
        result.current.unsubscribe('AAPL');
        result.current.subscribe('AAPL');
      });
      
      // Should only emit the final subscription
      await waitFor(() => {
        expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
          type: 'stock',
          symbol: 'AAPL'
        });
      });
    });

    it('should handle high-frequency message updates efficiently', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      // Simulate rapid price updates
      const updates = Array.from({ length: 100 }, (_, i) => ({
        symbol: 'AAPL',
        price: 150 + i * 0.01,
        timestamp: Date.now() + i
      }));
      
      act(() => {
        const messageHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'stock-update'
        )?.[1];
        
        updates.forEach(update => {
          messageHandler?.(update);
        });
      });
      
      // Should only keep the latest message
      expect(result.current.lastMessage?.data.price).toBe(150.99);
    });

    it('should limit memory usage for message history', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      // Send many messages
      for (let i = 0; i < 1000; i++) {
        act(() => {
          const messageHandler = mockSocket.on.mock.calls.find(
            call => call[0] === 'message'
          )?.[1];
          messageHandler?.({ id: i, data: `message-${i}` });
        });
      }
      
      // Should only keep the latest message, not all 1000
      expect(result.current.lastMessage?.id).toBe(999);
    });
  });

  describe('Custom Event Handling', () => {
    it('should handle custom events with callbacks', async () => {
      const onStockUpdate = vi.fn();
      const onMarketUpdate = vi.fn();
      
      const { result } = renderHook(() => 
        useWebSocket(undefined, {
          onStockUpdate,
          onMarketUpdate
        })
      );
      
      const stockUpdate = {
        symbol: 'AAPL',
        price: 150.25
      };
      
      act(() => {
        const stockUpdateHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'stock-update'
        )?.[1];
        stockUpdateHandler?.(stockUpdate);
      });
      
      expect(onStockUpdate).toHaveBeenCalledWith(stockUpdate);
    });

    it('should handle authentication events', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const authData = {
        token: 'jwt-token',
        user: { id: 1, name: 'Test User' }
      };
      
      act(() => {
        const authHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'authenticated'
        )?.[1];
        authHandler?.(authData);
      });
      
      expect(result.current.lastMessage).toEqual({
        type: 'authenticated',
        data: authData
      });
    });

    it('should handle rate limiting notifications', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      const rateLimitData = {
        limit: 100,
        remaining: 0,
        resetTime: Date.now() + 60000
      };
      
      act(() => {
        const rateLimitHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'rate-limit'
        )?.[1];
        rateLimitHandler?.(rateLimitData);
      });
      
      expect(result.current.lastMessage).toEqual({
        type: 'rate-limit',
        data: rateLimitData
      });
    });
  });

  describe('Connection State Persistence', () => {
    it('should maintain connection state across re-renders', () => {
      const { result, rerender } = renderHook(() => useWebSocket());
      
      // Connect
      act(() => {
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      });
      
      expect(result.current.isConnected).toBe(true);
      
      // Re-render
      rerender();
      
      // State should persist
      expect(result.current.isConnected).toBe(true);
    });

    it('should restore subscriptions after reconnection', async () => {
      const { result } = renderHook(() => useWebSocket());
      
      // Subscribe to stocks
      act(() => {
        result.current.subscribe('AAPL');
        result.current.subscribe('GOOGL');
      });
      
      // Simulate disconnect and reconnect
      act(() => {
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1];
        disconnectHandler?.('transport close');
      });
      
      act(() => {
        const reconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'reconnect'
        )?.[1];
        reconnectHandler?.(1);
      });
      
      // Should re-subscribe to previous stocks
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        type: 'stock',
        symbol: 'AAPL'
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        type: 'stock',
        symbol: 'GOOGL'
      });
    });
  });
});