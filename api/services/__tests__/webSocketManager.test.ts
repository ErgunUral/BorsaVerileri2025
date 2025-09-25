import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { WebSocketManager } from '../webSocketManager';
import { logger } from '../../utils/logger';
import { RateLimiter } from '../../utils/rateLimiter';

// Mock dependencies
vi.mock('socket.io');
vi.mock('http');
vi.mock('../../utils/logger');
vi.mock('../../utils/rateLimiter');

const MockedSocketIOServer = vi.mocked(SocketIOServer);
const mockedCreateServer = vi.mocked(createServer);
const mockedLogger = vi.mocked(logger);
const MockedRateLimiter = vi.mocked(RateLimiter);

describe('WebSocketManager', () => {
  let webSocketManager: WebSocketManager;
  let mockServer: any;
  let mockSocketIOServer: any;
  let mockRateLimiter: any;
  let mockSocket: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockServer = {
      listen: vi.fn(),
      close: vi.fn(),
      on: vi.fn()
    };

    mockSocket = {
      id: 'socket-123',
      handshake: {
        address: '127.0.0.1',
        headers: { 'user-agent': 'test-client' }
      },
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      on: vi.fn(),
      disconnect: vi.fn(),
      rooms: new Set(),
      data: {}
    };

    mockSocketIOServer = {
      on: vi.fn(),
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      sockets: {
        sockets: new Map([['socket-123', mockSocket]]),
        adapter: {
          rooms: new Map(),
          sids: new Map()
        }
      },
      engine: {
        clientsCount: 1
      },
      close: vi.fn()
    };

    mockRateLimiter = {
      isAllowed: vi.fn().mockReturnValue(true),
      reset: vi.fn(),
      getStats: vi.fn().mockReturnValue({ requests: 0, blocked: 0 })
    };

    mockedCreateServer.mockReturnValue(mockServer);
    MockedSocketIOServer.mockImplementation(() => mockSocketIOServer);
    MockedRateLimiter.mockImplementation(() => mockRateLimiter);

    webSocketManager = new WebSocketManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(webSocketManager).toBeDefined();
      expect(mockedCreateServer).toHaveBeenCalled();
      expect(MockedSocketIOServer).toHaveBeenCalledWith(mockServer, {
        cors: {
          origin: '*',
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        port: 8080,
        cors: {
          origin: 'https://example.com',
          credentials: true
        },
        maxConnections: 500
      };

      const customManager = new WebSocketManager(customConfig);
      expect(customManager).toBeDefined();
    });

    it('should setup connection event listeners', () => {
      expect(mockSocketIOServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Connection Management', () => {
    let connectionHandler: Function;

    beforeEach(() => {
      connectionHandler = mockSocketIOServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
    });

    it('should handle new connections', () => {
      connectionHandler(mockSocket);

      expect(mockedLogger.info).toHaveBeenCalledWith(
        `Client connected: ${mockSocket.id}`
      );
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should enforce connection limits', () => {
      const maxConnections = 2;
      const limitedManager = new WebSocketManager({ maxConnections });
      
      // Simulate reaching connection limit
      mockSocketIOServer.engine.clientsCount = maxConnections + 1;
      
      connectionHandler(mockSocket);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Connection limit exceeded'
      });
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should handle client disconnection', () => {
      connectionHandler(mockSocket);
      
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )?.[1];
      
      disconnectHandler('client disconnect');
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        `Client disconnected: ${mockSocket.id}`
      );
    });

    it('should track connection metrics', () => {
      connectionHandler(mockSocket);
      
      const metrics = webSocketManager.getMetrics();
      expect(metrics.totalConnections).toBeGreaterThan(0);
    });

    it('should handle authentication', () => {
      const authSocket = {
        ...mockSocket,
        handshake: {
          ...mockSocket.handshake,
          auth: { token: 'valid-token' }
        }
      };

      connectionHandler(authSocket);
      
      expect(authSocket.data.authenticated).toBe(true);
    });

    it('should reject invalid authentication', () => {
      const authSocket = {
        ...mockSocket,
        handshake: {
          ...mockSocket.handshake,
          auth: { token: 'invalid-token' }
        }
      };

      connectionHandler(authSocket);
      
      expect(authSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication failed'
      });
      expect(authSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('Room Management', () => {
    beforeEach(() => {
      const connectionHandler = mockSocketIOServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      connectionHandler(mockSocket);
    });

    it('should join clients to rooms', async () => {
      await webSocketManager.joinRoom(mockSocket.id, 'stock:AAPL');
      
      expect(mockSocket.join).toHaveBeenCalledWith('stock:AAPL');
    });

    it('should leave clients from rooms', async () => {
      await webSocketManager.leaveRoom(mockSocket.id, 'stock:AAPL');
      
      expect(mockSocket.leave).toHaveBeenCalledWith('stock:AAPL');
    });

    it('should get room client count', () => {
      const roomName = 'stock:AAPL';
      mockSocketIOServer.sockets.adapter.rooms.set(roomName, new Set(['socket-123']));
      
      const count = webSocketManager.getRoomClients(roomName);
      expect(count).toBe(1);
    });

    it('should list all rooms', () => {
      mockSocketIOServer.sockets.adapter.rooms.set('stock:AAPL', new Set(['socket-123']));
      mockSocketIOServer.sockets.adapter.rooms.set('stock:GOOGL', new Set(['socket-456']));
      
      const rooms = webSocketManager.getRooms();
      expect(rooms).toContain('stock:AAPL');
      expect(rooms).toContain('stock:GOOGL');
    });

    it('should handle room join errors', async () => {
      mockSocket.join.mockImplementation(() => {
        throw new Error('Join failed');
      });

      await expect(webSocketManager.joinRoom(mockSocket.id, 'invalid:room'))
        .rejects.toThrow('Join failed');
    });

    it('should validate room names', async () => {
      await expect(webSocketManager.joinRoom(mockSocket.id, ''))
        .rejects.toThrow('Invalid room name');
      
      await expect(webSocketManager.joinRoom(mockSocket.id, 'room with spaces'))
        .rejects.toThrow('Invalid room name');
    });
  });

  describe('Message Broadcasting', () => {
    const testMessage = {
      type: 'stock_update',
      data: {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50
      }
    };

    it('should broadcast to all clients', () => {
      webSocketManager.broadcast(testMessage);
      
      expect(mockSocketIOServer.emit).toHaveBeenCalledWith('message', testMessage);
    });

    it('should broadcast to specific room', () => {
      const roomName = 'stock:AAPL';
      
      webSocketManager.broadcastToRoom(roomName, testMessage);
      
      expect(mockSocketIOServer.to).toHaveBeenCalledWith(roomName);
      expect(mockSocketIOServer.emit).toHaveBeenCalledWith('message', testMessage);
    });

    it('should send message to specific client', () => {
      webSocketManager.sendToClient(mockSocket.id, testMessage);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('message', testMessage);
    });

    it('should handle message validation', () => {
      const invalidMessage = { type: '', data: null };
      
      expect(() => webSocketManager.broadcast(invalidMessage))
        .toThrow('Invalid message format');
    });

    it('should track message metrics', () => {
      webSocketManager.broadcast(testMessage);
      webSocketManager.broadcastToRoom('stock:AAPL', testMessage);
      
      const metrics = webSocketManager.getMetrics();
      expect(metrics.messagesSent).toBe(2);
    });

    it('should handle broadcast errors gracefully', () => {
      mockSocketIOServer.emit.mockImplementation(() => {
        throw new Error('Broadcast failed');
      });

      expect(() => webSocketManager.broadcast(testMessage)).not.toThrow();
      expect(mockedLogger.error).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      const connectionHandler = mockSocketIOServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      connectionHandler(mockSocket);
    });

    it('should allow messages within rate limit', () => {
      mockRateLimiter.isAllowed.mockReturnValue(true);
      
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const testMessage = { type: 'subscribe', symbol: 'AAPL' };
      messageHandler(testMessage);
      
      expect(mockRateLimiter.isAllowed).toHaveBeenCalledWith(mockSocket.id);
    });

    it('should block messages exceeding rate limit', () => {
      mockRateLimiter.isAllowed.mockReturnValue(false);
      
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const testMessage = { type: 'subscribe', symbol: 'AAPL' };
      messageHandler(testMessage);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Rate limit exceeded'
      });
    });

    it('should reset rate limits periodically', () => {
      vi.useFakeTimers();
      
      webSocketManager.start();
      
      vi.advanceTimersByTime(60000); // 1 minute
      
      expect(mockRateLimiter.reset).toHaveBeenCalled();
      
      vi.useRealTimers();
    });

    it('should track rate limit violations', () => {
      mockRateLimiter.isAllowed.mockReturnValue(false);
      
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      messageHandler({ type: 'test' });
      
      const metrics = webSocketManager.getMetrics();
      expect(metrics.rateLimitViolations).toBeGreaterThan(0);
    });
  });

  describe('Message Handling', () => {
    let messageHandler: Function;

    beforeEach(() => {
      const connectionHandler = mockSocketIOServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      connectionHandler(mockSocket);
      
      messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
    });

    it('should handle subscription messages', () => {
      const subscribeMessage = {
        type: 'subscribe',
        symbol: 'AAPL'
      };
      
      messageHandler(subscribeMessage);
      
      expect(mockSocket.join).toHaveBeenCalledWith('stock:AAPL');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        symbol: 'AAPL',
        room: 'stock:AAPL'
      });
    });

    it('should handle unsubscription messages', () => {
      const unsubscribeMessage = {
        type: 'unsubscribe',
        symbol: 'AAPL'
      };
      
      messageHandler(unsubscribeMessage);
      
      expect(mockSocket.leave).toHaveBeenCalledWith('stock:AAPL');
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
        symbol: 'AAPL',
        room: 'stock:AAPL'
      });
    });

    it('should handle ping messages', () => {
      const pingMessage = { type: 'ping' };
      
      messageHandler(pingMessage);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        timestamp: expect.any(Number)
      });
    });

    it('should validate message format', () => {
      const invalidMessage = { invalid: 'message' };
      
      messageHandler(invalidMessage);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid message format'
      });
    });

    it('should handle unknown message types', () => {
      const unknownMessage = { type: 'unknown_type' };
      
      messageHandler(unknownMessage);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Unknown message type: unknown_type'
      });
    });

    it('should log message handling errors', () => {
      mockSocket.join.mockImplementation(() => {
        throw new Error('Join failed');
      });
      
      const subscribeMessage = {
        type: 'subscribe',
        symbol: 'AAPL'
      };
      
      messageHandler(subscribeMessage);
      
      expect(mockedLogger.error).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to process message'
      });
    });
  });

  describe('Health Monitoring', () => {
    it('should check WebSocket health', async () => {
      const health = await webSocketManager.getHealth();
      
      expect(health).toEqual({
        status: 'healthy',
        connectedClients: expect.any(Number),
        activeRooms: expect.any(Number),
        uptime: expect.any(Number)
      });
    });

    it('should detect unhealthy state', async () => {
      // Simulate server error
      mockServer.listening = false;
      
      const health = await webSocketManager.getHealth();
      
      expect(health.status).toBe('unhealthy');
    });

    it('should provide detailed metrics', () => {
      const metrics = webSocketManager.getMetrics();
      
      expect(metrics).toEqual({
        connectedClients: expect.any(Number),
        totalConnections: expect.any(Number),
        messagesSent: expect.any(Number),
        messagesReceived: expect.any(Number),
        rateLimitViolations: expect.any(Number),
        errors: expect.any(Number),
        uptime: expect.any(Number),
        memoryUsage: expect.any(Object)
      });
    });

    it('should track memory usage', () => {
      const metrics = webSocketManager.getMetrics();
      
      expect(metrics.memoryUsage).toEqual({
        rss: expect.any(Number),
        heapTotal: expect.any(Number),
        heapUsed: expect.any(Number),
        external: expect.any(Number)
      });
    });
  });

  describe('Server Lifecycle', () => {
    it('should start the WebSocket server', async () => {
      const port = 3001;
      
      await webSocketManager.start(port);
      
      expect(mockServer.listen).toHaveBeenCalledWith(port, expect.any(Function));
    });

    it('should handle server start errors', async () => {
      mockServer.listen.mockImplementation((port, callback) => {
        callback(new Error('Port already in use'));
      });
      
      await expect(webSocketManager.start(3001))
        .rejects.toThrow('Port already in use');
    });

    it('should stop the WebSocket server', async () => {
      await webSocketManager.stop();
      
      expect(mockSocketIOServer.close).toHaveBeenCalled();
      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should handle graceful shutdown', async () => {
      // Start server first
      await webSocketManager.start(3001);
      
      // Add some connections
      const connectionHandler = mockSocketIOServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      connectionHandler(mockSocket);
      
      // Graceful shutdown
      await webSocketManager.shutdown();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('server_shutdown', {
        message: 'Server is shutting down'
      });
      expect(mockSocketIOServer.close).toHaveBeenCalled();
    });

    it('should cleanup resources on shutdown', async () => {
      await webSocketManager.start(3001);
      await webSocketManager.shutdown();
      
      const metrics = webSocketManager.getMetrics();
      expect(metrics.connectedClients).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle socket errors', () => {
      const connectionHandler = mockSocketIOServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      connectionHandler(mockSocket);
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      const error = new Error('Socket error');
      errorHandler(error);
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        `Socket error for ${mockSocket.id}:`,
        error
      );
    });

    it('should handle server errors', () => {
      const serverErrorHandler = mockServer.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      const error = new Error('Server error');
      serverErrorHandler?.(error);
      
      expect(mockedLogger.error).toHaveBeenCalledWith('Server error:', error);
    });

    it('should recover from temporary errors', async () => {
      // Simulate temporary error
      mockSocketIOServer.emit.mockImplementationOnce(() => {
        throw new Error('Temporary error');
      });
      
      // Should not crash the service
      webSocketManager.broadcast({ type: 'test', data: {} });
      
      // Next broadcast should work
      mockSocketIOServer.emit.mockImplementation(() => {});
      webSocketManager.broadcast({ type: 'test', data: {} });
      
      expect(mockSocketIOServer.emit).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed messages', () => {
      const connectionHandler = mockSocketIOServer.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];
      connectionHandler(mockSocket);
      
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      // Send malformed message
      messageHandler('not an object');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid message format'
      });
    });
  });

  describe('Performance Optimization', () => {
    it('should batch multiple messages', async () => {
      const messages = [
        { type: 'stock_update', data: { symbol: 'AAPL', price: 150 } },
        { type: 'stock_update', data: { symbol: 'GOOGL', price: 2800 } },
        { type: 'stock_update', data: { symbol: 'MSFT', price: 300 } }
      ];
      
      await webSocketManager.batchBroadcast(messages);
      
      expect(mockSocketIOServer.emit).toHaveBeenCalledWith('batch_update', {
        messages,
        timestamp: expect.any(Number)
      });
    });

    it('should compress large messages', () => {
      const largeMessage = {
        type: 'large_data',
        data: 'x'.repeat(10000)
      };
      
      const compressSpy = vi.spyOn(webSocketManager as any, 'compressMessage')
        .mockReturnValue({ compressed: true, data: 'compressed_data' });
      
      webSocketManager.broadcast(largeMessage);
      
      expect(compressSpy).toHaveBeenCalledWith(largeMessage);
    });

    it('should throttle high-frequency updates', () => {
      vi.useFakeTimers();
      
      const message = { type: 'price_update', data: { symbol: 'AAPL' } };
      
      // Send multiple rapid updates
      for (let i = 0; i < 10; i++) {
        webSocketManager.broadcastToRoom('stock:AAPL', message);
      }
      
      // Should throttle to prevent spam
      expect(mockSocketIOServer.emit).toHaveBeenCalledTimes(1);
      
      vi.useRealTimers();
    });

    it('should use connection pooling for high load', () => {
      const pooledManager = new WebSocketManager({
        enableConnectionPooling: true,
        maxPoolSize: 100
      });
      
      expect(pooledManager).toBeDefined();
    });
  });
})