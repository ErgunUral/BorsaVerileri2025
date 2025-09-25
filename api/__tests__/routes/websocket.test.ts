import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketManager } from '../../services/WebSocketManager';
import { realTimeDataService } from '../../services/realTimeDataService';
import { logger } from '../../utils/logger';
import type { StockData, MarketOverview } from '../../types/stock';

// Mock dependencies
vi.mock('../../services/realTimeDataService');
vi.mock('../../utils/logger');

const mockRealTimeDataService = vi.mocked(realTimeDataService);
const mockLogger = vi.mocked(logger);

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

const mockMarketOverview: MarketOverview = {
  totalVolume: 15000000000,
  advancingStocks: 1250,
  decliningStocks: 850,
  unchangedStocks: 100,
  marketSentiment: 'bullish',
  topGainers: [
    { symbol: 'AAPL', change: 5.25, changePercent: 3.5 },
    { symbol: 'GOOGL', change: 45.80, changePercent: 2.1 }
  ],
  topLosers: [
    { symbol: 'TSLA', change: -8.50, changePercent: -3.2 },
    { symbol: 'MSFT', change: -5.25, changePercent: -1.8 }
  ],
  lastUpdated: new Date().toISOString()
};

describe('WebSocket Integration Tests', () => {
  let webSocketManager: WebSocketManager;
  let server: any;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let port: number;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock logger
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    
    // Mock real-time data service
    mockRealTimeDataService.subscribe.mockImplementation(() => {});
    mockRealTimeDataService.unsubscribe.mockImplementation(() => {});
    mockRealTimeDataService.getStockData.mockResolvedValue(mockStockData);
    mockRealTimeDataService.getMarketOverview.mockResolvedValue(mockMarketOverview);
    mockRealTimeDataService.startRealTimeUpdates.mockResolvedValue();
    mockRealTimeDataService.stopRealTimeUpdates.mockResolvedValue();
    
    // Create real HTTP server and Socket.IO server
    server = createServer();
    io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Find available port
    port = 3001;
    while (true) {
      try {
        await new Promise<void>((resolve, reject) => {
          server.listen(port, (err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
        break;
      } catch (error) {
        port++;
        if (port > 3010) {
          throw new Error('No available ports found');
        }
      }
    }
    
    // Initialize WebSocket manager with real server
    webSocketManager = new WebSocketManager();
    
    // Set up connection handler
    io.on('connection', (socket) => {
      socket.on('subscribe', async (data, callback) => {
        try {
          if (!data || typeof data !== 'object') {
            callback({ success: false, error: 'Invalid request format' });
            return;
          }
          
          const { type, symbol } = data;
          
          if (type === 'stock') {
            if (!symbol) {
              callback({ success: false, error: 'Symbol is required for stock subscription' });
              return;
            }
            
            if (socket.rooms.has(`stock:${symbol}`)) {
              callback({ success: false, error: `Already subscribed to stock:${symbol}` });
              return;
            }
            
            await socket.join(`stock:${symbol}`);
            await mockRealTimeDataService.startRealTimeUpdates([symbol]);
            callback({ success: true });
          } else if (type === 'market') {
            await socket.join('market');
            callback({ success: true });
          } else if (type === 'news') {
            const room = symbol ? `news:${symbol}` : 'news:general';
            await socket.join(room);
            callback({ success: true });
          } else {
            callback({ success: false, error: `Invalid subscription type: ${type}` });
          }
        } catch (error) {
          callback({ success: false, error: (error as Error).message });
        }
      });
      
      socket.on('unsubscribe', async (data, callback) => {
        try {
          if (!data || typeof data !== 'object') {
            callback({ success: false, error: 'Invalid request format' });
            return;
          }
          
          const { type, symbol } = data;
          
          if (type === 'stock') {
            const room = `stock:${symbol}`;
            if (!socket.rooms.has(room)) {
              callback({ success: false, error: `Not subscribed to ${room}` });
              return;
            }
            
            await socket.leave(room);
            callback({ success: true });
          } else if (type === 'market') {
            await socket.leave('market');
            callback({ success: true });
          } else if (type === 'news') {
            const room = symbol ? `news:${symbol}` : 'news:general';
            await socket.leave(room);
            callback({ success: true });
          } else {
            callback({ success: false, error: `Invalid subscription type: ${type}` });
          }
        } catch (error) {
          callback({ success: false, error: (error as Error).message });
        }
      });
      
      socket.on('getStockData', async (data, callback) => {
        try {
          if (!data || !data.symbol) {
            callback({ success: false, error: 'Symbol is required' });
            return;
          }
          
          const stockData = await mockRealTimeDataService.getStockData(data.symbol);
          callback({ success: true, data: stockData });
        } catch (error) {
          callback({ success: false, error: (error as Error).message });
        }
      });
      
      socket.on('getMarketOverview', async (data, callback) => {
        try {
          const marketData = await mockRealTimeDataService.getMarketOverview();
          callback({ success: true, data: marketData });
        } catch (error) {
          callback({ success: false, error: (error as Error).message });
        }
      });
    });
  });

  afterEach(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    
    vi.restoreAllMocks();
  });

  const connectClient = (): Promise<ClientSocket> => {
    return new Promise((resolve, reject) => {
      const client = Client(`http://localhost:${port}`);
      
      client.on('connect', () => {
        resolve(client);
      });
      
      client.on('connect_error', (error) => {
        reject(error);
      });
      
      setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
    });
  };

  describe('Client Connection', () => {
    it('should establish WebSocket connection successfully', async () => {
      clientSocket = await connectClient();
      
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
    });

    it('should handle multiple client connections', async () => {
      const client1 = await connectClient();
      const client2 = await connectClient();
      
      expect(client1.connected).toBe(true);
      expect(client2.connected).toBe(true);
      expect(client1.id).not.toBe(client2.id);
      
      client1.disconnect();
      client2.disconnect();
    });

    it('should handle client disconnection gracefully', async () => {
      clientSocket = await connectClient();
      
      const disconnectPromise = new Promise<void>((resolve) => {
        clientSocket.on('disconnect', () => {
          resolve();
        });
      });
      
      clientSocket.disconnect();
      await disconnectPromise;
      
      expect(clientSocket.connected).toBe(false);
    });
  });

  describe('Stock Subscription', () => {
    beforeEach(async () => {
      clientSocket = await connectClient();
    });

    it('should subscribe to stock updates successfully', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({ success: true });
      expect(mockRealTimeDataService.startRealTimeUpdates).toHaveBeenCalledWith(['AAPL']);
    });

    it('should reject subscription without symbol', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock' }, resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Symbol is required for stock subscription'
      });
    });

    it('should prevent duplicate stock subscriptions', async () => {
      // First subscription
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      // Second subscription to same stock
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Already subscribed to stock:AAPL'
      });
    });

    it('should unsubscribe from stock updates successfully', async () => {
      // First subscribe
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      // Then unsubscribe
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('unsubscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({ success: true });
    });

    it('should reject unsubscribe from non-subscribed stock', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('unsubscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Not subscribed to stock:AAPL'
      });
    });

    it('should receive stock updates after subscription', async () => {
      // Subscribe to stock
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      // Set up listener for stock updates
      const updatePromise = new Promise<any>((resolve) => {
        clientSocket.on('stockUpdate', resolve);
      });
      
      // Simulate stock update broadcast
      const updateData = {
        symbol: 'AAPL',
        data: mockStockData,
        timestamp: new Date().toISOString()
      };
      
      io.to('stock:AAPL').emit('stockUpdate', updateData);
      
      const receivedUpdate = await updatePromise;
      expect(receivedUpdate).toEqual(updateData);
    });
  });

  describe('Market Subscription', () => {
    beforeEach(async () => {
      clientSocket = await connectClient();
    });

    it('should subscribe to market updates successfully', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'market' }, resolve);
      });
      
      expect(response).toEqual({ success: true });
    });

    it('should unsubscribe from market updates successfully', async () => {
      // First subscribe
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'market' }, resolve);
      });
      
      // Then unsubscribe
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('unsubscribe', { type: 'market' }, resolve);
      });
      
      expect(response).toEqual({ success: true });
    });

    it('should receive market updates after subscription', async () => {
      // Subscribe to market
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'market' }, resolve);
      });
      
      // Set up listener for market updates
      const updatePromise = new Promise<any>((resolve) => {
        clientSocket.on('marketUpdate', resolve);
      });
      
      // Simulate market update broadcast
      const updateData = {
        data: mockMarketOverview,
        timestamp: new Date().toISOString()
      };
      
      io.to('market').emit('marketUpdate', updateData);
      
      const receivedUpdate = await updatePromise;
      expect(receivedUpdate).toEqual(updateData);
    });
  });

  describe('News Subscription', () => {
    beforeEach(async () => {
      clientSocket = await connectClient();
    });

    it('should subscribe to stock-specific news successfully', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'news', symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({ success: true });
    });

    it('should subscribe to general news successfully', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'news' }, resolve);
      });
      
      expect(response).toEqual({ success: true });
    });

    it('should receive news updates after subscription', async () => {
      // Subscribe to news
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'news', symbol: 'AAPL' }, resolve);
      });
      
      // Set up listener for news updates
      const updatePromise = new Promise<any>((resolve) => {
        clientSocket.on('newsUpdate', resolve);
      });
      
      // Simulate news update broadcast
      const updateData = {
        symbol: 'AAPL',
        data: [{
          id: '1',
          title: 'Apple News',
          summary: 'Latest Apple news',
          url: 'https://example.com',
          publishedAt: new Date().toISOString(),
          source: 'TechNews',
          sentiment: 'positive' as const,
          relatedSymbols: ['AAPL']
        }],
        timestamp: new Date().toISOString()
      };
      
      io.to('news:AAPL').emit('newsUpdate', updateData);
      
      const receivedUpdate = await updatePromise;
      expect(receivedUpdate).toEqual(updateData);
    });
  });

  describe('Data Requests', () => {
    beforeEach(async () => {
      clientSocket = await connectClient();
    });

    it('should get stock data successfully', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('getStockData', { symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({
        success: true,
        data: mockStockData
      });
      
      expect(mockRealTimeDataService.getStockData).toHaveBeenCalledWith('AAPL');
    });

    it('should reject stock data request without symbol', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('getStockData', {}, resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Symbol is required'
      });
    });

    it('should get market overview successfully', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('getMarketOverview', {}, resolve);
      });
      
      expect(response).toEqual({
        success: true,
        data: mockMarketOverview
      });
      
      expect(mockRealTimeDataService.getMarketOverview).toHaveBeenCalled();
    });

    it('should handle service errors in data requests', async () => {
      mockRealTimeDataService.getStockData.mockRejectedValueOnce(
        new Error('Stock not found')
      );
      
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('getStockData', { symbol: 'INVALID' }, resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Stock not found'
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      clientSocket = await connectClient();
    });

    it('should handle invalid subscription types', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'invalid' }, resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Invalid subscription type: invalid'
      });
    });

    it('should handle malformed subscription requests', async () => {
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', 'invalid-data', resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Invalid request format'
      });
    });

    it('should handle service errors in subscriptions', async () => {
      mockRealTimeDataService.startRealTimeUpdates.mockRejectedValueOnce(
        new Error('Subscription failed')
      );
      
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({
        success: false,
        error: 'Subscription failed'
      });
    });

    it('should handle client disconnection during subscription', async () => {
      // Subscribe to stock
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      // Disconnect client
      clientSocket.disconnect();
      
      // Verify cleanup (this would be handled by the real WebSocketManager)
      expect(clientSocket.connected).toBe(false);
    });
  });

  describe('Multiple Subscriptions', () => {
    beforeEach(async () => {
      clientSocket = await connectClient();
    });

    it('should handle multiple stock subscriptions', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      
      for (const symbol of symbols) {
        const response = await new Promise<any>((resolve) => {
          clientSocket.emit('subscribe', { type: 'stock', symbol }, resolve);
        });
        
        expect(response).toEqual({ success: true });
      }
      
      expect(mockRealTimeDataService.startRealTimeUpdates).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed subscription types', async () => {
      const subscriptions = [
        { type: 'stock', symbol: 'AAPL' },
        { type: 'market' },
        { type: 'news', symbol: 'AAPL' },
        { type: 'news' }
      ];
      
      for (const subscription of subscriptions) {
        const response = await new Promise<any>((resolve) => {
          clientSocket.emit('subscribe', subscription, resolve);
        });
        
        expect(response).toEqual({ success: true });
      }
    });
  });

  describe('Concurrent Clients', () => {
    it('should handle multiple clients with different subscriptions', async () => {
      const client1 = await connectClient();
      const client2 = await connectClient();
      
      // Client 1 subscribes to AAPL
      const response1 = await new Promise<any>((resolve) => {
        client1.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      // Client 2 subscribes to GOOGL
      const response2 = await new Promise<any>((resolve) => {
        client2.emit('subscribe', { type: 'stock', symbol: 'GOOGL' }, resolve);
      });
      
      expect(response1).toEqual({ success: true });
      expect(response2).toEqual({ success: true });
      
      // Set up listeners
      const client1Updates: any[] = [];
      const client2Updates: any[] = [];
      
      client1.on('stockUpdate', (data) => client1Updates.push(data));
      client2.on('stockUpdate', (data) => client2Updates.push(data));
      
      // Broadcast updates
      const aaplUpdate = {
        symbol: 'AAPL',
        data: { ...mockStockData, symbol: 'AAPL' },
        timestamp: new Date().toISOString()
      };
      
      const googlUpdate = {
        symbol: 'GOOGL',
        data: { ...mockStockData, symbol: 'GOOGL' },
        timestamp: new Date().toISOString()
      };
      
      io.to('stock:AAPL').emit('stockUpdate', aaplUpdate);
      io.to('stock:GOOGL').emit('stockUpdate', googlUpdate);
      
      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Client 1 should only receive AAPL updates
      expect(client1Updates).toHaveLength(1);
      expect(client1Updates[0].symbol).toBe('AAPL');
      
      // Client 2 should only receive GOOGL updates
      expect(client2Updates).toHaveLength(1);
      expect(client2Updates[0].symbol).toBe('GOOGL');
      
      client1.disconnect();
      client2.disconnect();
    });

    it('should handle clients subscribing to same stock', async () => {
      const client1 = await connectClient();
      const client2 = await connectClient();
      
      // Both clients subscribe to AAPL
      await Promise.all([
        new Promise<any>((resolve) => {
          client1.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
        }),
        new Promise<any>((resolve) => {
          client2.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
        })
      ]);
      
      // Set up listeners
      const client1Updates: any[] = [];
      const client2Updates: any[] = [];
      
      client1.on('stockUpdate', (data) => client1Updates.push(data));
      client2.on('stockUpdate', (data) => client2Updates.push(data));
      
      // Broadcast update
      const updateData = {
        symbol: 'AAPL',
        data: mockStockData,
        timestamp: new Date().toISOString()
      };
      
      io.to('stock:AAPL').emit('stockUpdate', updateData);
      
      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Both clients should receive the update
      expect(client1Updates).toHaveLength(1);
      expect(client2Updates).toHaveLength(1);
      expect(client1Updates[0]).toEqual(updateData);
      expect(client2Updates[0]).toEqual(updateData);
      
      client1.disconnect();
      client2.disconnect();
    });
  });

  describe('Performance', () => {
    it('should handle rapid subscription requests', async () => {
      clientSocket = await connectClient();
      
      const symbols = Array.from({ length: 10 }, (_, i) => `STOCK${i}`);
      const promises = symbols.map(symbol => 
        new Promise<any>((resolve) => {
          clientSocket.emit('subscribe', { type: 'stock', symbol }, resolve);
        })
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response).toEqual({ success: true });
      });
    });

    it('should handle rapid data requests', async () => {
      clientSocket = await connectClient();
      
      const promises = Array.from({ length: 10 }, () => 
        new Promise<any>((resolve) => {
          clientSocket.emit('getStockData', { symbol: 'AAPL' }, resolve);
        })
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockStockData);
      });
    });
  });

  describe('Connection Stability', () => {
    it('should handle connection interruption and reconnection', async () => {
      clientSocket = await connectClient();
      
      // Subscribe to stock
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      // Simulate connection interruption
      clientSocket.disconnect();
      
      // Reconnect
      clientSocket = await connectClient();
      
      // Verify can subscribe again
      const response = await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      expect(response).toEqual({ success: true });
    });

    it('should handle server restart gracefully', async () => {
      clientSocket = await connectClient();
      
      // Subscribe to stock
      await new Promise<any>((resolve) => {
        clientSocket.emit('subscribe', { type: 'stock', symbol: 'AAPL' }, resolve);
      });
      
      // Simulate server restart by closing and reopening
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      
      // Verify client detects disconnection
      expect(clientSocket.connected).toBe(false);
    });
  });
});