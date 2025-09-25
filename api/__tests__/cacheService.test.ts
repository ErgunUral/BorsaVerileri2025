import { getCacheService, resetCacheService } from '../services/cacheService';
import Redis from 'ioredis';
import { vi, describe, test, beforeEach, afterAll, expect } from 'vitest';

// Mock Redis
vi.mock('ioredis');
const MockedRedis = Redis as any;

const mockRedisInstance = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  ttl: vi.fn(),
  expire: vi.fn(),
  keys: vi.fn(),
  flushall: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  removeAllListeners: vi.fn(),
  status: 'ready',
  options: {
    host: 'localhost',
    port: 6379,
    db: 0
  }
} as any;

MockedRedis.mockImplementation(() => mockRedisInstance as any);

describe('Cache Service', () => {
  let cacheService: any;

  afterAll(async () => {
    // Clean up cache service
    if (cacheService) {
      cacheService.destroy();
    }
    resetCacheService();
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance.ping.mockResolvedValue('PONG');
    mockRedisInstance.get.mockResolvedValue(null);
    mockRedisInstance.set.mockResolvedValue('OK');
    mockRedisInstance.del.mockResolvedValue(1);
    mockRedisInstance.exists.mockResolvedValue(0);
    mockRedisInstance.expire.mockResolvedValue(1);
    mockRedisInstance.ttl.mockResolvedValue(-1);
    mockRedisInstance.keys.mockResolvedValue([]);
    mockRedisInstance.flushall.mockResolvedValue('OK');
    
    cacheService = getCacheService();
  });

















  describe('cache operations', () => {
    test('checks if key exists', () => {
      cacheService.set('test:key', 'value');
      const exists = cacheService.has('test:key');
      
      expect(exists).toBe(true);
    });

    test('gets cache size', () => {
      cacheService.clear();
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const size = cacheService.size();
      expect(size).toBe(2);
    });

    test('gets all cache keys', () => {
      cacheService.clear();
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const keys = cacheService.keys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys.length).toBe(2);
    });
  });

  describe('cache cleanup', () => {
    test('clears all cache data', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      cacheService.clear();
      
      expect(cacheService.size()).toBe(0);
    });

    test('deletes specific keys', () => {
      cacheService.set('key1', 'value1');
      cacheService.set('key2', 'value2');
      
      const deleted = cacheService.delete('key1');
      
      expect(deleted).toBe(true);
      expect(cacheService.has('key1')).toBe(false);
      expect(cacheService.has('key2')).toBe(true);
    });
  });

  describe('cache expiration', () => {
    test('handles expired entries', async () => {
      const key = 'expiring:key';
      const value = 'test value';
      const ttl = 50; // 50ms
      
      cacheService.set(key, value, ttl);
      
      // Should exist immediately
      expect(cacheService.get(key)).toBe(value);
      
      // Should be expired after TTL
      await new Promise(resolve => {
        setTimeout(() => {
          expect(cacheService.get(key)).toBeNull();
          resolve(undefined);
        }, ttl + 10);
      });
    });


  });

  describe('performance and monitoring', () => {
    test('tracks cache hit/miss statistics', () => {
      cacheService.resetStats();
      
      // Cache miss
      cacheService.get('nonexistent:key');
      
      // Cache hit
      cacheService.set('test:key', 'value');
      cacheService.get('test:key');
      
      const stats = cacheService.getStats();
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });


  });

  describe('cache lifecycle', () => {


    test('resets statistics', () => {
      cacheService.set('key1', 'value1');
      cacheService.get('key1');
      cacheService.get('nonexistent');
      
      let stats = cacheService.getStats();
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
      
      cacheService.resetStats();
      stats = cacheService.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });
});