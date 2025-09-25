import express from 'express';
import rateLimit from 'express-rate-limit';
import { getCacheService, stockDataCache } from '../services/cacheService';
import logger from '../utils/logger';

const router = express.Router();

// Rate limiting for cache endpoints
const cacheLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many cache requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 admin operations per 5 minutes
  message: { error: 'Too many admin operations, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Get cache statistics
router.get('/stats', cacheLimiter, (req, res) => {
  try {
    const cacheService = getCacheService();
    const stats = cacheService.getStats();
    const config = cacheService.getConfig();

    res.json({
      success: true,
      data: {
        stats,
        config,
        memoryUsage: cacheService.getMemoryUsage(),
        size: cacheService.size()
      }
    });
  } catch (error) {
    logger.error('Error getting cache statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

// Get cache health status
router.get('/health', cacheLimiter, (req, res) => {
  try {
    const cacheService = getCacheService();
    const stats = cacheService.getStats();
    const memoryUsage = cacheService.getMemoryUsage();
    const config = cacheService.getConfig();
    
    // Calculate health metrics
    const memoryUsageMB = memoryUsage / (1024 * 1024);
    const hitRate = stats.hitRate;
    const utilizationRate = (stats.size / config.maxSize) * 100;
    
    let status = 'healthy';
    let message = 'Cache operating normally';
    const issues = [];
    
    if (hitRate < 50) {
      status = 'warning';
      issues.push(`Low hit rate: ${hitRate.toFixed(2)}%`);
    }
    
    if (utilizationRate > 90) {
      status = 'warning';
      issues.push(`High utilization: ${utilizationRate.toFixed(2)}%`);
    }
    
    if (memoryUsageMB > 500) { // 500MB threshold
      status = 'warning';
      issues.push(`High memory usage: ${memoryUsageMB.toFixed(2)}MB`);
    }
    
    if (issues.length > 2) {
      status = 'error';
      message = 'Multiple cache issues detected';
    } else if (issues.length > 0) {
      message = 'Cache performance issues detected';
    }

    res.json({
      success: true,
      data: {
        status,
        message,
        issues,
        metrics: {
          hitRate: hitRate.toFixed(2) + '%',
          memoryUsage: memoryUsageMB.toFixed(2) + 'MB',
          utilization: utilizationRate.toFixed(2) + '%',
          size: stats.size,
          maxSize: config.maxSize
        }
      }
    });
  } catch (error) {
    logger.error('Error getting cache health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache health status'
    });
  }
});

// Get top accessed keys
router.get('/top-keys', cacheLimiter, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 100'
      });
    }

    const cacheService = getCacheService();
    const topKeys = cacheService.getTopKeys(limit);

    res.json({
      success: true,
      data: topKeys
    });
  } catch (error) {
    logger.error('Error getting top cache keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top cache keys'
    });
  }
});

// Get cache entry information
router.get('/entry/:key', cacheLimiter, (req, res) => {
  try {
    const { key } = req.params;
    const cacheService = getCacheService();
    const entryInfo = cacheService.getEntryInfo(key);

    res.json({
      success: true,
      data: entryInfo
    });
  } catch (error) {
    logger.error('Error getting cache entry info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache entry information'
    });
  }
});

// Check if key exists in cache
router.get('/exists/:key', cacheLimiter, (req, res) => {
  try {
    const { key } = req.params;
    const cacheService = getCacheService();
    const exists = cacheService.has(key);

    res.json({
      success: true,
      data: { exists }
    });
  } catch (error) {
    logger.error('Error checking cache key existence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check cache key existence'
    });
  }
});

// Get cache value (admin only)
router.get('/value/:key', adminLimiter, (req, res) => {
  try {
    const { key } = req.params;
    const cacheService = getCacheService();
    const value = cacheService.get(key);

    res.json({
      success: true,
      data: { value }
    });
  } catch (error) {
    logger.error('Error getting cache value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache value'
    });
  }
});

// Set cache value (admin only)
router.post('/set', adminLimiter, (req, res) => {
  try {
    const { key, value, ttl } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    if (ttl && (ttl < 1000 || ttl > 86400000)) { // 1 second to 24 hours
      return res.status(400).json({
        success: false,
        error: 'TTL must be between 1 second and 24 hours'
      });
    }

    const cacheService = getCacheService();
    cacheService.set(key, value, ttl);

    logger.info(`Cache value set via API: ${key}`);
    res.json({
      success: true,
      message: 'Cache value set successfully'
    });
  } catch (error) {
    logger.error('Error setting cache value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set cache value'
    });
  }
});

// Delete cache entry (admin only)
router.delete('/entry/:key', adminLimiter, (req, res) => {
  try {
    const { key } = req.params;
    const cacheService = getCacheService();
    const deleted = cacheService.delete(key);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Cache entry not found'
      });
    }

    logger.info(`Cache entry deleted via API: ${key}`);
    res.json({
      success: true,
      message: 'Cache entry deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting cache entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete cache entry'
    });
  }
});

// Clear all cache (admin only)
router.post('/clear', adminLimiter, (req, res) => {
  try {
    const cacheService = getCacheService();
    cacheService.clear();

    logger.warn('Cache cleared via API');
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Reset cache statistics (admin only)
router.post('/reset-stats', adminLimiter, (req, res) => {
  try {
    const cacheService = getCacheService();
    cacheService.resetStats();

    logger.info('Cache statistics reset via API');
    res.json({
      success: true,
      message: 'Cache statistics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting cache statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset cache statistics'
    });
  }
});

// Cleanup expired entries (admin only)
router.post('/cleanup', adminLimiter, (req, res) => {
  try {
    const cacheService = getCacheService();
    const cleaned = cacheService.cleanup();

    logger.info(`Cache cleanup completed via API: ${cleaned} entries removed`);
    res.json({
      success: true,
      message: `Cache cleanup completed: ${cleaned} entries removed`,
      data: { entriesRemoved: cleaned }
    });
  } catch (error) {
    logger.error('Error performing cache cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform cache cleanup'
    });
  }
});

// Update cache configuration (admin only)
router.put('/config', adminLimiter, (req, res) => {
  try {
    const { defaultTTL, maxSize, cleanupInterval, enableStats } = req.body;
    const config: any = {};

    if (defaultTTL !== undefined) {
      if (defaultTTL < 1000 || defaultTTL > 86400000) {
        return res.status(400).json({
          success: false,
          error: 'Default TTL must be between 1 second and 24 hours'
        });
      }
      config.defaultTTL = defaultTTL;
    }

    if (maxSize !== undefined) {
      if (maxSize < 100 || maxSize > 100000) {
        return res.status(400).json({
          success: false,
          error: 'Max size must be between 100 and 100,000'
        });
      }
      config.maxSize = maxSize;
    }

    if (cleanupInterval !== undefined) {
      if (cleanupInterval < 10000 || cleanupInterval > 3600000) {
        return res.status(400).json({
          success: false,
          error: 'Cleanup interval must be between 10 seconds and 1 hour'
        });
      }
      config.cleanupInterval = cleanupInterval;
    }

    if (enableStats !== undefined) {
      config.enableStats = Boolean(enableStats);
    }

    const cacheService = getCacheService();
    cacheService.updateConfig(config);

    logger.info('Cache configuration updated via API');
    res.json({
      success: true,
      message: 'Cache configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error updating cache configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update cache configuration'
    });
  }
});

// Stock-specific cache operations
router.get('/stock/:symbol', cacheLimiter, (req, res) => {
  try {
    const { symbol } = req.params;
    const data = stockDataCache.getStockData(symbol.toUpperCase());

    res.json({
      success: true,
      data: { symbol, data, cached: data !== null }
    });
  } catch (error) {
    logger.error('Error getting stock cache data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stock cache data'
    });
  }
});

router.delete('/stock/:symbol', adminLimiter, (req, res) => {
  try {
    const { symbol } = req.params;
    stockDataCache.invalidateStock(symbol.toUpperCase());

    logger.info(`Stock cache invalidated via API: ${symbol}`);
    res.json({
      success: true,
      message: `Stock cache invalidated for ${symbol}`
    });
  } catch (error) {
    logger.error('Error invalidating stock cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate stock cache'
    });
  }
});

router.delete('/stock', adminLimiter, (req, res) => {
  try {
    stockDataCache.invalidateAll();

    logger.warn('All stock cache invalidated via API');
    res.json({
      success: true,
      message: 'All stock cache invalidated'
    });
  } catch (error) {
    logger.error('Error invalidating all stock cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate all stock cache'
    });
  }
});

// Extend cache entry TTL (admin only)
router.post('/extend/:key', adminLimiter, (req, res) => {
  try {
    const { key } = req.params;
    const { additionalTTL } = req.body;

    if (!additionalTTL || additionalTTL < 1000 || additionalTTL > 86400000) {
      return res.status(400).json({
        success: false,
        error: 'Additional TTL must be between 1 second and 24 hours'
      });
    }

    const cacheService = getCacheService();
    const extended = cacheService.extend(key, additionalTTL);

    if (!extended) {
      return res.status(404).json({
        success: false,
        error: 'Cache entry not found'
      });
    }

    logger.info(`Cache TTL extended via API: ${key} (+${additionalTTL}ms)`);
    res.json({
      success: true,
      message: 'Cache TTL extended successfully'
    });
  } catch (error) {
    logger.error('Error extending cache TTL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to extend cache TTL'
    });
  }
});

// Touch cache entry (update access time)
router.post('/touch/:key', cacheLimiter, (req, res) => {
  try {
    const { key } = req.params;
    const cacheService = getCacheService();
    const touched = cacheService.touch(key);

    if (!touched) {
      return res.status(404).json({
        success: false,
        error: 'Cache entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Cache entry touched successfully'
    });
  } catch (error) {
    logger.error('Error touching cache entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to touch cache entry'
    });
  }
});

export default router;