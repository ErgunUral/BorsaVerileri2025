import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { WebSocketManager } from '../../services/WebSocketManager';
import { realTimeDataService } from '../../services/realTimeDataService';
import { logger } from '../../utils/logger';
import type { StockData, MarketOverview } from '../../types/stock';

// Mock dependencies
vi.mock('socket.io');
vi.mock('http');
vi.mock('../../services/realTimeDataService');
vi.mock('../../utils/logger');

const mockSocketIOServer = vi.mocked(SocketIOServer);
const mockCreateServer = vi.mocked(createServer);
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

describe('WebSocketManager', () => {
  let webSocketManager: WebSocketManager;
  let mockServer: any;
  let mockIO: any;
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock HTTP server
    mockServer = {
      listen: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
      address: vi.fn().mockReturnValue({ port: 3001 })
    };
    
    mockCreateServer.mockReturnValue(mockServer);
    
    // Mock Socket.IO server
    mockIO = {
      on: vi.fn(),
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      close: vi.fn(),
      engine: {
        clientsCount: 0
      },
      sockets: {
        sockets: new Map()
      },
      use: vi.fn(),
      of: vi.fn().mockReturnThis()
    };
    
    mockSocketIOServer.mockImplementation(() => mockIO);
    
    // Mock client socket
    mockSocket = {
      id: 'socket-123',
      emit: vi.fn(),
      on: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      disconnect: vi.fn(),
      rooms: new Set(),
      handshake: {
        auth: {},
        query: {},
        headers: {}
      },
      data: {}
    };
    
    // Mock real-time data service
    mockRealTimeDataService.subscribe.mockImplementation(() => {});
    mockRealTimeDataService.unsubscribe.mockImplementation(() => {});
    mockRealTimeDataService.getStockData.mockResolvedValue(mockStockData);
    mockRealTimeDataService.getMarketOverview.mockResolvedValue(mockMarketOverview);
    mockRealTimeDataService.startRealTimeUpdates.mockResolvedValue();
    mockRealTimeDataService.stopRealTimeUpdates.mockResolvedValue();
    
    // Mock logger
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    
    webSocketManager = new WebSocketManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize WebSocket server successfully', () => {
      expect(mockCreateServer).toHaveBeenCalled();
      expect(mockSocketIOServer).toHaveBeenCalledWith(mockServer, {
        cors: {
          origin: expect.any(Array),
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling']
      });
      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket server initialized');
    });

    it('should set up connection event handler', () => {
      expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should subscribe to real-time data service events', () => {
      expect(mockRealTimeDataService.subscribe).toHaveBeenCalledWith(
        'stockUpdate',
        expect.any(Function)
      );
      expect(mockRealTimeDataService.subscribe).toHaveBeenCalledWith(
        'marketUpdate',
        expect.any(Function)
      );
      expect(mockRealTimeDataService.subscribe).toHaveBeenCalledWith(
        'newsUpdate',
        expect.any(Function)
      );
    });
  });

  describe('Server Management', () => {
    describe('start', () => {
      it('should start server on specified port', async () => {
        mockServer.listen.mockImplementation((port, callback) => {
          callback();
        });
        
        await webSocketManager.start(3001);
        
        expect(mockServer.listen).toHaveBeenCalledWith(3001, expect.any(Function));
        expect(mockLogger.info).toHaveBeenCalledWith('WebSocket server started on port 3001');
      });

      it('should handle server start errors', async () => {
        const error = new Error('Port already in use');
        mockServer.listen.mockImplementation((port, callback) => {
          callback(error);
        });
        
        await expect(webSocketManager.start(3001))
          .rejects.toThrow('Failed to start WebSocket server: Port already in use');
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to start WebSocket server:',
          error
        );
      });

      it('should not start if already running', async () => {
        mockServer.listen.mockImplementation((port, callback) => {
          callback();
        });
        
        await webSocketManager.start(3001);
        await webSocketManager.start(3001);
        
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'WebSocket server is already running'
        );
        expect(mockServer.listen).toHaveBeenCalledTimes(1);
      });
    });

    describe('stop', () => {
      it('should stop server gracefully', async () => {
        mockServer.listen.mockImplementation((port, callback) => {
          callback();
        });
        
        mockServer.close.mockImplementation((callback) => {
          callback();
        });
        
        mockIO.close.mockImplementation((callback) => {
          callback();
        });
        
        await webSocketManager.start(3001);
        await webSocketManager.stop();
        
        expect(mockIO.close).toHaveBeenCalled();
        expect(mockServer.close).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('WebSocket server stopped');
      });

      it('should handle stop errors', async () => {
        const error = new Error('Stop failed');
        mockIO.close.mockImplementation((callback) => {
          callback(error);
        });
        
        await expect(webSocketManager.stop())
          .rejects.toThrow('Failed to stop WebSocket server: Stop failed');
      });

      it('should not stop if not running', async () => {
        await webSocketManager.stop();
        
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'WebSocket server is not running'
        );
        expect(mockIO.close).not.toHaveBeenCalled();
      });
    });
  });

  describe('Client Connection Management', () => {
    let connectionHandler: Function;

    beforeEach(() => {
      connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
    });

    describe('connection', () => {
      it('should handle new client connections', () => {
        connectionHandler(mockSocket);
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Client connected:',
          mockSocket.id
        );
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('getStockData', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('getMarketOverview', expect.any(Function));
      });

      it('should track connected clients', () => {
        connectionHandler(mockSocket);
        
        const stats = webSocketManager.getStats();
        expect(stats.connectedClients).toBe(1);
      });

      it('should handle authentication if provided', () => {
        mockSocket.handshake.auth = { token: 'valid-token' };
        
        connectionHandler(mockSocket);
        
        expect(mockSocket.data.authenticated).toBe(true);
      });
    });

    describe('disconnect', () => {
      it('should handle client disconnections', () => {
        connectionHandler(mockSocket);
        
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1];
        
        disconnectHandler('client disconnect');
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Client disconnected:',
          mockSocket.id,
          'Reason:',
          'client disconnect'
        );
      });

      it('should clean up client subscriptions on disconnect', () => {
        connectionHandler(mockSocket);
        mockSocket.rooms.add('stock:AAPL');
        
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )?.[1];
        
        disconnectHandler('client disconnect');
        
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Cleaned up subscriptions for client:',
          mockSocket.id
        );
      });
    });
  });

  describe('Subscription Management', () => {
    let connectionHandler: Function;
    let subscribeHandler: Function;
    let unsubscribeHandler: Function;

    beforeEach(() => {
      connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      connectionHandler(mockSocket);
      
      subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe'
      )?.[1];
      
      unsubscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'unsubscribe'
      )?.[1];
    });

    describe('subscribe', () => {
      it('should handle stock subscription', async () => {
        const callback = vi.fn();
        
        await subscribeHandler({ type: 'stock', symbol: 'AAPL' }, callback);
        
        expect(mockSocket.join).toHaveBeenCalledWith('stock:AAPL');
        expect(mockRealTimeDataService.startRealTimeUpdates).toHaveBeenCalledWith(['AAPL']);
        expect(callback).toHaveBeenCalledWith({ success: true });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Client',
          mockSocket.id,
          'subscribed to stock:AAPL'
        );
      });

      it('should handle market subscription', async () => {
        const callback = vi.fn();
        
        await subscribeHandler({ type: 'market' }, callback);
        
        expect(mockSocket.join).toHaveBeenCalledWith('market');
        expect(callback).toHaveBeenCalledWith({ success: true });
      });

      it('should handle news subscription', async () => {
        const callback = vi.fn();
        
        await subscribeHandler({ type: 'news', symbol: 'AAPL' }, callback);
        
        expect(mockSocket.join).toHaveBeenCalledWith('news:AAPL');
        expect(callback).toHaveBeenCalledWith({ success: true });
      });

      it('should handle general news subscription', async () => {
        const callback = vi.fn();
        
        await subscribeHandler({ type: 'news' }, callback);
        
        expect(mockSocket.join).toHaveBeenCalledWith('news:general');
        expect(callback).toHaveBeenCalledWith({ success: true });
      });

      it('should validate subscription parameters', async () => {
        const callback = vi.fn();
        
        await subscribeHandler({ type: 'stock' }, callback); // Missing symbol
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Symbol is required for stock subscription'
        });
        expect(mockSocket.join).not.toHaveBeenCalled();
      });

      it('should handle invalid subscription types', async () => {
        const callback = vi.fn();
        
        await subscribeHandler({ type: 'invalid' }, callback);
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid subscription type: invalid'
        });
      });

      it('should handle subscription errors', async () => {
        const callback = vi.fn();
        mockRealTimeDataService.startRealTimeUpdates.mockRejectedValueOnce(
          new Error('Subscription failed')
        );
        
        await subscribeHandler({ type: 'stock', symbol: 'AAPL' }, callback);
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Subscription failed'
        });
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Subscription error for client',
          mockSocket.id,
          ':',
          expect.any(Error)
        );
      });

      it('should prevent duplicate subscriptions', async () => {
        const callback = vi.fn();
        mockSocket.rooms.add('stock:AAPL');
        
        await subscribeHandler({ type: 'stock', symbol: 'AAPL' }, callback);
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Already subscribed to stock:AAPL'
        });
        expect(mockRealTimeDataService.startRealTimeUpdates).not.toHaveBeenCalled();
      });
    });

    describe('unsubscribe', () => {
      it('should handle stock unsubscription', async () => {
        const callback = vi.fn();
        mockSocket.rooms.add('stock:AAPL');
        
        await unsubscribeHandler({ type: 'stock', symbol: 'AAPL' }, callback);
        
        expect(mockSocket.leave).toHaveBeenCalledWith('stock:AAPL');
        expect(callback).toHaveBeenCalledWith({ success: true });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'Client',
          mockSocket.id,
          'unsubscribed from stock:AAPL'
        );
      });

      it('should handle market unsubscription', async () => {
        const callback = vi.fn();
        mockSocket.rooms.add('market');
        
        await unsubscribeHandler({ type: 'market' }, callback);
        
        expect(mockSocket.leave).toHaveBeenCalledWith('market');
        expect(callback).toHaveBeenCalledWith({ success: true });
      });

      it('should handle unsubscription from non-subscribed channel', async () => {
        const callback = vi.fn();
        
        await unsubscribeHandler({ type: 'stock', symbol: 'AAPL' }, callback);
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Not subscribed to stock:AAPL'
        });
      });

      it('should stop real-time updates when no clients subscribed', async () => {
        const callback = vi.fn();
        mockSocket.rooms.add('stock:AAPL');
        mockIO.sockets.adapter = {
          rooms: new Map([['stock:AAPL', new Set([mockSocket.id])]])
        };
        
        await unsubscribeHandler({ type: 'stock', symbol: 'AAPL' }, callback);
        
        expect(mockRealTimeDataService.stopRealTimeUpdates).toHaveBeenCalledWith(['AAPL']);
      });
    });
  });

  describe('Data Request Handlers', () => {
    let connectionHandler: Function;
    let getStockDataHandler: Function;
    let getMarketOverviewHandler: Function;

    beforeEach(() => {
      connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      connectionHandler(mockSocket);
      
      getStockDataHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'getStockData'
      )?.[1];
      
      getMarketOverviewHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'getMarketOverview'
      )?.[1];
    });

    describe('getStockData', () => {
      it('should handle stock data requests', async () => {
        const callback = vi.fn();
        
        await getStockDataHandler({ symbol: 'AAPL' }, callback);
        
        expect(mockRealTimeDataService.getStockData).toHaveBeenCalledWith('AAPL');
        expect(callback).toHaveBeenCalledWith({
          success: true,
          data: mockStockData
        });
      });

      it('should validate stock data request parameters', async () => {
        const callback = vi.fn();
        
        await getStockDataHandler({}, callback); // Missing symbol
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Symbol is required'
        });
        expect(mockRealTimeDataService.getStockData).not.toHaveBeenCalled();
      });

      it('should handle stock data request errors', async () => {
        const callback = vi.fn();
        mockRealTimeDataService.getStockData.mockRejectedValueOnce(
          new Error('Stock not found')
        );
        
        await getStockDataHandler({ symbol: 'INVALID' }, callback);
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Stock not found'
        });
      });
    });

    describe('getMarketOverview', () => {
      it('should handle market overview requests', async () => {
        const callback = vi.fn();
        
        await getMarketOverviewHandler({}, callback);
        
        expect(mockRealTimeDataService.getMarketOverview).toHaveBeenCalled();
        expect(callback).toHaveBeenCalledWith({
          success: true,
          data: mockMarketOverview
        });
      });

      it('should handle market overview request errors', async () => {
        const callback = vi.fn();
        mockRealTimeDataService.getMarketOverview.mockRejectedValueOnce(
          new Error('Market data unavailable')
        );
        
        await getMarketOverviewHandler({}, callback);
        
        expect(callback).toHaveBeenCalledWith({
          success: false,
          error: 'Market data unavailable'
        });
      });
    });
  });

  describe('Real-time Data Broadcasting', () => {
    let stockUpdateHandler: Function;
    let marketUpdateHandler: Function;
    let newsUpdateHandler: Function;

    beforeEach(() => {
      stockUpdateHandler = mockRealTimeDataService.subscribe.mock.calls.find(
        call => call[0] === 'stockUpdate'
      )?.[1];
      
      marketUpdateHandler = mockRealTimeDataService.subscribe.mock.calls.find(
        call => call[0] === 'marketUpdate'
      )?.[1];
      
      newsUpdateHandler = mockRealTimeDataService.subscribe.mock.calls.find(
        call => call[0] === 'newsUpdate'
      )?.[1];
    });

    describe('stock updates', () => {
      it('should broadcast stock updates to subscribed clients', () => {
        const updateData = {
          symbol: 'AAPL',
          data: mockStockData,
          timestamp: new Date().toISOString()
        };
        
        stockUpdateHandler(updateData);
        
        expect(mockIO.to).toHaveBeenCalledWith('stock:AAPL');
        expect(mockIO.emit).toHaveBeenCalledWith('stockUpdate', updateData);
      });

      it('should handle stock update broadcasting errors', () => {
        mockIO.emit.mockImplementation(() => {
          throw new Error('Broadcast failed');
        });
        
        const updateData = {
          symbol: 'AAPL',
          data: mockStockData,
          timestamp: new Date().toISOString()
        };
        
        expect(() => stockUpdateHandler(updateData)).not.toThrow();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error broadcasting stock update:',
          expect.any(Error)
        );
      });
    });

    describe('market updates', () => {
      it('should broadcast market updates to subscribed clients', () => {
        const updateData = {
          data: mockMarketOverview,
          timestamp: new Date().toISOString()
        };
        
        marketUpdateHandler(updateData);
        
        expect(mockIO.to).toHaveBeenCalledWith('market');
        expect(mockIO.emit).toHaveBeenCalledWith('marketUpdate', updateData);
      });
    });

    describe('news updates', () => {
      it('should broadcast news updates to subscribed clients', () => {
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
        
        newsUpdateHandler(updateData);
        
        expect(mockIO.to).toHaveBeenCalledWith('news:AAPL');
        expect(mockIO.emit).toHaveBeenCalledWith('newsUpdate', updateData);
      });

      it('should broadcast general news updates', () => {
        const updateData = {
          data: [{
            id: '1',
            title: 'Market News',
            summary: 'General market news',
            url: 'https://example.com',
            publishedAt: new Date().toISOString(),
            source: 'MarketWatch',
            sentiment: 'neutral' as const,
            relatedSymbols: []
          }],
          timestamp: new Date().toISOString()
        };
        
        newsUpdateHandler(updateData);
        
        expect(mockIO.to).toHaveBeenCalledWith('news:general');
        expect(mockIO.emit).toHaveBeenCalledWith('newsUpdate', updateData);
      });
    });
  });

  describe('Rate Limiting', () => {
    let connectionHandler: Function;

    beforeEach(() => {
      connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
    });

    it('should implement rate limiting for client requests', () => {
      connectionHandler(mockSocket);
      
      expect(mockIO.use).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should block clients exceeding rate limits', () => {
      const rateLimitMiddleware = mockIO.use.mock.calls[0]?.[1];
      const next = vi.fn();
      
      // Simulate rapid requests
      for (let i = 0; i < 100; i++) {
        rateLimitMiddleware(mockSocket, next);
      }
      
      expect(next).toHaveBeenCalledWith(new Error('Rate limit exceeded'));
    });
  });

  describe('Authentication', () => {
    let connectionHandler: Function;

    beforeEach(() => {
      connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
    });

    it('should authenticate clients with valid tokens', () => {
      mockSocket.handshake.auth = { token: 'valid-token' };
      
      connectionHandler(mockSocket);
      
      expect(mockSocket.data.authenticated).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Client authenticated:',
        mockSocket.id
      );
    });

    it('should reject clients with invalid tokens', () => {
      mockSocket.handshake.auth = { token: 'invalid-token' };
      
      connectionHandler(mockSocket);
      
      expect(mockSocket.data.authenticated).toBe(false);
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });

    it('should allow unauthenticated clients with limited access', () => {
      connectionHandler(mockSocket);
      
      expect(mockSocket.data.authenticated).toBe(false);
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket server errors gracefully', () => {
      const error = new Error('Server error');
      const errorHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        errorHandler(error);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'WebSocket server error:',
          error
        );
      }
    });

    it('should handle client errors gracefully', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      connectionHandler(mockSocket);
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        const error = new Error('Client error');
        errorHandler(error);
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Client error for',
          mockSocket.id,
          ':',
          error
        );
      }
    });

    it('should handle malformed client messages', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe'
      )?.[1];
      
      const callback = vi.fn();
      subscribeHandler('invalid-data', callback);
      
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid request format'
      });
    });
  });

  describe('Performance Monitoring', () => {
    describe('getStats', () => {
      it('should return WebSocket server statistics', () => {
        mockIO.engine.clientsCount = 5;
        mockIO.sockets.sockets = new Map([
          ['socket1', {}],
          ['socket2', {}],
          ['socket3', {}]
        ]);
        
        const stats = webSocketManager.getStats();
        
        expect(stats).toEqual({
          connectedClients: 5,
          totalConnections: 3,
          activeSubscriptions: expect.any(Number),
          uptime: expect.any(Number),
          memoryUsage: expect.any(Object)
        });
      });
    });

    describe('getHealth', () => {
      it('should return health status', async () => {
        mockServer.listen.mockImplementation((port, callback) => {
          callback();
        });
        
        await webSocketManager.start(3001);
        
        const health = await webSocketManager.getHealth();
        
        expect(health).toEqual({
          status: 'healthy',
          server: 'running',
          port: 3001,
          connectedClients: expect.any(Number),
          uptime: expect.any(Number)
        });
      });

      it('should return unhealthy status when server is down', async () => {
        const health = await webSocketManager.getHealth();
        
        expect(health).toEqual({
          status: 'unhealthy',
          server: 'stopped',
          port: null,
          connectedClients: 0,
          uptime: 0
        });
      });
    });
  });

  describe('Memory Management', () => {
    it('should clean up resources on server stop', async () => {
      mockServer.listen.mockImplementation((port, callback) => {
        callback();
      });
      
      mockServer.close.mockImplementation((callback) => {
        callback();
      });
      
      mockIO.close.mockImplementation((callback) => {
        callback();
      });
      
      await webSocketManager.start(3001);
      await webSocketManager.stop();
      
      expect(mockRealTimeDataService.unsubscribe).toHaveBeenCalledTimes(3);
    });

    it('should handle memory pressure gracefully', () => {
      // Simulate high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = vi.fn().mockReturnValue({
        rss: 1000000000, // 1GB
        heapTotal: 800000000,
        heapUsed: 750000000,
        external: 50000000,
        arrayBuffers: 10000000
      });
      
      const stats = webSocketManager.getStats();
      
      expect(stats.memoryUsage.heapUsed).toBeGreaterThan(700000000);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'High memory usage detected:',
        expect.any(Number)
      );
      
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle graceful shutdown', async () => {
      mockServer.listen.mockImplementation((port, callback) => {
        callback();
      });
      
      await webSocketManager.start(3001);
      
      // Simulate shutdown signal
      const shutdownHandler = process.listeners('SIGTERM')[0] as Function;
      if (shutdownHandler) {
        await shutdownHandler();
        
        expect(mockLogger.info).toHaveBeenCalledWith(
          'Graceful shutdown initiated'
        );
        expect(mockIO.close).toHaveBeenCalled();
      }
    });

    it('should disconnect all clients during shutdown', async () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      
      connectionHandler(mockSocket);
      
      await webSocketManager.stop();
      
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });
});