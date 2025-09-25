import { Router } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { DataSourceService } from '../services/dataSourceService.js';
import { AdvancedLoggerService } from '../services/advancedLoggerService.js';
import { RedisService } from '../services/redisService.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const logger = new AdvancedLoggerService();
const redis = new RedisService();
const dataSourceService = new DataSourceService(logger, redis);

// Rate limiting for WebSocket endpoints
const wsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many WebSocket requests' }
});

interface WebSocketClient {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
  lastPing: number;
  isAlive: boolean;
}

class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private wss: WebSocketServer | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private dataUpdateInterval: NodeJS.Timeout | null = null;

  initialize(server: any) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/stocks',
      clientTracking: true
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();
      const client: WebSocketClient = {
        ws,
        id: clientId,
        subscriptions: new Set(),
        lastPing: Date.now(),
        isAlive: true
      };

      this.clients.set(clientId, client);
      logger.logInfo('WebSocket client connected', { clientId, clientCount: this.clients.size });

      // Send welcome message
      this.sendToClient(clientId, {
        type: 'connection_established',
        clientId,
        timestamp: new Date().toISOString()
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', error as Error, { clientId });
          this.sendToClient(clientId, {
            type: 'error',
            message: 'Invalid message format'
          });
        }
      });

      // Handle pong responses
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
          client.lastPing = Date.now();
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info('WebSocket client disconnected', { clientId, clientCount: this.clients.size });
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket client error', error, { clientId });
        this.clients.delete(clientId);
      });
    });

    // Start ping/pong mechanism
    this.startPingInterval();
    
    // Start data update broadcasting
    this.startDataUpdateInterval();

    logger.info('WebSocket server initialized', { path: '/ws/stocks' });
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleClientMessage(clientId: string, message: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    logger.logDebug('WebSocket message received', { clientId, messageType: message.type });

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, message.symbols || []);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message.symbols || []);
        break;
      
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      case 'get_market_summary':
        this.sendMarketSummary(clientId);
        break;
      
      case 'get_stock_history':
        this.sendStockHistory(clientId, message.symbol, message.period || '1d');
        break;
      
      default:
        this.sendToClient(clientId, {
          type: 'error',
          message: `Unknown message type: ${message.type}`
        });
    }
  }

  private handleSubscribe(clientId: string, symbols: string[]) {
    const client = this.clients.get(clientId);
    if (!client) return;

    symbols.forEach(symbol => {
      client.subscriptions.add(symbol.toUpperCase());
    });

    this.sendToClient(clientId, {
      type: 'subscription_updated',
      subscriptions: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    });

    logger.logInfo('Client subscribed to symbols', { 
      clientId, 
      symbols, 
      totalSubscriptions: client.subscriptions.size 
    });
  }

  private handleUnsubscribe(clientId: string, symbols: string[]) {
    const client = this.clients.get(clientId);
    if (!client) return;

    symbols.forEach(symbol => {
      client.subscriptions.delete(symbol.toUpperCase());
    });

    this.sendToClient(clientId, {
      type: 'subscription_updated',
      subscriptions: Array.from(client.subscriptions),
      timestamp: new Date().toISOString()
    });

    logger.logInfo('Client unsubscribed from symbols', { 
      clientId, 
      symbols, 
      totalSubscriptions: client.subscriptions.size 
    });
  }

  private async sendMarketSummary(clientId: string) {
    try {
      const allStocks = await dataSourceService.getAllStocks();
      
      const summary = {
        totalStocks: allStocks.length,
        gainers: allStocks.filter(stock => stock.change > 0).length,
        losers: allStocks.filter(stock => stock.change < 0).length,
        unchanged: allStocks.filter(stock => stock.change === 0).length,
        totalVolume: allStocks.reduce((sum, stock) => sum + (stock.volume || 0), 0),
        marketCap: allStocks.reduce((sum, stock) => sum + (stock.marketCap || 0), 0),
        lastUpdate: new Date().toISOString()
      };

      this.sendToClient(clientId, {
        type: 'market_summary',
        summary,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to send market summary', error as Error, { clientId });
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Failed to fetch market summary'
      });
    }
  }

  private async sendStockHistory(clientId: string, symbol: string, period: string) {
    try {
      const history = await dataSourceService.getStockHistory(symbol, period);
      
      this.sendToClient(clientId, {
        type: 'price_history',
        symbol,
        period,
        history,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Failed to send stock history', error as Error, { clientId, symbol, period });
      this.sendToClient(clientId, {
        type: 'error',
        message: `Failed to fetch history for ${symbol}`
      });
    }
  }

  private sendToClient(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      logger.error('Failed to send message to client', error as Error, { clientId });
      this.clients.delete(clientId);
      return false;
    }
  }

  private broadcast(data: any, filter?: (client: WebSocketClient) => boolean) {
    let sentCount = 0;
    
    this.clients.forEach((client, clientId) => {
      if (filter && !filter(client)) return;
      
      if (this.sendToClient(clientId, data)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  private startPingInterval() {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive || (now - client.lastPing) > 60000) {
          // Client hasn't responded to ping in 60 seconds
          logger.logWarn('Removing unresponsive WebSocket client', { clientId });
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000); // Ping every 30 seconds
  }

  private startDataUpdateInterval() {
    this.dataUpdateInterval = setInterval(async () => {
      try {
        const allStocks = await dataSourceService.getAllStocks();
        
        // Broadcast stock updates to subscribed clients
        allStocks.forEach(stock => {
          const stockData = {
            type: 'stock_update',
            stock: {
              symbol: stock.symbol,
              name: stock.name,
              price: stock.price,
              change: stock.change,
              changePercent: stock.changePercent,
              volume: stock.volume,
              high: stock.high,
              low: stock.low,
              open: stock.open,
              marketCap: stock.marketCap,
              lastUpdate: stock.lastUpdate,
              source: stock.source,
              isWatchlisted: false // This will be determined by frontend
            },
            timestamp: new Date().toISOString()
          };
          
          // Send to clients subscribed to this symbol
          this.broadcast(stockData, (client) => 
            client.subscriptions.has(stock.symbol.toUpperCase()) || 
            client.subscriptions.has('ALL')
          );
        });
        
        // Send market summary to all clients
        const summary = {
          totalStocks: allStocks.length,
          gainers: allStocks.filter(stock => stock.change > 0).length,
          losers: allStocks.filter(stock => stock.change < 0).length,
          unchanged: allStocks.filter(stock => stock.change === 0).length,
          totalVolume: allStocks.reduce((sum, stock) => sum + (stock.volume || 0), 0),
          marketCap: allStocks.reduce((sum, stock) => sum + (stock.marketCap || 0), 0),
          lastUpdate: new Date().toISOString()
        };
        
        this.broadcast({
          type: 'market_summary',
          summary,
          timestamp: new Date().toISOString()
        });
        
        logger.logDebug('Broadcasted stock updates', { 
          stockCount: allStocks.length, 
          clientCount: this.clients.size 
        });
        
      } catch (error) {
        logger.error('Failed to broadcast stock updates', error as Error);
      }
    }, 30000); // Update every 30 seconds
  }

  getStats() {
    const clientStats = Array.from(this.clients.values()).map(client => ({
      id: client.id,
      subscriptions: Array.from(client.subscriptions),
      lastPing: client.lastPing,
      isAlive: client.isAlive
    }));
    
    return {
      totalClients: this.clients.size,
      clients: clientStats,
      isRunning: this.wss !== null
    };
  }

  shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = null;
    }
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    this.clients.clear();
    logger.logInfo('WebSocket server shutdown completed');
  }
}

// Singleton instance
const wsManager = new WebSocketManager();

// REST API endpoints for WebSocket management
router.get('/stats', wsRateLimit, (req, res) => {
  try {
    const stats = wsManager.getStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get WebSocket stats', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket statistics'
    });
  }
});

router.post('/broadcast', wsRateLimit, (req, res) => {
  try {
    const { message, filter } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const sentCount = wsManager.broadcast(message);
    
    res.json({
      success: true,
      data: {
        sentCount,
        message: 'Broadcast completed'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to broadcast message', error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast message'
    });
  }
});

router.get('/health', (req, res) => {
  try {
    const stats = wsManager.getStats();
    
    res.json({
      success: true,
      data: {
        status: stats.isRunning ? 'healthy' : 'down',
        clientCount: stats.totalClients,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('WebSocket health check failed', error as Error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Export both router and manager
export { router as default, wsManager };
export { WebSocketManager };