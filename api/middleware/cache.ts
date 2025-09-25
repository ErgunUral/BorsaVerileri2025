import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// In-memory cache implementation
interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  private hits: number = 0;
  private misses: number = 0;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key: string, data: unknown, ttlSeconds: number = 300): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    };
    this.cache.set(key, entry);
    logger.info(`Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      logger.info(`Cache expired: ${key}`);
      return null;
    }

    this.hits++;
    logger.info(`Cache hit: ${key}`);
    return entry.data;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.info(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.info(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }

  getStats(): { size: number; keys: string[]; hits: number; misses: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hits: this.hits,
      misses: this.misses
    };
  }

  getAllKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache middleware factory
export function createCacheMiddleware(ttlSeconds: number = 300) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create cache key from URL and query parameters
    const cacheKey = `${req.originalUrl || req.url}`;
    
    // Try to get from cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      res.setHeader('X-Cache', 'HIT');
      res.json(cachedData);
      return;
    }

    // Store original res.json method
    const originalJson = res.json.bind(res);

    // Override res.json to cache the response
    res.json = function(data: unknown) {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, data, ttlSeconds);
        res.setHeader('X-Cache', 'MISS');
      }
      return originalJson(data);
    };

    next();
  };
}

// Stock data cache middleware (short TTL for real-time data)
export const stockDataCache = createCacheMiddleware(120); // 2 minutes (gerçek zamanlı veri için kısaltıldı)

// Financial analysis cache middleware (longer TTL)
export const analysisCache = createCacheMiddleware(900); // 15 minutes (30'dan düşürüldü)

// Price data cache middleware (very short TTL)
export const priceCache = createCacheMiddleware(60); // 1 minute (gerçek zamanlı fiyat için)

// Cache invalidation middleware
export function invalidateCache(pattern?: string) {
  return (_req: Request, _res: Response, next: NextFunction): void => {
    if (pattern) {
      const stats = cache.getStats();
      const keysToDelete = stats.keys.filter(key => key.includes(pattern));
      keysToDelete.forEach(key => cache.delete(key));
      logger.info(`Cache invalidated: ${keysToDelete.length} keys matching pattern '${pattern}'`);
    } else {
      cache.clear();
      logger.info('All cache cleared');
    }
    next();
  };
}

// Cache stats endpoint middleware
export function getCacheStats(_req: Request, res: Response): void {
  const stats = cache.getStats();
  res.json({
    success: true,
    data: {
      cacheSize: stats.size,
      totalKeys: stats.keys.length,
      keys: stats.keys,
      timestamp: new Date().toISOString()
    }
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  cache.destroy();
});

process.on('SIGINT', () => {
  cache.destroy();
});