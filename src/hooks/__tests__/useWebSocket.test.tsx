import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url = '';
  onopen = null;
  onclose = null;
  onmessage = null;
  onerror = null;
  
  constructor(url) {
    this.url = url;
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Simulate echo for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: JSON.stringify({ type: 'echo', data: JSON.parse(data) })
        });
      }
    }, 5);
  }

  close(code, reason) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose({ code, reason, wasClean: true });
      }
    }, 5);
  }

  // Helper methods for testing
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({
        data: JSON.stringify(data)
      });
    }
  }

  simulateError(error) {
    if (this.onerror) {
      this.onerror(error);
    }
  }

  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code, reason, wasClean: code === 1000 });
    }
  }
}

// Mock global WebSocket
Object.defineProperty(global, 'WebSocket', {
  writable: true,
  value: MockWebSocket
});

// Mock console for logging
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('useWebSocket Hook', () => {
  let mockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Capture the WebSocket instance
    const OriginalWebSocket = global.WebSocket;
    global.WebSocket = vi.fn().mockImplementation((url) => {
      mockWebSocket = new OriginalWebSocket(url);
      return mockWebSocket;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      expect(result.current.connectionStatus).toBe('connecting');
      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080');

      // Wait for connection to open
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should handle connection with options', async () => {
      const options = {
        reconnectAttempts: 5,
        reconnectInterval: 2000,
        heartbeatInterval: 30000
      };

      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', options)
      );

      expect(result.current.connectionStatus).toBe('connecting');
      
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should handle connection errors', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://invalid-url')
      );

      act(() => {
        vi.advanceTimersByTime(20);
        mockWebSocket.simulateError(new Error('Connection failed'));
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
        expect(result.current.error).toEqual(expect.any(Error));
      });
    });

    it('should handle connection close', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate close
      act(() => {
        mockWebSocket.simulateClose(1000, 'Normal closure');
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });
    });

    it('should handle abnormal connection close', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate abnormal close
      act(() => {
        mockWebSocket.simulateClose(1006, 'Abnormal closure');
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });
    });
  });

  describe('Message Handling', () => {
    it('should send messages when connected', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const sendSpy = vi.spyOn(mockWebSocket, 'send');
      const testMessage = { type: 'test', data: 'hello' };

      act(() => {
        result.current.sendMessage(testMessage);
      });

      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage));
    });

    it('should queue messages when not connected', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      const testMessage = { type: 'test', data: 'hello' };

      // Send message before connection is established
      act(() => {
        result.current.sendMessage(testMessage);
      });

      // Message should be queued
      expect(result.current.messageQueue).toHaveLength(1);
      expect(result.current.messageQueue[0]).toEqual(testMessage);

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Queue should be cleared after connection
      await waitFor(() => {
        expect(result.current.messageQueue).toHaveLength(0);
      });
    });

    it('should receive and parse messages', async () => {
      const onMessage = vi.fn();
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', { onMessage })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const testMessage = { type: 'stockUpdate', symbol: 'AAPL', price: 150.25 };

      act(() => {
        mockWebSocket.simulateMessage(testMessage);
      });

      expect(onMessage).toHaveBeenCalledWith(testMessage);
      expect(result.current.lastMessage).toEqual(testMessage);
    });

    it('should handle malformed messages gracefully', async () => {
      const onMessage = vi.fn();
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', { onMessage })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Send malformed JSON
      act(() => {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({ data: 'invalid json' });
        }
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      );
      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should handle message sending errors', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Mock send to throw error
      vi.spyOn(mockWebSocket, 'send').mockImplementation(() => {
        throw new Error('Send failed');
      });

      act(() => {
        result.current.sendMessage({ type: 'test' });
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to send WebSocket message:',
        expect.any(Error)
      );
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on abnormal close', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          reconnectAttempts: 3,
          reconnectInterval: 1000
        })
      );

      // Wait for initial connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate abnormal close
      act(() => {
        mockWebSocket.simulateClose(1006, 'Abnormal closure');
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
        expect(result.current.reconnectAttempts).toBe(1);
      });

      // Advance timer to trigger reconnection
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it('should not reconnect on normal close', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate normal close
      act(() => {
        mockWebSocket.simulateClose(1000, 'Normal closure');
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });

      // Should not attempt reconnection
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should stop reconnecting after max attempts', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          reconnectAttempts: 2,
          reconnectInterval: 100
        })
      );

      // Wait for initial connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate multiple abnormal closes
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockWebSocket.simulateClose(1006, 'Abnormal closure');
          vi.advanceTimersByTime(150);
        });
      }

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
        expect(result.current.reconnectAttempts).toBe(2);
      });
    });

    it('should reset reconnect attempts on successful connection', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          reconnectAttempts: 3,
          reconnectInterval: 100
        })
      );

      // Wait for initial connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate abnormal close and reconnection
      act(() => {
        mockWebSocket.simulateClose(1006, 'Abnormal closure');
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });

      // Trigger reconnection
      act(() => {
        vi.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
        expect(result.current.reconnectAttempts).toBe(0);
      });
    });
  });

  describe('Heartbeat/Ping-Pong', () => {
    it('should send heartbeat messages', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          heartbeatInterval: 1000
        })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const sendSpy = vi.spyOn(mockWebSocket, 'send');

      // Advance timer to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'ping', timestamp: expect.any(Number) })
      );
    });

    it('should handle pong responses', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          heartbeatInterval: 1000
        })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Send pong message
      act(() => {
        mockWebSocket.simulateMessage({
          type: 'pong',
          timestamp: Date.now()
        });
      });

      expect(result.current.lastPong).toBeGreaterThan(0);
    });

    it('should detect connection timeout', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          heartbeatInterval: 1000,
          heartbeatTimeout: 2000
        })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Advance timer past heartbeat timeout without pong
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });
    });
  });

  describe('Manual Connection Control', () => {
    it('should manually connect', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', { autoConnect: false })
      );

      expect(result.current.connectionStatus).toBe('disconnected');

      act(() => {
        result.current.connect();
      });

      expect(result.current.connectionStatus).toBe('connecting');

      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });
    });

    it('should manually disconnect', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const closeSpy = vi.spyOn(mockWebSocket, 'close');

      act(() => {
        result.current.disconnect();
      });

      expect(closeSpy).toHaveBeenCalledWith(1000, 'Manual disconnect');
    });

    it('should reconnect manually', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      act(() => {
        result.current.reconnect();
      });

      expect(result.current.connectionStatus).toBe('connecting');
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });
  });

  describe('Event Callbacks', () => {
    it('should call onOpen callback', async () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', { onOpen })
      );

      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
        expect(onOpen).toHaveBeenCalledWith(expect.any(Event));
      });
    });

    it('should call onClose callback', async () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', { onClose })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate close
      act(() => {
        mockWebSocket.simulateClose(1000, 'Normal closure');
      });

      expect(onClose).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 1000,
          reason: 'Normal closure',
          wasClean: true
        })
      );
    });

    it('should call onError callback', async () => {
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', { onError })
      );

      act(() => {
        vi.advanceTimersByTime(20);
        mockWebSocket.simulateError(new Error('Connection failed'));
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call onReconnect callback', async () => {
      const onReconnect = vi.fn();
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          onReconnect,
          reconnectInterval: 100
        })
      );

      // Wait for initial connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Simulate abnormal close
      act(() => {
        mockWebSocket.simulateClose(1006, 'Abnormal closure');
      });

      // Trigger reconnection
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(onReconnect).toHaveBeenCalledWith(1);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const closeSpy = vi.spyOn(mockWebSocket, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalledWith(1000, 'Component unmounted');
    });

    it('should clear timers on cleanup', async () => {
      const { result, unmount } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          heartbeatInterval: 1000,
          reconnectInterval: 2000
        })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle URL changes', async () => {
      let url = 'ws://localhost:8080';
      const { result, rerender } = renderHook(() => 
        useWebSocket(url)
      );

      // Wait for initial connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Change URL
      url = 'ws://localhost:8081';
      rerender();

      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      expect(global.WebSocket).toHaveBeenLastCalledWith('ws://localhost:8081');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle WebSocket constructor errors', () => {
      global.WebSocket = vi.fn().mockImplementation(() => {
        throw new Error('WebSocket not supported');
      });

      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080')
      );

      expect(result.current.connectionStatus).toBe('error');
      expect(result.current.error).toEqual(expect.any(Error));
    });

    it('should handle invalid URL', () => {
      const { result } = renderHook(() => 
        useWebSocket('invalid-url')
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Invalid WebSocket URL:',
        'invalid-url'
      );
    });

    it('should handle message queue overflow', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          maxQueueSize: 2
        })
      );

      // Send messages before connection
      act(() => {
        result.current.sendMessage({ type: 'msg1' });
        result.current.sendMessage({ type: 'msg2' });
        result.current.sendMessage({ type: 'msg3' }); // Should be dropped
      });

      expect(result.current.messageQueue).toHaveLength(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Message queue is full, dropping message:',
        { type: 'msg3' }
      );
    });
  });

  describe('Performance Considerations', () => {
    it('should throttle rapid messages', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          messageThrottle: 100
        })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      const sendSpy = vi.spyOn(mockWebSocket, 'send');

      // Send multiple rapid messages
      act(() => {
        result.current.sendMessage({ type: 'msg1' });
        result.current.sendMessage({ type: 'msg2' });
        result.current.sendMessage({ type: 'msg3' });
      });

      // Only first message should be sent immediately
      expect(sendSpy).toHaveBeenCalledTimes(1);

      // Advance timer to allow throttled messages
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(sendSpy).toHaveBeenCalledTimes(3);
    });

    it('should limit message history', async () => {
      const { result } = renderHook(() => 
        useWebSocket('ws://localhost:8080', {
          maxMessageHistory: 2
        })
      );

      // Wait for connection
      act(() => {
        vi.advanceTimersByTime(20);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      // Receive multiple messages
      act(() => {
        mockWebSocket.simulateMessage({ type: 'msg1' });
        mockWebSocket.simulateMessage({ type: 'msg2' });
        mockWebSocket.simulateMessage({ type: 'msg3' });
      });

      expect(result.current.messageHistory).toHaveLength(2);
      expect(result.current.messageHistory[0]).toEqual({ type: 'msg2' });
      expect(result.current.messageHistory[1]).toEqual({ type: 'msg3' });
    });
  });
});