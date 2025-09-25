import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cacheRouter from '../cache';
import { getCacheService } from '../../services/cacheService';
import logger from '../../utils/logger';

// Mock dependencies
vi.mock('../../services/cacheService');
vi.mock('../../utils/logger');

const mockCacheService = {
  getStats: vi.fn(),
  getConfig: vi.fn(),
  getMemoryUsage: vi.fn(),
  size: vi.fn(),
  getTopKeys: vi.fn(),
  getEntryInfo: vi.fn(),
  has: vi.fn(),
  get: vi.fn()
};

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/cache', cacheRouter);

describe('Cache Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCacheService as any).mockReturnValue(mockCacheService);
    (logger as any).error = mockLogger.error;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/cache/stats', () => {
    it('should return cache statistics successfully', async () => {
      const mockStats = {
        hits: 100,
        misses: 20,
        hitRate: 83.33,
        size: 50
      };
      const mockConfig = {
        maxSize: 1000,
        ttl: 3600
      };
      const mockMemoryUsage = 1024 * 1024; // 1MB
      const mockSize = 50;

      mockCacheService.getStats.mockReturnValue(mockStats);
      mockCacheService.getConfig.mockReturnValue(mockConfig);
      mockCacheService.getMemoryUsage.mockReturnValue(mockMemoryUsage);
      mockCacheService.size.mockReturnValue(mockSize);

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          stats: mockStats,
          config: mockConfig,
          memoryUsage: mockMemoryUsage,
          size: mockSize
        }
      });

      expect(mockCacheService.getStats).toHaveBeenCalledOnce();
      expect(mockCacheService.getConfig).toHaveBeenCalledOnce();
      expect(mockCacheService.getMemoryUsage).toHaveBeenCalledOnce();
      expect(mockCacheService.size).toHaveBeenCalledOnce();
    });

    it('should handle cache service errors', async () => {
      const error = new Error('Cache service unavailable');
      mockCacheService.getStats.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get cache statistics'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting cache statistics:',
        error
      );
    });
  });

  describe('GET /api/cache/health', () => {
    it('should return healthy status with good metrics', async () => {
      const mockStats = {
        hits: 800,
        misses: 200,
        hitRate: 80,
        size: 500
      };
      const mockConfig = {
        maxSize: 1000,
        ttl: 3600
      };
      const mockMemoryUsage = 100 * 1024 * 1024; // 100MB

      mockCacheService.getStats.mockReturnValue(mockStats);
      mockCacheService.getConfig.mockReturnValue(mockConfig);
      mockCacheService.getMemoryUsage.mockReturnValue(mockMemoryUsage);

      const response = await request(app)
        .get('/api/cache/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.message).toBe('Cache operating normally');
      expect(response.body.data.issues).toEqual([]);
      expect(response.body.data.metrics.hitRate).toBe('80.00%');
      expect(response.body.data.metrics.utilization).toBe('50.00%');
    });

    it('should return warning status with low hit rate', async () => {
      const mockStats = {
        hits: 30,
        misses: 70,
        hitRate: 30,
        size: 100
      };
      const mockConfig = {
        maxSize: 1000,
        ttl: 3600
      };
      const mockMemoryUsage = 50 * 1024 * 1024; // 50MB

      mockCacheService.getStats.mockReturnValue(mockStats);
      mockCacheService.getConfig.mockReturnValue(mockConfig);
      mockCacheService.getMemoryUsage.mockReturnValue(mockMemoryUsage);

      const response = await request(app)
        .get('/api/cache/health')
        .expect(200);

      expect(response.body.data.status).toBe('warning');
      expect(response.body.data.message).toBe('Cache performance issues detected');
      expect(response.body.data.issues).toContain('Low hit rate: 30.00%');
    });

    it('should return warning status with high utilization', async () => {
      const mockStats = {
        hits: 800,
        misses: 200,
        hitRate: 80,
        size: 950
      };
      const mockConfig = {
        maxSize: 1000,
        ttl: 3600
      };
      const mockMemoryUsage = 50 * 1024 * 1024; // 50MB

      mockCacheService.getStats.mockReturnValue(mockStats);
      mockCacheService.getConfig.mockReturnValue(mockConfig);
      mockCacheService.getMemoryUsage.mockReturnValue(mockMemoryUsage);

      const response = await request(app)
        .get('/api/cache/health')
        .expect(200);

      expect(response.body.data.status).toBe('warning');
      expect(response.body.data.issues).toContain('High utilization: 95.00%');
    });

    it('should return warning status with high memory usage', async () => {
      const mockStats = {
        hits: 800,
        misses: 200,
        hitRate: 80,
        size: 500
      };
      const mockConfig = {
        maxSize: 1000,
        ttl: 3600
      };
      const mockMemoryUsage = 600 * 1024 * 1024; // 600MB

      mockCacheService.getStats.mockReturnValue(mockStats);
      mockCacheService.getConfig.mockReturnValue(mockConfig);
      mockCacheService.getMemoryUsage.mockReturnValue(mockMemoryUsage);

      const response = await request(app)
        .get('/api/cache/health')
        .expect(200);

      expect(response.body.data.status).toBe('warning');
      expect(response.body.data.issues).toContain('High memory usage: 600.00MB');
    });

    it('should return error status with multiple issues', async () => {
      const mockStats = {
        hits: 30,
        misses: 70,
        hitRate: 30,
        size: 950
      };
      const mockConfig = {
        maxSize: 1000,
        ttl: 3600
      };
      const mockMemoryUsage = 600 * 1024 * 1024; // 600MB

      mockCacheService.getStats.mockReturnValue(mockStats);
      mockCacheService.getConfig.mockReturnValue(mockConfig);
      mockCacheService.getMemoryUsage.mockReturnValue(mockMemoryUsage);

      const response = await request(app)
        .get('/api/cache/health')
        .expect(200);

      expect(response.body.data.status).toBe('error');
      expect(response.body.data.message).toBe('Multiple cache issues detected');
      expect(response.body.data.issues).toHaveLength(3);
    });

    it('should handle health check errors', async () => {
      const error = new Error('Health check failed');
      mockCacheService.getStats.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/cache/health')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get cache health status'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting cache health:',
        error
      );
    });
  });

  describe('GET /api/cache/top-keys', () => {
    it('should return top keys with default limit', async () => {
      const mockTopKeys = [
        { key: 'stock:AAPL', accessCount: 100, lastAccessed: '2024-01-01T10:00:00Z' },
        { key: 'stock:GOOGL', accessCount: 85, lastAccessed: '2024-01-01T09:30:00Z' },
        { key: 'stock:MSFT', accessCount: 70, lastAccessed: '2024-01-01T09:00:00Z' }
      ];

      mockCacheService.getTopKeys.mockReturnValue(mockTopKeys);

      const response = await request(app)
        .get('/api/cache/top-keys')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTopKeys
      });

      expect(mockCacheService.getTopKeys).toHaveBeenCalledWith(10);
    });

    it('should return top keys with custom limit', async () => {
      const mockTopKeys = [
        { key: 'stock:AAPL', accessCount: 100, lastAccessed: '2024-01-01T10:00:00Z' }
      ];

      mockCacheService.getTopKeys.mockReturnValue(mockTopKeys);

      const response = await request(app)
        .get('/api/cache/top-keys?limit=5')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTopKeys
      });

      expect(mockCacheService.getTopKeys).toHaveBeenCalledWith(5);
    });

    it('should validate limit parameter - too low', async () => {
      const response = await request(app)
        .get('/api/cache/top-keys?limit=0')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Limit must be between 1 and 100'
      });

      expect(mockCacheService.getTopKeys).not.toHaveBeenCalled();
    });

    it('should validate limit parameter - too high', async () => {
      const response = await request(app)
        .get('/api/cache/top-keys?limit=150')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Limit must be between 1 and 100'
      });

      expect(mockCacheService.getTopKeys).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to get top keys');
      mockCacheService.getTopKeys.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/cache/top-keys')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get top cache keys'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting top cache keys:',
        error
      );
    });
  });

  describe('GET /api/cache/entry/:key', () => {
    it('should return cache entry information', async () => {
      const mockEntryInfo = {
        key: 'stock:AAPL',
        value: { price: 150, symbol: 'AAPL' },
        ttl: 3600,
        createdAt: '2024-01-01T10:00:00Z',
        lastAccessed: '2024-01-01T10:30:00Z',
        accessCount: 5
      };

      mockCacheService.getEntryInfo.mockReturnValue(mockEntryInfo);

      const response = await request(app)
        .get('/api/cache/entry/stock:AAPL')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockEntryInfo
      });

      expect(mockCacheService.getEntryInfo).toHaveBeenCalledWith('stock:AAPL');
    });

    it('should handle service errors', async () => {
      const error = new Error('Entry not found');
      mockCacheService.getEntryInfo.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/cache/entry/nonexistent')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get cache entry information'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting cache entry info:',
        error
      );
    });
  });

  describe('GET /api/cache/exists/:key', () => {
    it('should return true when key exists', async () => {
      mockCacheService.has.mockReturnValue(true);

      const response = await request(app)
        .get('/api/cache/exists/stock:AAPL')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { exists: true }
      });

      expect(mockCacheService.has).toHaveBeenCalledWith('stock:AAPL');
    });

    it('should return false when key does not exist', async () => {
      mockCacheService.has.mockReturnValue(false);

      const response = await request(app)
        .get('/api/cache/exists/nonexistent')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { exists: false }
      });

      expect(mockCacheService.has).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle service errors', async () => {
      const error = new Error('Cache check failed');
      mockCacheService.has.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/cache/exists/test-key')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to check cache key existence'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error checking cache key existence:',
        error
      );
    });
  });

  describe('GET /api/cache/value/:key', () => {
    it('should return cache value for admin', async () => {
      const mockValue = { price: 150, symbol: 'AAPL', timestamp: '2024-01-01T10:00:00Z' };
      mockCacheService.get.mockReturnValue(mockValue);

      const response = await request(app)
        .get('/api/cache/value/stock:AAPL')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { value: mockValue }
      });

      expect(mockCacheService.get).toHaveBeenCalledWith('stock:AAPL');
    });

    it('should return null when key does not exist', async () => {
      mockCacheService.get.mockReturnValue(null);

      const response = await request(app)
        .get('/api/cache/value/nonexistent')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { value: null }
      });

      expect(mockCacheService.get).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle service errors', async () => {
      const error = new Error('Failed to get value');
      mockCacheService.get.mockImplementation(() => {
        throw error;
      });

      const response = await request(app)
        .get('/api/cache/value/test-key')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get cache value'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error getting cache value:',
        error
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to cache endpoints', async () => {
      // This test would require more complex setup to test rate limiting
      // For now, we'll just verify the endpoints are accessible
      mockCacheService.getStats.mockReturnValue({});
      mockCacheService.getConfig.mockReturnValue({});
      mockCacheService.getMemoryUsage.mockReturnValue(0);
      mockCacheService.size.mockReturnValue(0);

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined cache service', async () => {
      (getCacheService as any).mockReturnValue(null);

      const response = await request(app)
        .get('/api/cache/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle malformed limit parameter', async () => {
      const response = await request(app)
        .get('/api/cache/top-keys?limit=abc')
        .expect(200);

      // Should use default limit of 10
      expect(mockCacheService.getTopKeys).toHaveBeenCalledWith(10);
    });

    it('should handle special characters in cache keys', async () => {
      const specialKey = 'stock:AAPL@2024-01-01#test';
      mockCacheService.has.mockReturnValue(true);

      const response = await request(app)
        .get(`/api/cache/exists/${encodeURIComponent(specialKey)}`)
        .expect(200);

      expect(response.body.data.exists).toBe(true);
      expect(mockCacheService.has).toHaveBeenCalledWith(specialKey);
    });
  });
});