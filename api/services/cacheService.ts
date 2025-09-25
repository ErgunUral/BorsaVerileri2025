import logger from '../utils/logger';

export interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
  enableStats: boolean;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 10000,
      cleanupInterval: 60000, // 1 minute
      enableStats: true,
      ...config
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0,
      hitRate: 0,
      memoryUsage: 0
    };

    this.startCleanup();
  }

  public set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl || this.config.defaultTTL;

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 0,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    
    if (this.config.enableStats) {
      this.stats.sets++;
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
    }

    logger.debug(`Cache set: ${key} (TTL: ${entryTTL}ms)`);
  }

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
        this.stats.size = this.cache.size;
        this.updateHitRate();
        this.updateMemoryUsage();
      }
      logger.debug(`Cache expired: ${key}`);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    if (this.config.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }

    logger.debug(`Cache hit: ${key}`);
    return entry.value;
  }

  public has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.size = this.cache.size;
        this.updateMemoryUsage();
      }
      return false;
    }

    return true;
  }

  public delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted && this.config.enableStats) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
      this.updateMemoryUsage();
    }

    if (deleted) {
      logger.debug(`Cache deleted: ${key}`);
    }

    return deleted;
  }

  public clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    
    if (this.config.enableStats) {
      this.stats.size = 0;
      this.updateMemoryUsage();
    }

    logger.info(`Cache cleared: ${size} entries removed`);
  }

  public keys(): string[] {
    return Array.from(this.cache.keys());
  }

  public size(): number {
    return this.cache.size;
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: this.cache.size,
      hitRate: 0,
      memoryUsage: this.stats.memoryUsage
    };
    logger.info('Cache statistics reset');
  }

  public cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      if (this.config.enableStats) {
        this.stats.size = this.cache.size;
        this.updateMemoryUsage();
      }
      logger.debug(`Cache cleanup: ${cleaned} expired entries removed`);
    }

    return cleaned;
  }

  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<CacheConfig>): void {
    Object.assign(this.config, newConfig);
    
    // Restart cleanup timer if interval changed
    if (newConfig.cleanupInterval) {
      this.stopCleanup();
      this.startCleanup();
    }

    logger.info('Cache configuration updated');
  }

  public getMemoryUsage(): number {
    // Rough estimation of memory usage
    let usage = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      usage += key.length * 2; // String characters are 2 bytes each
      usage += this.estimateObjectSize(entry);
    }

    return usage;
  }

  public getEntryInfo(key: string): {
    exists: boolean;
    expired?: boolean;
    ttl?: number;
    age?: number;
    accessCount?: number;
    lastAccessed?: Date;
  } {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return { exists: false };
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const expired = age > entry.ttl;
    const remainingTTL = Math.max(0, entry.ttl - age);

    return {
      exists: true,
      expired,
      ttl: remainingTTL,
      age,
      accessCount: entry.accessCount,
      lastAccessed: new Date(entry.lastAccessed)
    };
  }

  public extend(key: string, additionalTTL: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    entry.ttl += additionalTTL;
    logger.debug(`Cache TTL extended for ${key} by ${additionalTTL}ms`);
    return true;
  }

  public touch(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    entry.lastAccessed = now;
    entry.accessCount++;
    
    return true;
  }

  public getTopKeys(limit: number = 10): Array<{
    key: string;
    accessCount: number;
    lastAccessed: Date;
    age: number;
  }> {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed),
        age: Date.now() - entry.timestamp
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries;
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.config.enableStats) {
        this.stats.evictions++;
        this.stats.size = this.cache.size;
        this.updateMemoryUsage();
      }
      logger.debug(`Cache LRU eviction: ${oldestKey}`);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateMemoryUsage(): void {
    this.stats.memoryUsage = this.getMemoryUsage();
  }

  private estimateObjectSize(obj: any): number {
    // Very rough estimation
    const jsonString = JSON.stringify(obj);
    return jsonString.length * 2; // Assuming UTF-16 encoding
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
    
    logger.debug(`Cache cleanup timer started (interval: ${this.config.cleanupInterval}ms)`);
  }

  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      logger.debug('Cache cleanup timer stopped');
    }
  }

  public destroy(): void {
    this.stopCleanup();
    this.clear();
    logger.info('Cache service destroyed');
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
}

export function resetCacheService(): void {
  if (cacheServiceInstance) {
    cacheServiceInstance.destroy();
  }
  cacheServiceInstance = null;
}

// Stock-specific cache helpers
export class StockDataCache {
  private cache = getCacheService();
  private readonly STOCK_PREFIX = 'stock:';
  private readonly BULK_PREFIX = 'bulk:';
  private readonly ANALYSIS_PREFIX = 'analysis:';

  public setStockData(symbol: string, data: any, ttl: number = 30000): void {
    this.cache.set(`${this.STOCK_PREFIX}${symbol}`, data, ttl);
  }

  public getStockData(symbol: string): any | null {
    return this.cache.get(`${this.STOCK_PREFIX}${symbol}`);
  }

  public setBulkData(symbols: string[], data: any, ttl: number = 30000): void {
    const key = `${this.BULK_PREFIX}${symbols.sort().join(',')}`;
    this.cache.set(key, data, ttl);
  }

  public getBulkData(symbols: string[]): any | null {
    const key = `${this.BULK_PREFIX}${symbols.sort().join(',')}`;
    return this.cache.get(key);
  }

  public setAnalysisData(symbol: string, analysisType: string, data: any, ttl: number = 300000): void {
    this.cache.set(`${this.ANALYSIS_PREFIX}${symbol}:${analysisType}`, data, ttl);
  }

  public getAnalysisData(symbol: string, analysisType: string): any | null {
    return this.cache.get(`${this.ANALYSIS_PREFIX}${symbol}:${analysisType}`);
  }

  public invalidateStock(symbol: string): void {
    const keys = this.cache.keys();
    const stockKeys = keys.filter(key => 
      key.startsWith(`${this.STOCK_PREFIX}${symbol}`) ||
      key.startsWith(`${this.ANALYSIS_PREFIX}${symbol}:`) ||
      (key.startsWith(this.BULK_PREFIX) && key.includes(symbol))
    );

    stockKeys.forEach(key => this.cache.delete(key));
    logger.debug(`Invalidated cache for stock: ${symbol}`);
  }

  public invalidateAll(): void {
    const keys = this.cache.keys();
    const stockKeys = keys.filter(key => 
      key.startsWith(this.STOCK_PREFIX) ||
      key.startsWith(this.BULK_PREFIX) ||
      key.startsWith(this.ANALYSIS_PREFIX)
    );

    stockKeys.forEach(key => this.cache.delete(key));
    logger.info('Invalidated all stock cache data');
  }
}

export const stockDataCache = new StockDataCache();