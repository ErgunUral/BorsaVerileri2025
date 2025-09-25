import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import cacheService from '../cacheService.js';

// Mock Redis
const mockRedisClient = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  keys: vi.fn(),
  flushdb: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  isReady: true,
  status: 'ready'
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient)
}));

// Mock console for error logging
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisClient.isReady = true;
    mockRedisClient.status = 'ready';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Basic Operations', () => {
    describe('get', () => {
      it('should retrieve value from cache', async () => {
        const testValue = 'test-value';
        mockRedisClient.get.mockResolvedValueOnce(testValue);

        const result = await cacheService.get('test-key');

        expect(result).toBe(testValue);
        expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      });

      it('should return null for non-existent key', async () => {
        mockRedisClient.get.mockResolvedValueOnce(null);

        const result = await cacheService.get('non-existent-key');

        expect(result).toBeNull();
      });

      it('should handle Redis errors gracefully', async () => {
        const error = new Error('Redis connection failed');
        mockRedisClient.get.mockRejectedValueOnce(error);

        const result = await cacheService.get('test-key');

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith('Cache get error:', error);
      });

      it('should validate key parameter', async () => {
        await expect(cacheService.get()).rejects.toThrow('Key is required');
        await expect(cacheService.get('')).rejects.toThrow('Key cannot be empty');
        await expect(cacheService.get(null)).rejects.toThrow('Key is required');
      });

      it('should handle different data types', async () => {
        const testCases = [
          { input: 'string-value', expected: 'string-value' },
          { input: '123', expected: '123' },
          { input: 'true', expected: 'true' },
          { input: JSON.stringify({ key: 'value' }), expected: JSON.stringify({ key: 'value' }) }
        ];

        for (const testCase of testCases) {
          mockRedisClient.get.mockResolvedValueOnce(testCase.input);
          const result = await cacheService.get('test-key');
          expect(result).toBe(testCase.expected);
        }
      });
    });

    describe('set', () => {
      it('should store value in cache without expiration', async () => {
        mockRedisClient.set.mockResolvedValueOnce('OK');

        const result = await cacheService.set('test-key', 'test-value');

        expect(result).toBe(true);
        expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', 'test-value');
      });

      it('should store value in cache with expiration', async () => {
        mockRedisClient.setex.mockResolvedValueOnce('OK');

        const result = await cacheService.set('test-key', 'test-value', 3600);

        expect(result).toBe(true);
        expect(mockRedisClient.setex).toHaveBeenCalledWith('test-key', 3600, 'test-value');
      });

      it('should handle Redis errors gracefully', async () => {
        const error = new Error('Redis connection failed');
        mockRedisClient.set.mockRejectedValueOnce(error);

        const result = await cacheService.set('test-key', 'test-value');

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache set error:', error);
      });

      it('should validate parameters', async () => {
        await expect(cacheService.set()).rejects.toThrow('Key is required');
        await expect(cacheService.set('key')).rejects.toThrow('Value is required');
        await expect(cacheService.set('key', 'value', -1)).rejects.toThrow('TTL must be positive');
        await expect(cacheService.set('key', 'value', 'invalid')).rejects.toThrow('TTL must be a number');
      });

      it('should handle different value types', async () => {
        const testCases = [
          'string-value',
          123,
          true,
          { key: 'value' },
          ['array', 'value'],
          null
        ];

        mockRedisClient.set.mockResolvedValue('OK');
        mockRedisClient.setex.mockResolvedValue('OK');

        for (const value of testCases) {
          const result = await cacheService.set('test-key', value);
          expect(result).toBe(true);
        }
      });

      it('should convert objects to JSON strings', async () => {
        const testObject = { name: 'test', value: 123 };
        mockRedisClient.set.mockResolvedValueOnce('OK');

        await cacheService.set('test-key', testObject);

        expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testObject));
      });
    });

    describe('del', () => {
      it('should delete single key', async () => {
        mockRedisClient.del.mockResolvedValueOnce(1);

        const result = await cacheService.del('test-key');

        expect(result).toBe(true);
        expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      });

      it('should delete multiple keys', async () => {
        mockRedisClient.del.mockResolvedValueOnce(2);

        const result = await cacheService.del(['key1', 'key2']);

        expect(result).toBe(true);
        expect(mockRedisClient.del).toHaveBeenCalledWith(['key1', 'key2']);
      });

      it('should return false for non-existent key', async () => {
        mockRedisClient.del.mockResolvedValueOnce(0);

        const result = await cacheService.del('non-existent-key');

        expect(result).toBe(false);
      });

      it('should handle Redis errors gracefully', async () => {
        const error = new Error('Redis connection failed');
        mockRedisClient.del.mockRejectedValueOnce(error);

        const result = await cacheService.del('test-key');

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache delete error:', error);
      });

      it('should validate key parameter', async () => {
        await expect(cacheService.del()).rejects.toThrow('Key is required');
        await expect(cacheService.del('')).rejects.toThrow('Key cannot be empty');
        await expect(cacheService.del([])).rejects.toThrow('Keys array cannot be empty');
      });
    });
  });

  describe('Advanced Operations', () => {
    describe('exists', () => {
      it('should check if key exists', async () => {
        mockRedisClient.exists.mockResolvedValueOnce(1);

        const result = await cacheService.exists('test-key');

        expect(result).toBe(true);
        expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
      });

      it('should return false for non-existent key', async () => {
        mockRedisClient.exists.mockResolvedValueOnce(0);

        const result = await cacheService.exists('non-existent-key');

        expect(result).toBe(false);
      });

      it('should handle multiple keys', async () => {
        mockRedisClient.exists.mockResolvedValueOnce(2);

        const result = await cacheService.exists(['key1', 'key2']);

        expect(result).toBe(2);
        expect(mockRedisClient.exists).toHaveBeenCalledWith(['key1', 'key2']);
      });
    });

    describe('expire', () => {
      it('should set expiration for existing key', async () => {
        mockRedisClient.expire.mockResolvedValueOnce(1);

        const result = await cacheService.expire('test-key', 3600);

        expect(result).toBe(true);
        expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 3600);
      });

      it('should return false for non-existent key', async () => {
        mockRedisClient.expire.mockResolvedValueOnce(0);

        const result = await cacheService.expire('non-existent-key', 3600);

        expect(result).toBe(false);
      });

      it('should validate parameters', async () => {
        await expect(cacheService.expire()).rejects.toThrow('Key is required');
        await expect(cacheService.expire('key')).rejects.toThrow('TTL is required');
        await expect(cacheService.expire('key', -1)).rejects.toThrow('TTL must be positive');
      });
    });

    describe('ttl', () => {
      it('should get TTL for key with expiration', async () => {
        mockRedisClient.ttl.mockResolvedValueOnce(3600);

        const result = await cacheService.ttl('test-key');

        expect(result).toBe(3600);
        expect(mockRedisClient.ttl).toHaveBeenCalledWith('test-key');
      });

      it('should return -1 for key without expiration', async () => {
        mockRedisClient.ttl.mockResolvedValueOnce(-1);

        const result = await cacheService.ttl('test-key');

        expect(result).toBe(-1);
      });

      it('should return -2 for non-existent key', async () => {
        mockRedisClient.ttl.mockResolvedValueOnce(-2);

        const result = await cacheService.ttl('non-existent-key');

        expect(result).toBe(-2);
      });
    });

    describe('keys', () => {
      it('should find keys by pattern', async () => {
        const mockKeys = ['user:1', 'user:2', 'user:3'];
        mockRedisClient.keys.mockResolvedValueOnce(mockKeys);

        const result = await cacheService.keys('user:*');

        expect(result).toEqual(mockKeys);
        expect(mockRedisClient.keys).toHaveBeenCalledWith('user:*');
      });

      it('should return empty array for no matches', async () => {
        mockRedisClient.keys.mockResolvedValueOnce([]);

        const result = await cacheService.keys('nonexistent:*');

        expect(result).toEqual([]);
      });

      it('should validate pattern parameter', async () => {
        await expect(cacheService.keys()).rejects.toThrow('Pattern is required');
        await expect(cacheService.keys('')).rejects.toThrow('Pattern cannot be empty');
      });

      it('should warn about performance impact', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        mockRedisClient.keys.mockResolvedValueOnce([]);

        await cacheService.keys('*');

        expect(warnSpy).toHaveBeenCalledWith(
          'Warning: KEYS command can be slow on large datasets. Consider using SCAN instead.'
        );
        
        warnSpy.mockRestore();
      });
    });

    describe('flushAll', () => {
      it('should clear all cache data', async () => {
        mockRedisClient.flushdb.mockResolvedValueOnce('OK');

        const result = await cacheService.flushAll();

        expect(result).toBe(true);
        expect(mockRedisClient.flushdb).toHaveBeenCalled();
      });

      it('should handle Redis errors gracefully', async () => {
        const error = new Error('Redis connection failed');
        mockRedisClient.flushdb.mockRejectedValueOnce(error);

        const result = await cacheService.flushAll();

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache flush error:', error);
      });
    });
  });

  describe('JSON Operations', () => {
    describe('getJSON', () => {
      it('should parse JSON value from cache', async () => {
        const testObject = { name: 'test', value: 123 };
        mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testObject));

        const result = await cacheService.getJSON('test-key');

        expect(result).toEqual(testObject);
      });

      it('should return null for invalid JSON', async () => {
        mockRedisClient.get.mockResolvedValueOnce('invalid-json');

        const result = await cacheService.getJSON('test-key');

        expect(result).toBeNull();
        expect(consoleSpy).toHaveBeenCalledWith(
          'JSON parse error for key test-key:',
          expect.any(Error)
        );
      });

      it('should return null for non-existent key', async () => {
        mockRedisClient.get.mockResolvedValueOnce(null);

        const result = await cacheService.getJSON('non-existent-key');

        expect(result).toBeNull();
      });
    });

    describe('setJSON', () => {
      it('should store object as JSON string', async () => {
        const testObject = { name: 'test', value: 123 };
        mockRedisClient.set.mockResolvedValueOnce('OK');

        const result = await cacheService.setJSON('test-key', testObject);

        expect(result).toBe(true);
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'test-key',
          JSON.stringify(testObject)
        );
      });

      it('should store object as JSON string with expiration', async () => {
        const testObject = { name: 'test', value: 123 };
        mockRedisClient.setex.mockResolvedValueOnce('OK');

        const result = await cacheService.setJSON('test-key', testObject, 3600);

        expect(result).toBe(true);
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          'test-key',
          3600,
          JSON.stringify(testObject)
        );
      });

      it('should handle JSON serialization errors', async () => {
        const circularObject = {};
        circularObject.self = circularObject;

        const result = await cacheService.setJSON('test-key', circularObject);

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
          'JSON stringify error for key test-key:',
          expect.any(Error)
        );
      });
    });
  });

  describe('Batch Operations', () => {
    describe('mget', () => {
      it('should get multiple values', async () => {
        const mockValues = ['value1', 'value2', 'value3'];
        mockRedisClient.mget = vi.fn().mockResolvedValueOnce(mockValues);

        const result = await cacheService.mget(['key1', 'key2', 'key3']);

        expect(result).toEqual({
          key1: 'value1',
          key2: 'value2',
          key3: 'value3'
        });
        expect(mockRedisClient.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      });

      it('should handle null values in response', async () => {
        const mockValues = ['value1', null, 'value3'];
        mockRedisClient.mget = vi.fn().mockResolvedValueOnce(mockValues);

        const result = await cacheService.mget(['key1', 'key2', 'key3']);

        expect(result).toEqual({
          key1: 'value1',
          key2: null,
          key3: 'value3'
        });
      });

      it('should validate keys parameter', async () => {
        await expect(cacheService.mget()).rejects.toThrow('Keys array is required');
        await expect(cacheService.mget([])).rejects.toThrow('Keys array cannot be empty');
        await expect(cacheService.mget('not-array')).rejects.toThrow('Keys must be an array');
      });
    });

    describe('mset', () => {
      it('should set multiple key-value pairs', async () => {
        mockRedisClient.mset = vi.fn().mockResolvedValueOnce('OK');

        const keyValuePairs = {
          key1: 'value1',
          key2: 'value2',
          key3: 'value3'
        };

        const result = await cacheService.mset(keyValuePairs);

        expect(result).toBe(true);
        expect(mockRedisClient.mset).toHaveBeenCalledWith([
          'key1', 'value1',
          'key2', 'value2',
          'key3', 'value3'
        ]);
      });

      it('should validate keyValuePairs parameter', async () => {
        await expect(cacheService.mset()).rejects.toThrow('Key-value pairs object is required');
        await expect(cacheService.mset({})).rejects.toThrow('Key-value pairs object cannot be empty');
        await expect(cacheService.mset('not-object')).rejects.toThrow('Key-value pairs must be an object');
      });
    });
  });

  describe('Connection Management', () => {
    describe('isConnected', () => {
      it('should return true when Redis is connected', () => {
        mockRedisClient.isReady = true;
        mockRedisClient.status = 'ready';

        const result = cacheService.isConnected();

        expect(result).toBe(true);
      });

      it('should return false when Redis is not connected', () => {
        mockRedisClient.isReady = false;
        mockRedisClient.status = 'connecting';

        const result = cacheService.isConnected();

        expect(result).toBe(false);
      });
    });

    describe('ping', () => {
      it('should ping Redis successfully', async () => {
        mockRedisClient.ping.mockResolvedValueOnce('PONG');

        const result = await cacheService.ping();

        expect(result).toBe(true);
        expect(mockRedisClient.ping).toHaveBeenCalled();
      });

      it('should handle ping errors', async () => {
        const error = new Error('Redis connection failed');
        mockRedisClient.ping.mockRejectedValueOnce(error);

        const result = await cacheService.ping();

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Cache ping error:', error);
      });
    });

    describe('disconnect', () => {
      it('should disconnect from Redis', async () => {
        mockRedisClient.quit.mockResolvedValueOnce('OK');

        await cacheService.disconnect();

        expect(mockRedisClient.quit).toHaveBeenCalled();
      });

      it('should handle disconnect errors', async () => {
        const error = new Error('Disconnect failed');
        mockRedisClient.quit.mockRejectedValueOnce(error);

        await cacheService.disconnect();

        expect(consoleSpy).toHaveBeenCalledWith('Cache disconnect error:', error);
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Redis client not ready', async () => {
      mockRedisClient.isReady = false;

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache get error:',
        expect.objectContaining({ message: 'Redis client not ready' })
      );
    });

    it('should handle connection timeouts', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      mockRedisClient.get.mockRejectedValueOnce(timeoutError);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Cache get error:', timeoutError);
    });

    it('should handle Redis server errors', async () => {
      const serverError = new Error('READONLY You can\'t write against a read only replica');
      mockRedisClient.set.mockRejectedValueOnce(serverError);

      const result = await cacheService.set('test-key', 'test-value');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Cache set error:', serverError);
    });

    it('should handle memory pressure errors', async () => {
      const memoryError = new Error('OOM command not allowed when used memory > \'maxmemory\'');
      mockRedisClient.set.mockRejectedValueOnce(memoryError);

      const result = await cacheService.set('test-key', 'test-value');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Cache set error:', memoryError);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('ECONNREFUSED');
      networkError.code = 'ECONNREFUSED';
      mockRedisClient.get.mockRejectedValueOnce(networkError);

      const result = await cacheService.get('test-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Cache get error:', networkError);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large values efficiently', async () => {
      const largeValue = 'x'.repeat(1024 * 1024); // 1MB string
      mockRedisClient.set.mockResolvedValueOnce('OK');
      mockRedisClient.get.mockResolvedValueOnce(largeValue);

      await cacheService.set('large-key', largeValue);
      const result = await cacheService.get('large-key');

      expect(result).toBe(largeValue);
    });

    it('should handle concurrent operations', async () => {
      mockRedisClient.get.mockResolvedValue('test-value');
      mockRedisClient.set.mockResolvedValue('OK');

      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(cacheService.get(`key-${i}`));
        operations.push(cacheService.set(`key-${i}`, `value-${i}`));
      }

      const results = await Promise.all(operations);

      expect(results).toHaveLength(200);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(100);
      expect(mockRedisClient.set).toHaveBeenCalledTimes(100);
    });

    it('should implement proper key namespacing', async () => {
      const namespacedCache = cacheService.namespace('test');
      mockRedisClient.get.mockResolvedValueOnce('test-value');

      await namespacedCache.get('key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hit/miss statistics', async () => {
      mockRedisClient.get
        .mockResolvedValueOnce('hit-value')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('another-hit');

      await cacheService.get('hit-key');
      await cacheService.get('miss-key');
      await cacheService.get('another-hit-key');

      const stats = cacheService.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2);
    });

    it('should reset statistics', () => {
      cacheService.resetStats();
      const stats = cacheService.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with predefined data', async () => {
      const warmupData = {
        'key1': 'value1',
        'key2': { complex: 'object' },
        'key3': ['array', 'data']
      };

      mockRedisClient.mset = vi.fn().mockResolvedValueOnce('OK');

      const result = await cacheService.warmup(warmupData);

      expect(result).toBe(true);
      expect(mockRedisClient.mset).toHaveBeenCalledWith([
        'key1', 'value1',
        'key2', JSON.stringify({ complex: 'object' }),
        'key3', JSON.stringify(['array', 'data'])
      ]);
    });
  });
});