import express from 'express';
import rateLimit from 'express-rate-limit';
import { ErrorHandlingService } from '../services/errorHandlingService.js';
import { AdvancedLoggerService } from '../services/advancedLoggerService.js';

const router = express.Router();

// Initialize services
const logger = new AdvancedLoggerService();
const errorHandlingService = new ErrorHandlingService(logger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

router.use(limiter);

// Get error handling statistics
router.get('/stats', (req, res) => {
  try {
    // errorHandlingService already initialized above
    const stats = errorHandlingService.getErrorStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting error handling stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get error handling statistics'
    });
  }
});

// Get circuit breaker statistics
router.get('/circuit-breakers', (req, res) => {
  try {
    // errorHandlingService already initialized above
    const circuitBreakers = errorHandlingService.getCircuitBreakerStats();
    
    res.json({
      success: true,
      data: circuitBreakers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting circuit breaker stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get circuit breaker statistics'
    });
  }
});

// Get active retry operations
router.get('/active-retries', (req, res) => {
  try {
    // errorHandlingService already initialized above
    const activeRetries = errorHandlingService.getActiveRetryOperations();
    
    res.json({
      success: true,
      data: activeRetries,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting active retries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active retry operations'
    });
  }
});

// Get health status
router.get('/health', (req, res) => {
  try {
    // errorHandlingService already initialized above
    const health = errorHandlingService.getHealthStatus();
    
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'warning' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting error handling health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get error handling health status'
    });
  }
});

// Reset circuit breaker
router.post('/circuit-breakers/:name/reset', (req, res) => {
  try {
    const { name } = req.params;
    // errorHandlingService already initialized above
    const success = errorHandlingService.resetCircuitBreaker(name);
    
    if (success) {
      logger.info(`Circuit breaker '${name}' reset manually`);
      res.json({
        success: true,
        message: `Circuit breaker '${name}' has been reset`,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: `Circuit breaker '${name}' not found`
      });
    }
  } catch (error) {
    logger.error('Error resetting circuit breaker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset circuit breaker'
    });
  }
});

// Reset all circuit breakers
router.post('/circuit-breakers/reset-all', (req, res) => {
  try {
    // errorHandlingService already initialized above
    errorHandlingService.resetAllCircuitBreakers();
    
    logger.info('All circuit breakers reset manually');
    res.json({
      success: true,
      message: 'All circuit breakers have been reset',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error resetting all circuit breakers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset all circuit breakers'
    });
  }
});

// Clear error statistics
router.post('/stats/clear', (req, res) => {
  try {
    // errorHandlingService already initialized above
    errorHandlingService.clearStats();
    
    logger.info('Error handling statistics cleared manually');
    res.json({
      success: true,
      message: 'Error handling statistics have been cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error clearing statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear error handling statistics'
    });
  }
});

// Get comprehensive error handling report
router.get('/report', (req, res) => {
  try {
    // errorHandlingService already initialized above
    
    const report = {
      stats: errorHandlingService.getErrorStats(),
      circuitBreakers: errorHandlingService.getCircuitBreakerStats(),
      activeRetries: errorHandlingService.getActiveRetryOperations(),
      health: errorHandlingService.getHealthStatus(),
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating error handling report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate error handling report'
    });
  }
});

// Test error handling (for development/testing)
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoint not available in production'
    });
  }
  
  try {
    const { operation = 'test', shouldFail = false, retries = 3 } = req.body;
    // errorHandlingService already initialized above
    
    const testOperation = async () => {
      if (shouldFail) {
        throw new Error('Test error for error handling');
      }
      return { message: 'Test operation successful' };
    };
    
    const context = {
      operation,
      source: 'TestEndpoint',
      timestamp: new Date(),
      metadata: { isTest: true }
    };
    
    const result = await errorHandlingService.executeWithRetryAndCircuitBreaker(
      testOperation,
      context,
      { maxRetries: retries, baseDelay: 100 },
      { failureThreshold: 2, resetTimeout: 5000 }
    );
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Test operation failed',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;