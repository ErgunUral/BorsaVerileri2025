import { CacheService, CacheConfig, CacheEntry, CacheStats, StockDataCache, getCacheService, resetCacheService } from '../../services/cacheService.js';
import logger from '../../utils/logger.js';

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLogger = logger as jest.Mocked<typeof logger>;
    
    // Create fresh cache service instance
    cacheService = new CacheService({
      defaultTTL: 1000,
      maxSize: 5,
      cleanupInterval: 500,
      enableStats: true
    });
  });

  afterEach(() => {
    cacheService.destroy();
    jest.useRealTimers();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get values correctly', () => {
      cacheService.set('key1', 'value1');
      
      expect(cacheService.get('key1')).toBe('value1');
      expect(cacheService.has('key1')).toBe(true);
      expect(cacheService.size()).toBe(1);
    });

    it('should return null for non-existent keys', () => {
      expect(cacheService.get('nonexistent')).toBeNull();
      expect(cacheService.has('nonexistent')).toBe(false);
    });

    it('should delete values correctly', () => {
      cacheService.set('key1', 'value1');
      
      expect(cacheService.delete('key1')).toBe(true);
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.size()).toBe(0);
    });

    it('should return false when deleting non-existent key', () => {
      expect(cacheService.delete('nonexistent')).toBe(false);
    });

    it('should clear all values', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      cacheService.clear();
      
      expect(cacheService.size()).toBe(0);
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBeNull();
    });

    it('should return all keys', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const keys = cacheService.keys();
      
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      cacheService.set('key1', 'value1', 500);
      
      expect(cacheService.get('key1')).toBe('value1');
      
      // Fast forward past TTL
      jest.advanceTimersByTime(600);
      
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.has('key1')).toBe(false);
    });

    it('should use default TTL when not specified', () => {
      cacheService.set('key1', 'value1');
      
      expect(cacheService.get('key1')).toBe('value1');
      
      // Fast forward past default TTL (1000ms)
      jest.advanceTimersByTime(1100);
      
      expect(cacheService.get('key1')).toBeNull();
    });

    it('should extend TTL correctly', () => {
      cacheService.set('key1', 'value1', 500);
      
      expect(cacheService.extend('key1', 500)).toBe(true);
      
      // Fast forward past original TTL but not extended TTL
      jest.advanceTimersByTime(600);
      
      expect(cacheService.get('key1')).toBe('value1');
      
      // Fast forward past extended TTL
      jest.advanceTimersByTime(500);
      
      expect(cacheService.get('key1')).toBeNull();
    });

    it('should return false when extending non-existent key', () => {
      expect(cacheService.extend('nonexistent', 500)).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entry when max size reached', () => {
      // Fill cache to max size
      for (let i = 1; i <= 5; i++) {
        cacheService.set(`key${i}`, `value${i}`);
      }
      
      expect(cacheService.size()).toBe(5);
      
      // Access key2 to make it more recently used
      cacheService.get('key2');
      
      // Add one more entry to trigger eviction
      cacheService.set('key6', 'value6');
      
      expect(cacheService.size()).toBe(5);
      expect(cacheService.get('key1')).toBeNull(); // Should be evicted (LRU)
      expect(cacheService.get('key2')).toBe('value2'); // Should still exist
      expect(cacheService.get('key6')).toBe('value6'); // New entry should exist
    });

    it('should not evict when updating existing key', () => {
      // Fill cache to max size
      for (let i = 1; i <= 5; i++) {
        cacheService.set(`key${i}`, `value${i}`);
      }
      
      // Update existing key
      cacheService.set('key3', 'updated_value3');
      
      expect(cacheService.size()).toBe(5);
      expect(cacheService.get('key3')).toBe('updated_value3');
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics correctly', () => {
      // Set some values
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      // Generate hits and misses
      cacheService.get('key1'); // hit
      cacheService.get('key1'); // hit
      cacheService.get('nonexistent'); // miss
      
      // Delete a value
      cacheService.delete('key2');
      
      const stats = cacheService.getStats();
      
      expect(stats.sets).toBe(2);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBe((2 / 3) * 100); // 2 hits out of 3 total accesses
    });

    it('should reset statistics correctly', () => {
      cacheService.set('key1', 'value1');
      cacheService.get('key1');
      cacheService.get('nonexistent');
      
      cacheService.resetStats();
      
      const stats = cacheService.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
      expect(stats.evictions).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should track evictions in statistics', () => {
      // Fill cache beyond max size to trigger evictions
      for (let i = 1; i <= 7; i++) {
        cacheService.set(`key${i}`, `value${i}`);
      }
      
      const stats = cacheService.getStats();
      
      expect(stats.evictions).toBe(2); // 2 entries should be evicted
      expect(stats.size).toBe(5);
    });
  });

  describe('Entry Information', () => {
    it('should provide detailed entry information', () => {
      const now = Date.now();
      jest.setSystemTime(now);
      
      cacheService.set('key1', 'value1', 1000);
      cacheService.get('key1'); // Access to update stats
      
      jest.advanceTimersByTime(200);
      
      const info = cacheService.getEntryInfo('key1');
      
      expect(info.exists).toBe(true);
      expect(info.expired).toBe(false);
      expect(info.age).toBe(200);
      expect(info.ttl).toBe(800); // 1000 - 200
      expect(info.accessCount).toBe(1);
      expect(info.lastAccessed).toBeInstanceOf(Date);
    });

    it('should indicate non-existent entries', () => {
      const info = cacheService.getEntryInfo('nonexistent');
      
      expect(info.exists).toBe(false);
      expect(info.expired).toBeUndefined();
      expect(info.ttl).toBeUndefined();
    });

    it('should indicate expired entries', () => {
      cacheService.set('key1', 'value1', 500);
      
      jest.advanceTimersByTime(600);
      
      const info = cacheService.getEntryInfo('key1');
      
      expect(info.exists).toBe(true);
      expect(info.expired).toBe(true);
      expect(info.ttl).toBe(0);
    });
  });

  describe('Touch Operation', () => {
    it('should update access time and count', () => {
      cacheService.set('key1', 'value1');
      
      const initialInfo = cacheService.getEntryInfo('key1');
      
      jest.advanceTimersByTime(100);
      
      expect(cacheService.touch('key1')).toBe(true);
      
      const updatedInfo = cacheService.getEntryInfo('key1');
      
      expect(updatedInfo.accessCount).toBe(initialInfo.accessCount! + 1);
      expect(updatedInfo.lastAccessed!.getTime()).toBeGreaterThan(initialInfo.lastAccessed!.getTime());
    });

    it('should return false for non-existent key', () => {
      expect(cacheService.touch('nonexistent')).toBe(false);
    });
  });

  describe('Top Keys', () => {
    it('should return most accessed keys', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      cacheService.set('key3', 'value3');
      
      // Access keys different number of times
      cacheService.get('key1'); // 1 access
      cacheService.get('key2'); // 1 access
      cacheService.get('key2'); // 2 accesses total
      cacheService.get('key3'); // 1 access
      cacheService.get('key3'); // 2 accesses total
      cacheService.get('key3'); // 3 accesses total
      
      const topKeys = cacheService.getTopKeys(2);
      
      expect(topKeys).toHaveLength(2);
      expect(topKeys[0].key).toBe('key3');
      expect(topKeys[0].accessCount).toBe(3);
      expect(topKeys[1].accessCount).toBe(2);
    });
  });

  describe('Cleanup', () => {
    it('should clean up expired entries manually', () => {
      cacheService.set('key1', 'value1', 500);
      cacheService.set('key2', 'value2', 1500);
      
      jest.advanceTimersByTime(600);
      
      const cleaned = cacheService.cleanup();
      
      expect(cleaned).toBe(1);
      expect(cacheService.get('key1')).toBeNull();
      expect(cacheService.get('key2')).toBe('value2');
    });

    it('should automatically clean up expired entries', () => {
      cacheService.set('key1', 'value1', 300);
      
      // Fast forward past TTL and cleanup interval
      jest.advanceTimersByTime(600);
      
      expect(cacheService.size()).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const config = cacheService.getConfig();
      
      expect(config.defaultTTL).toBe(1000);
      expect(config.maxSize).toBe(5);
      expect(config.cleanupInterval).toBe(500);
      expect(config.enableStats).toBe(true);
    });

    it('should update configuration', () => {
      cacheService.updateConfig({
        defaultTTL: 2000,
        maxSize: 10
      });
      
      const config = cacheService.getConfig();
      
      expect(config.defaultTTL).toBe(2000);
      expect(config.maxSize).toBe(10);
      expect(config.cleanupInterval).toBe(500); // Unchanged
    });
  });

  describe('Memory Usage', () => {
    it('should estimate memory usage', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', { data: 'complex object' });
      
      const usage = cacheService.getMemoryUsage();
      
      expect(usage).toBeGreaterThan(0);
      expect(typeof usage).toBe('number');
    });
  });

  describe('Destroy', () => {
    it('should clean up resources on destroy', () => {
      cacheService.set('key1', 'value1');
      
      cacheService.destroy();
      
      expect(cacheService.size()).toBe(0);
      expect(mockLogger.info).toHaveBeenCalledWith('Cache service destroyed');
    });
  });
});

describe('Singleton Cache Service', () => {
  afterEach(() => {
    resetCacheService();
  });

  it('should return same instance', () => {
    const cache1 = getCacheService();
    const cache2 = getCacheService();
    
    expect(cache1).toBe(cache2);
  });

  it('should reset singleton instance', () => {
    const cache1 = getCacheService();
    resetCacheService();
    const cache2 = getCacheService();
    
    expect(cache1).not.toBe(cache2);
  });
});

describe('StockDataCache', () => {
  let stockCache: StockDataCache;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    resetCacheService();
    mockLogger = logger as jest.Mocked<typeof logger>;
    stockCache = new StockDataCache();
  });

  afterEach(() => {
    resetCacheService();
  });

  describe('Stock Data Operations', () => {
    it('should set and get stock data', () => {
      const stockData = { price: 100, volume: 1000 };
      
      stockCache.setStockData('AAPL', stockData);
      
      expect(stockCache.getStockData('AAPL')).toEqual(stockData);
    });

    it('should return null for non-existent stock data', () => {
      expect(stockCache.getStockData('NONEXISTENT')).toBeNull();
    });
  });

  describe('Bulk Data Operations', () => {
    it('should set and get bulk data', () => {
      const bulkData = [{ symbol: 'AAPL', price: 100 }, { symbol: 'GOOGL', price: 200 }];
      const symbols = ['AAPL', 'GOOGL'];
      
      stockCache.setBulkData(symbols, bulkData);
      
      expect(stockCache.getBulkData(symbols)).toEqual(bulkData);
    });

    it('should handle symbol order independence', () => {
      const bulkData = [{ symbol: 'AAPL', price: 100 }, { symbol: 'GOOGL', price: 200 }];
      
      stockCache.setBulkData(['AAPL', 'GOOGL'], bulkData);
      
      expect(stockCache.getBulkData(['GOOGL', 'AAPL'])).toEqual(bulkData);
    });
  });

  describe('Analysis Data Operations', () => {
    it('should set and get analysis data', () => {
      const analysisData = { trend: 'bullish', score: 85 };
      
      stockCache.setAnalysisData('AAPL', 'technical', analysisData);
      
      expect(stockCache.getAnalysisData('AAPL', 'technical')).toEqual(analysisData);
    });

    it('should handle different analysis types', () => {
      const technicalData = { trend: 'bullish' };
      const fundamentalData = { pe: 25 };
      
      stockCache.setAnalysisData('AAPL', 'technical', technicalData);
      stockCache.setAnalysisData('AAPL', 'fundamental', fundamentalData);
      
      expect(stockCache.getAnalysisData('AAPL', 'technical')).toEqual(technicalData);
      expect(stockCache.getAnalysisData('AAPL', 'fundamental')).toEqual(fundamentalData);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate specific stock data', () => {
      stockCache.setStockData('AAPL', { price: 100 });
      stockCache.setAnalysisData('AAPL', 'technical', { trend: 'bullish' });
      stockCache.setBulkData(['AAPL', 'GOOGL'], [{ symbol: 'AAPL' }]);
      
      stockCache.invalidateStock('AAPL');
      
      expect(stockCache.getStockData('AAPL')).toBeNull();
      expect(stockCache.getAnalysisData('AAPL', 'technical')).toBeNull();
      expect(stockCache.getBulkData(['AAPL', 'GOOGL'])).toBeNull();
    });

    it('should invalidate all stock data', () => {
      stockCache.setStockData('AAPL', { price: 100 });
      stockCache.setStockData('GOOGL', { price: 200 });
      stockCache.setAnalysisData('AAPL', 'technical', { trend: 'bullish' });
      
      stockCache.invalidateAll();
      
      expect(stockCache.getStockData('AAPL')).toBeNull();
      expect(stockCache.getStockData('GOOGL')).toBeNull();
      expect(stockCache.getAnalysisData('AAPL', 'technical')).toBeNull();
    });
  });

  describe('TTL Behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should respect custom TTL for stock data', () => {
      stockCache.setStockData('AAPL', { price: 100 }, 1000);
      
      expect(stockCache.getStockData('AAPL')).toEqual({ price: 100 });
      
      jest.advanceTimersByTime(1100);
      
      expect(stockCache.getStockData('AAPL')).toBeNull();
    });

    it('should use longer TTL for analysis data', () => {
      stockCache.setAnalysisData('AAPL', 'technical', { trend: 'bullish' }, 5000);
      
      jest.advanceTimersByTime(4000);
      
      expect(stockCache.getAnalysisData('AAPL', 'technical')).toEqual({ trend: 'bullish' });
      
      jest.advanceTimersByTime(2000);
      
      expect(stockCache.getAnalysisData('AAPL', 'technical')).toBeNull();
    });
  });
});