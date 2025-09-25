import { EventEmitter } from 'events';
import { DataSourceService } from './dataSourceService.js';
import { AdvancedLoggerService } from './advancedLoggerService.js';
import { ErrorHandlingService } from './errorHandlingService.js';
import { RedisService } from './redisService.js';
import { wsManager } from '../routes/websocket';
import * as cron from 'node-cron';

interface RealTimeConfig {
  pollingInterval: number; // milliseconds
  batchSize: number;
  enableWebSocket: boolean;
  enableSSE: boolean;
  symbols: string[];
  maxRetries: number;
}

interface DataUpdate {
  symbol: string;
  data: any;
  timestamp: string;
  source: string;
  changeDetected: boolean;
}

interface SubscriptionInfo {
  id: string;
  symbols: string[];
  lastUpdate: string;
  updateCount: number;
}

class RealTimeDataService extends EventEmitter {
  private logger: AdvancedLoggerService;
  private dataSource: DataSourceService;
  private errorHandler: ErrorHandlingService;
  private redis: RedisService;
  
  private config: RealTimeConfig;
  private isRunning: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private cronJobs: cron.ScheduledTask[] = [];
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private lastDataCache: Map<string, any> = new Map();
  private updateQueue: DataUpdate[] = [];
  private processingQueue: boolean = false;
  
  // Performance metrics
  private metrics = {
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    averageResponseTime: 0,
    lastUpdateTime: '',
    activeSubscriptions: 0,
    queueSize: 0
  };

  constructor(
    logger: AdvancedLoggerService,
    redis: RedisService,
    errorHandler: ErrorHandlingService,
    config?: Partial<RealTimeConfig>
  ) {
    super();
    
    this.logger = logger;
    this.redis = redis;
    this.errorHandler = errorHandler;
    this.dataSource = new DataSourceService(logger, redis, errorHandler);
    
    this.config = {
      pollingInterval: 30000, // 30 seconds
      batchSize: 10,
      enableWebSocket: true,
      enableSSE: true,
      symbols: [], // Will be populated with BIST 100
      maxRetries: 3,
      ...config
    };
    
    this.initializeDefaultSymbols();
    this.setupEventHandlers();
  }

  private initializeDefaultSymbols() {
    // BIST 100 major symbols for real-time tracking
    this.config.symbols = [
      'AKBNK', 'ARCLK', 'ASELS', 'BIMAS', 'EKGYO', 'EREGL', 'FROTO', 'GARAN',
      'HALKB', 'ISCTR', 'KCHOL', 'PETKM', 'PGSUS', 'SAHOL', 'SISE', 'SKBNK',
      'TAVHL', 'TCELL', 'THYAO', 'TKFEN', 'TUPRS', 'VAKBN', 'YKBNK'
    ];
  }

  private setupEventHandlers() {
    this.on('dataUpdate', this.handleDataUpdate.bind(this));
    this.on('error', this.handleError.bind(this));
    
    // Handle process termination
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.logWarn('Real-time data service is already running');
      return;
    }

    try {
      this.logger.logInfo('Starting real-time data service', {
        pollingInterval: this.config.pollingInterval,
        symbolCount: this.config.symbols.length,
        batchSize: this.config.batchSize
      });

      this.isRunning = true;
      
      // Start polling
      await this.startPolling();
      
      // Setup cron jobs for different intervals
      this.setupCronJobs();
      
      // Start queue processor
      this.startQueueProcessor();
      
      this.logger.logInfo('Real-time data service started successfully');
      
    } catch (error) {
      this.isRunning = false;
      await this.errorHandler.handleCriticalError(error as Error, {
        operation: 'start_realtime_service',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.logInfo('Stopping real-time data service');
    
    this.isRunning = false;
    
    // Clear polling timer
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    // Stop cron jobs
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    
    // Clear subscriptions
    this.subscriptions.clear();
    
    this.logger.logInfo('Real-time data service stopped');
  }

  private async startPolling(): Promise<void> {
    const pollData = async () => {
      if (!this.isRunning) return;
      
      try {
        await this.pollAllSymbols();
      } catch (error) {
        this.logger.logError('Polling error', error as Error);
      }
    };
    
    // Initial poll
    await pollData();
    
    // Setup interval
    this.pollingTimer = setInterval(pollData, this.config.pollingInterval);
  }

  private setupCronJobs(): void {
    // High frequency updates for major stocks (every 30 seconds)
    const highFreqJob = cron.schedule('*/30 * * * * *', async () => {
      if (!this.isRunning) return;
      
      const majorSymbols = ['AKBNK', 'GARAN', 'ISCTR', 'THYAO', 'TUPRS'];
      await this.pollSymbols(majorSymbols, 'high_frequency');
    }, { scheduled: false });
    
    // Market summary updates (every 2 minutes)
    const marketSummaryJob = cron.schedule('*/2 * * * *', async () => {
      if (!this.isRunning) return;
      
      await this.updateMarketSummary();
    }, { scheduled: false });
    
    // Health check and metrics update (every 5 minutes)
    const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
      if (!this.isRunning) return;
      
      await this.performHealthCheck();
      await this.updateMetrics();
    }, { scheduled: false });
    
    this.cronJobs = [highFreqJob, marketSummaryJob, healthCheckJob];
    
    // Start all jobs
    this.cronJobs.forEach(job => job.start());
  }

  private async pollAllSymbols(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Process symbols in batches
      for (let i = 0; i < this.config.symbols.length; i += this.config.batchSize) {
        const batch = this.config.symbols.slice(i, i + this.config.batchSize);
        await this.pollSymbols(batch, 'regular_polling');
        
        // Small delay between batches to avoid overwhelming sources
        if (i + this.config.batchSize < this.config.symbols.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const duration = Date.now() - startTime;
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime + duration) / 2;
      this.metrics.lastUpdateTime = new Date().toISOString();
      
    } catch (error) {
      this.metrics.failedUpdates++;
      throw error;
    }
  }

  private async pollSymbols(symbols: string[], source: string): Promise<void> {
    const promises = symbols.map(async (symbol) => {
      try {
        const stockDataArray = await this.dataSource.getStockData(symbol);
        const validatedData = await this.dataSource.validateDataConsistency(symbol, stockDataArray);
        
        if (validatedData) {
          const changeDetected = this.detectChange(symbol, validatedData);
          
          const update: DataUpdate = {
            symbol,
            data: validatedData,
            timestamp: new Date().toISOString(),
            source,
            changeDetected
          };
          
          this.addToQueue(update);
          this.metrics.successfulUpdates++;
        }
        
      } catch (error) {
        this.logger.logWarn(`Failed to poll ${symbol}`, {
          symbol,
          source,
          error: (error as Error).message
        });
        this.metrics.failedUpdates++;
      }
    });
    
    await Promise.allSettled(promises);
  }

  private detectChange(symbol: string, newData: any): boolean {
    const lastData = this.lastDataCache.get(symbol);
    
    if (!lastData) {
      this.lastDataCache.set(symbol, newData);
      return true; // First time data
    }
    
    // Check for significant changes
    const priceChanged = Math.abs(newData.price - lastData.price) > 0.001;
    const volumeChanged = Math.abs(newData.volume - lastData.volume) > 0;
    
    if (priceChanged || volumeChanged) {
      this.lastDataCache.set(symbol, newData);
      return true;
    }
    
    return false;
  }

  private addToQueue(update: DataUpdate): void {
    this.updateQueue.push(update);
    this.metrics.queueSize = this.updateQueue.length;
    
    // Emit event for immediate processing
    this.emit('dataUpdate', update);
  }

  private startQueueProcessor(): void {
    const processQueue = async () => {
      if (this.processingQueue || this.updateQueue.length === 0) {
        return;
      }
      
      this.processingQueue = true;
      
      try {
        const updates = this.updateQueue.splice(0, 50); // Process up to 50 updates at once
        
        await Promise.all([
          this.cacheUpdates(updates),
          this.broadcastUpdates(updates),
          this.storeUpdates(updates)
        ]);
        
        this.metrics.totalUpdates += updates.length;
        this.metrics.queueSize = this.updateQueue.length;
        
      } catch (error) {
        this.logger.logError('Queue processing error', error as Error);
      } finally {
        this.processingQueue = false;
      }
    };
    
    // Process queue every 1 second
    setInterval(processQueue, 1000);
  }

  private async cacheUpdates(updates: DataUpdate[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    updates.forEach(update => {
      const cacheKey = `realtime:${update.symbol}`;
      pipeline.setex(cacheKey, 300, JSON.stringify(update.data)); // Cache for 5 minutes
      
      // Store in time series for historical data
      const timeSeriesKey = `timeseries:${update.symbol}`;
      pipeline.zadd(timeSeriesKey, Date.now(), JSON.stringify({
        price: update.data.price,
        volume: update.data.volume,
        timestamp: update.timestamp
      }));
      
      // Keep only last 1000 entries
      pipeline.zremrangebyrank(timeSeriesKey, 0, -1001);
    });
    
    await pipeline.exec();
  }

  private async broadcastUpdates(updates: DataUpdate[]): Promise<void> {
    if (!this.config.enableWebSocket) return;
    
    // Group updates by symbol for efficient broadcasting
    const updatesBySymbol = new Map<string, DataUpdate[]>();
    
    updates.forEach(update => {
      if (!updatesBySymbol.has(update.symbol)) {
        updatesBySymbol.set(update.symbol, []);
      }
      updatesBySymbol.get(update.symbol)!.push(update);
    });
    
    // Broadcast to WebSocket clients
    updatesBySymbol.forEach((symbolUpdates, symbol) => {
      const latestUpdate = symbolUpdates[symbolUpdates.length - 1];
      
      if (latestUpdate.changeDetected) {
        wsManager.broadcast('stock_update', {
          symbol,
          data: latestUpdate.data,
          timestamp: latestUpdate.timestamp
        });
        
        // Also broadcast to symbol-specific room
        wsManager.broadcast(`stock_${symbol}`, {
          data: latestUpdate.data,
          timestamp: latestUpdate.timestamp
        });
      }
    });
  }

  private async storeUpdates(updates: DataUpdate[]): Promise<void> {
    // Store significant updates in Redis for historical analysis
    const significantUpdates = updates.filter(update => update.changeDetected);
    
    if (significantUpdates.length === 0) return;
    
    const pipeline = this.redis.pipeline();
    
    significantUpdates.forEach(update => {
      const historyKey = `history:${update.symbol}:${new Date().toISOString().split('T')[0]}`;
      pipeline.lpush(historyKey, JSON.stringify({
        ...update.data,
        timestamp: update.timestamp,
        source: update.source
      }));
      pipeline.expire(historyKey, 86400 * 7); // Keep for 7 days
    });
    
    await pipeline.exec();
  }

  private async updateMarketSummary(): Promise<void> {
    try {
      const summaries = await this.dataSource.getMarketSummary();
      
      if (summaries.length > 0) {
        const cacheKey = 'realtime:market_summary';
        await this.redis.setex(cacheKey, 120, JSON.stringify(summaries)); // Cache for 2 minutes
        
        // Broadcast market summary
        wsManager.broadcast('market_summary', {
          data: summaries,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      this.logger.logError('Failed to update market summary', error as Error);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthChecks = await this.errorHandler.performHealthChecks();
      const sourceStatus = this.dataSource.getDataSourceStatus();
      
      const healthData = {
        healthChecks,
        sourceStatus,
        metrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      };
      
      // Cache health data
      await this.redis.setex('realtime:health', 300, JSON.stringify(healthData));
      
      // Broadcast health status
      wsManager.broadcast('health_update', healthData);
      
    } catch (error) {
      this.logger.logError('Health check failed', error as Error);
    }
  }

  private async updateMetrics(): Promise<void> {
    this.metrics.activeSubscriptions = this.subscriptions.size;
    
    // Store metrics in Redis
    await this.redis.setex('realtime:metrics', 300, JSON.stringify(this.metrics));
  }

  private handleDataUpdate(update: DataUpdate): void {
    // Handle real-time data update
    this.logger.logInfo('Data update processed', {
      symbol: update.symbol,
      source: update.source,
      changeDetected: update.changeDetected
    });
  }

  private handleError(error: Error): void {
    this.logger.logError('Real-time service error', error);
  }

  // Public API methods
  
  subscribe(subscriptionId: string, symbols: string[]): void {
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      symbols,
      lastUpdate: new Date().toISOString(),
      updateCount: 0
    });
    
    this.logger.logInfo('New subscription created', {
      subscriptionId,
      symbolCount: symbols.length
    });
  }

  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
    
    this.logger.logInfo('Subscription removed', {
      subscriptionId
    });
  }

  addSymbol(symbol: string): void {
    if (!this.config.symbols.includes(symbol)) {
      this.config.symbols.push(symbol);
      this.logger.logInfo('Symbol added to real-time tracking', { symbol });
    }
  }

  removeSymbol(symbol: string): void {
    const index = this.config.symbols.indexOf(symbol);
    if (index > -1) {
      this.config.symbols.splice(index, 1);
      this.lastDataCache.delete(symbol);
      this.logger.logInfo('Symbol removed from real-time tracking', { symbol });
    }
  }

  async getLatestData(symbol: string): Promise<any> {
    const cacheKey = `realtime:${symbol}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async getHistoricalData(symbol: string, hours: number = 24): Promise<any[]> {
    const timeSeriesKey = `timeseries:${symbol}`;
    const since = Date.now() - (hours * 60 * 60 * 1000);
    
    const data = await this.redis.zrangebyscore(timeSeriesKey, since, Date.now());
    return data.map(item => JSON.parse(item));
  }

  getMetrics() {
    return {
      ...this.metrics,
      isRunning: this.isRunning,
      symbolCount: this.config.symbols.length,
      subscriptionCount: this.subscriptions.size,
      uptime: process.uptime()
    };
  }

  getConfig(): RealTimeConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<RealTimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.logInfo('Real-time service config updated', newConfig);
  }

  async gracefulShutdown(): Promise<void> {
    this.logger.logInfo('Starting graceful shutdown of real-time data service');
    
    await this.stop();
    
    // Clear caches
    this.lastDataCache.clear();
    this.updateQueue.length = 0;
    
    this.logger.logInfo('Real-time data service shutdown completed');
  }
}

// Singleton instance
let realTimeDataServiceInstance: RealTimeDataService | null = null;

export const getRealTimeDataService = (logger?: AdvancedLoggerService, redis?: RedisService, errorHandler?: ErrorHandlingService): RealTimeDataService => {
  if (!realTimeDataServiceInstance) {
    if (!logger || !redis || !errorHandler) {
      throw new Error('Logger, Redis, and ErrorHandler are required for first initialization');
    }
    realTimeDataServiceInstance = new RealTimeDataService(logger, redis, errorHandler);
  }
  return realTimeDataServiceInstance;
};

export { RealTimeDataService, RealTimeConfig, DataUpdate, SubscriptionInfo };
export default getRealTimeDataService;