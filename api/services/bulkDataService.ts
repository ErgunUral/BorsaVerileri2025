import { BIST100_STOCKS, POPULAR_STOCKS, SECTOR_GROUPS, STOCK_INFO, UPDATE_INTERVALS } from '../data/bist100.js';
import { EnhancedApiProvider } from './enhancedApiProvider.js';
import { CacheService } from './cacheService.js';
import { getErrorHandlingService, ErrorContext } from './errorHandlingService';
import { stockDataCache } from './cacheService';
import { getRedisService } from './redisService';
import EventEmitter from 'events';

export interface BulkDataOptions {
  stockCodes?: string[];
  useCache?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface BulkDataResult {
  successful: Record<string, any>;
  failed: string[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    duration: number;
    fromCache: number;
    fromApi: number;
  };
}

export interface DataUpdateEvent {
  type: 'update' | 'error' | 'complete';
  stockCode?: string;
  data?: any;
  error?: string;
  progress?: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export class BulkDataService extends EventEmitter {
  private enhancedApiProvider: EnhancedApiProvider;
  private cacheService: CacheService;
  private errorHandlingService = getErrorHandlingService();
  private isRunning: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: Date | null = null;

  constructor() {
    super();
    this.enhancedApiProvider = new EnhancedApiProvider();
    this.cacheService = new CacheService();
  }

  /**
   * BIST 100 tüm hisseleri için veri çekme
   */
  async getBist100Data(options: BulkDataOptions = {}): Promise<BulkDataResult> {
    return this.getBulkData({
      stockCodes: BIST100_STOCKS,
      ...options
    });
  }

  /**
   * Popüler hisseler için veri çekme
   */
  async getPopularStocksData(options: BulkDataOptions = {}): Promise<BulkDataResult> {
    return this.getBulkData({
      stockCodes: POPULAR_STOCKS,
      ...options
    });
  }

  /**
   * Sektör bazında veri çekme
   */
  async getSectorData(sectorName: keyof typeof SECTOR_GROUPS, options: BulkDataOptions = {}): Promise<BulkDataResult> {
    const stockCodes = SECTOR_GROUPS[sectorName];
    if (!stockCodes) {
      throw new Error(`Geçersiz sektör: ${sectorName}`);
    }

    return this.getBulkData({
      stockCodes,
      ...options
    });
  }

  /**
   * Toplu veri çekme ana fonksiyonu
   */
  async getBulkData(options: BulkDataOptions = {}): Promise<BulkDataResult> {
    const {
      stockCodes = POPULAR_STOCKS,
      useCache = true,
      maxConcurrency = 10,
      timeout = 30000,
      retryAttempts = 3
    } = options;

    const startTime = Date.now();
    const successful: Record<string, any> = {};
    const failed: string[] = [];
    let fromCache = 0;
    let fromApi = 0;

    // Progress tracking
    let completed = 0;
    const total = stockCodes.length;

    const context: ErrorContext = {
      operation: 'getBulkData',
      source: 'BulkDataService',
      timestamp: new Date(),
      metadata: { stockCodeCount: stockCodes.length }
    };

    try {
      // Check cache first for bulk data
      if (useCache) {
        const cachedResult = stockDataCache.getBulkData(stockCodes);
        if (cachedResult) {
          return {
            ...cachedResult,
            summary: {
              ...cachedResult.summary,
              fromCache: cachedResult.summary.successful,
              fromApi: 0
            }
          };
        }
      }

      return await this.errorHandlingService.executeWithRetryAndCircuitBreaker(
        async () => {
          // Batch processing için chunks oluştur
          const chunks = this.createChunks(stockCodes, maxConcurrency);

          for (const chunk of chunks) {
            const chunkPromises = chunk.map(async (stockCode) => {
              const stockContext: ErrorContext = {
                operation: 'getStockPrice',
                source: 'BulkDataService',
                timestamp: new Date(),
                metadata: { stockCode }
              };

              try {
                let data = null;
                let isCached = false;

                // Cache kontrolü
                if (useCache) {
                  data = stockDataCache.getStockData(stockCode);
                  if (data) {
                    isCached = true;
                    fromCache++;
                  }
                }

                // API'den veri çek
                if (!data) {
                  data = await this.errorHandlingService.executeWithRetry(
                    () => this.enhancedApiProvider.getStockPrice(stockCode),
                    stockContext,
                    { maxRetries: retryAttempts, baseDelay: 500 }
                  );
                  
                  if (data) {
                    fromApi++;
                    // Cache'e kaydet
                    if (useCache) {
                      stockDataCache.setStockData(stockCode, data, 300000); // 5 dakika TTL
                    }
                  }
                }

                if (data) {
                  successful[stockCode] = {
                    ...data,
                    stockInfo: STOCK_INFO[stockCode] || { code: stockCode, name: stockCode },
                    cached: isCached,
                    timestamp: new Date().toISOString()
                  };
                } else {
                  failed.push(stockCode);
                }

                completed++;
                this.emit('update', {
                  type: 'update',
                  stockCode,
                  data: successful[stockCode],
                  progress: {
                    completed,
                    total,
                    percentage: Math.round((completed / total) * 100)
                  }
                } as DataUpdateEvent);

              } catch (error) {
                failed.push(stockCode);
                completed++;
                
                this.emit('update', {
                  type: 'error',
                  stockCode,
                  error: error instanceof Error ? error.message : 'Bilinmeyen hata',
                  progress: {
                    completed,
                    total,
                    percentage: Math.round((completed / total) * 100)
                  }
                } as DataUpdateEvent);
              }
            });

            // Chunk'ı bekle
            await Promise.allSettled(chunkPromises);
          }

          const duration = Date.now() - startTime;
          const result: BulkDataResult = {
            successful,
            failed,
            summary: {
              total,
              successful: Object.keys(successful).length,
              failed: failed.length,
              duration,
              fromCache,
              fromApi
            }
          };

          // Cache the bulk result if we have significant success
          if (useCache && Object.keys(successful).length > 0) {
            stockDataCache.setBulkData(stockCodes, result, 300000); // 5 dakika TTL
          }

          this.emit('update', {
            type: 'complete',
            progress: {
              completed: total,
              total,
              percentage: 100
            }
          } as DataUpdateEvent);

          return result;
        },
        context,
        { maxRetries: 1, baseDelay: 1000 },
        { failureThreshold: 3, resetTimeout: 60000 }
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        successful,
        failed: stockCodes,
        summary: {
          total,
          successful: 0,
          failed: stockCodes.length,
          duration,
          fromCache: 0,
          fromApi: 0
        }
      };
    }
  }

  /**
   * Otomatik güncelleme başlat
   */
  startAutoUpdate(intervalMs: number = UPDATE_INTERVALS.FREQUENT): void {
    if (this.isRunning) {
      console.log('Otomatik güncelleme zaten çalışıyor');
      return;
    }

    this.isRunning = true;
    console.log(`Otomatik güncelleme başlatıldı: ${intervalMs}ms aralıklarla`);

    // İlk güncellemeyi hemen yap
    this.performAutoUpdate();

    // Periyodik güncelleme
    this.updateInterval = setInterval(() => {
      this.performAutoUpdate();
    }, intervalMs);
  }

  /**
   * Otomatik güncelleme durdur
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('Otomatik güncelleme durduruldu');
  }

  /**
   * Otomatik güncelleme işlemi
   */
  private async performAutoUpdate(): Promise<void> {
    try {
      console.log('Otomatik güncelleme başlıyor...');
      const startTime = Date.now();

      // Popüler hisseleri güncelle
      const result = await this.getPopularStocksData({
        useCache: false, // Fresh data
        maxConcurrency: 5
      });

      this.lastUpdateTime = new Date();
      const duration = Date.now() - startTime;

      console.log(`Otomatik güncelleme tamamlandı: ${result.summary.successful}/${result.summary.total} başarılı (${duration}ms)`);

      // WebSocket ile broadcast et
      this.emit('autoUpdate', {
        timestamp: this.lastUpdateTime,
        result,
        duration
      });

    } catch (error) {
      console.error('Otomatik güncelleme hatası:', error);
      this.emit('autoUpdateError', error);
    }
  }

  /**
   * Watchlist için özel veri çekme
   */
  async getWatchlistData(stockCodes: string[], options: BulkDataOptions = {}): Promise<BulkDataResult> {
    return this.getBulkData({
      stockCodes,
      useCache: true,
      maxConcurrency: 15,
      ...options
    });
  }

  /**
   * Sistem durumu
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastUpdateTime: this.lastUpdateTime,
      cacheStats: this.cacheService.getStats(),
      supportedStocks: {
        bist100: BIST100_STOCKS.length,
        popular: POPULAR_STOCKS.length,
        sectors: Object.keys(SECTOR_GROUPS).length
      }
    };
  }

  /**
   * Array'i chunks'lara böl
   */
  private createChunks<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.stopAutoUpdate();
    await this.cacheService.disconnect();
    this.removeAllListeners();
  }
}

// Singleton instance
export const bulkDataService = new BulkDataService();