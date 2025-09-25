import express from 'express';
import rateLimit from 'express-rate-limit';
import { AdvancedLoggerService } from '../services/advancedLoggerService';
import { ErrorHandlingService } from '../services/errorHandlingService';
import { RedisService } from '../services/redisService';
import { getRealTimeDataService } from '../services/realTimeDataService';

const router = express.Router();

// Initialize services
const logger = new AdvancedLoggerService();
const redis = new RedisService();
const errorHandler = new ErrorHandlingService(logger, redis);
const realTimeService = getRealTimeDataService(logger, redis, errorHandler);

// Rate limiting for real-time endpoints
const realTimeRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many real-time requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

const subscriptionRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit subscription operations
  message: 'Too many subscription requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
router.use(realTimeRateLimit);

// Get real-time data for a specific symbol
router.get('/data/:symbol', async (req, res) => {
  const startTime = Date.now();
  const { symbol } = req.params;
  
  try {
    logger.info('Real-time data request', {
      symbol
    });
    
    // Validate symbol
    if (!symbol || symbol.length < 2 || symbol.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid symbol format',
        code: 'INVALID_SYMBOL'
      });
    }
    
    const symbolUpper = symbol.toUpperCase();
    
    // Get latest data from real-time service
    const latestData = await realTimeService.getLatestData(symbolUpper);
    
    if (!latestData) {
      // Try to get from cache or trigger immediate fetch
      const cacheKey = `realtime:${symbolUpper}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        return res.json({
          success: true,
          data,
          symbol: symbolUpper,
          timestamp: new Date().toISOString(),
          source: 'cache',
          responseTime: Date.now() - startTime
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'No real-time data available for this symbol',
        code: 'NO_DATA',
        symbol: symbolUpper
      });
    }
    
    return res.json({
      success: true,
      data: latestData,
      symbol: symbolUpper,
      timestamp: new Date().toISOString(),
      source: 'realtime',
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error('Real-time data request failed', error as Error, {
      symbol
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time data',
      code: 'FETCH_ERROR',
      responseTime: Date.now() - startTime
    });
  }
});

// Get historical data for a symbol
router.get('/history/:symbol', async (req, res) => {
  const startTime = Date.now();
  const { symbol } = req.params;
  const { hours = '24' } = req.query;
  
  try {
    const symbolUpper = symbol.toUpperCase();
    const hoursNum = Math.min(parseInt(hours as string) || 24, 168); // Max 7 days
    
    logger.info('Historical data request', {
      symbol: symbolUpper
    });
    
    const historicalData = await realTimeService.getHistoricalData(symbolUpper, hoursNum);
    
    res.json({
      success: true,
      data: historicalData,
      symbol: symbolUpper,
      hours: hoursNum,
      count: historicalData.length,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error('Historical data request failed', error as Error, {
      symbol
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical data',
      code: 'HISTORY_ERROR',
      responseTime: Date.now() - startTime
    });
  }
});

// Get real-time data for multiple symbols
router.post('/data/batch', async (req, res) => {
  const startTime = Date.now();
  const { symbols } = req.body;
  
  try {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required',
        code: 'INVALID_INPUT'
      });
    }
    
    if (symbols.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 symbols allowed per request',
        code: 'TOO_MANY_SYMBOLS'
      });
    }
    
    logger.info('Batch real-time data request');
    
    const results = await Promise.allSettled(
      symbols.map(async (symbol: string) => {
        const symbolUpper = symbol.toUpperCase();
        const data = await realTimeService.getLatestData(symbolUpper);
        return {
          symbol: symbolUpper,
          data,
          success: !!data
        };
      })
    );
    
    const successfulResults = results
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)
      .filter(result => result.success);
    
    const failedSymbols = results
      .map((result, index) => ({ result, symbol: symbols[index] }))
      .filter(({ result }) => result.status === 'rejected' || !result.value?.success)
      .map(({ symbol }) => symbol);
    
    return res.json({
      success: true,
      data: successfulResults,
      totalRequested: symbols.length,
      successful: successfulResults.length,
      failed: failedSymbols.length,
      failedSymbols,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error('Batch real-time data request failed', error as Error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch batch real-time data',
      code: 'BATCH_ERROR',
      responseTime: Date.now() - startTime
    });
  }
});

// Subscribe to real-time updates
router.post('/subscribe', subscriptionRateLimit, async (req, res) => {
  const { symbols, subscriptionId } = req.body;
  
  try {
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required',
        code: 'INVALID_INPUT'
      });
    }
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required',
        code: 'MISSING_SUBSCRIPTION_ID'
      });
    }
    
    if (symbols.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 symbols allowed per subscription',
        code: 'TOO_MANY_SYMBOLS'
      });
    }
    
    const symbolsUpper = symbols.map((s: string) => s.toUpperCase());
    
    realTimeService.subscribe(subscriptionId, symbolsUpper);
    
    // Add symbols to real-time tracking if not already tracked
    symbolsUpper.forEach(symbol => {
      realTimeService.addSymbol(symbol);
    });
    
    logger.info('Real-time subscription created');
    
    return res.json({
      success: true,
      subscriptionId,
      symbols: symbolsUpper,
      message: 'Subscription created successfully'
    });
    
  } catch (error) {
    logger.error('Subscription creation failed', error as Error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
      code: 'SUBSCRIPTION_ERROR'
    });
  }
});

// Unsubscribe from real-time updates
router.delete('/subscribe/:subscriptionId', subscriptionRateLimit, async (req, res) => {
  const { subscriptionId } = req.params;
  
  try {
    realTimeService.unsubscribe(subscriptionId);
    
    logger.info('Real-time subscription removed');
    
    return res.json({
      success: true,
      subscriptionId,
      message: 'Subscription removed successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Subscription removal failed', error as Error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to remove subscription',
      code: 'UNSUBSCRIBE_ERROR'
    });
  }
});

// Get real-time service metrics
router.get('/metrics', async (_req, res) => {
  try {
    const metrics = realTimeService.getMetrics();
    
    res.json({
      success: true,
      metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Metrics request failed', error as Error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
      code: 'METRICS_ERROR'
    });
  }
});

// Get real-time service configuration
router.get('/config', async (_req, res) => {
  try {
    const config = realTimeService.getConfig();
    
    res.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Config request failed', error as Error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration',
      code: 'CONFIG_ERROR'
    });
  }
});

// Update real-time service configuration
router.put('/config', async (req, res) => {
  try {
    const { pollingInterval, batchSize, enableWebSocket, enableSSE } = req.body;
    
    const updateConfig: any = {};
    
    if (pollingInterval !== undefined) {
      if (pollingInterval < 5000 || pollingInterval > 300000) {
        return res.status(400).json({
          success: false,
          error: 'Polling interval must be between 5000ms and 300000ms',
          code: 'INVALID_POLLING_INTERVAL'
        });
      }
      updateConfig.pollingInterval = pollingInterval;
    }
    
    if (batchSize !== undefined) {
      if (batchSize < 1 || batchSize > 50) {
        return res.status(400).json({
          success: false,
          error: 'Batch size must be between 1 and 50',
          code: 'INVALID_BATCH_SIZE'
        });
      }
      updateConfig.batchSize = batchSize;
    }
    
    if (enableWebSocket !== undefined) {
      updateConfig.enableWebSocket = Boolean(enableWebSocket);
    }
    
    if (enableSSE !== undefined) {
      updateConfig.enableSSE = Boolean(enableSSE);
    }
    
    realTimeService.updateConfig(updateConfig);
    
    logger.info('Real-time service configuration updated');
    
    return res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: realTimeService.getConfig()
    });
    
  } catch (error) {
    logger.error('Config update failed', error as Error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to update configuration',
      error: 'Internal server error'
    });
  }
});

// Add symbol to real-time tracking
router.post('/symbols/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const symbolUpper = symbol.toUpperCase();
    
    realTimeService.addSymbol(symbolUpper);
    
    logger.info('Symbol added to real-time tracking', {
      symbol: symbolUpper
    });
    
    res.json({
      success: true,
      symbol: symbolUpper,
      message: 'Symbol added to real-time tracking',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Add symbol failed', error as Error, { symbol });
    
    res.status(500).json({
      success: false,
      error: 'Failed to add symbol',
      code: 'ADD_SYMBOL_ERROR'
    });
  }
});

// Remove symbol from real-time tracking
router.delete('/symbols/:symbol', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const symbolUpper = symbol.toUpperCase();
    
    realTimeService.removeSymbol(symbolUpper);
    
    logger.info('Symbol removed from real-time tracking', {
      symbol: symbolUpper
    });
    
    res.json({
      success: true,
      symbol: symbolUpper,
      message: 'Symbol removed from real-time tracking',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Remove symbol failed', error as Error, { symbol });
    
    res.status(500).json({
      success: false,
      error: 'Failed to remove symbol',
      code: 'REMOVE_SYMBOL_ERROR'
    });
  }
});

// Get market summary (real-time)
router.get('/market/summary', async (_req, res) => {
  const startTime = Date.now();
  
  try {
    const cacheKey = 'realtime:market_summary';
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      const data = JSON.parse(cached);
      
      res.json({
        success: true,
        data,
        source: 'realtime_cache',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'No real-time market summary available',
        code: 'NO_MARKET_DATA',
        responseTime: Date.now() - startTime
      });
    }
    
  } catch (error) {
    logger.error('Market summary request failed', error as Error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market summary',
      code: 'MARKET_SUMMARY_ERROR',
      responseTime: Date.now() - startTime
    });
  }
});

// Health check for real-time service
router.get('/health', async (_req, res) => {
  try {
    const metrics = realTimeService.getMetrics();
    const healthData = await redis.get('realtime:health');
    
    const health = {
      status: metrics.isRunning ? 'healthy' : 'unhealthy',
      metrics,
      detailedHealth: healthData ? JSON.parse(healthData) : null,
      timestamp: new Date().toISOString()
    };
    
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status === 'healthy',
      ...health
    });
    
  } catch (error) {
    logger.error('Real-time health check failed', error as Error);
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;