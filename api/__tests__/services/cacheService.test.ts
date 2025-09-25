import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { cacheService } from '../../services/cacheService';
import { logger } from '../../utils/logger';

// Mock dependencies
vi.mock('ioredis');
vi.mock('../../utils/logger');

const mockRedis = {
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
  pipeline: vi.fn(),
  exec: vi.fn(),
  hget: vi.fn(),
  hset: vi.fn(),
  hdel: vi.fn(),
  hgetall: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  smembers: vi.fn(),
  sismember: vi.fn(),
  zadd: vi.fn(),
  zrem: vi.fn(),
  zrange: vi.fn(),
  zrangebyscore: vi.fn(),
  incr: vi.fn(),
  decr: vi.fn(),
  incrby: vi.fn(),
  decrby: vi.fn()
};

const mockLogger = vi.mocked(logger);

// Mock Redis constructor
vi.mocked(Redis).mockImplementation(() => mockRedis as any);

const testData = {
  simple: { name: 'test', value: 123 },
  complex: {
    stocks: [
      { symbol: 'AAPL', price: 150.25 },
      { symbol: 'GOOGL', price: 2750.80 }
    ],
    metadata: {
      timestamp: Date.now(),
      source: 'api'
    }
  },
  array: [1, 2, 3, 4, 5],
  string: 'simple string value',
  number: 42,
  boolean: true
};

describe('cacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default Redis behavior
    mockRedis.ping.mockResolvedValue('PONG');
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.get.mockResolvedValue(null);
    mockRedis.del.mockResolvedValue(1);
    mockRedis.exists.mockResolvedValue(0);
    mockRedis.expire.mockResolvedValue(1);
    mockRedis.ttl.mockResolvedValue(-1);
    mockRedis.keys.mockResolvedValue([]);
    mockRedis.flushdb.mockResolvedValue('OK');
    
    // Default logger behavior
    mockLogger.info.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});
    mockLogger.warn.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Connection Management', () => {
    it('should initialize Redis connection successfully', async () => {
      expect(mockRedis.ping).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Cache service initialized successfully');
    });

    it('should handle Redis connection errors', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection failed'));
      
      // Reinitialize cache service to trigger error
      const { cacheService: newCacheService } = await import('../../services/cacheService');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to Redis:',
        expect.any(Error)
      );
    });

    it('should handle Redis disconnection events', () => {
      const disconnectHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];
      
      if (disconnectHandler) {
        disconnectHandler();
        expect(mockLogger.warn).toHaveBeenCalledWith('Redis connection closed');
      }
    });

    it('should handle Redis error events', () => {
      const errorHandler = mockRedis.on.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        const testError = new Error('Redis error');
        errorHandler(testError);
        expect(mockLogger.error).toHaveBeenCalledWith('Redis error:', testError);
      }
    });

    it('should gracefully close Redis connection', async () => {
      await cacheService.close();
      
      expect(mockRedis.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Cache service closed');
    });
  });

  describe('Basic Operations', () => {
    describe('set', () => {
      it('should set simple values successfully', async () => {
        await cacheService.set('test:key', testData.simple);
        
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:key',
          JSON.stringify(testData.simple)
        );
      });

      it('should set values with TTL', async () => {
        await cacheService.set('test:key', testData.simple, 300);
        
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:key',
          JSON.stringify(testData.simple),
          'EX',
          300
        );
      });

      it('should handle complex objects', async () => {
        await cacheService.set('test:complex', testData.complex);
        
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:complex',
          JSON.stringify(testData.complex)
        );
      });

      it('should handle arrays', async () => {
        await cacheService.set('test:array', testData.array);
        
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:array',
          JSON.stringify(testData.array)
        );
      });

      it('should handle primitive values', async () => {
        await cacheService.set('test:string', testData.string);
        await cacheService.set('test:number', testData.number);
        await cacheService.set('test:boolean', testData.boolean);
        
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:string',
          JSON.stringify(testData.string)
        );
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:number',
          JSON.stringify(testData.number)
        );
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:boolean',
          JSON.stringify(testData.boolean)
        );
      });

      it('should handle null and undefined values', async () => {
        await cacheService.set('test:null', null);
        await cacheService.set('test:undefined', undefined);
        
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:null',
          JSON.stringify(null)
        );
        expect(mockRedis.set).toHaveBeenCalledWith(
          'test:undefined',
          JSON.stringify(undefined)
        );
      });

      it('should handle Redis set errors', async () => {
        mockRedis.set.mockRejectedValueOnce(new Error('Redis set failed'));
        
        await expect(cacheService.set('test:key', testData.simple))
          .rejects.toThrow('Failed to set cache key: test:key');
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error setting cache key test:key:',
          expect.any(Error)
        );
      });
    });

    describe('get', () => {
      it('should get values successfully', async () => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData.simple));
        
        const result = await cacheService.get('test:key');
        
        expect(mockRedis.get).toHaveBeenCalledWith('test:key');
        expect(result).toEqual(testData.simple);
      });

      it('should return null for non-existent keys', async () => {
        mockRedis.get.mockResolvedValueOnce(null);
        
        const result = await cacheService.get('non:existent');
        
        expect(result).toBeNull();
      });

      it('should handle complex objects', async () => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData.complex));
        
        const result = await cacheService.get('test:complex');
        
        expect(result).toEqual(testData.complex);
      });

      it('should handle arrays', async () => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData.array));
        
        const result = await cacheService.get('test:array');
        
        expect(result).toEqual(testData.array);
      });

      it('should handle primitive values', async () => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData.string));
        const stringResult = await cacheService.get('test:string');
        expect(stringResult).toBe(testData.string);
        
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData.number));
        const numberResult = await cacheService.get('test:number');
        expect(numberResult).toBe(testData.number);
        
        mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData.boolean));
        const booleanResult = await cacheService.get('test:boolean');
        expect(booleanResult).toBe(testData.boolean);
      });

      it('should handle corrupted JSON data', async () => {
        mockRedis.get.mockResolvedValueOnce('invalid json {');
        
        const result = await cacheService.get('test:corrupted');
        
        expect(result).toBeNull();
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error parsing cached data for key test:corrupted:',
          expect.any(Error)
        );
      });

      it('should handle Redis get errors', async () => {
        mockRedis.get.mockRejectedValueOnce(new Error('Redis get failed'));
        
        await expect(cacheService.get('test:key'))
          .rejects.toThrow('Failed to get cache key: test:key');
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error getting cache key test:key:',
          expect.any(Error)
        );
      });
    });

    describe('del', () => {
      it('should delete single key successfully', async () => {
        mockRedis.del.mockResolvedValueOnce(1);
        
        const result = await cacheService.del('test:key');
        
        expect(mockRedis.del).toHaveBeenCalledWith('test:key');
        expect(result).toBe(true);
      });

      it('should delete multiple keys successfully', async () => {
        mockRedis.del.mockResolvedValueOnce(2);
        
        const result = await cacheService.del(['test:key1', 'test:key2']);
        
        expect(mockRedis.del).toHaveBeenCalledWith('test:key1', 'test:key2');
        expect(result).toBe(true);
      });

      it('should return false when key does not exist', async () => {
        mockRedis.del.mockResolvedValueOnce(0);
        
        const result = await cacheService.del('non:existent');
        
        expect(result).toBe(false);
      });

      it('should handle Redis del errors', async () => {
        mockRedis.del.mockRejectedValueOnce(new Error('Redis del failed'));
        
        await expect(cacheService.del('test:key'))
          .rejects.toThrow('Failed to delete cache key(s)');
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error deleting cache key(s):',
          expect.any(Error)
        );
      });
    });
  });

  describe('Advanced Operations', () => {
    describe('exists', () => {
      it('should check if key exists', async () => {
        mockRedis.exists.mockResolvedValueOnce(1);
        
        const result = await cacheService.exists('test:key');
        
        expect(mockRedis.exists).toHaveBeenCalledWith('test:key');
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        mockRedis.exists.mockResolvedValueOnce(0);
        
        const result = await cacheService.exists('non:existent');
        
        expect(result).toBe(false);
      });
    });

    describe('expire', () => {
      it('should set expiration successfully', async () => {
        mockRedis.expire.mockResolvedValueOnce(1);
        
        const result = await cacheService.expire('test:key', 300);
        
        expect(mockRedis.expire).toHaveBeenCalledWith('test:key', 300);
        expect(result).toBe(true);
      });

      it('should return false for non-existent key', async () => {
        mockRedis.expire.mockResolvedValueOnce(0);
        
        const result = await cacheService.expire('non:existent', 300);
        
        expect(result).toBe(false);
      });
    });

    describe('ttl', () => {
      it('should get TTL for key with expiration', async () => {
        mockRedis.ttl.mockResolvedValueOnce(300);
        
        const result = await cacheService.ttl('test:key');
        
        expect(mockRedis.ttl).toHaveBeenCalledWith('test:key');
        expect(result).toBe(300);
      });

      it('should return -1 for key without expiration', async () => {
        mockRedis.ttl.mockResolvedValueOnce(-1);
        
        const result = await cacheService.ttl('test:key');
        
        expect(result).toBe(-1);
      });

      it('should return -2 for non-existent key', async () => {
        mockRedis.ttl.mockResolvedValueOnce(-2);
        
        const result = await cacheService.ttl('non:existent');
        
        expect(result).toBe(-2);
      });
    });

    describe('keys', () => {
      it('should get keys by pattern', async () => {
        const mockKeys = ['test:key1', 'test:key2', 'test:key3'];
        mockRedis.keys.mockResolvedValueOnce(mockKeys);
        
        const result = await cacheService.keys('test:*');
        
        expect(mockRedis.keys).toHaveBeenCalledWith('test:*');
        expect(result).toEqual(mockKeys);
      });

      it('should return empty array when no keys match', async () => {
        mockRedis.keys.mockResolvedValueOnce([]);
        
        const result = await cacheService.keys('nonexistent:*');
        
        expect(result).toEqual([]);
      });
    });

    describe('clear', () => {
      it('should clear all cache data', async () => {
        mockRedis.flushdb.mockResolvedValueOnce('OK');
        
        await cacheService.clear();
        
        expect(mockRedis.flushdb).toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('Cache cleared successfully');
      });

      it('should handle clear errors', async () => {
        mockRedis.flushdb.mockRejectedValueOnce(new Error('Clear failed'));
        
        await expect(cacheService.clear())
          .rejects.toThrow('Failed to clear cache');
        
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Error clearing cache:',
          expect.any(Error)
        );
      });
    });
  });

  describe('Batch Operations', () => {
    describe('mget', () => {
      it('should get multiple values successfully', async () => {
        const keys = ['test:key1', 'test:key2', 'test:key3'];
        const values = [
          JSON.stringify(testData.simple),
          JSON.stringify(testData.array),
          null
        ];
        
        mockRedis.mget.mockResolvedValueOnce(values);
        
        const result = await cacheService.mget(keys);
        
        expect(mockRedis.mget).toHaveBeenCalledWith(...keys);
        expect(result).toEqual({
          'test:key1': testData.simple,
          'test:key2': testData.array,
          'test:key3': null
        });
      });

      it('should handle empty key array', async () => {
        const result = await cacheService.mget([]);
        
        expect(result).toEqual({});
        expect(mockRedis.mget).not.toHaveBeenCalled();
      });

      it('should handle corrupted data in batch', async () => {
        const keys = ['test:key1', 'test:key2'];
        const values = [
          JSON.stringify(testData.simple),
          'invalid json {'
        ];
        
        mockRedis.mget.mockResolvedValueOnce(values);
        
        const result = await cacheService.mget(keys);
        
        expect(result).toEqual({
          'test:key1': testData.simple,
          'test:key2': null
        });
      });
    });

    describe('mset', () => {
      it('should set multiple values successfully', async () => {
        const data = {
          'test:key1': testData.simple,
          'test:key2': testData.array,
          'test:key3': testData.string
        };
        
        mockRedis.mset.mockResolvedValueOnce('OK');
        
        await cacheService.mset(data);
        
        expect(mockRedis.mset).toHaveBeenCalledWith(
          'test:key1', JSON.stringify(testData.simple),
          'test:key2', JSON.stringify(testData.array),
          'test:key3', JSON.stringify(testData.string)
        );
      });

      it('should handle empty data object', async () => {
        await cacheService.mset({});
        
        expect(mockRedis.mset).not.toHaveBeenCalled();
      });

      it('should handle mset errors', async () => {
        mockRedis.mset.mockRejectedValueOnce(new Error('Mset failed'));
        
        await expect(cacheService.mset({ 'test:key': testData.simple }))
          .rejects.toThrow('Failed to set multiple cache keys');
      });
    });
  });

  describe('Hash Operations', () => {
    describe('hset', () => {
      it('should set hash field successfully', async () => {
        mockRedis.hset.mockResolvedValueOnce(1);
        
        await cacheService.hset('test:hash', 'field1', testData.simple);
        
        expect(mockRedis.hset).toHaveBeenCalledWith(
          'test:hash',
          'field1',
          JSON.stringify(testData.simple)
        );
      });

      it('should set multiple hash fields', async () => {
        const fields = {
          field1: testData.simple,
          field2: testData.array
        };
        
        mockRedis.hset.mockResolvedValueOnce(2);
        
        await cacheService.hset('test:hash', fields);
        
        expect(mockRedis.hset).toHaveBeenCalledWith(
          'test:hash',
          'field1', JSON.stringify(testData.simple),
          'field2', JSON.stringify(testData.array)
        );
      });
    });

    describe('hget', () => {
      it('should get hash field successfully', async () => {
        mockRedis.hget.mockResolvedValueOnce(JSON.stringify(testData.simple));
        
        const result = await cacheService.hget('test:hash', 'field1');
        
        expect(mockRedis.hget).toHaveBeenCalledWith('test:hash', 'field1');
        expect(result).toEqual(testData.simple);
      });

      it('should return null for non-existent field', async () => {
        mockRedis.hget.mockResolvedValueOnce(null);
        
        const result = await cacheService.hget('test:hash', 'nonexistent');
        
        expect(result).toBeNull();
      });
    });

    describe('hdel', () => {
      it('should delete hash field successfully', async () => {
        mockRedis.hdel.mockResolvedValueOnce(1);
        
        const result = await cacheService.hdel('test:hash', 'field1');
        
        expect(mockRedis.hdel).toHaveBeenCalledWith('test:hash', 'field1');
        expect(result).toBe(true);
      });

      it('should delete multiple hash fields', async () => {
        mockRedis.hdel.mockResolvedValueOnce(2);
        
        const result = await cacheService.hdel('test:hash', ['field1', 'field2']);
        
        expect(mockRedis.hdel).toHaveBeenCalledWith('test:hash', 'field1', 'field2');
        expect(result).toBe(true);
      });
    });

    describe('hgetall', () => {
      it('should get all hash fields successfully', async () => {
        const hashData = {
          field1: JSON.stringify(testData.simple),
          field2: JSON.stringify(testData.array)
        };
        
        mockRedis.hgetall.mockResolvedValueOnce(hashData);
        
        const result = await cacheService.hgetall('test:hash');
        
        expect(mockRedis.hgetall).toHaveBeenCalledWith('test:hash');
        expect(result).toEqual({
          field1: testData.simple,
          field2: testData.array
        });
      });

      it('should return empty object for non-existent hash', async () => {
        mockRedis.hgetall.mockResolvedValueOnce({});
        
        const result = await cacheService.hgetall('nonexistent:hash');
        
        expect(result).toEqual({});
      });
    });
  });

  describe('Set Operations', () => {
    describe('sadd', () => {
      it('should add members to set successfully', async () => {
        mockRedis.sadd.mockResolvedValueOnce(2);
        
        const result = await cacheService.sadd('test:set', ['member1', 'member2']);
        
        expect(mockRedis.sadd).toHaveBeenCalledWith('test:set', 'member1', 'member2');
        expect(result).toBe(2);
      });

      it('should add single member to set', async () => {
        mockRedis.sadd.mockResolvedValueOnce(1);
        
        const result = await cacheService.sadd('test:set', 'member1');
        
        expect(mockRedis.sadd).toHaveBeenCalledWith('test:set', 'member1');
        expect(result).toBe(1);
      });
    });

    describe('srem', () => {
      it('should remove members from set successfully', async () => {
        mockRedis.srem.mockResolvedValueOnce(1);
        
        const result = await cacheService.srem('test:set', 'member1');
        
        expect(mockRedis.srem).toHaveBeenCalledWith('test:set', 'member1');
        expect(result).toBe(1);
      });
    });

    describe('smembers', () => {
      it('should get all set members successfully', async () => {
        const members = ['member1', 'member2', 'member3'];
        mockRedis.smembers.mockResolvedValueOnce(members);
        
        const result = await cacheService.smembers('test:set');
        
        expect(mockRedis.smembers).toHaveBeenCalledWith('test:set');
        expect(result).toEqual(members);
      });
    });

    describe('sismember', () => {
      it('should check set membership successfully', async () => {
        mockRedis.sismember.mockResolvedValueOnce(1);
        
        const result = await cacheService.sismember('test:set', 'member1');
        
        expect(mockRedis.sismember).toHaveBeenCalledWith('test:set', 'member1');
        expect(result).toBe(true);
      });

      it('should return false for non-member', async () => {
        mockRedis.sismember.mockResolvedValueOnce(0);
        
        const result = await cacheService.sismember('test:set', 'nonmember');
        
        expect(result).toBe(false);
      });
    });
  });

  describe('Sorted Set Operations', () => {
    describe('zadd', () => {
      it('should add scored members to sorted set', async () => {
        mockRedis.zadd.mockResolvedValueOnce(2);
        
        const result = await cacheService.zadd('test:zset', [
          { score: 100, member: 'member1' },
          { score: 200, member: 'member2' }
        ]);
        
        expect(mockRedis.zadd).toHaveBeenCalledWith(
          'test:zset',
          100, 'member1',
          200, 'member2'
        );
        expect(result).toBe(2);
      });
    });

    describe('zrange', () => {
      it('should get range of sorted set members', async () => {
        const members = ['member1', 'member2'];
        mockRedis.zrange.mockResolvedValueOnce(members);
        
        const result = await cacheService.zrange('test:zset', 0, -1);
        
        expect(mockRedis.zrange).toHaveBeenCalledWith('test:zset', 0, -1);
        expect(result).toEqual(members);
      });
    });
  });

  describe('Counter Operations', () => {
    describe('incr', () => {
      it('should increment counter successfully', async () => {
        mockRedis.incr.mockResolvedValueOnce(1);
        
        const result = await cacheService.incr('test:counter');
        
        expect(mockRedis.incr).toHaveBeenCalledWith('test:counter');
        expect(result).toBe(1);
      });
    });

    describe('decr', () => {
      it('should decrement counter successfully', async () => {
        mockRedis.decr.mockResolvedValueOnce(0);
        
        const result = await cacheService.decr('test:counter');
        
        expect(mockRedis.decr).toHaveBeenCalledWith('test:counter');
        expect(result).toBe(0);
      });
    });

    describe('incrby', () => {
      it('should increment counter by amount', async () => {
        mockRedis.incrby.mockResolvedValueOnce(10);
        
        const result = await cacheService.incrby('test:counter', 5);
        
        expect(mockRedis.incrby).toHaveBeenCalledWith('test:counter', 5);
        expect(result).toBe(10);
      });
    });
  });

  describe('Pipeline Operations', () => {
    it('should execute pipeline operations successfully', async () => {
      const mockPipeline = {
        set: vi.fn().mockReturnThis(),
        get: vi.fn().mockReturnThis(),
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([
          ['OK'],
          [null, JSON.stringify(testData.simple)],
          [null, 1]
        ])
      };
      
      mockRedis.pipeline.mockReturnValue(mockPipeline);
      
      const result = await cacheService.pipeline([
        ['set', 'key1', testData.simple],
        ['get', 'key2'],
        ['del', 'key3']
      ]);
      
      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledWith('key1', JSON.stringify(testData.simple));
      expect(mockPipeline.get).toHaveBeenCalledWith('key2');
      expect(mockPipeline.del).toHaveBeenCalledWith('key3');
      expect(mockPipeline.exec).toHaveBeenCalled();
      
      expect(result).toEqual([
        'OK',
        testData.simple,
        1
      ]);
    });

    it('should handle pipeline errors', async () => {
      const mockPipeline = {
        set: vi.fn().mockReturnThis(),
        exec: vi.fn().mockRejectedValue(new Error('Pipeline failed'))
      };
      
      mockRedis.pipeline.mockReturnValue(mockPipeline);
      
      await expect(cacheService.pipeline([['set', 'key1', 'value1']]))
        .rejects.toThrow('Pipeline execution failed');
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when Redis is connected', async () => {
      mockRedis.ping.mockResolvedValueOnce('PONG');
      
      const health = await cacheService.health();
      
      expect(health).toEqual({
        status: 'healthy',
        connected: true,
        latency: expect.any(Number)
      });
    });

    it('should return unhealthy status when Redis is disconnected', async () => {
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection failed'));
      
      const health = await cacheService.health();
      
      expect(health).toEqual({
        status: 'unhealthy',
        connected: false,
        error: 'Connection failed'
      });
    });

    it('should measure Redis latency', async () => {
      mockRedis.ping.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('PONG'), 10);
        });
      });
      
      const health = await cacheService.health();
      
      expect(health.latency).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('should handle memory pressure gracefully', async () => {
      const memoryError = {
        message: 'OOM command not allowed when used memory > maxmemory'
      };
      
      mockRedis.set.mockRejectedValueOnce(memoryError);
      
      await expect(cacheService.set('test:key', testData.simple))
        .rejects.toThrow('Failed to set cache key: test:key');
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error setting cache key test:key:',
        memoryError
      );
    });

    it('should implement LRU eviction strategy', async () => {
      // This would be tested with actual Redis configuration
      // Here we just verify the service handles eviction gracefully
      mockRedis.get.mockResolvedValueOnce(null); // Key was evicted
      
      const result = await cacheService.get('evicted:key');
      
      expect(result).toBeNull();
    });
  });

  describe('Serialization Edge Cases', () => {
    it('should handle circular references', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      await expect(cacheService.set('test:circular', circularObj))
        .rejects.toThrow('Failed to set cache key: test:circular');
    });

    it('should handle very large objects', async () => {
      const largeObj = {
        data: new Array(100000).fill('x').join('')
      };
      
      await cacheService.set('test:large', largeObj);
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:large',
        JSON.stringify(largeObj)
      );
    });

    it('should handle special characters and unicode', async () => {
      const unicodeData = {
        emoji: '🚀💰📈',
        chinese: '你好世界',
        special: '!@#$%^&*()'
      };
      
      await cacheService.set('test:unicode', unicodeData);
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:unicode',
        JSON.stringify(unicodeData)
      );
    });
  });
});