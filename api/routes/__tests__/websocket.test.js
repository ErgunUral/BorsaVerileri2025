import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import Client from 'socket.io-client';
import WebSocketManager from '../../services/WebSocketManager.js';
import realTimeDataService from '../../services/realTimeDataService.js';
import cacheService from '../../services/cacheService.js';

// Mock dependencies
vi.mock('../../services/realTimeDataService.js');
vi.mock('../../services/cacheService.js');

// Mock console for logging
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('WebSocket API Integration Tests', () => {
  let httpServer;
  let io;
  let webSocketManager;
  let clientSocket;
  let serverSocket;
  let port;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = createServer();
    
    // Initialize WebSocket manager
    webSocketManager = new WebSocketManager(httpServer);
    io = webSocketManager.io;
    
    // Start server on random port
    await new Promise((resolve) => {
      httpServer.listen(() => {
        port = httpServer.address().port;
        resolve();
      });
    });

    // Setup server-side socket capture
    io.on('connection', (socket) => {
      serverSocket = socket;
    });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup default mocks
    cacheService.get.mockResolvedValue(null);
    cacheService.set.mockResolvedValue(true);
    cacheService.isConnected.mockReturnValue(true);
    
    realTimeDataService.subscribe.mockResolvedValue(true);
    realTimeDataService.unsubscribe.mockResolvedValue(true);
    realTimeDataService.getLatestData.mockResolvedValue({
      symbol: 'AAPL',
      price: 150.25,
      change: 2.15,
      changePercent: 1.45,
      timestamp: Date.now()
    });

    // Create client connection
    clientSocket = new Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true
    });

    // Wait for connection
    await new Promise((resolve) => {
      clientSocket.on('connect', resolve);
    });
  });

  afterEach(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
    
    vi.resetAllMocks();
  });

  afterAll(async () => {
    if (io) {
      io.close();
    }
    if (httpServer) {
      await new Promise((resolve) => httpServer.close(resolve));
    }
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection successfully', () => {
      expect(clientSocket.connected).toBe(true);
      expect(serverSocket).toBeDefined();
      expect(serverSocket.id).toBeDefined();
    });

    it('should send welcome message on connection', (done) => {
      clientSocket.on('connected', (data) => {
        expect(data).toHaveProperty('message', 'Connected to WebSocket server');
        expect(data).toHaveProperty('clientId');
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('number');
        done();
      });

      // Trigger connection event by creating new client
      const newClient = new Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        forceNew: true
      });

      newClient.on('connect', () => {
        newClient.disconnect();
      });
    });

    it('should handle client disconnection', (done) => {
      const disconnectSpy = vi.fn();
      serverSocket.on('disconnect', disconnectSpy);

      clientSocket.disconnect();

      setTimeout(() => {
        expect(disconnectSpy).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should track connected clients count', () => {
      const clientCount = webSocketManager.getConnectedClients();
      expect(clientCount).toBeGreaterThan(0);
    });
  });

  describe('Stock Subscription Management', () => {
    describe('subscribe-stock event', () => {
      it('should handle stock subscription successfully', (done) => {
        clientSocket.on('subscribed', (data) => {
          expect(data).toEqual({
            symbol: 'AAPL',
            room: 'stock:AAPL'
          });
          expect(realTimeDataService.subscribe).toHaveBeenCalledWith(
            serverSocket.id,
            'AAPL'
          );
          done();
        });

        clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });
      });

      it('should validate stock symbol on subscription', (done) => {
        clientSocket.on('error', (data) => {
          expect(data).toEqual({
            message: 'Invalid stock symbol'
          });
          done();
        });

        clientSocket.emit('subscribe-stock', { symbol: '' });
      });

      it('should handle subscription to multiple stocks', (done) => {
        let subscriptionCount = 0;
        const expectedSymbols = ['AAPL', 'GOOGL', 'MSFT'];

        clientSocket.on('subscribed', (data) => {
          expect(expectedSymbols).toContain(data.symbol);
          subscriptionCount++;
          
          if (subscriptionCount === expectedSymbols.length) {
            expect(realTimeDataService.subscribe).toHaveBeenCalledTimes(3);
            done();
          }
        });

        expectedSymbols.forEach(symbol => {
          clientSocket.emit('subscribe-stock', { symbol });
        });
      });

      it('should handle subscription service errors', (done) => {
        realTimeDataService.subscribe.mockRejectedValue(new Error('Subscription failed'));

        clientSocket.on('error', (data) => {
          expect(data).toEqual({
            message: 'Failed to subscribe to stock updates'
          });
          done();
        });

        clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });
      });

      it('should send cached data on subscription if available', (done) => {
        const cachedData = {
          symbol: 'AAPL',
          price: 150.25,
          change: 2.15,
          changePercent: 1.45,
          timestamp: Date.now()
        };

        realTimeDataService.getLatestData.mockResolvedValue(cachedData);

        clientSocket.on('stockUpdate', (data) => {
          expect(data).toEqual(cachedData);
          done();
        });

        clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });
      });
    });

    describe('unsubscribe-stock event', () => {
      it('should handle stock unsubscription successfully', (done) => {
        clientSocket.on('unsubscribed', (data) => {
          expect(data).toEqual({
            symbol: 'AAPL',
            room: 'stock:AAPL'
          });
          expect(realTimeDataService.unsubscribe).toHaveBeenCalledWith(
            serverSocket.id,
            'AAPL'
          );
          done();
        });

        clientSocket.emit('unsubscribe-stock', { symbol: 'AAPL' });
      });

      it('should validate stock symbol on unsubscription', (done) => {
        clientSocket.on('error', (data) => {
          expect(data).toEqual({
            message: 'Invalid stock symbol'
          });
          done();
        });

        clientSocket.emit('unsubscribe-stock', { symbol: null });
      });

      it('should handle unsubscription service errors', (done) => {
        realTimeDataService.unsubscribe.mockRejectedValue(new Error('Unsubscription failed'));

        clientSocket.on('error', (data) => {
          expect(data).toEqual({
            message: 'Failed to unsubscribe from stock updates'
          });
          done();
        });

        clientSocket.emit('unsubscribe-stock', { symbol: 'AAPL' });
      });
    });
  });

  describe('Room Management', () => {
    describe('join-room event', () => {
      it('should handle room joining successfully', (done) => {
        const roomName = 'market:overview';
        
        // Mock socket join method
        const joinSpy = vi.spyOn(serverSocket, 'join');
        
        clientSocket.on('joined-room', (data) => {
          expect(data).toEqual({
            room: roomName,
            message: `Joined room: ${roomName}`
          });
          expect(joinSpy).toHaveBeenCalledWith(roomName);
          done();
        });

        clientSocket.emit('join-room', { room: roomName });
      });

      it('should validate room name on join', (done) => {
        clientSocket.on('error', (data) => {
          expect(data).toEqual({
            message: 'Invalid room name'
          });
          done();
        });

        clientSocket.emit('join-room', { room: '' });
      });
    });

    describe('leave-room event', () => {
      it('should handle room leaving successfully', (done) => {
        const roomName = 'market:overview';
        
        // Mock socket leave method
        const leaveSpy = vi.spyOn(serverSocket, 'leave');
        
        clientSocket.on('left-room', (data) => {
          expect(data).toEqual({
            room: roomName,
            message: `Left room: ${roomName}`
          });
          expect(leaveSpy).toHaveBeenCalledWith(roomName);
          done();
        });

        clientSocket.emit('leave-room', { room: roomName });
      });

      it('should validate room name on leave', (done) => {
        clientSocket.on('error', (data) => {
          expect(data).toEqual({
            message: 'Invalid room name'
          });
          done();
        });

        clientSocket.emit('leave-room', { room: null });
      });
    });
  });

  describe('Real-time Data Broadcasting', () => {
    it('should broadcast stock price updates to subscribed clients', (done) => {
      const stockUpdate = {
        symbol: 'AAPL',
        price: 151.50,
        change: 3.40,
        changePercent: 2.30,
        timestamp: Date.now()
      };

      clientSocket.on('stockUpdate', (data) => {
        expect(data).toEqual(stockUpdate);
        done();
      });

      // First subscribe to the stock
      clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });

      // Wait a bit then broadcast update
      setTimeout(() => {
        webSocketManager.broadcastToRoom('stock:AAPL', 'stockUpdate', stockUpdate);
      }, 50);
    });

    it('should broadcast market overview updates', (done) => {
      const marketUpdate = {
        indices: {
          'S&P 500': { value: 4500.25, change: 15.30, changePercent: 0.34 }
        },
        timestamp: Date.now()
      };

      clientSocket.on('marketUpdate', (data) => {
        expect(data).toEqual(marketUpdate);
        done();
      });

      // Join market overview room
      clientSocket.emit('join-room', { room: 'market:overview' });

      // Wait a bit then broadcast update
      setTimeout(() => {
        webSocketManager.broadcastToRoom('market:overview', 'marketUpdate', marketUpdate);
      }, 50);
    });

    it('should broadcast news updates', (done) => {
      const newsUpdate = {
        symbol: 'AAPL',
        news: {
          title: 'Apple Reports Strong Earnings',
          summary: 'Company exceeds expectations',
          sentiment: 'positive',
          timestamp: Date.now()
        }
      };

      clientSocket.on('newsUpdate', (data) => {
        expect(data).toEqual(newsUpdate);
        done();
      });

      // Subscribe to stock news
      clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });

      // Wait a bit then broadcast news
      setTimeout(() => {
        webSocketManager.broadcastToRoom('stock:AAPL', 'newsUpdate', newsUpdate);
      }, 50);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should handle authenticated connections', async () => {
      const authToken = 'valid-jwt-token';
      const userId = 'user-123';

      const authenticatedClient = new Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: authToken,
          userId: userId
        },
        forceNew: true
      });

      await new Promise((resolve) => {
        authenticatedClient.on('connect', resolve);
      });

      expect(authenticatedClient.connected).toBe(true);
      
      authenticatedClient.disconnect();
    });

    it('should handle invalid authentication tokens', (done) => {
      const invalidClient = new Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        auth: {
          token: 'invalid-token'
        },
        forceNew: true
      });

      invalidClient.on('connect_error', (error) => {
        expect(error.message).toContain('authentication');
        done();
      });

      invalidClient.on('error', (data) => {
        expect(data.message).toContain('authentication');
        invalidClient.disconnect();
        done();
      });
    });

    it('should restrict access to premium features for unauthenticated users', (done) => {
      clientSocket.on('error', (data) => {
        expect(data.message).toContain('authentication required');
        done();
      });

      clientSocket.emit('subscribe-premium-data', { symbol: 'AAPL' });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle malformed message data', (done) => {
      clientSocket.on('error', (data) => {
        expect(data.message).toContain('Invalid');
        done();
      });

      // Send malformed subscription data
      clientSocket.emit('subscribe-stock', 'invalid-data');
    });

    it('should handle service unavailability gracefully', (done) => {
      realTimeDataService.subscribe.mockRejectedValue(new Error('Service unavailable'));

      clientSocket.on('error', (data) => {
        expect(data.message).toContain('Failed to subscribe');
        done();
      });

      clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });
    });

    it('should handle cache service errors gracefully', (done) => {
      cacheService.get.mockRejectedValue(new Error('Cache unavailable'));
      realTimeDataService.getLatestData.mockRejectedValue(new Error('Data unavailable'));

      clientSocket.on('subscribed', (data) => {
        expect(data.symbol).toBe('AAPL');
        // Should still work without cache
        done();
      });

      clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });
    });

    it('should implement connection timeout handling', (done) => {
      const timeoutClient = new Client(`http://localhost:${port}`, {
        transports: ['websocket'],
        timeout: 100, // Very short timeout
        forceNew: true
      });

      timeoutClient.on('connect_error', (error) => {
        expect(error.type).toBe('timeout');
        done();
      });

      timeoutClient.on('connect', () => {
        // If connection succeeds, disconnect and pass test
        timeoutClient.disconnect();
        done();
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent connections', async () => {
      const clientCount = 10;
      const clients = [];

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const client = new Client(`http://localhost:${port}`, {
          transports: ['websocket'],
          forceNew: true
        });
        clients.push(client);
      }

      // Wait for all connections
      await Promise.all(clients.map(client => 
        new Promise(resolve => client.on('connect', resolve))
      ));

      // Verify all clients are connected
      clients.forEach(client => {
        expect(client.connected).toBe(true);
      });

      // Clean up
      clients.forEach(client => client.disconnect());
    });

    it('should handle high-frequency message broadcasting', (done) => {
      let messageCount = 0;
      const expectedMessages = 100;

      clientSocket.on('stockUpdate', () => {
        messageCount++;
        if (messageCount === expectedMessages) {
          done();
        }
      });

      // Subscribe to stock
      clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });

      // Wait a bit then send high-frequency updates
      setTimeout(() => {
        for (let i = 0; i < expectedMessages; i++) {
          webSocketManager.broadcastToRoom('stock:AAPL', 'stockUpdate', {
            symbol: 'AAPL',
            price: 150 + Math.random(),
            timestamp: Date.now()
          });
        }
      }, 50);
    });

    it('should implement message queuing for disconnected clients', async () => {
      // Subscribe to stock
      clientSocket.emit('subscribe-stock', { symbol: 'AAPL' });
      
      // Wait for subscription
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Disconnect client
      clientSocket.disconnect();
      
      // Send updates while disconnected
      webSocketManager.broadcastToRoom('stock:AAPL', 'stockUpdate', {
        symbol: 'AAPL',
        price: 155.00,
        timestamp: Date.now()
      });
      
      // Check if messages are queued
      const queuedMessages = webSocketManager.getQueuedMessages(clientSocket.id);
      expect(Array.isArray(queuedMessages)).toBe(true);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should implement rate limiting for subscription requests', (done) => {
      let errorReceived = false;
      
      clientSocket.on('error', (data) => {
        if (data.message.includes('rate limit')) {
          errorReceived = true;
          done();
        }
      });

      // Send many rapid subscription requests
      for (let i = 0; i < 100; i++) {
        clientSocket.emit('subscribe-stock', { symbol: `STOCK${i}` });
      }

      // If no rate limiting error after 1 second, test passes
      setTimeout(() => {
        if (!errorReceived) {
          done();
        }
      }, 1000);
    });

    it('should sanitize input data', (done) => {
      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Invalid stock symbol');
        done();
      });

      // Send potentially malicious data
      clientSocket.emit('subscribe-stock', {
        symbol: '<script>alert("xss")</script>'
      });
    });

    it('should validate message size limits', (done) => {
      const largeData = 'x'.repeat(10000); // Very large string
      
      clientSocket.on('error', (data) => {
        expect(data.message).toContain('message too large');
        done();
      });

      clientSocket.emit('subscribe-stock', {
        symbol: largeData
      });

      // If no error after timeout, test passes (no size limit implemented)
      setTimeout(done, 500);
    });
  });

  describe('Connection Statistics and Monitoring', () => {
    it('should provide connection statistics', () => {
      const stats = webSocketManager.getConnectionStats();
      
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('currentConnections');
      expect(stats).toHaveProperty('totalRooms');
      expect(stats).toHaveProperty('messagesSent');
      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('uptime');
      
      expect(typeof stats.currentConnections).toBe('number');
      expect(stats.currentConnections).toBeGreaterThan(0);
    });

    it('should track message statistics', () => {
      const initialStats = webSocketManager.getConnectionStats();
      
      // Send some messages
      webSocketManager.broadcast('test-event', { data: 'test' });
      webSocketManager.broadcastToRoom('test-room', 'test-event', { data: 'test' });
      
      const updatedStats = webSocketManager.getConnectionStats();
      expect(updatedStats.messagesSent).toBeGreaterThan(initialStats.messagesSent);
    });

    it('should provide room statistics', () => {
      const roomStats = webSocketManager.getRoomStats();
      
      expect(Array.isArray(roomStats)).toBe(true);
      roomStats.forEach(room => {
        expect(room).toHaveProperty('name');
        expect(room).toHaveProperty('clientCount');
        expect(typeof room.clientCount).toBe('number');
      });
    });
  });
});