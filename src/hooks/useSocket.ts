import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
}

interface UseSocketReturn extends SocketState {
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  clearError: () => void;
}

const useSocket = (options: UseSocketOptions = {}): UseSocketReturn => {
  const {
    url = 'http://localhost:9876',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000
  } = options;

  const [state, setState] = useState<SocketState>({
    socket: null,
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectAttempts: 0
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listenersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (state.socket?.connected) {
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const newSocket = io(url, {
        autoConnect: false,
        reconnection: false // We handle reconnection manually
      });

      // Set up event listeners
      newSocket.on('connect', () => {
        console.log('Socket connected successfully');
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0
        }));
        clearReconnectTimeout();
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false
        }));

        // Auto-reconnect if enabled and not manually disconnected
        if (reconnection && reason !== 'io client disconnect') {
          scheduleReconnect();
        }
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: error.message || 'Connection failed'
        }));

        if (reconnection) {
          scheduleReconnect();
        }
      });

      // Re-attach existing listeners
      listenersRef.current.forEach((callback, event) => {
        newSocket.on(event, callback);
      });

      setState(prev => ({ ...prev, socket: newSocket }));
      newSocket.connect();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to create socket'
      }));
    }
  }, [url, reconnection]);

  const scheduleReconnect = useCallback(() => {
    setState(prev => {
      if (prev.reconnectAttempts >= reconnectionAttempts) {
        return {
          ...prev,
          error: `Failed to reconnect after ${reconnectionAttempts} attempts`
        };
      }

      const newAttempts = prev.reconnectAttempts + 1;
      const delay = reconnectionDelay * Math.pow(2, newAttempts - 1); // Exponential backoff

      console.log(`Scheduling reconnect attempt ${newAttempts} in ${delay}ms`);
      
      clearReconnectTimeout();
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(`Reconnect attempt ${newAttempts}`);
        connect();
      }, delay);

      return {
        ...prev,
        reconnectAttempts: newAttempts,
        isConnecting: true
      };
    });
  }, [reconnectionAttempts, reconnectionDelay, connect, clearReconnectTimeout]);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    
    if (state.socket) {
      state.socket.disconnect();
      setState(prev => ({
        ...prev,
        socket: null,
        isConnected: false,
        isConnecting: false,
        reconnectAttempts: 0
      }));
    }
  }, [state.socket, clearReconnectTimeout]);

  const emit = useCallback((event: string, data?: any) => {
    if (state.socket?.connected) {
      state.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit '${event}': socket not connected`);
    }
  }, [state.socket]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    // Store the listener for re-attachment on reconnect
    listenersRef.current.set(event, callback);
    
    if (state.socket) {
      state.socket.on(event, callback);
    }
  }, [state.socket]);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      listenersRef.current.delete(event);
    }
    
    if (state.socket) {
      state.socket.off(event, callback);
    }
  }, [state.socket]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      clearReconnectTimeout();
      if (state.socket) {
        state.socket.disconnect();
      }
    };
  }, [autoConnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearReconnectTimeout();
      if (state.socket) {
        state.socket.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    emit,
    on,
    off,
    clearError
  };
};

export default useSocket;
export type { UseSocketOptions, UseSocketReturn };