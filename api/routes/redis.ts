import express from 'express';
import rateLimit from 'express-rate-limit';
import { RedisService } from '../services/redisService.js';
import { AdvancedLoggerService } from '../services/advancedLoggerService.js';

const router = express.Router();

// Initialize services
const logger = new AdvancedLoggerService();
const redisService = new RedisService(logger);

// Rate limiting for Redis endpoints
const redisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: { error: 'Too many Redis requests, please try again later' },
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

// Get Redis connection status and statistics
router.get('/status', redisLimiter, async (req, res) => {
  try {
    // redisService already initialized above
    const isReady = redisService.isReady();
    const localStats = redisService.getLocalStats();
    const redisStats = await redisService.getStats();
    const config = redisService.getConfig();

    res.json({
      success: true,
      data: {
        connected: isReady,
        localStats,
        redisStats,
        config: {
          host: config.host,
          port: config.port,
          db: config.db,
          keyPrefix: config.keyPrefix
        }
      }
    });
  } catch (error) {
    logger.error('Error getting Redis status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis status'
    });
  }
});

// Health check endpoint
router.get('/health', redisLimiter, async (req, res) => {
  try {
    // redisService already initialized above
    const isReady = redisService.isReady();
    const pingResult = await redisService.ping();
    const localStats = redisService.getLocalStats();
    
    let status = 'healthy';
    let message = 'Redis operating normally';
    const issues = [];
    
    if (!isReady) {
      status = 'error';
      message = 'Redis not connected';
      issues.push('Connection lost');
    } else if (!pingResult) {
      status = 'warning';
      message = 'Redis ping failed';
      issues.push('Ping timeout');
    }
    
    if (localStats.errors > 10) {
      status = status === 'error' ? 'error' : 'warning';
      issues.push(`High error count: ${localStats.errors}`);
    }
    
    if (localStats.hitRate < 50 && localStats.hits + localStats.misses > 100) {
      status = status === 'error' ? 'error' : 'warning';
      issues.push(`Low hit rate: ${localStats.hitRate}%`);
    }

    res.json({
      success: true,
      data: {
        status,
        message,
        issues,
        metrics: {
          connected: isReady,
          ping: pingResult,
          hitRate: localStats.hitRate + '%',
          operations: localStats.operations,
          errors: localStats.errors
        }
      }
    });
  } catch (error) {
    logger.error('Error checking Redis health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Redis health'
    });
  }
});

// Connect to Redis
router.post('/connect', adminLimiter, async (req, res) => {
  try {
    // redisService already initialized above
    const connected = await redisService.connect();

    if (connected) {
      logger.info('Redis connection established via API');
      res.json({
        success: true,
        message: 'Redis connected successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to connect to Redis'
      });
    }
  } catch (error) {
    logger.error('Error connecting to Redis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to Redis'
    });
  }
});

// Disconnect from Redis
router.post('/disconnect', adminLimiter, async (req, res) => {
  try {
    // redisService already initialized above
    await redisService.disconnect();

    logger.info('Redis disconnected via API');
    res.json({
      success: true,
      message: 'Redis disconnected successfully'
    });
  } catch (error) {
    logger.error('Error disconnecting from Redis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect from Redis'
    });
  }
});

// Ping Redis
router.get('/ping', redisLimiter, async (req, res) => {
  try {
    // redisService already initialized above
    const result = await redisService.ping();

    res.json({
      success: true,
      data: { ping: result ? 'PONG' : 'FAILED' }
    });
  } catch (error) {
    logger.error('Error pinging Redis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ping Redis'
    });
  }
});

// Get value from Redis
router.get('/get/:key', redisLimiter, async (req, res) => {
  try {
    const { key } = req.params;
    // redisService already initialized above
    const value = await redisService.get(key);

    res.json({
      success: true,
      data: { key, value, exists: value !== null }
    });
  } catch (error) {
    logger.error('Error getting Redis value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis value'
    });
  }
});

// Set value in Redis
router.post('/set', adminLimiter, async (req, res) => {
  try {
    const { key, value, ttl } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key is required'
      });
    }

    if (ttl && (ttl < 1 || ttl > 86400)) { // 1 second to 24 hours
      return res.status(400).json({
        success: false,
        error: 'TTL must be between 1 second and 24 hours'
      });
    }

    // redisService already initialized above
    const success = await redisService.set(key, value, ttl);

    if (success) {
      logger.info(`Redis value set via API: ${key}`);
      res.json({
        success: true,
        message: 'Value set successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to set value'
      });
    }
  } catch (error) {
    logger.error('Error setting Redis value:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set Redis value'
    });
  }
});

// Delete key from Redis
router.delete('/key/:key', adminLimiter, async (req, res) => {
  try {
    const { key } = req.params;
    // redisService already initialized above
    const deleted = await redisService.del(key);

    if (deleted) {
      logger.info(`Redis key deleted via API: ${key}`);
      res.json({
        success: true,
        message: 'Key deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Key not found'
      });
    }
  } catch (error) {
    logger.error('Error deleting Redis key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Redis key'
    });
  }
});

// Check if key exists
router.get('/exists/:key', redisLimiter, async (req, res) => {
  try {
    const { key } = req.params;
    // redisService already initialized above
    const exists = await redisService.exists(key);

    res.json({
      success: true,
      data: { key, exists }
    });
  } catch (error) {
    logger.error('Error checking Redis key existence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check key existence'
    });
  }
});

// Get TTL of key
router.get('/ttl/:key', redisLimiter, async (req, res) => {
  try {
    const { key } = req.params;
    // redisService already initialized above
    const ttl = await redisService.ttl(key);

    let status = 'unknown';
    if (ttl === -2) status = 'not_exists';
    else if (ttl === -1) status = 'no_expiry';
    else if (ttl > 0) status = 'expires';

    res.json({
      success: true,
      data: { key, ttl, status }
    });
  } catch (error) {
    logger.error('Error getting Redis key TTL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get key TTL'
    });
  }
});

// Set expiry for key
router.post('/expire/:key', adminLimiter, async (req, res) => {
  try {
    const { key } = req.params;
    const { seconds } = req.body;

    if (!seconds || seconds < 1 || seconds > 86400) {
      return res.status(400).json({
        success: false,
        error: 'Seconds must be between 1 and 86400'
      });
    }

    // redisService already initialized above
    const success = await redisService.expire(key, seconds);

    if (success) {
      logger.info(`Redis key expiry set via API: ${key} (${seconds}s)`);
      res.json({
        success: true,
        message: 'Expiry set successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Key not found'
      });
    }
  } catch (error) {
    logger.error('Error setting Redis key expiry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set key expiry'
    });
  }
});

// Get keys by pattern
router.get('/keys', redisLimiter, async (req, res) => {
  try {
    const pattern = (req.query.pattern as string) || '*';
    const limit = parseInt(req.query.limit as string) || 100;

    if (limit < 1 || limit > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 1000'
      });
    }

    // redisService already initialized above
    const allKeys = await redisService.keys(pattern);
    const keys = allKeys.slice(0, limit);

    res.json({
      success: true,
      data: {
        pattern,
        keys,
        total: allKeys.length,
        returned: keys.length,
        truncated: allKeys.length > limit
      }
    });
  } catch (error) {
    logger.error('Error getting Redis keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Redis keys'
    });
  }
});

// Flush database (admin only)
router.post('/flush', adminLimiter, async (req, res) => {
  try {
    const redisService = getRedisService();
    const success = await redisService.flushdb();

    if (success) {
      logger.warn('Redis database flushed via API');
      res.json({
        success: true,
        message: 'Database flushed successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to flush database'
      });
    }
  } catch (error) {
    logger.error('Error flushing Redis database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flush Redis database'
    });
  }
});

// Reset local statistics
router.post('/reset-stats', adminLimiter, (req, res) => {
  try {
    const redisService = getRedisService();
    redisService.resetLocalStats();

    logger.info('Redis local statistics reset via API');
    res.json({
      success: true,
      message: 'Local statistics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting Redis statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset statistics'
    });
  }
});

// Stock-specific endpoints
router.get('/stock/:symbol', redisLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;
    const redisService = getRedisService();
    const data = await redisService.getStockData(symbol.toUpperCase());

    res.json({
      success: true,
      data: { symbol: symbol.toUpperCase(), data, cached: data !== null }
    });
  } catch (error) {
    logger.error('Error getting stock data from Redis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stock data'
    });
  }
});

router.post('/stock/:symbol', adminLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { data, ttl } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Stock data is required'
      });
    }

    const redisService = getRedisService();
    const success = await redisService.setStockData(symbol.toUpperCase(), data, ttl || 30);

    if (success) {
      logger.info(`Stock data cached via API: ${symbol}`);
      res.json({
        success: true,
        message: 'Stock data cached successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to cache stock data'
      });
    }
  } catch (error) {
    logger.error('Error caching stock data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cache stock data'
    });
  }
});

router.delete('/stock/:symbol', adminLimiter, async (req, res) => {
  try {
    const { symbol } = req.params;
    const redisService = getRedisService();
    const deleted = await redisService.invalidateStockData(symbol.toUpperCase());

    if (deleted) {
      logger.info(`Stock data invalidated via API: ${symbol}`);
      res.json({
        success: true,
        message: 'Stock data invalidated successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Stock data not found'
      });
    }
  } catch (error) {
    logger.error('Error invalidating stock data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate stock data'
    });
  }
});

router.post('/stock/bulk', adminLimiter, async (req, res) => {
  try {
    const { stockData, ttl } = req.body;

    if (!stockData || typeof stockData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Stock data object is required'
      });
    }

    const redisService = getRedisService();
    const success = await redisService.setBulkStockData(stockData, ttl || 30);

    if (success) {
      const symbols = Object.keys(stockData);
      logger.info(`Bulk stock data cached via API: ${symbols.length} symbols`);
      res.json({
        success: true,
        message: `Bulk stock data cached successfully for ${symbols.length} symbols`,
        data: { symbolCount: symbols.length }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to cache bulk stock data'
      });
    }
  } catch (error) {
    logger.error('Error caching bulk stock data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cache bulk stock data'
    });
  }
});

router.post('/stock/bulk-get', redisLimiter, async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }

    if (symbols.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 symbols allowed'
      });
    }

    const redisService = getRedisService();
    const upperSymbols = symbols.map(s => s.toUpperCase());
    const data = await redisService.getBulkStockData(upperSymbols);

    res.json({
      success: true,
      data: {
        requested: upperSymbols.length,
        found: Object.keys(data).length,
        data
      }
    });
  } catch (error) {
    logger.error('Error getting bulk stock data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bulk stock data'
    });
  }
});

router.delete('/stock', adminLimiter, async (req, res) => {
  try {
    const redisService = getRedisService();
    const success = await redisService.invalidateAllStockData();

    if (success) {
      logger.warn('All stock data invalidated via API');
      res.json({
        success: true,
        message: 'All stock data invalidated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to invalidate all stock data'
      });
    }
  } catch (error) {
    logger.error('Error invalidating all stock data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate all stock data'
    });
  }
});

export default router;