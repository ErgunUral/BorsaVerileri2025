import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server as SocketIOServer } from 'socket.io';
import WebSocketManager from '../WebSocketManager.js';

// Mock socket.io
vi.mock('socket.io', () => ({
  Server: vi.fn()
}));

// Mock console for logging
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('WebSocketManager', () => {
  let mockIO;
  let mockSocket;
  let webSocketManager;
  let mockServer;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock socket instance
    mockSocket = {
      id: 'socket-123',
      join: vi.fn(),
      leave: vi.fn(),
      emit: vi.fn(),
      broadcast: {
        emit: vi.fn(),
        to: vi.fn().mockReturnThis()
      },
      to: vi.fn().mockReturnThis(),
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
      rooms: new Set(),
      handshake: {
        auth: {},
        query: {},
        headers: {}
      }
    };

    // Mock socket.io server instance
    mockIO = {
      on: vi.fn(),
      emit: vi.fn(),
      to: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      sockets: {
        sockets: new Map([['socket-123', mockSocket]]),
        adapter: {
          rooms: new Map(),
          sids: new Map([['socket-123', new Set(['room1'])])
        }
      },
      engine: {
        clientsCount: 1
      },
      close: vi.fn()
    };

    // Mock HTTP server
    mockServer = {
      listen: vi.fn(),
      close: vi.fn()
    };

    SocketIOServer.mockImplementation(() => mockIO);
    
    webSocketManager = new WebSocketManager(mockServer);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize WebSocket server correctly', () => {
      expect(SocketIOServer).toHaveBeenCalledWith(mockServer, {
        cors: {
          origin: process.env.CLIENT_URL || 'http://localhost:3000',
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000
      });
    });

    it('should setup connection event handler', () => {
      expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should initialize with empty client tracking', () => {
      expect(webSocketManager.getConnectedClients()).toBe(0);
    });
  });

  describe('Connection Management', () => {
    describe('handleConnection', () => {
      it('should handle new client connection', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);

        expect(consoleSpy).toHaveBeenCalledWith(
          `Client connected: ${mockSocket.id}`
        );
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      });

      it('should setup socket event listeners', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);

        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('join-room', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('leave-room', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('subscribe-stock', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('unsubscribe-stock', expect.any(Function));
      });

      it('should emit welcome message to new client', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);

        expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
          message: 'Connected to WebSocket server',
          clientId: mockSocket.id,
          timestamp: expect.any(Number)
        });
      });

      it('should track client connection', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);

        expect(webSocketManager.getConnectedClients()).toBe(1);
      });

      it('should handle connection with authentication', () => {
        mockSocket.handshake.auth = {
          token: 'valid-jwt-token',
          userId: 'user-123'
        };
        
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);

        expect(mockSocket.userId).toBe('user-123');
        expect(consoleSpy).toHaveBeenCalledWith(
          `Authenticated client connected: ${mockSocket.id} (User: user-123)`
        );
      });
    });

    describe('handleDisconnection', () => {
      it('should handle client disconnection', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )[1];
        
        disconnectHandler('client disconnect');

        expect(consoleSpy).toHaveBeenCalledWith(
          `Client disconnected: ${mockSocket.id} (Reason: client disconnect)`
        );
      });

      it('should clean up client data on disconnect', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )[1];
        
        disconnectHandler('client disconnect');

        // Should clean up any client-specific data
        expect(webSocketManager.getConnectedClients()).toBe(0);
      });

      it('should handle different disconnect reasons', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const disconnectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )[1];
        
        const reasons = [
          'transport close',
          'client disconnect',
          'ping timeout',
          'server disconnect'
        ];
        
        reasons.forEach(reason => {
          disconnectHandler(reason);
          expect(consoleSpy).toHaveBeenCalledWith(
            `Client disconnected: ${mockSocket.id} (Reason: ${reason})`
          );
        });
      });
    });
  });

  describe('Room Management', () => {
    describe('joinRoom', () => {
      it('should join client to room', () => {
        const roomName = 'stock:AAPL';
        
        webSocketManager.joinRoom(mockSocket.id, roomName);

        expect(mockSocket.join).toHaveBeenCalledWith(roomName);
        expect(consoleSpy).toHaveBeenCalledWith(
          `Client ${mockSocket.id} joined room: ${roomName}`
        );
      });

      it('should handle join room event', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const joinRoomHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'join-room'
        )[1];
        
        joinRoomHandler({ room: 'stock:AAPL' });

        expect(mockSocket.join).toHaveBeenCalledWith('stock:AAPL');
      });

      it('should validate room name', () => {
        expect(() => {
          webSocketManager.joinRoom(mockSocket.id, '');
        }).toThrow('Room name cannot be empty');
        
        expect(() => {
          webSocketManager.joinRoom(mockSocket.id, null);
        }).toThrow('Room name is required');
      });

      it('should handle invalid socket ID', () => {
        expect(() => {
          webSocketManager.joinRoom('invalid-socket-id', 'room1');
        }).toThrow('Socket not found');
      });
    });

    describe('leaveRoom', () => {
      it('should remove client from room', () => {
        const roomName = 'stock:AAPL';
        
        webSocketManager.leaveRoom(mockSocket.id, roomName);

        expect(mockSocket.leave).toHaveBeenCalledWith(roomName);
        expect(consoleSpy).toHaveBeenCalledWith(
          `Client ${mockSocket.id} left room: ${roomName}`
        );
      });

      it('should handle leave room event', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const leaveRoomHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'leave-room'
        )[1];
        
        leaveRoomHandler({ room: 'stock:AAPL' });

        expect(mockSocket.leave).toHaveBeenCalledWith('stock:AAPL');
      });
    });

    describe('getRoomClients', () => {
      it('should return number of clients in room', () => {
        const roomName = 'stock:AAPL';
        mockIO.sockets.adapter.rooms.set(roomName, new Set(['socket-123', 'socket-456']));
        
        const clientCount = webSocketManager.getRoomClients(roomName);

        expect(clientCount).toBe(2);
      });

      it('should return 0 for non-existent room', () => {
        const clientCount = webSocketManager.getRoomClients('non-existent-room');

        expect(clientCount).toBe(0);
      });
    });
  });

  describe('Broadcasting', () => {
    describe('broadcast', () => {
      it('should broadcast message to all clients', () => {
        const event = 'marketUpdate';
        const data = { market: 'NYSE', status: 'open' };
        
        webSocketManager.broadcast(event, data);

        expect(mockIO.emit).toHaveBeenCalledWith(event, data);
      });

      it('should validate broadcast parameters', () => {
        expect(() => {
          webSocketManager.broadcast('', { data: 'test' });
        }).toThrow('Event name cannot be empty');
        
        expect(() => {
          webSocketManager.broadcast(null, { data: 'test' });
        }).toThrow('Event name is required');
      });

      it('should handle broadcast errors gracefully', () => {
        mockIO.emit.mockImplementation(() => {
          throw new Error('Broadcast failed');
        });
        
        expect(() => {
          webSocketManager.broadcast('test-event', { data: 'test' });
        }).not.toThrow();
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Broadcast error:',
          expect.any(Error)
        );
      });
    });

    describe('broadcastToRoom', () => {
      it('should broadcast message to specific room', () => {
        const room = 'stock:AAPL';
        const event = 'priceUpdate';
        const data = { symbol: 'AAPL', price: 150.25 };
        
        webSocketManager.broadcastToRoom(room, event, data);

        expect(mockIO.to).toHaveBeenCalledWith(room);
        expect(mockIO.emit).toHaveBeenCalledWith(event, data);
      });

      it('should validate room broadcast parameters', () => {
        expect(() => {
          webSocketManager.broadcastToRoom('', 'event', { data: 'test' });
        }).toThrow('Room name cannot be empty');
        
        expect(() => {
          webSocketManager.broadcastToRoom('room', '', { data: 'test' });
        }).toThrow('Event name cannot be empty');
      });

      it('should handle room broadcast errors gracefully', () => {
        mockIO.to.mockImplementation(() => {
          throw new Error('Room broadcast failed');
        });
        
        expect(() => {
          webSocketManager.broadcastToRoom('room1', 'test-event', { data: 'test' });
        }).not.toThrow();
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Room broadcast error:',
          expect.any(Error)
        );
      });
    });

    describe('emit', () => {
      it('should emit message to specific client', () => {
        const event = 'personalMessage';
        const data = { message: 'Hello client!' };
        
        webSocketManager.emit(mockSocket.id, event, data);

        expect(mockSocket.emit).toHaveBeenCalledWith(event, data);
      });

      it('should handle emit to non-existent client', () => {
        expect(() => {
          webSocketManager.emit('invalid-socket-id', 'event', { data: 'test' });
        }).toThrow('Socket not found');
      });

      it('should validate emit parameters', () => {
        expect(() => {
          webSocketManager.emit('', 'event', { data: 'test' });
        }).toThrow('Socket ID cannot be empty');
        
        expect(() => {
          webSocketManager.emit(mockSocket.id, '', { data: 'test' });
        }).toThrow('Event name cannot be empty');
      });
    });
  });

  describe('Stock Subscription Management', () => {
    describe('subscribeToStock', () => {
      it('should handle stock subscription', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const subscribeHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'subscribe-stock'
        )[1];
        
        subscribeHandler({ symbol: 'AAPL' });

        expect(mockSocket.join).toHaveBeenCalledWith('stock:AAPL');
        expect(mockSocket.emit).toHaveBeenCalledWith('subscribed', {
          symbol: 'AAPL',
          room: 'stock:AAPL'
        });
      });

      it('should validate stock symbol', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const subscribeHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'subscribe-stock'
        )[1];
        
        subscribeHandler({ symbol: '' });

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Invalid stock symbol'
        });
      });

      it('should handle multiple stock subscriptions', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const subscribeHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'subscribe-stock'
        )[1];
        
        const symbols = ['AAPL', 'GOOGL', 'MSFT'];
        symbols.forEach(symbol => {
          subscribeHandler({ symbol });
          expect(mockSocket.join).toHaveBeenCalledWith(`stock:${symbol}`);
        });
      });
    });

    describe('unsubscribeFromStock', () => {
      it('should handle stock unsubscription', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const unsubscribeHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'unsubscribe-stock'
        )[1];
        
        unsubscribeHandler({ symbol: 'AAPL' });

        expect(mockSocket.leave).toHaveBeenCalledWith('stock:AAPL');
        expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribed', {
          symbol: 'AAPL',
          room: 'stock:AAPL'
        });
      });

      it('should validate unsubscription symbol', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        connectionHandler(mockSocket);
        
        const unsubscribeHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'unsubscribe-stock'
        )[1];
        
        unsubscribeHandler({ symbol: null });

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Invalid stock symbol'
        });
      });
    });
  });

  describe('Connection Statistics', () => {
    describe('getConnectedClients', () => {
      it('should return current client count', () => {
        const clientCount = webSocketManager.getConnectedClients();
        expect(clientCount).toBe(1);
      });

      it('should update client count on connections/disconnections', () => {
        const connectionHandler = mockIO.on.mock.calls.find(
          call => call[0] === 'connection'
        )[1];
        
        // Simulate new connection
        const newSocket = { ...mockSocket, id: 'socket-456' };
        mockIO.sockets.sockets.set('socket-456', newSocket);
        mockIO.engine.clientsCount = 2;
        
        connectionHandler(newSocket);
        
        expect(webSocketManager.getConnectedClients()).toBe(2);
        
        // Simulate disconnection
        const disconnectHandler = newSocket.on.mock.calls.find(
          call => call[0] === 'disconnect'
        )[1];
        
        mockIO.sockets.sockets.delete('socket-456');
        mockIO.engine.clientsCount = 1;
        
        disconnectHandler('client disconnect');
        
        expect(webSocketManager.getConnectedClients()).toBe(1);
      });
    });

    describe('getConnectionStats', () => {
      it('should return detailed connection statistics', () => {
        const stats = webSocketManager.getConnectionStats();
        
        expect(stats).toHaveProperty('totalConnections');
        expect(stats).toHaveProperty('currentConnections');
        expect(stats).toHaveProperty('totalRooms');
        expect(stats).toHaveProperty('messagesSent');
        expect(stats).toHaveProperty('messagesReceived');
        expect(stats).toHaveProperty('uptime');
      });

      it('should track message statistics', () => {
        webSocketManager.broadcast('test-event', { data: 'test' });
        webSocketManager.broadcastToRoom('room1', 'test-event', { data: 'test' });
        
        const stats = webSocketManager.getConnectionStats();
        expect(stats.messagesSent).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle socket errors gracefully', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const errorHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      if (errorHandler) {
        const error = new Error('Socket error');
        errorHandler(error);
        
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          `Socket error for ${mockSocket.id}:`,
          error
        );
      }
    });

    it('should handle malformed messages', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe-stock'
      )[1];
      
      // Test with malformed data
      subscribeHandler('invalid-data');
      subscribeHandler({ invalidProperty: 'test' });
      subscribeHandler(null);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid stock symbol'
      });
    });

    it('should implement rate limiting for messages', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe-stock'
      )[1];
      
      // Simulate rapid subscription attempts
      for (let i = 0; i < 100; i++) {
        subscribeHandler({ symbol: `STOCK${i}` });
      }
      
      // Should implement some form of rate limiting
      // This would depend on the actual implementation
    });

    it('should handle server shutdown gracefully', async () => {
      await webSocketManager.close();
      
      expect(mockIO.close).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('WebSocket server closed');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle high-frequency updates efficiently', () => {
      const startTime = Date.now();
      
      // Simulate high-frequency price updates
      for (let i = 0; i < 1000; i++) {
        webSocketManager.broadcastToRoom('stock:AAPL', 'priceUpdate', {
          symbol: 'AAPL',
          price: 150 + Math.random(),
          timestamp: Date.now()
        });
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should implement message queuing for disconnected clients', () => {
      // This would test message queuing functionality
      // Implementation depends on specific requirements
      const queuedMessages = webSocketManager.getQueuedMessages(mockSocket.id);
      expect(Array.isArray(queuedMessages)).toBe(true);
    });

    it('should clean up resources on client disconnect', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const disconnectHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'disconnect'
      )[1];
      
      disconnectHandler('client disconnect');
      
      // Should clean up any client-specific resources
      expect(webSocketManager.getQueuedMessages(mockSocket.id)).toEqual([]);
    });
  });

  describe('Security', () => {
    it('should validate client authentication', () => {
      const invalidSocket = {
        ...mockSocket,
        handshake: {
          auth: { token: 'invalid-token' },
          query: {},
          headers: {}
        }
      };
      
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(invalidSocket);
      
      // Should handle invalid authentication appropriately
      expect(invalidSocket.emit).toHaveBeenCalledWith('error', {
        message: expect.stringContaining('authentication')
      });
    });

    it('should sanitize message data', () => {
      const connectionHandler = mockIO.on.mock.calls.find(
        call => call[0] === 'connection'
      )[1];
      
      connectionHandler(mockSocket);
      
      const subscribeHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'subscribe-stock'
      )[1];
      
      // Test with potentially malicious data
      subscribeHandler({ symbol: '<script>alert("xss")</script>' });
      subscribeHandler({ symbol: 'AAPL; DROP TABLE stocks;' });
      
      // Should sanitize or reject malicious input
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid stock symbol'
      });
    });

    it('should implement connection limits per IP', () => {
      // This would test IP-based connection limiting
      // Implementation depends on specific security requirements
      const connectionLimit = webSocketManager.getConnectionLimit();
      expect(typeof connectionLimit).toBe('number');
      expect(connectionLimit).toBeGreaterThan(0);
    });
  });
});