import express from 'express';
import { getSchedulerService } from '../services/schedulerService';
import { bulkDataService } from '../services/bulkDataService';
import logger from '../utils/logger';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for scheduler endpoints
const schedulerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many scheduler requests, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(schedulerLimiter);

// Get scheduler status and statistics
router.get('/status', async (req, res) => {
  try {
    const schedulerService = getSchedulerService(bulkDataService);
    
    const stats = schedulerService.getStats();
    const config = schedulerService.getConfig();
    const health = schedulerService.getHealthStatus();
    const isActive = schedulerService.isActive();

    res.json({
      success: true,
      data: {
        isActive,
        stats,
        config,
        health,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start the scheduler
router.post('/start', async (req, res) => {
  try {
    const schedulerService = getSchedulerService(bulkDataService);
    
    if (schedulerService.isActive()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduler is already running'
      });
    }

    schedulerService.start();
    
    res.json({
      success: true,
      message: 'Scheduler started successfully',
      data: {
        config: schedulerService.getConfig(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error starting scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduler',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop the scheduler
router.post('/stop', async (req, res) => {
  try {
    const schedulerService = getSchedulerService(bulkDataService);
    
    if (!schedulerService.isActive()) {
      return res.status(400).json({
        success: false,
        error: 'Scheduler is not running'
      });
    }

    schedulerService.stop();
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully',
      data: {
        stats: schedulerService.getStats(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error stopping scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Restart the scheduler
router.post('/restart', async (req, res) => {
  try {
    const schedulerService = getSchedulerService(bulkDataService);
    
    schedulerService.restart();
    
    res.json({
      success: true,
      message: 'Scheduler restarted successfully',
      data: {
        config: schedulerService.getConfig(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error restarting scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart scheduler',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update scheduler configuration
router.put('/config', async (req, res) => {
  try {
    const { interval, enabled, maxRetries, retryDelay } = req.body;
    
    // Validate configuration
    const config: any = {};
    
    if (typeof interval === 'number' && interval >= 5000) { // Minimum 5 seconds
      config.interval = interval;
    } else if (interval !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'Invalid interval. Must be a number >= 5000 (5 seconds)'
      });
    }
    
    if (typeof enabled === 'boolean') {
      config.enabled = enabled;
    }
    
    if (typeof maxRetries === 'number' && maxRetries >= 0 && maxRetries <= 10) {
      config.maxRetries = maxRetries;
    } else if (maxRetries !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'Invalid maxRetries. Must be a number between 0 and 10'
      });
    }
    
    if (typeof retryDelay === 'number' && retryDelay >= 1000) { // Minimum 1 second
      config.retryDelay = retryDelay;
    } else if (retryDelay !== undefined) {
      return res.status(400).json({
        success: false,
        error: 'Invalid retryDelay. Must be a number >= 1000 (1 second)'
      });
    }

    const schedulerService = getSchedulerService(bulkDataService);
    
    schedulerService.updateConfig(config);
    
    res.json({
      success: true,
      message: 'Scheduler configuration updated successfully',
      data: {
        config: schedulerService.getConfig(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating scheduler config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update scheduler configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Force immediate update
router.post('/force-update', async (req, res) => {
  try {
    const schedulerService = getSchedulerService(bulkDataService);
    
    // Run update in background
    schedulerService.forceUpdate().catch(error => {
      logger.error('Force update failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Force update initiated',
      data: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error forcing update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force update',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scheduler health check
router.get('/health', async (req, res) => {
  try {
    const schedulerService = getSchedulerService(bulkDataService);
    
    const health = schedulerService.getHealthStatus();
    const stats = schedulerService.getStats();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status !== 'error',
      data: {
        health,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        stats: {
          totalRuns: stats.totalRuns,
          successfulRuns: stats.successfulRuns,
          failedRuns: stats.failedRuns,
          successRate: stats.totalRuns > 0 ? 
            ((stats.successfulRuns / stats.totalRuns) * 100).toFixed(2) + '%' : '0%'
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting scheduler health:', error);
    res.status(503).json({
      success: false,
      error: 'Scheduler health check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get scheduler logs (last N events)
router.get('/logs', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const schedulerService = getSchedulerService(bulkDataService);
    
    const stats = schedulerService.getStats();
    
    // Create a simple log structure from stats
    const logs = [];
    
    if (stats.lastSuccessTime) {
      logs.push({
        type: 'success',
        message: 'Data update completed successfully',
        timestamp: stats.lastSuccessTime,
        level: 'info'
      });
    }
    
    if (stats.lastErrorTime) {
      logs.push({
        type: 'error',
        message: stats.lastError || 'Unknown error occurred',
        timestamp: stats.lastErrorTime,
        level: 'error'
      });
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    res.json({
      success: true,
      data: {
        logs: logs.slice(0, limit),
        total: logs.length,
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting scheduler logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;