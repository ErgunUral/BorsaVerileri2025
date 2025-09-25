import express from 'express';
import rateLimit from 'express-rate-limit';
import { getRealTimePollingService, PollingTarget } from '../services/realTimePollingService';
import logger from '../utils/logger';

const router = express.Router();

// Rate limiting for polling endpoints
const pollingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many polling requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const configLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 configuration changes per 5 minutes
  message: { error: 'Too many configuration changes, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Get polling service status and statistics
router.get('/status', pollingLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    const stats = pollingService.getStats();
    const health = pollingService.getHealthStatus();
    const targets = pollingService.getPollingTargets();

    res.json({
      success: true,
      data: {
        stats,
        health,
        targets: targets.map(target => ({
          name: target.name,
          symbolCount: target.symbols.length,
          interval: target.interval,
          priority: target.priority,
          enabled: target.enabled
        }))
      }
    });
  } catch (error) {
    logger.error('Error getting polling status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get polling status'
    });
  }
});

// Get detailed statistics
router.get('/stats', pollingLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    const stats = pollingService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting polling statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get polling statistics'
    });
  }
});

// Get health status
router.get('/health', pollingLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    const health = pollingService.getHealthStatus();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error getting polling health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get polling health status'
    });
  }
});

// Start polling service
router.post('/start', configLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    pollingService.start();

    logger.info('Real-time polling service started via API');
    res.json({
      success: true,
      message: 'Polling service started successfully'
    });
  } catch (error) {
    logger.error('Error starting polling service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start polling service'
    });
  }
});

// Stop polling service
router.post('/stop', configLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    pollingService.stop();

    logger.info('Real-time polling service stopped via API');
    res.json({
      success: true,
      message: 'Polling service stopped successfully'
    });
  } catch (error) {
    logger.error('Error stopping polling service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop polling service'
    });
  }
});

// Restart polling service
router.post('/restart', configLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    pollingService.restart();

    logger.info('Real-time polling service restarted via API');
    res.json({
      success: true,
      message: 'Polling service restarted successfully'
    });
  } catch (error) {
    logger.error('Error restarting polling service:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart polling service'
    });
  }
});

// Get polling targets
router.get('/targets', pollingLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    const targets = pollingService.getPollingTargets();

    res.json({
      success: true,
      data: targets
    });
  } catch (error) {
    logger.error('Error getting polling targets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get polling targets'
    });
  }
});

// Add new polling target
router.post('/targets', configLimiter, (req, res) => {
  try {
    const { name, symbols, interval, priority, enabled } = req.body;

    // Validation
    if (!name || !symbols || !Array.isArray(symbols)) {
      return res.status(400).json({
        success: false,
        error: 'Name and symbols array are required'
      });
    }

    if (symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array cannot be empty'
      });
    }

    if (interval && (interval < 10000 || interval > 600000)) {
      return res.status(400).json({
        success: false,
        error: 'Interval must be between 10 seconds and 10 minutes'
      });
    }

    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Priority must be high, medium, or low'
      });
    }

    const target: PollingTarget = {
      name,
      symbols,
      interval: interval || 30000,
      priority: priority || 'medium',
      enabled: enabled !== false
    };

    const pollingService = getRealTimePollingService();
    pollingService.addPollingTarget(target);

    logger.info(`Added polling target '${name}' with ${symbols.length} symbols`);
    res.json({
      success: true,
      message: 'Polling target added successfully',
      data: target
    });
  } catch (error) {
    logger.error('Error adding polling target:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add polling target'
    });
  }
});

// Update polling target
router.put('/targets/:name', configLimiter, (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    // Validation
    if (updates.interval && (updates.interval < 10000 || updates.interval > 600000)) {
      return res.status(400).json({
        success: false,
        error: 'Interval must be between 10 seconds and 10 minutes'
      });
    }

    if (updates.priority && !['high', 'medium', 'low'].includes(updates.priority)) {
      return res.status(400).json({
        success: false,
        error: 'Priority must be high, medium, or low'
      });
    }

    if (updates.symbols && (!Array.isArray(updates.symbols) || updates.symbols.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Symbols must be a non-empty array'
      });
    }

    const pollingService = getRealTimePollingService();
    const success = pollingService.updatePollingTarget(name, updates);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Polling target not found'
      });
    }

    logger.info(`Updated polling target '${name}'`);
    res.json({
      success: true,
      message: 'Polling target updated successfully'
    });
  } catch (error) {
    logger.error('Error updating polling target:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update polling target'
    });
  }
});

// Remove polling target
router.delete('/targets/:name', configLimiter, (req, res) => {
  try {
    const { name } = req.params;

    const pollingService = getRealTimePollingService();
    const success = pollingService.removePollingTarget(name);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Polling target not found'
      });
    }

    logger.info(`Removed polling target '${name}'`);
    res.json({
      success: true,
      message: 'Polling target removed successfully'
    });
  } catch (error) {
    logger.error('Error removing polling target:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove polling target'
    });
  }
});

// Update polling configuration
router.put('/config', configLimiter, (req, res) => {
  try {
    const { interval, batchSize, maxConcurrency, enableCache, retryAttempts, healthCheckInterval } = req.body;

    const config: any = {};

    if (interval !== undefined) {
      if (interval < 10000 || interval > 600000) {
        return res.status(400).json({
          success: false,
          error: 'Interval must be between 10 seconds and 10 minutes'
        });
      }
      config.interval = interval;
    }

    if (batchSize !== undefined) {
      if (batchSize < 1 || batchSize > 200) {
        return res.status(400).json({
          success: false,
          error: 'Batch size must be between 1 and 200'
        });
      }
      config.batchSize = batchSize;
    }

    if (maxConcurrency !== undefined) {
      if (maxConcurrency < 1 || maxConcurrency > 50) {
        return res.status(400).json({
          success: false,
          error: 'Max concurrency must be between 1 and 50'
        });
      }
      config.maxConcurrency = maxConcurrency;
    }

    if (enableCache !== undefined) {
      config.enableCache = Boolean(enableCache);
    }

    if (retryAttempts !== undefined) {
      if (retryAttempts < 0 || retryAttempts > 10) {
        return res.status(400).json({
          success: false,
          error: 'Retry attempts must be between 0 and 10'
        });
      }
      config.retryAttempts = retryAttempts;
    }

    if (healthCheckInterval !== undefined) {
      if (healthCheckInterval < 30000 || healthCheckInterval > 600000) {
        return res.status(400).json({
          success: false,
          error: 'Health check interval must be between 30 seconds and 10 minutes'
        });
      }
      config.healthCheckInterval = healthCheckInterval;
    }

    const pollingService = getRealTimePollingService();
    pollingService.updateConfig(config);

    logger.info('Polling service configuration updated');
    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error updating polling configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// Force immediate poll for all targets
router.post('/poll-now', configLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    
    // Emit a manual poll event
    pollingService.emit('manualPoll', { timestamp: new Date() });
    
    logger.info('Manual poll triggered via API');
    res.json({
      success: true,
      message: 'Manual poll triggered successfully'
    });
  } catch (error) {
    logger.error('Error triggering manual poll:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger manual poll'
    });
  }
});

// Clear statistics
router.post('/clear-stats', configLimiter, (req, res) => {
  try {
    const pollingService = getRealTimePollingService();
    pollingService.clearStats();

    logger.info('Polling service statistics cleared via API');
    res.json({
      success: true,
      message: 'Statistics cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear statistics'
    });
  }
});

// Get real-time events (Server-Sent Events)
router.get('/events', (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const pollingService = getRealTimePollingService();
  
  // Send initial status
  const initialData = {
    type: 'status',
    data: {
      stats: pollingService.getStats(),
      health: pollingService.getHealthStatus()
    }
  };
  res.write(`data: ${JSON.stringify(initialData)}\n\n`);

  // Event handlers
  const onPollComplete = (result: any) => {
    res.write(`data: ${JSON.stringify({ type: 'pollComplete', data: result })}\n\n`);
  };

  const onPollError = (result: any) => {
    res.write(`data: ${JSON.stringify({ type: 'pollError', data: result })}\n\n`);
  };

  const onDataUpdate = (data: any) => {
    res.write(`data: ${JSON.stringify({ type: 'dataUpdate', data })}\n\n`);
  };

  const onHealthCheck = (health: any) => {
    res.write(`data: ${JSON.stringify({ type: 'healthCheck', data: health })}\n\n`);
  };

  const onStarted = () => {
    res.write(`data: ${JSON.stringify({ type: 'started', data: { timestamp: new Date() } })}\n\n`);
  };

  const onStopped = () => {
    res.write(`data: ${JSON.stringify({ type: 'stopped', data: { timestamp: new Date() } })}\n\n`);
  };

  // Register event listeners
  pollingService.on('pollComplete', onPollComplete);
  pollingService.on('pollError', onPollError);
  pollingService.on('dataUpdate', onDataUpdate);
  pollingService.on('healthCheck', onHealthCheck);
  pollingService.on('started', onStarted);
  pollingService.on('stopped', onStopped);

  // Handle client disconnect
  req.on('close', () => {
    pollingService.removeListener('pollComplete', onPollComplete);
    pollingService.removeListener('pollError', onPollError);
    pollingService.removeListener('dataUpdate', onDataUpdate);
    pollingService.removeListener('healthCheck', onHealthCheck);
    pollingService.removeListener('started', onStarted);
    pollingService.removeListener('stopped', onStopped);
    logger.debug('SSE client disconnected from polling events');
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

export default router;