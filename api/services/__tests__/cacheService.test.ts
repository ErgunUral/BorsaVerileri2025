import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { CacheService } from '../cacheService';
import { logger } from '../../utils/logger';

// Mock dependencies
vi.mock('ioredis');
vi.mock('../../utils/logger');

const MockedRedis = vi.mocked(Redis);
const mockedLogger = vi.mocked(logger);

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRedisInstance = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      exists: vi.fn(),
      expire: vi.fn(),
      ttl: vi.fn(),
      keys: vi.fn(),
      flushdb: vi.fn(),
      ping: vi.fn(),
      quit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      status: 'ready',
      mget: vi.fn(),
      mset: vi.fn(),
      pipeline: vi.fn(() => ({
        get: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([])
      })),
      multi: vi.fn(() => ({
        get: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([])
      }))
    };

    MockedRedis.mockImplementation(() => mockRedisInstance);
    cacheService = new CacheService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(cacheService).toBeDefined();
      expect(MockedRedis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        host: 'redis.example.com',
        port: 6380,
        password: 'secret',
        db: 1
      };

      const customCacheService = new CacheService(customConfig);
      expect(customCacheService).toBeDefined();
    });

    it('should setup event listeners', () => {
      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should set and get string values', async () => {
      const key = 'test:key';
      const value = 'test value';
      
      mockRedisInstance.set.mockResolvedValue('OK');
      mockRedisInstance.get.mockResolvedValue(value);

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(key, value);
      expect(result).toBe(value);
    });

    it('should set and get object values', async () => {
      const key = 'test:object';
      const value = { name: 'John', age: 30 };
      const serializedValue = JSON.stringify(value);
      
      mockRedisInstance.set.mockResolvedValue('OK');
      mockRedisInstance.get.mockResolvedValue(serializedValue);

      await cacheService.set(key, value);
      const result = await cacheService.get(key);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(key, serializedValue);
      expect(result).toEqual(value);
    });

    it('should set values with TTL', async () => {
      const key = 'test:ttl';
      const value = 'test value';
      const ttl = 3600;
      
      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.set(key, value, ttl);

      expect(mockRedisInstance.set).toHaveBeenCalledWith(key, value, 'EX', ttl);
    });

    it('should delete values', async () => {
      const key = 'test:delete';
      
      mockRedisInstance.del.mockResolvedValue(1);

      const result = await cacheService.del(key);

      expect(mockRedisInstance.del).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      
      mockRedisInstance.exists.mockResolvedValue(1);

      const result = await cacheService.exists(key);

      expect(mockRedisInstance.exists).toHaveBeenCalledWith(key);
      expect(result).toBe(true);
    });

    it('should get TTL for key', async () => {
      const key = 'test:ttl';
      const ttl = 3600;
      
      mockRedisInstance.ttl.mockResolvedValue(ttl);

      const result = await cacheService.getTTL(key);

      expect(mockRedisInstance.ttl).toHaveBeenCalledWith(key);
      expect(result).toBe(ttl);
    });

    it('should set expiration for existing key', async () => {
      const key = 'test:expire';
      const ttl = 1800;
      
      mockRedisInstance.expire.mockResolvedValue(1);

      const result = await cacheService.expire(key, ttl);

      expect(mockRedisInstance.expire).toHaveBeenCalledWith(key, ttl);
      expect(result).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should get multiple values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', null];
      
      mockRedisInstance.mget.mockResolvedValue(values);

      const result = await cacheService.mget(keys);

      expect(mockRedisInstance.mget).toHaveBeenCalledWith(keys);
      expect(result).toEqual({
        key1: 'value1',
        key2: 'value2',
        key3: null
      });
    });

    it('should set multiple values', async () => {
      const keyValuePairs = {
        'key1': 'value1',
        'key2': { data: 'object' },
        'key3': 123
      };
      
      mockRedisInstance.mset.mockResolvedValue('OK');

      await cacheService.mset(keyValuePairs);

      expect(mockRedisInstance.mset).toHaveBeenCalledWith([
        'key1', 'value1',
        'key2', JSON.stringify({ data: 'object' }),
        'key3', '123'
      ]);
    });

    it('should delete multiple keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await cacheService.mdel(keys);

      expect(mockRedisInstance.del).toHaveBeenCalledWith(...keys);
      expect(result).toBe(3);
    });
  });

  describe('Pattern Operations', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should find keys by pattern', async () => {
      const pattern = 'user:*';
      const keys = ['user:1', 'user:2', 'user:3'];
      
      mockRedisInstance.keys.mockResolvedValue(keys);

      const result = await cacheService.keys(pattern);

      expect(mockRedisInstance.keys).toHaveBeenCalledWith(pattern);
      expect(result).toEqual(keys);
    });

    it('should delete keys by pattern', async () => {
      const pattern = 'temp:*';
      const keys = ['temp:1', 'temp:2', 'temp:3'];
      
      mockRedisInstance.keys.mockResolvedValue(keys);
      mockRedisInstance.del.mockResolvedValue(3);

      const result = await cacheService.deleteByPattern(pattern);

      expect(mockRedisInstance.keys).toHaveBeenCalledWith(pattern);
      expect(mockRedisInstance.del).toHaveBeenCalledWith(...keys);
      expect(result).toBe(3);
    });

    it('should handle empty pattern results', async () => {
      const pattern = 'nonexistent:*';
      
      mockRedisInstance.keys.mockResolvedValue([]);

      const result = await cacheService.deleteByPattern(pattern);

      expect(result).toBe(0);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('Pipeline Operations', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should execute pipeline operations', async () => {
      const operations = [
        { command: 'set', args: ['key1', 'value1'] },
        { command: 'set', args: ['key2', 'value2'] },
        { command: 'get', args: ['key1'] }
      ];
      
      const mockPipeline = {
        set: vi.fn().mockReturnThis(),
        get: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 'OK'],
          [null, 'OK'],
          [null, 'value1']
        ])
      };
      
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      const result = await cacheService.pipeline(operations);

      expect(mockPipeline.set).toHaveBeenCalledWith('key1', 'value1');
      expect(mockPipeline.set).toHaveBeenCalledWith('key2', 'value2');
      expect(mockPipeline.get).toHaveBeenCalledWith('key1');
      expect(result).toEqual(['OK', 'OK', 'value1']);
    });

    it('should handle pipeline errors', async () => {
      const operations = [
        { command: 'set', args: ['key1', 'value1'] }
      ];
      
      const mockPipeline = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [new Error('Pipeline error'), null]
        ])
      };
      
      mockRedisInstance.pipeline.mockReturnValue(mockPipeline);

      await expect(cacheService.pipeline(operations)).rejects.toThrow('Pipeline error');
    });
  });

  describe('Transaction Operations', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should execute transaction operations', async () => {
      const operations = [
        { command: 'set', args: ['key1', 'value1'] },
        { command: 'incr', args: ['counter'] }
      ];
      
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        incr: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          [null, 'OK'],
          [null, 1]
        ])
      };
      
      mockRedisInstance.multi.mockReturnValue(mockMulti);

      const result = await cacheService.transaction(operations);

      expect(mockMulti.set).toHaveBeenCalledWith('key1', 'value1');
      expect(mockMulti.incr).toHaveBeenCalledWith('counter');
      expect(result).toEqual(['OK', 1]);
    });

    it('should handle transaction failures', async () => {
      const operations = [
        { command: 'set', args: ['key1', 'value1'] }
      ];
      
      const mockMulti = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null) // Transaction failed
      };
      
      mockRedisInstance.multi.mockReturnValue(mockMulti);

      await expect(cacheService.transaction(operations)).rejects.toThrow('Transaction failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle Redis connection errors', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Connection failed'));

      await expect(cacheService.get('test:key')).rejects.toThrow('Connection failed');
      expect(mockedLogger.error).toHaveBeenCalled();
    });

    it('should handle JSON parsing errors', async () => {
      const key = 'test:invalid-json';
      const invalidJson = '{ invalid json';
      
      mockRedisInstance.get.mockResolvedValue(invalidJson);

      const result = await cacheService.get(key);

      expect(result).toBe(invalidJson); // Should return raw string if JSON parsing fails
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse JSON')
      );
    });

    it('should handle serialization errors', async () => {
      const key = 'test:circular';
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj; // Create circular reference
      
      await expect(cacheService.set(key, circularObj)).rejects.toThrow();
    });

    it('should handle Redis unavailable gracefully', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Redis unavailable'));

      const isHealthy = await cacheService.isHealthy();
      expect(isHealthy).toBe(false);
    });
  });

  describe('Health Monitoring', () => {
    it('should check Redis health', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');

      const isHealthy = await cacheService.isHealthy();
      expect(isHealthy).toBe(true);
    });

    it('should return health status', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
      mockRedisInstance.status = 'ready';

      const status = await cacheService.getStatus();
      
      expect(status).toEqual({
        connected: true,
        status: 'ready',
        latency: expect.any(Number)
      });
    });

    it('should measure Redis latency', async () => {
      mockRedisInstance.ping.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('PONG'), 10);
        });
      });

      const status = await cacheService.getStatus();
      expect(status.latency).toBeGreaterThan(0);
    });
  });

  describe('Cache Statistics', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should track cache hits and misses', async () => {
      // Cache miss
      mockRedisInstance.get.mockResolvedValueOnce(null);
      await cacheService.get('miss:key');

      // Cache hit
      mockRedisInstance.get.mockResolvedValueOnce('value');
      await cacheService.get('hit:key');

      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track operation counts', async () => {
      mockRedisInstance.set.mockResolvedValue('OK');
      mockRedisInstance.get.mockResolvedValue('value');
      mockRedisInstance.del.mockResolvedValue(1);

      await cacheService.set('key1', 'value1');
      await cacheService.get('key1');
      await cacheService.del('key1');

      const stats = cacheService.getStats();
      expect(stats.operations.set).toBe(1);
      expect(stats.operations.get).toBe(1);
      expect(stats.operations.del).toBe(1);
    });

    it('should reset statistics', () => {
      cacheService.resetStats();
      
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.operations.set).toBe(0);
    });
  });

  describe('Memory Management', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should clear all cache data', async () => {
      mockRedisInstance.flushdb.mockResolvedValue('OK');

      await cacheService.clear();

      expect(mockRedisInstance.flushdb).toHaveBeenCalled();
    });

    it('should get memory usage information', async () => {
      const memoryInfo = {
        'used_memory': '1048576',
        'used_memory_human': '1.00M',
        'maxmemory': '2097152',
        'maxmemory_human': '2.00M'
      };
      
      mockRedisInstance.memory = vi.fn().mockResolvedValue(memoryInfo);

      const result = await cacheService.getMemoryUsage();

      expect(result).toEqual({
        used: 1048576,
        usedHuman: '1.00M',
        max: 2097152,
        maxHuman: '2.00M',
        percentage: 50
      });
    });
  });

  describe('Connection Management', () => {
    it('should connect to Redis', async () => {
      mockRedisInstance.connect = vi.fn().mockResolvedValue(undefined);

      await cacheService.connect();

      expect(mockRedisInstance.connect).toHaveBeenCalled();
    });

    it('should disconnect from Redis', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');

      await cacheService.disconnect();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should handle connection events', () => {
      const connectCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      const errorCallback = mockRedisInstance.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];

      expect(connectCallback).toBeDefined();
      expect(errorCallback).toBeDefined();

      // Simulate connection event
      connectCallback?.();
      expect(mockedLogger.info).toHaveBeenCalledWith('Redis connected');

      // Simulate error event
      const error = new Error('Connection error');
      errorCallback?.(error);
      expect(mockedLogger.error).toHaveBeenCalledWith('Redis error:', error);
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should use in-memory fallback when Redis is unavailable', async () => {
      const fallbackCacheService = new CacheService({ enableFallback: true });
      mockRedisInstance.get.mockRejectedValue(new Error('Redis unavailable'));

      // Should not throw error, use in-memory cache instead
      await fallbackCacheService.set('key1', 'value1');
      const result = await fallbackCacheService.get('key1');

      expect(result).toBe('value1');
    });

    it('should sync fallback cache with Redis when available', async () => {
      const fallbackCacheService = new CacheService({ enableFallback: true });
      
      // Set value in fallback cache
      mockRedisInstance.set.mockRejectedValue(new Error('Redis unavailable'));
      await fallbackCacheService.set('key1', 'value1');

      // Redis becomes available
      mockRedisInstance.set.mockResolvedValue('OK');
      mockRedisInstance.ping.mockResolvedValue('PONG');
      
      await fallbackCacheService.syncWithRedis();

      expect(mockRedisInstance.set).toHaveBeenCalledWith('key1', 'value1');
    });
  });

  describe('Performance Optimization', () => {
    beforeEach(() => {
      mockRedisInstance.ping.mockResolvedValue('PONG');
    });

    it('should compress large values', async () => {
      const largeValue = 'x'.repeat(10000);
      const compressedValue = 'compressed_data';
      
      // Mock compression
      const compressionSpy = vi.spyOn(cacheService as any, 'compress')
        .mockReturnValue(compressedValue);
      
      mockRedisInstance.set.mockResolvedValue('OK');

      await cacheService.set('large:key', largeValue);

      expect(compressionSpy).toHaveBeenCalledWith(largeValue);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'large:key',
        compressedValue
      );
    });

    it('should decompress retrieved values', async () => {
      const compressedValue = 'compressed_data';
      const originalValue = 'original_data';
      
      mockRedisInstance.get.mockResolvedValue(compressedValue);
      
      const decompressionSpy = vi.spyOn(cacheService as any, 'decompress')
        .mockReturnValue(originalValue);

      const result = await cacheService.get('compressed:key');

      expect(decompressionSpy).toHaveBeenCalledWith(compressedValue);
      expect(result).toBe(originalValue);
    });

    it('should use connection pooling for high concurrency', async () => {
      const pooledCacheService = new CacheService({ 
        enableConnectionPool: true,
        poolSize: 10
      });

      // Simulate concurrent operations
      const promises = Array.from({ length: 20 }, (_, i) => 
        pooledCacheService.set(`key${i}`, `value${i}`)
      );

      await Promise.all(promises);

      expect(mockRedisInstance.set).toHaveBeenCalledTimes(20);
    });
  });
});