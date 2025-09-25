import { WebSocketManager } from '../services/WebSocketManager';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { vi, describe, test, beforeEach, afterEach, expect } from 'vitest';

// Mock socket.io
vi.mock('socket.io');
const MockedSocketIOServer = SocketIOServer as any;

// Mock http server
vi.mock('http', () => ({
  createServer: vi.fn()
}));
const mockedCreateServer = createServer as any;

const mockSocket = {
  id: 'socket123',
  join: vi.fn(),
  leave: vi.fn(),
  emit: vi.fn(),
  broadcast: {
    emit: vi.fn(),
    to: vi.fn().mockReturnThis()
  },
  to: vi.fn().mockReturnThis(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  rooms: new Set(['room1', 'room2']),
  handshake: {
    auth: { token: 'valid-token' },
    query: { clientId: 'client123' }
  },
  data: {},
  connected: true
};

const mockIOInstance = {
  on: vi.fn(),
  emit: vi.fn(),
  to: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  sockets: {
    sockets: new Map([['socket123', mockSocket]]),
    adapter: {
      rooms: new Map([
        ['room1', new Set(['socket123'])],
        ['room2', new Set(['socket123', 'socket456'])]
      ])
    }
  },
  engine: {
    clientsCount: 1
  },
  close: vi.fn(),
  listen: vi.fn(),
  use: vi.fn()
};

MockedSocketIOServer.mockImplementation(() => mockIOInstance as any);

const mockHttpServer = {
  listen: vi.fn(),
  close: vi.fn(),
  on: vi.fn()
};

mockedCreateServer.mockReturnValue(mockHttpServer as any);

describe('WebSocket Manager', () => {
  let wsManager: WebSocketManager;

  beforeEach(() => {
    vi.clearAllMocks();
    wsManager = new WebSocketManager({
      port: 3001,
      cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      maxConnections: 1000,
      heartbeatInterval: 30000
    });
  });

  afterEach(async () => {
    await wsManager.close();
  });

  describe('initialization', () => {
    test('creates WebSocket server with correct configuration', () => {
      expect(MockedSocketIOServer).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: 'http://localhost:3000',
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
      });
    });

    test('sets up connection event handlers', () => {
      expect(mockIOInstance.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    test('starts HTTP server on specified port', async () => {
      await wsManager.start();
      
      expect(mockHttpServer.listen).toHaveBeenCalledWith(3001, expect.any(Function));
    });

    test('handles server startup errors', async () => {
      mockHttpServer.listen.mockImplementationOnce((port, callback) => {
        callback(new Error('Port already in use'));
      });
      
      await expect(wsManager.start()).rejects.toThrow('Port already in use');
    });
  });

  describe('connection management', () => {
    test('handles new client connections', async () => {
      await wsManager.start();
      
      // Simulate connection event
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('subscribe', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe', expect.any(Function));
    });

    test('authenticates clients on connection', async () => {
      const authenticatedSocket = {
        ...mockSocket,
        handshake: {
          auth: { token: 'valid-token' },
          query: { clientId: 'client123' }
        }
      };
      
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(authenticatedSocket);
      
      expect(authenticatedSocket.emit).toHaveBeenCalledWith('authenticated', {
        clientId: 'client123',
        timestamp: expect.any(String)
      });
    });

    test('rejects unauthenticated connections', async () => {
      const unauthenticatedSocket = {
        ...mockSocket,
        handshake: {
          auth: { token: 'invalid-token' },
          query: {}
        }
      };
      
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(unauthenticatedSocket);
      
      expect(unauthenticatedSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication failed'
      });
      expect(unauthenticatedSocket.disconnect).toHaveBeenCalled();
    });

    test('tracks connected clients', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const clientCount = wsManager.getConnectedClients();
      expect(clientCount).toBe(1);
    });

    test('handles client disconnections', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      // Simulate disconnect event
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      disconnectHandler('client disconnect');
      
      const clientCount = wsManager.getConnectedClients();
      expect(clientCount).toBe(0);
    });

    test('enforces maximum connection limit', async () => {
      const limitedWsManager = new WebSocketManager({ maxConnections: 1 });
      await limitedWsManager.start();
      
      // Mock multiple connections
      mockIOInstance.engine.clientsCount = 2;
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      const newSocket = { ...mockSocket, id: 'socket456' };
      connectionHandler(newSocket);
      
      expect(newSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Maximum connections exceeded'
      });
      expect(newSocket.disconnect).toHaveBeenCalled();
      
      await limitedWsManager.close();
    });
  });

  describe('room management', () => {
    test('adds clients to rooms', async () => {
      const clientId = 'client123';
      const room = 'stock:THYAO';
      
      await wsManager.addClientToRoom(clientId, room);
      
      expect(mockSocket.join).toHaveBeenCalledWith(room);
    });

    test('removes clients from rooms', async () => {
      const clientId = 'client123';
      const room = 'stock:THYAO';
      
      await wsManager.removeClientFromRoom(clientId, room);
      
      expect(mockSocket.leave).toHaveBeenCalledWith(room);
    });

    test('gets rooms for a client', () => {
      const clientId = 'client123';
      
      const rooms = wsManager.getClientRooms(clientId);
      
      expect(rooms).toEqual(['room1', 'room2']);
    });

    test('gets clients in a room', () => {
      const room = 'room1';
      
      const clients = wsManager.getRoomClients(room);
      
      expect(clients).toEqual(['socket123']);
    });

    test('handles non-existent clients gracefully', () => {
      const clientId = 'nonexistent';
      
      const rooms = wsManager.getClientRooms(clientId);
      
      expect(rooms).toEqual([]);
    });

    test('handles non-existent rooms gracefully', () => {
      const room = 'nonexistent';
      
      const clients = wsManager.getRoomClients(room);
      
      expect(clients).toEqual([]);
    });
  });

  describe('message broadcasting', () => {
    test('broadcasts messages to all clients', async () => {
      const event = 'stockUpdate';
      const data = { symbol: 'THYAO', price: 147.5 };
      
      await wsManager.broadcast(event, data);
      
      expect(mockIOInstance.emit).toHaveBeenCalledWith(event, data);
    });

    test('broadcasts messages to specific room', async () => {
      const room = 'stock:THYAO';
      const event = 'priceUpdate';
      const data = { price: 147.5, change: 2.5 };
      
      await wsManager.broadcastToRoom(room, event, data);
      
      expect(mockIOInstance.to).toHaveBeenCalledWith(room);
      expect(mockIOInstance.emit).toHaveBeenCalledWith(event, data);
    });

    test('sends messages to specific client', async () => {
      const clientId = 'client123';
      const event = 'personalAlert';
      const data = { message: 'Your stock alert triggered' };
      
      await wsManager.sendToClient(clientId, event, data);
      
      expect(mockSocket.emit).toHaveBeenCalledWith(event, data);
    });

    test('handles broadcasting to non-existent rooms', async () => {
      const room = 'nonexistent';
      const event = 'test';
      const data = { test: true };
      
      // Should not throw error
      await expect(wsManager.broadcastToRoom(room, event, data))
        .resolves.not.toThrow();
    });

    test('handles sending to non-existent clients', async () => {
      const clientId = 'nonexistent';
      const event = 'test';
      const data = { test: true };
      
      // Should not throw error
      await expect(wsManager.sendToClient(clientId, event, data))
        .resolves.not.toThrow();
    });
  });

  describe('subscription handling', () => {
    test('handles stock subscription requests', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      // Simulate subscription event
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe'
      )[1];
      
      subscribeHandler({ type: 'stock', symbol: 'THYAO' });
      
      expect(mockSocket.join).toHaveBeenCalledWith('stock:THYAO');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        type: 'stock',
        symbol: 'THYAO',
        timestamp: expect.any(String)
      });
    });

    test('handles market subscription requests', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe'
      )[1];
      
      subscribeHandler({ type: 'market' });
      
      expect(mockSocket.join).toHaveBeenCalledWith('market:summary');
      expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
        type: 'market',
        timestamp: expect.any(String)
      });
    });

    test('handles unsubscription requests', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const unsubscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'unsubscribe'
      )[1];
      
      unsubscribeHandler({ type: 'stock', symbol: 'THYAO' });
      
      expect(mockSocket.leave).toHaveBeenCalledWith('stock:THYAO');
      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
        type: 'stock',
        symbol: 'THYAO',
        timestamp: expect.any(String)
      });
    });

    test('validates subscription requests', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe'
      )[1];
      
      // Invalid subscription request
      subscribeHandler({ type: 'invalid' });
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid subscription type'
      });
    });
  });

  describe('heartbeat and connection monitoring', () => {
    test('implements heartbeat mechanism', async () => {
      jest.useFakeTimers();
      
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      // Fast forward time to trigger heartbeat
      jest.advanceTimersByTime(30000);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('ping', {
        timestamp: expect.any(String)
      });
      
      jest.useRealTimers();
    });

    test('handles pong responses', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      // Simulate pong event
      const pongHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'pong'
      )[1];
      
      pongHandler({ timestamp: new Date().toISOString() });
      
      // Should update last seen timestamp
      const clientInfo = wsManager.getClientInfo('client123');
      expect(clientInfo.lastSeen).toBeDefined();
    });

    test('detects and removes stale connections', async () => {
      jest.useFakeTimers();
      
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      // Fast forward time beyond heartbeat timeout
      jest.advanceTimersByTime(90000); // 90 seconds
      
      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      
      jest.useRealTimers();
    });
  });

  describe('error handling', () => {
    test('handles socket errors gracefully', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      // Simulate error event
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      const error = new Error('Socket error');
      errorHandler(error);
      
      // Should log error and potentially disconnect
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    test('handles malformed messages', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe'
      )[1];
      
      // Send malformed subscription
      subscribeHandler('invalid json');
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid message format'
      });
    });

    test('handles server errors during startup', async () => {
      mockHttpServer.listen.mockImplementationOnce((port, callback) => {
        callback(new Error('EADDRINUSE'));
      });
      
      await expect(wsManager.start()).rejects.toThrow('EADDRINUSE');
    });
  });

  describe('performance and monitoring', () => {
    test('tracks connection statistics', () => {
      const stats = wsManager.getConnectionStats();
      
      expect(stats).toEqual({
        totalConnections: expect.any(Number),
        activeConnections: expect.any(Number),
        totalRooms: expect.any(Number),
        messagesPerSecond: expect.any(Number),
        uptime: expect.any(Number)
      });
    });

    test('monitors message throughput', async () => {
      const event = 'test';
      const data = { test: true };
      
      // Send multiple messages
      for (let i = 0; i < 10; i++) {
        await wsManager.broadcast(event, data);
      }
      
      const stats = wsManager.getConnectionStats();
      expect(stats.messagesPerSecond).toBeGreaterThan(0);
    });

    test('tracks memory usage', () => {
      const memoryUsage = wsManager.getMemoryUsage();
      
      expect(memoryUsage).toEqual({
        heapUsed: expect.any(Number),
        heapTotal: expect.any(Number),
        external: expect.any(Number),
        rss: expect.any(Number)
      });
    });

    test('implements rate limiting per client', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe'
      )[1];
      
      // Send multiple rapid subscription requests
      for (let i = 0; i < 20; i++) {
        subscribeHandler({ type: 'stock', symbol: `STOCK${i}` });
      }
      
      // Should rate limit after certain threshold
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Rate limit exceeded'
      });
    });
  });

  describe('graceful shutdown', () => {
    test('closes all connections gracefully', async () => {
      await wsManager.start();
      
      const connectionHandler = mockIOInstance.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      await wsManager.close();
      
      expect(mockIOInstance.close).toHaveBeenCalled();
      expect(mockHttpServer.close).toHaveBeenCalled();
    });

    test('waits for pending operations before closing', async () => {
      await wsManager.start();
      
      // Simulate pending broadcast
      const broadcastPromise = wsManager.broadcast('test', { data: 'test' });
      
      const closePromise = wsManager.close();
      
      await Promise.all([broadcastPromise, closePromise]);
      
      expect(mockIOInstance.close).toHaveBeenCalled();
    });

    test('handles forced shutdown', async () => {
      await wsManager.start();
      
      await wsManager.forceClose();
      
      expect(mockIOInstance.close).toHaveBeenCalled();
      expect(mockHttpServer.close).toHaveBeenCalled();
    });
  });

  describe('middleware and authentication', () => {
    test('applies authentication middleware', async () => {
      const authMiddleware = jest.fn((socket, next) => {
        if (socket.handshake.auth.token === 'valid-token') {
          next();
        } else {
          next(new Error('Authentication failed'));
        }
      });
      
      wsManager.use(authMiddleware);
      
      expect(mockIOInstance.use).toHaveBeenCalledWith(authMiddleware);
    });

    test('applies rate limiting middleware', async () => {
      const rateLimitMiddleware = jest.fn((socket, next) => {
        // Rate limiting logic
        next();
      });
      
      wsManager.use(rateLimitMiddleware);
      
      expect(mockIOInstance.use).toHaveBeenCalledWith(rateLimitMiddleware);
    });

    test('applies logging middleware', async () => {
      const loggingMiddleware = jest.fn((socket, next) => {
        console.log(`Client ${socket.id} connected`);
        next();
      });
      
      wsManager.use(loggingMiddleware);
      
      expect(mockIOInstance.use).toHaveBeenCalledWith(loggingMiddleware);
    });
  });

  describe('custom event handling', () => {
    test('registers custom event handlers', async () => {
      const customHandler = jest.fn();
      
      wsManager.on('customEvent', customHandler);
      
      await wsManager.start();
      
      // Emit custom event
      wsManager.emit('customEvent', { data: 'test' });
      
      expect(customHandler).toHaveBeenCalledWith({ data: 'test' });
    });

    test('removes event handlers', () => {
      const customHandler = jest.fn();
      
      wsManager.on('customEvent', customHandler);
      wsManager.off('customEvent', customHandler);
      
      wsManager.emit('customEvent', { data: 'test' });
      
      expect(customHandler).not.toHaveBeenCalled();
    });

    test('handles multiple listeners for same event', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsManager.on('testEvent', handler1);
      wsManager.on('testEvent', handler2);
      
      wsManager.emit('testEvent', { data: 'test' });
      
      expect(handler1).toHaveBeenCalledWith({ data: 'test' });
      expect(handler2).toHaveBeenCalledWith({ data: 'test' });
    });
  });
});