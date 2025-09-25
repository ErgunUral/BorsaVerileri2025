import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSocket } from '../useSocket';
import { io } from 'socket.io-client';

// Mock socket.io-client
vi.mock('socket.io-client');

const mockSocket = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn()
};

const mockIo = vi.mocked(io);

describe('useSocket Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    mockIo.mockReturnValue(mockSocket as any);
    
    // Clear all timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useSocket());
    
    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.reconnectAttempts).toBe(0);
  });

  it('should auto-connect by default', () => {
    renderHook(() => useSocket());
    
    expect(mockIo).toHaveBeenCalledWith('http://localhost:9876', {
      autoConnect: false,
      reconnection: false
    });
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('should not auto-connect when disabled', () => {
    renderHook(() => useSocket({ autoConnect: false }));
    
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('should use custom URL when provided', () => {
    const customUrl = 'http://localhost:3001';
    renderHook(() => useSocket({ url: customUrl }));
    
    expect(mockIo).toHaveBeenCalledWith(customUrl, expect.any(Object));
  });

  it('should handle successful connection', async () => {
    const { result } = renderHook(() => useSocket());
    
    // Simulate successful connection
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    
    act(() => {
      connectHandler();
    });
    
    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.reconnectAttempts).toBe(0);
  });

  it('should handle connection error', async () => {
    const { result } = renderHook(() => useSocket());
    
    // Simulate connection error
    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
    const error = new Error('Connection failed');
    
    act(() => {
      errorHandler(error);
    });
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
    expect(result.current.error).toBe('Connection failed');
  });

  it('should handle disconnection', async () => {
    const { result } = renderHook(() => useSocket());
    
    // First connect
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    act(() => {
      connectHandler();
    });
    
    // Then disconnect
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    act(() => {
      disconnectHandler('transport close');
    });
    
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
  });

  it('should attempt reconnection on unexpected disconnect', async () => {
    const { result } = renderHook(() => useSocket({ reconnectionDelay: 1000 }));
    
    // Simulate unexpected disconnect
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    
    act(() => {
      disconnectHandler('transport close');
    });
    
    expect(result.current.reconnectAttempts).toBe(1);
    expect(result.current.isConnecting).toBe(true);
    
    // Fast-forward timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    
    expect(mockSocket.connect).toHaveBeenCalledTimes(2); // Initial + reconnect
  });

  it('should not reconnect on manual disconnect', async () => {
    const { result } = renderHook(() => useSocket());
    
    // Simulate manual disconnect
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    
    act(() => {
      disconnectHandler('io client disconnect');
    });
    
    expect(result.current.reconnectAttempts).toBe(0);
    expect(result.current.isConnecting).toBe(false);
  });

  it('should stop reconnecting after max attempts', async () => {
    const { result } = renderHook(() => useSocket({ 
      reconnectionAttempts: 2,
      reconnectionDelay: 100
    }));
    
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
    
    // Simulate multiple failed reconnection attempts
    for (let i = 0; i < 3; i++) {
      act(() => {
        disconnectHandler('transport close');
      });
      
      act(() => {
        vi.advanceTimersByTime(100 * Math.pow(2, i));
      });
      
      act(() => {
        errorHandler(new Error('Connection failed'));
      });
    }
    
    expect(result.current.error).toContain('Failed to reconnect after 2 attempts');
  });

  it('should emit events when connected', () => {
    const { result } = renderHook(() => useSocket());
    
    // Set socket as connected
    mockSocket.connected = true;
    result.current.socket = mockSocket as any;
    
    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });
    
    expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
  });

  it('should not emit events when disconnected', () => {
    const { result } = renderHook(() => useSocket({ autoConnect: false }));
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    act(() => {
      result.current.emit('test-event', { data: 'test' });
    });
    
    expect(mockSocket.emit).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Cannot emit 'test-event': socket not connected");
    
    consoleSpy.mockRestore();
  });

  it('should register event listeners', () => {
    const { result } = renderHook(() => useSocket());
    const callback = vi.fn();
    
    act(() => {
      result.current.on('test-event', callback);
    });
    
    expect(mockSocket.on).toHaveBeenCalledWith('test-event', callback);
  });

  it('should remove event listeners', () => {
    const { result } = renderHook(() => useSocket());
    const callback = vi.fn();
    
    act(() => {
      result.current.off('test-event', callback);
    });
    
    expect(mockSocket.off).toHaveBeenCalledWith('test-event', callback);
  });

  it('should manually connect when called', () => {
    const { result } = renderHook(() => useSocket({ autoConnect: false }));
    
    act(() => {
      result.current.connect();
    });
    
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('should manually disconnect when called', () => {
    const { result } = renderHook(() => useSocket());
    
    act(() => {
      result.current.disconnect();
    });
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(result.current.socket).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.reconnectAttempts).toBe(0);
  });

  it('should clear error when called', () => {
    const { result } = renderHook(() => useSocket());
    
    // Set an error first
    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
    act(() => {
      errorHandler(new Error('Test error'));
    });
    
    expect(result.current.error).toBe('Test error');
    
    // Clear the error
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should not connect if already connected', () => {
    const { result } = renderHook(() => useSocket({ autoConnect: false }));
    
    // Mock socket as already connected
    mockSocket.connected = true;
    result.current.socket = mockSocket as any;
    
    act(() => {
      result.current.connect();
    });
    
    // Should not call connect again
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });

  it('should re-attach listeners on reconnect', () => {
    const { result } = renderHook(() => useSocket());
    const callback = vi.fn();
    
    // Add a listener
    act(() => {
      result.current.on('test-event', callback);
    });
    
    // Simulate reconnection
    act(() => {
      result.current.connect();
    });
    
    // Should re-attach the listener
    expect(mockSocket.on).toHaveBeenCalledWith('test-event', callback);
  });

  it('should use exponential backoff for reconnection delays', () => {
    const { result } = renderHook(() => useSocket({ 
      reconnectionDelay: 1000
    }));
    
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    const errorHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect_error')[1];
    
    // First reconnection attempt - 1000ms delay
    act(() => {
      disconnectHandler('transport close');
    });
    
    expect(result.current.reconnectAttempts).toBe(1);
    
    // Second reconnection attempt - 2000ms delay
    act(() => {
      vi.advanceTimersByTime(1000);
      errorHandler(new Error('Connection failed'));
    });
    
    expect(result.current.reconnectAttempts).toBe(2);
    
    // Third reconnection attempt - 4000ms delay
    act(() => {
      vi.advanceTimersByTime(2000);
      errorHandler(new Error('Connection failed'));
    });
    
    expect(result.current.reconnectAttempts).toBe(3);
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useSocket());
    
    unmount();
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});