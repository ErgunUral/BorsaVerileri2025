import { BulkDataService } from './bulkDataService';
import logger from '../utils/logger';
import { EventEmitter } from 'events';
import { getErrorHandlingService, ErrorContext } from './errorHandlingService';

export interface SchedulerConfig {
  interval: number; // milliseconds
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface SchedulerStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunTime: Date | null;
  lastSuccessTime: Date | null;
  lastErrorTime: Date | null;
  lastError: string | null;
  isRunning: boolean;
  nextRunTime: Date | null;
}

export class SchedulerService extends EventEmitter {
  private bulkDataService: BulkDataService;
  private errorHandlingService = getErrorHandlingService();
  private config: SchedulerConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private stats: SchedulerStats;
  private isProcessing = false;

  constructor(bulkDataService: BulkDataService, config: Partial<SchedulerConfig> = {}) {
    super();
    this.bulkDataService = bulkDataService;
    this.config = {
      interval: 30000, // 30 seconds
      enabled: true,
      maxRetries: 3,
      retryDelay: 5000, // 5 seconds
      ...config
    };

    this.stats = {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      lastRunTime: null,
      lastSuccessTime: null,
      lastErrorTime: null,
      lastError: null,
      isRunning: false,
      nextRunTime: null
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.bulkDataService.on('update', (data) => {
      this.emit('dataUpdate', data);
    });

    this.bulkDataService.on('error', (error) => {
      this.emit('dataError', error);
    });
  }

  public start(): void {
    if (this.intervalId || !this.config.enabled) {
      logger.warn('Scheduler already running or disabled');
      return;
    }

    logger.info(`Starting scheduler with ${this.config.interval}ms interval`);
    
    // Run immediately
    this.runDataUpdate();
    
    // Schedule recurring updates
    this.intervalId = setInterval(() => {
      this.runDataUpdate();
    }, this.config.interval);

    this.updateNextRunTime();
    this.emit('started');
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.stats.nextRunTime = null;
      logger.info('Scheduler stopped');
      this.emit('stopped');
    }
  }

  public restart(): void {
    this.stop();
    setTimeout(() => {
      this.start();
    }, 1000);
  }

  private async runDataUpdate(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Previous data update still processing, skipping...');
      return;
    }

    this.isProcessing = true;
    this.stats.totalRuns++;
    this.stats.lastRunTime = new Date();
    this.stats.isRunning = true;

    const context: ErrorContext = {
      operation: 'runDataUpdate',
      source: 'SchedulerService',
      timestamp: new Date()
    };

    try {
      await this.errorHandlingService.executeWithRetryAndCircuitBreaker(
        async () => {
          logger.info('Running scheduled data update');
          
          // Update BIST 100 data
          const bist100Data = await this.bulkDataService.getBist100Data();
          
          // Update popular stocks
          const popularData = await this.bulkDataService.getPopularStocks();
          
          // Update watchlist data if available
          const watchlistData = await this.bulkDataService.getWatchlistData(['default']);

          this.stats.successfulRuns++;
          this.stats.lastSuccessTime = new Date();

          this.emit('updateComplete', {
            bist100: bist100Data,
            popular: popularData,
            watchlist: watchlistData,
            timestamp: new Date()
          });

          logger.info('Scheduled data update completed successfully');
        },
        context,
        { maxRetries: this.config.maxRetries, baseDelay: this.config.retryDelay },
        { failureThreshold: 3, resetTimeout: 300000 }
      );
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.stats.failedRuns++;
      this.stats.lastErrorTime = new Date();
      this.stats.lastError = errorMessage;
      
      this.emit('updateError', {
        error: errorMessage,
        timestamp: new Date()
      });
      
      logger.error('Data update failed after all retries:', errorMessage);
    }

    this.isProcessing = false;
    this.stats.isRunning = false;
    this.updateNextRunTime();
  }

  private updateNextRunTime(): void {
    if (this.intervalId) {
      this.stats.nextRunTime = new Date(Date.now() + this.config.interval);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getStats(): SchedulerStats {
    return { ...this.stats };
  }

  public getConfig(): SchedulerConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<SchedulerConfig>): void {
    const wasRunning = this.intervalId !== null;
    
    if (wasRunning) {
      this.stop();
    }

    this.config = { ...this.config, ...newConfig };
    
    if (wasRunning && this.config.enabled) {
      this.start();
    }

    this.emit('configUpdated', this.config);
  }

  public forceUpdate(): Promise<void> {
    return this.runDataUpdate();
  }

  public isActive(): boolean {
    return this.intervalId !== null;
  }

  public getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error';
    message: string;
    details: any;
  } {
    const now = Date.now();
    const lastRunAge = this.stats.lastRunTime ? now - this.stats.lastRunTime.getTime() : null;
    const expectedInterval = this.config.interval * 2; // Allow 2x interval as warning threshold

    if (!this.config.enabled) {
      return {
        status: 'warning',
        message: 'Scheduler is disabled',
        details: { enabled: false }
      };
    }

    if (!this.intervalId) {
      return {
        status: 'error',
        message: 'Scheduler is not running',
        details: { running: false }
      };
    }

    if (this.stats.lastErrorTime && this.stats.lastSuccessTime) {
      if (this.stats.lastErrorTime > this.stats.lastSuccessTime) {
        return {
          status: 'error',
          message: 'Last update failed',
          details: {
            lastError: this.stats.lastError,
            lastErrorTime: this.stats.lastErrorTime
          }
        };
      }
    }

    if (lastRunAge && lastRunAge > expectedInterval) {
      return {
        status: 'warning',
        message: 'Update interval exceeded',
        details: {
          lastRunAge: lastRunAge,
          expectedInterval: expectedInterval
        }
      };
    }

    return {
      status: 'healthy',
      message: 'Scheduler running normally',
      details: {
        successRate: this.stats.totalRuns > 0 ? 
          (this.stats.successfulRuns / this.stats.totalRuns * 100).toFixed(2) + '%' : '0%',
        nextRun: this.stats.nextRunTime
      }
    };
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

export function getSchedulerService(bulkDataService?: BulkDataService): SchedulerService {
  if (!schedulerInstance && bulkDataService) {
    schedulerInstance = new SchedulerService(bulkDataService);
  }
  
  if (!schedulerInstance) {
    throw new Error('SchedulerService not initialized. Provide BulkDataService instance.');
  }
  
  return schedulerInstance;
}

export function resetSchedulerService(): void {
  if (schedulerInstance) {
    schedulerInstance.stop();
    schedulerInstance = null;
  }
}