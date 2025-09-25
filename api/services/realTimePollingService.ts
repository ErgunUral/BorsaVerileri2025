import { EventEmitter } from 'events';
import logger from '../utils/logger';
import { bulkDataService } from './bulkDataService';
import { getErrorHandlingService, ErrorContext } from './errorHandlingService';
import { getCacheService } from './cacheService';

export interface PollingConfig {
  interval: number; // milliseconds
  batchSize: number;
  maxConcurrency: number;
  enableCache: boolean;
  retryAttempts: number;
  healthCheckInterval: number;
}

export interface PollingStats {
  isRunning: boolean;
  totalPolls: number;
  successfulPolls: number;
  failedPolls: number;
  lastPollTime: Date | null;
  lastSuccessTime: Date | null;
  lastErrorTime: Date | null;
  lastError: string | null;
  averageResponseTime: number;
  symbolsPolled: number;
  cacheHitRate: number;
  uptime: number;
  startTime: Date | null;
}

export interface PollingTarget {
  name: string;
  symbols: string[];
  interval: number;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export interface PollingResult {
  target: string;
  success: boolean;
  symbolsProcessed: number;
  symbolsFailed: number;
  responseTime: number;
  timestamp: Date;
  error?: string;
}

export class RealTimePollingService extends EventEmitter {
  private config: PollingConfig;
  private stats: PollingStats;
  private bulkDataService = bulkDataService;
  private errorHandlingService = getErrorHandlingService();
  private cacheService = getCacheService();
  private pollingTargets: Map<string, PollingTarget> = new Map();
  private activeIntervals: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(config: Partial<PollingConfig> = {}) {
    super();
    
    this.config = {
      interval: 30000, // 30 seconds
      batchSize: 50,
      maxConcurrency: 10,
      enableCache: true,
      retryAttempts: 3,
      healthCheckInterval: 60000, // 1 minute
      ...config
    };

    this.stats = {
      isRunning: false,
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      lastPollTime: null,
      lastSuccessTime: null,
      lastErrorTime: null,
      lastError: null,
      averageResponseTime: 0,
      symbolsPolled: 0,
      cacheHitRate: 0,
      uptime: 0,
      startTime: null
    };

    this.initializeDefaultTargets();
    this.setupEventHandlers();
  }

  private initializeDefaultTargets(): void {
    // BIST 100 high priority polling
    this.addPollingTarget({
      name: 'bist100',
      symbols: this.getBIST100Symbols(),
      interval: 30000, // 30 seconds
      priority: 'high',
      enabled: true
    });

    // Popular stocks medium priority polling
    this.addPollingTarget({
      name: 'popular',
      symbols: this.getPopularStockSymbols(),
      interval: 45000, // 45 seconds
      priority: 'medium',
      enabled: true
    });

    // Watchlist high priority polling
    this.addPollingTarget({
      name: 'watchlist',
      symbols: this.getWatchlistSymbols(),
      interval: 20000, // 20 seconds
      priority: 'high',
      enabled: true
    });
  }

  private setupEventHandlers(): void {
    // Event handlers for circuit breaker events would be implemented here
    // when ErrorHandlingService extends EventEmitter
    logger.debug('Event handlers setup completed');
  }

  public start(): void {
    if (this.stats.isRunning) {
      logger.warn('Real-time polling service is already running');
      return;
    }

    logger.info('Starting real-time polling service');
    this.stats.isRunning = true;
    this.stats.startTime = new Date();
    this.isShuttingDown = false;

    // Start polling for each target
    for (const [name, target] of this.pollingTargets) {
      if (target.enabled) {
        this.startPollingTarget(name, target);
      }
    }

    // Start health check
    this.startHealthCheck();

    this.emit('started');
    logger.info('Real-time polling service started successfully');
  }

  public stop(): void {
    if (!this.stats.isRunning) {
      logger.warn('Real-time polling service is not running');
      return;
    }

    logger.info('Stopping real-time polling service');
    this.isShuttingDown = true;
    this.stats.isRunning = false;

    // Stop all polling intervals
    for (const [name, interval] of this.activeIntervals) {
      clearInterval(interval);
      logger.debug(`Stopped polling for target: ${name}`);
    }
    this.activeIntervals.clear();

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.emit('stopped');
    logger.info('Real-time polling service stopped');
  }

  public restart(): void {
    logger.info('Restarting real-time polling service');
    this.stop();
    setTimeout(() => this.start(), 1000);
  }

  private startPollingTarget(name: string, target: PollingTarget): void {
    if (this.activeIntervals.has(name)) {
      clearInterval(this.activeIntervals.get(name)!);
    }

    const interval = setInterval(async () => {
      if (this.isShuttingDown) return;
      
      await this.pollTarget(name, target);
    }, target.interval);

    this.activeIntervals.set(name, interval);
    logger.info(`Started polling for target '${name}' with ${target.interval}ms interval`);

    // Immediate first poll
    setImmediate(() => this.pollTarget(name, target));
  }

  private async pollTarget(name: string, target: PollingTarget): Promise<void> {
    const startTime = Date.now();
    
    const context: ErrorContext = {
      operation: 'pollTarget',
      source: 'RealTimePollingService',
      timestamp: new Date(),
      metadata: { target: name, symbolCount: target.symbols.length }
    };

    try {
      const result = await this.errorHandlingService.executeWithRetryAndCircuitBreaker(
        async () => {
          logger.debug(`Polling target '${name}' with ${target.symbols.length} symbols`);
          
          const bulkResult = await this.bulkDataService.getBulkData(target.symbols);
          
          if (!bulkResult.success) {
            throw new Error(`Bulk data fetch failed: ${bulkResult.error}`);
          }

          return bulkResult;
        },
        context,
        { maxRetries: this.config.retryAttempts, baseDelay: 1000 },
        { failureThreshold: 3, resetTimeout: 300000 }
      );

      const responseTime = Date.now() - startTime;
      
      // Update statistics
      this.updateStats(true, responseTime, target.symbols.length, result.summary.cached);
      
      const pollingResult: PollingResult = {
        target: name,
        success: true,
        symbolsProcessed: result.summary.successful,
        symbolsFailed: result.summary.failed,
        responseTime,
        timestamp: new Date()
      };

      this.emit('pollComplete', pollingResult);
      this.emit('dataUpdate', {
        target: name,
        data: result.data,
        summary: result.summary,
        timestamp: new Date()
      });

      logger.debug(`Poll completed for '${name}': ${result.summary.successful}/${result.summary.total} symbols in ${responseTime}ms`);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.updateStats(false, responseTime, 0, 0);
      
      const pollingResult: PollingResult = {
        target: name,
        success: false,
        symbolsProcessed: 0,
        symbolsFailed: target.symbols.length,
        responseTime,
        timestamp: new Date(),
        error: errorMessage
      };

      this.emit('pollError', pollingResult);
      logger.error(`Poll failed for '${name}':`, errorMessage);
    }
  }

  private updateStats(success: boolean, responseTime: number, symbolsProcessed: number, cacheHits: number): void {
    this.stats.totalPolls++;
    this.stats.lastPollTime = new Date();
    
    if (success) {
      this.stats.successfulPolls++;
      this.stats.lastSuccessTime = new Date();
      this.stats.symbolsPolled += symbolsProcessed;
      
      // Update cache hit rate
      if (symbolsProcessed > 0) {
        const totalSymbols = this.stats.symbolsPolled;
        const totalCacheHits = (this.stats.cacheHitRate * (totalSymbols - symbolsProcessed)) + cacheHits;
        this.stats.cacheHitRate = totalCacheHits / totalSymbols;
      }
    } else {
      this.stats.failedPolls++;
      this.stats.lastErrorTime = new Date();
    }
    
    // Update average response time
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalPolls - 1) + responseTime) / this.stats.totalPolls;
    
    // Update uptime
    if (this.stats.startTime) {
      this.stats.uptime = Date.now() - this.stats.startTime.getTime();
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private performHealthCheck(): void {
    const health = this.getHealthStatus();
    
    this.emit('healthCheck', health);
    
    if (health.status === 'error') {
      logger.error('Real-time polling service health check failed:', health.message);
      
      // Auto-recovery attempts
      if (health.details.consecutiveFailures > 5) {
        logger.warn('Too many consecutive failures, restarting polling service');
        this.restart();
      }
    }
  }

  private adjustPollingIntervals(action: 'increase' | 'decrease' | 'normalize'): void {
    for (const [name, target] of this.pollingTargets) {
      if (!target.enabled) continue;
      
      let newInterval = target.interval;
      
      switch (action) {
        case 'increase':
          newInterval = Math.min(target.interval * 1.5, 300000); // Max 5 minutes
          break;
        case 'decrease':
          newInterval = Math.max(target.interval * 0.8, 10000); // Min 10 seconds
          break;
        case 'normalize':
          newInterval = this.getDefaultInterval(target.priority);
          break;
      }
      
      if (newInterval !== target.interval) {
        target.interval = newInterval;
        
        if (this.stats.isRunning) {
          this.startPollingTarget(name, target);
        }
        
        logger.info(`Adjusted polling interval for '${name}' to ${newInterval}ms`);
      }
    }
  }

  private getDefaultInterval(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 30000; // 30 seconds
      case 'medium': return 45000; // 45 seconds
      case 'low': return 60000; // 1 minute
    }
  }

  public addPollingTarget(target: PollingTarget): void {
    this.pollingTargets.set(target.name, target);
    
    if (this.stats.isRunning && target.enabled) {
      this.startPollingTarget(target.name, target);
    }
    
    logger.info(`Added polling target '${target.name}' with ${target.symbols.length} symbols`);
  }

  public removePollingTarget(name: string): boolean {
    if (this.pollingTargets.has(name)) {
      // Stop polling if running
      if (this.activeIntervals.has(name)) {
        clearInterval(this.activeIntervals.get(name)!);
        this.activeIntervals.delete(name);
      }
      
      this.pollingTargets.delete(name);
      logger.info(`Removed polling target '${name}'`);
      return true;
    }
    return false;
  }

  public updatePollingTarget(name: string, updates: Partial<PollingTarget>): boolean {
    const target = this.pollingTargets.get(name);
    if (!target) return false;
    
    Object.assign(target, updates);
    
    // Restart polling if interval changed and service is running
    if (updates.interval && this.stats.isRunning && target.enabled) {
      this.startPollingTarget(name, target);
    }
    
    logger.info(`Updated polling target '${name}'`);
    return true;
  }

  public getPollingTargets(): PollingTarget[] {
    return Array.from(this.pollingTargets.values());
  }

  public getStats(): PollingStats {
    return { ...this.stats };
  }

  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details: any;
  } {
    const now = Date.now();
    const recentFailures = this.stats.failedPolls;
    const totalPolls = this.stats.totalPolls;
    const failureRate = totalPolls > 0 ? (recentFailures / totalPolls) * 100 : 0;
    
    const timeSinceLastSuccess = this.stats.lastSuccessTime ? 
      now - this.stats.lastSuccessTime.getTime() : Infinity;
    
    const consecutiveFailures = this.calculateConsecutiveFailures();
    
    if (!this.stats.isRunning) {
      return {
        status: 'error',
        message: 'Polling service is not running',
        details: { isRunning: false }
      };
    }
    
    if (consecutiveFailures >= 5) {
      return {
        status: 'error',
        message: 'Too many consecutive failures',
        details: { consecutiveFailures, failureRate: failureRate.toFixed(2) + '%' }
      };
    }
    
    if (timeSinceLastSuccess > 300000) { // 5 minutes
      return {
        status: 'error',
        message: 'No successful polls in the last 5 minutes',
        details: { timeSinceLastSuccess: Math.round(timeSinceLastSuccess / 1000) + 's' }
      };
    }
    
    if (failureRate > 50) {
      return {
        status: 'error',
        message: 'High failure rate detected',
        details: { failureRate: failureRate.toFixed(2) + '%' }
      };
    }
    
    if (failureRate > 20) {
      return {
        status: 'warning',
        message: 'Elevated failure rate',
        details: { failureRate: failureRate.toFixed(2) + '%' }
      };
    }
    
    return {
      status: 'healthy',
      message: 'Polling service operating normally',
      details: {
        failureRate: failureRate.toFixed(2) + '%',
        activeTargets: this.activeIntervals.size,
        uptime: Math.round(this.stats.uptime / 1000) + 's'
      }
    };
  }

  private calculateConsecutiveFailures(): number {
    // This is a simplified calculation
    // In a real implementation, you might want to track this more precisely
    const recentWindow = 10; // Last 10 polls
    return Math.min(this.stats.failedPolls, recentWindow);
  }

  private getBIST100Symbols(): string[] {
    // Return BIST 100 symbols
    return [
      'AKBNK', 'ARCLK', 'ASELS', 'BIMAS', 'EKGYO', 'EREGL', 'FROTO',
      'GARAN', 'HALKB', 'ISCTR', 'KCHOL', 'KOZAL', 'KOZAA', 'KRDMD',
      'PETKM', 'PGSUS', 'SAHOL', 'SASA', 'SISE', 'SKBNK', 'TAVHL',
      'TCELL', 'THYAO', 'TKFEN', 'TOASO', 'TUPRS', 'VAKBN', 'YKBNK'
    ];
  }

  private getPopularStockSymbols(): string[] {
    return [
      'AKBNK', 'GARAN', 'ISCTR', 'THYAO', 'BIMAS', 'ASELS', 'KCHOL',
      'SAHOL', 'VAKBN', 'HALKB', 'EREGL', 'ARCLK', 'TUPRS', 'SISE'
    ];
  }

  private getWatchlistSymbols(): string[] {
    // This would typically come from user preferences or database
    return ['AKBNK', 'GARAN', 'THYAO', 'BIMAS', 'ASELS'];
  }

  public updateConfig(newConfig: Partial<PollingConfig>): void {
    Object.assign(this.config, newConfig);
    logger.info('Polling service configuration updated');
    
    if (this.stats.isRunning) {
      this.restart();
    }
  }

  public clearStats(): void {
    this.stats = {
      ...this.stats,
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      lastError: null,
      averageResponseTime: 0,
      symbolsPolled: 0,
      cacheHitRate: 0
    };
    logger.info('Polling service statistics cleared');
  }
}

// Singleton instance
let realTimePollingServiceInstance: RealTimePollingService | null = null;

export function getRealTimePollingService(): RealTimePollingService {
  if (!realTimePollingServiceInstance) {
    realTimePollingServiceInstance = new RealTimePollingService();
  }
  return realTimePollingServiceInstance;
}

export function resetRealTimePollingService(): void {
  if (realTimePollingServiceInstance) {
    realTimePollingServiceInstance.stop();
  }
  realTimePollingServiceInstance = null;
}