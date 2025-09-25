import request from 'supertest';
import express from 'express';
import { cache, createCacheMiddleware, stockDataCache, analysisCache, priceCache, invalidateCache, getCacheStats } from '../cache';

const app = express();
app.use(express.json());

// Test routes
app.get('/test-cache', createCacheMiddleware(60), (_req, res) => {
  res.json({ message: 'test response', timestamp: Date.now() });
});

app.get('/test-stock', stockDataCache, (_req, res) => {
  res.json({ symbol: 'AAPL', price: 150.00 });
});

app.get('/test-analysis', analysisCache, (_req, res) => {
  res.json({ analysis: 'bullish', confidence: 0.85 });
});

app.get('/test-price', priceCache, (_req, res) => {
  res.json({ price: 150.00, change: 2.5 });
});

app.post('/test-post', createCacheMiddleware(60), (_req, res) => {
  res.json({ message: 'post response' });
});

app.get('/test-error', createCacheMiddleware(60), (_req, res) => {
  res.status(500).json({ error: 'server error' });
});

app.delete('/invalidate', invalidateCache(), (_req, res) => {
  res.json({ message: 'cache cleared' });
});

app.delete('/invalidate/:pattern', (req, res, next) => {
  invalidateCache(req.params.pattern)(req, res, next);
}, (_req, res) => {
  res.json({ message: 'cache invalidated' });
});

app.get('/cache-stats', getCacheStats);

describe('Cache Middleware', () => {
  beforeEach(() => {
    cache.clear();
  });

  afterAll(() => {
    cache.destroy();
  });

  describe('MemoryCache Class', () => {
    it('should set and get cache entries', () => {
      cache.set('test-key', { data: 'test' }, 60);
      const result = cache.get('test-key');
      
      expect(result).toEqual({ data: 'test' });
    });

    it('should return null for non-existent keys', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire entries after TTL', (done) => {
      cache.set('expire-test', { data: 'test' }, 0.1); // 100ms TTL
      
      setTimeout(() => {
        const result = cache.get('expire-test');
        expect(result).toBeNull();
        done();
      }, 150);
    });

    it('should delete cache entries', () => {
      cache.set('delete-test', { data: 'test' }, 60);
      const deleted = cache.delete('delete-test');
      
      expect(deleted).toBe(true);
      expect(cache.get('delete-test')).toBeNull();
    });

    it('should clear all cache entries', () => {
      cache.set('key1', { data: 'test1' }, 60);
      cache.set('key2', { data: 'test2' }, 60);
      
      cache.clear();
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should return cache statistics', () => {
      cache.set('stats-test', { data: 'test' }, 60);
      cache.get('stats-test'); // Hit
      cache.get('non-existent'); // Miss
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('stats-test');
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });

    it('should return all cache keys', () => {
      cache.set('key1', { data: 'test1' }, 60);
      cache.set('key2', { data: 'test2' }, 60);
      
      const keys = cache.getAllKeys();
      
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('Cache Middleware', () => {
    it('should cache GET requests', async () => {
      // First request - should be cached
      const response1 = await request(app)
        .get('/test-cache')
        .expect(200);
      
      expect(response1.headers['x-cache']).toBe('MISS');
      
      // Second request - should hit cache
      const response2 = await request(app)
        .get('/test-cache')
        .expect(200);
      
      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body).toEqual(response1.body);
    });

    it('should not cache POST requests', async () => {
      const response = await request(app)
        .post('/test-post')
        .send({ data: 'test' })
        .expect(200);
      
      expect(response.headers['x-cache']).toBeUndefined();
    });

    it('should not cache error responses', async () => {
      await request(app)
        .get('/test-error')
        .expect(500);
      
      // Second request should still return error (not cached)
      const response = await request(app)
        .get('/test-error')
        .expect(500);
      
      // Error responses don't get X-Cache header since they're not cached
      expect(response.headers['x-cache']).toBeUndefined();
      
      // Verify cache is empty for this endpoint
      const stats = cache.getStats();
      const errorCacheKey = stats.keys.find(key => key.includes('/test-error'));
      expect(errorCacheKey).toBeUndefined();
    });

    it('should cache with different TTL values', async () => {
      // Test stock data cache (30 minutes TTL)
      const stockResponse = await request(app)
        .get('/test-stock')
        .expect(200);
      
      expect(stockResponse.headers['x-cache']).toBe('MISS');
      
      // Test analysis cache (30 minutes TTL)
      const analysisResponse = await request(app)
        .get('/test-analysis')
        .expect(200);
      
      expect(analysisResponse.headers['x-cache']).toBe('MISS');
      
      // Test price cache (2 minutes TTL)
      const priceResponse = await request(app)
        .get('/test-price')
        .expect(200);
      
      expect(priceResponse.headers['x-cache']).toBe('MISS');
    });

    it('should create cache keys from URL and query parameters', async () => {
      // Request with query parameters
      await request(app)
        .get('/test-cache?param1=value1&param2=value2')
        .expect(200);
      
      // Same request should hit cache
      const response = await request(app)
        .get('/test-cache?param1=value1&param2=value2')
        .expect(200);
      
      expect(response.headers['x-cache']).toBe('HIT');
      
      // Different query parameters should miss cache
      const response2 = await request(app)
        .get('/test-cache?param1=different')
        .expect(200);
      
      expect(response2.headers['x-cache']).toBe('MISS');
    });
  });

  describe('Cache Invalidation', () => {
    beforeEach(async () => {
      // Set up some cached data
      await request(app).get('/test-cache').expect(200);
      await request(app).get('/test-stock').expect(200);
      await request(app).get('/test-analysis').expect(200);
    });

    it('should clear all cache', async () => {
      await request(app)
        .delete('/invalidate')
        .expect(200);
      
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
    });

    it('should invalidate cache by pattern', async () => {
      await request(app)
        .delete('/invalidate/test-stock')
        .expect(200);
      
      // test-stock should be invalidated
      const response = await request(app)
        .get('/test-stock')
        .expect(200);
      
      expect(response.headers['x-cache']).toBe('MISS');
    });
  });

  describe('Cache Stats Endpoint', () => {
    it('should return cache statistics', async () => {
      // Add some cached data
      await request(app).get('/test-cache').expect(200);
      await request(app).get('/test-stock').expect(200);
      
      const response = await request(app)
        .get('/cache-stats')
        .expect(200);
      
      expect(response.body).toMatchObject({
        success: true,
        data: {
          cacheSize: expect.any(Number),
          totalKeys: expect.any(Number),
          keys: expect.any(Array),
          timestamp: expect.any(String)
        }
      });
      
      expect(response.body.data.cacheSize).toBeGreaterThan(0);
      expect(response.body.data.keys.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Cleanup', () => {
    it('should automatically cleanup expired entries', (done) => {
      cache.set('cleanup-test', { data: 'test' }, 0.1); // 100ms TTL
      
      expect(cache.get('cleanup-test')).not.toBeNull();
      
      setTimeout(() => {
        // Entry should be expired and cleaned up
        expect(cache.get('cleanup-test')).toBeNull();
        done();
      }, 200);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache operations gracefully', () => {
      // Test with invalid TTL
      expect(() => {
        cache.set('test', { data: 'test' }, -1);
      }).not.toThrow();
      
      // Test deleting non-existent key
      expect(cache.delete('non-existent')).toBe(false);
    });
  });
});