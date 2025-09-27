import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';

interface RealTimeDataConfig {
  symbols: string[];
  enableAutoRefresh?: boolean;
  refreshInterval?: number;
  maxRetries?: number;
}

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: string;
  source: string;
}

interface RealTimeDataState {
  data: Map<string, StockData>;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  subscriptionId: string | null;
}

interface UseRealTimeDataReturn {
  data: Map<string, StockData>;
  loading: boolean;
  error: string | null;
  lastUpdate: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => Promise<void>;
  unsubscribe: () => Promise<void>;
  refreshData: () => Promise<void>;
  getSymbolData: (symbol: string) => StockData | undefined;
  addSymbol: (symbol: string) => Promise<void>;
  removeSymbol: (symbol: string) => Promise<void>;
  getHistoricalData: (symbol: string, hours?: number) => Promise<any[]>;
  isSubscribed: boolean;
  metrics: {
    totalUpdates: number;
    successfulUpdates: number;
    failedUpdates: number;
    averageResponseTime: number;
  };
}

export const useRealTimeData = (config: RealTimeDataConfig): UseRealTimeDataReturn => {
  const [state, setState] = useState<RealTimeDataState>({
    data: new Map(),
    loading: false,
    error: null,
    lastUpdate: null,
    connectionStatus: 'disconnected',
    subscriptionId: null
  });

  const [metrics, setMetrics] = useState({
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    averageResponseTime: 0
  });

  const configRef = useRef(config);
  const retryCountRef = useRef(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const responseTimesRef = useRef<number[]>([]);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // WebSocket connection for real-time updates
  const {
    isConnected: wsConnected,
    isConnecting: wsConnecting,
    sendMessage,
    subscribe: wsSubscribe,
    unsubscribe: wsUnsubscribe
  } = useWebSocket();

  // Update connection status based on WebSocket status
  useEffect(() => {
    if (wsConnected) {
      setState(prev => ({ ...prev, connectionStatus: 'connected' }));
    } else if (wsConnecting) {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
    } else {
      setState(prev => ({ ...prev, connectionStatus: 'disconnected' }));
    }
  }, [wsConnected, wsConnecting]);

  // Generate unique subscription ID
  const generateSubscriptionId = useCallback(() => {
    return `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Calculate average response time
  const updateResponseTime = useCallback((responseTime: number) => {
    responseTimesRef.current.push(responseTime);
    if (responseTimesRef.current.length > 100) {
      responseTimesRef.current = responseTimesRef.current.slice(-50);
    }
    
    const average = responseTimesRef.current.reduce((a, b) => a + b, 0) / responseTimesRef.current.length;
    setMetrics(prev => ({ ...prev, averageResponseTime: Math.round(average) }));
  }, []);

  // Fetch initial data for symbols
  const fetchInitialData = useCallback(async (symbols: string[]) => {
    const startTime = Date.now();
    
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('/api/realtime/data/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbols }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Çok fazla istek gönderildi. Lütfen bekleyin.');
        } else if (response.status >= 500) {
          throw new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
        } else {
          throw new Error(`HTTP hatası! Durum: ${response.status}`);
        }
      }
      
      const result = await response.json();
      
      if (result.success) {
        const newData = new Map<string, StockData>();
        
        result.data.forEach((item: any) => {
          if (item.data) {
            newData.set(item.symbol, {
              symbol: item.symbol,
              price: item.data.price || 0,
              change: item.data.change || 0,
              changePercent: item.data.changePercent || 0,
              volume: item.data.volume || 0,
              high: item.data.high || 0,
              low: item.data.low || 0,
              open: item.data.open || 0,
              timestamp: item.data.timestamp || new Date().toISOString(),
              source: item.data.source || 'api'
            });
          }
        });
        
        setState(prev => ({
          ...prev,
          data: newData,
          loading: false,
          lastUpdate: new Date().toISOString(),
          error: null
        }));
        
        setMetrics(prev => ({
          ...prev,
          successfulUpdates: prev.successfulUpdates + result.successful,
          failedUpdates: prev.failedUpdates + result.failed,
          totalUpdates: prev.totalUpdates + symbols.length
        }));
        
        retryCountRef.current = 0;
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
      
      updateResponseTime(Date.now() - startTime);
      
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      
      let errorMessage = 'Bilinmeyen hata oluştu';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'İstek zaman aşımına uğradı';
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      
      setMetrics(prev => ({
        ...prev,
        failedUpdates: prev.failedUpdates + symbols.length
      }));
      
      // Retry logic - don't retry on timeout or network errors
      if (error?.name !== 'AbortError' && !error?.message?.includes('Failed to fetch')) {
        retryCountRef.current++;
        if (retryCountRef.current < (configRef.current.maxRetries || 3)) {
          setTimeout(() => {
            fetchInitialData(symbols);
          }, Math.min(1000 * Math.pow(2, retryCountRef.current), 30000));
        }
      }
    }
  }, [updateResponseTime]);

  // Handle real-time updates from WebSocket
  const handleStockUpdate = useCallback((data: any) => {
    if (data.symbol && data.data) {
      setState(prev => {
        const newData = new Map(prev.data);
        
        newData.set(data.symbol, {
          symbol: data.symbol,
          price: data.data.price || 0,
          change: data.data.change || 0,
          changePercent: data.data.changePercent || 0,
          volume: data.data.volume || 0,
          high: data.data.high || 0,
          low: data.data.low || 0,
          open: data.data.open || 0,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'websocket'
        });
        
        return {
          ...prev,
          data: newData,
          lastUpdate: new Date().toISOString(),
          error: null
        };
      });
      
      setMetrics(prev => ({
        ...prev,
        totalUpdates: prev.totalUpdates + 1,
        successfulUpdates: prev.successfulUpdates + 1
      }));
    }
  }, []);

  // Subscribe to real-time updates
  const subscribe = useCallback(async (symbols: string[]) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Generate subscription ID
      const subscriptionId = generateSubscriptionId();
      
      // Fetch initial data
      await fetchInitialData(symbols);
      
      // Subscribe to WebSocket updates
      wsSubscribe('stock_update', handleStockUpdate);
      
      // Subscribe to real-time service
      const response = await fetch('/api/realtime/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbols,
          subscriptionId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Subscription failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          subscriptionId,
          loading: false
        }));
        
        // Setup auto-refresh if enabled
        if (configRef.current.enableAutoRefresh) {
          const interval = configRef.current.refreshInterval || 30000;
          refreshIntervalRef.current = setInterval(() => {
            fetchInitialData(symbols);
          }, interval);
        }
      } else {
        throw new Error(result.error || 'Subscription failed');
      }
      
    } catch (error) {
      console.error('Subscription failed:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Subscription failed'
      }));
    }
  }, [generateSubscriptionId, fetchInitialData, wsSubscribe, handleStockUpdate]);

  // Unsubscribe from real-time updates
  const unsubscribe = useCallback(async () => {
    try {
      // Clear auto-refresh interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      
      // Unsubscribe from WebSocket
      wsUnsubscribe('stock_update');
      
      // Unsubscribe from real-time service
      if (state.subscriptionId) {
        const response = await fetch(`/api/realtime/subscribe/${state.subscriptionId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          console.warn('Failed to unsubscribe from real-time service');
        }
      }
      
      setState(prev => ({
        ...prev,
        subscriptionId: null,
        connectionStatus: 'disconnected'
      }));
      
    } catch (error) {
      console.error('Unsubscribe failed:', error);
    }
  }, [state.subscriptionId, wsUnsubscribe]);

  // Refresh data manually
  const refreshData = useCallback(async () => {
    if (configRef.current.symbols.length > 0) {
      await fetchInitialData(configRef.current.symbols);
    }
  }, [fetchInitialData]);

  // Get data for specific symbol
  const getSymbolData = useCallback((symbol: string): StockData | undefined => {
    return state.data.get(symbol.toUpperCase());
  }, [state.data]);

  // Add symbol to tracking
  const addSymbol = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/realtime/symbols/${symbol}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add symbol: ${response.status}`);
      }
      
      // Fetch data for the new symbol
      await fetchInitialData([symbol]);
      
    } catch (error) {
      console.error('Failed to add symbol:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add symbol'
      }));
    }
  }, [fetchInitialData]);

  // Remove symbol from tracking
  const removeSymbol = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/realtime/symbols/${symbol}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to remove symbol: ${response.status}`);
      }
      
      // Remove from local state
      setState(prev => {
        const newData = new Map(prev.data);
        newData.delete(symbol.toUpperCase());
        return { ...prev, data: newData };
      });
      
    } catch (error) {
      console.error('Failed to remove symbol:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to remove symbol'
      }));
    }
  }, []);

  // Get historical data for symbol
  const getHistoricalData = useCallback(async (symbol: string, hours: number = 24): Promise<any[]> => {
    try {
      const response = await fetch(`/api/realtime/history/${symbol}?hours=${hours}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch historical data');
      }
      
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      return [];
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      unsubscribe();
    };
  }, [unsubscribe]);

  // Auto-subscribe to initial symbols
  useEffect(() => {
    if (config.symbols.length > 0 && !state.subscriptionId) {
      subscribe(config.symbols);
    }
  }, [config.symbols, state.subscriptionId, subscribe]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    lastUpdate: state.lastUpdate,
    connectionStatus: state.connectionStatus,
    subscribe,
    unsubscribe,
    refreshData,
    getSymbolData,
    addSymbol,
    removeSymbol,
    getHistoricalData,
    isSubscribed: !!state.subscriptionId,
    metrics
  };
};

export default useRealTimeData;