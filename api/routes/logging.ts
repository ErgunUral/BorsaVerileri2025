import express from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs/promises';
import path from 'path';
import { LogContext } from '../services/advancedLoggerService';
import { authenticateUser } from '../middleware/auth';
import { ErrorHandlingService } from '../services/errorHandlingService.js';
import { AdvancedLoggerService } from '../services/advancedLoggerService.js';

const router = express.Router();

// Initialize services
const advancedLogger = new AdvancedLoggerService();
const errorHandler = new ErrorHandlingService(advancedLogger);

// Rate limiting for logging endpoints
const loggingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many logging requests from this IP'
});

router.use(loggingLimiter);

// Get logging metrics
router.get('/metrics', authenticateUser, (req, res) => {
  try {
    const metrics = advancedLogger.getMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to get logging metrics', error as Error, {
      service: 'loggingAPI',
      operation: 'getMetrics',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logging metrics'
    });
  }
});

// Get recent logs
router.get('/recent', authenticateUser, (req, res) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const level = req.query.level as string;
    const service = req.query.service as string;
    
    let logs = advancedLogger.getRecentLogs(minutes);
    
    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    // Filter by service if specified
    if (service) {
      logs = logs.filter(log => log.service === service);
    }
    
    // Limit to last 1000 logs for performance
    logs = logs.slice(-1000);
    
    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
        filters: { minutes, level, service }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to get recent logs', error as Error, {
      service: 'loggingAPI',
      operation: 'getRecentLogs',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recent logs'
    });
  }
});

// Get health status
router.get('/health', async (req, res) => {
  try {
    const healthChecks = await errorHandler.performHealthChecks();
    const loggerStatus = advancedLogger.getHealthStatus();
    
    const overallStatus = healthChecks.every(check => check.status === 'healthy') && loggerStatus.isHealthy
      ? 'healthy'
      : healthChecks.some(check => check.status === 'unhealthy') || !loggerStatus.isHealthy
      ? 'unhealthy'
      : 'degraded';
    
    res.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        logger: loggerStatus.isHealthy ? 'healthy' : 'unhealthy',
        ...Object.fromEntries(healthChecks.map(check => [check.service, check.status]))
      },
      healthChecks,
      errorStats: errorHandler.getErrorStatistics()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: (error as Error).message
    });
  }
});

// Get alert configuration
router.get('/alerts/config', authenticateUser, (req, res) => {
  try {
    const config = advancedLogger.getAlertConfig();
    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to get alert config', error as Error, {
      service: 'loggingAPI',
      operation: 'getAlertConfig',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert configuration'
    });
  }
});

// Update alert configuration
router.put('/alerts/config', authenticateUser, (req, res) => {
  try {
    const {
      enabled,
      errorThreshold,
      warningThreshold,
      responseTimeThreshold,
      webhookUrl,
      emailRecipients,
      slackChannel
    } = req.body;
    
    const updateConfig: any = {};
    
    if (typeof enabled === 'boolean') updateConfig.enabled = enabled;
    if (typeof errorThreshold === 'number') updateConfig.errorThreshold = errorThreshold;
    if (typeof warningThreshold === 'number') updateConfig.warningThreshold = warningThreshold;
    if (typeof responseTimeThreshold === 'number') updateConfig.responseTimeThreshold = responseTimeThreshold;
    if (typeof webhookUrl === 'string') updateConfig.webhookUrl = webhookUrl;
    if (Array.isArray(emailRecipients)) updateConfig.emailRecipients = emailRecipients;
    if (typeof slackChannel === 'string') updateConfig.slackChannel = slackChannel;
    
    advancedLogger.updateAlertConfig(updateConfig);
    
    advancedLogger.info('Alert configuration updated', {
      service: 'loggingAPI',
      operation: 'updateAlertConfig',
      userId: req.user?.id,
      metadata: { updatedFields: Object.keys(updateConfig) }
    });
    
    res.json({
      success: true,
      message: 'Alert configuration updated successfully',
      data: advancedLogger.getAlertConfig(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to update alert config', error as Error, {
      service: 'loggingAPI',
      operation: 'updateAlertConfig',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update alert configuration'
    });
  }
});

// Manual log entry (for testing or external integrations)
router.post('/log', authenticateUser, (req, res) => {
  try {
    const { level, message, context } = req.body;
    
    if (!level || !message) {
      return res.status(400).json({
        success: false,
        error: 'Level and message are required'
      });
    }
    
    const logContext: LogContext = {
      ...context,
      service: context?.service || 'manual',
      userId: req.user?.id
    };
    
    switch (level.toLowerCase()) {
      case 'info':
        advancedLogger.info(message, logContext);
        break;
      case 'warn':
      case 'warning':
        advancedLogger.warn(message, logContext);
        break;
      case 'error':
        advancedLogger.error(message, undefined, logContext);
        break;
      case 'debug':
        advancedLogger.debug(message, logContext);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid log level. Use: info, warn, error, debug'
        });
    }
    
    res.json({
      success: true,
      message: 'Log entry created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to create manual log entry', error as Error, {
      service: 'loggingAPI',
      operation: 'manualLog',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create log entry'
    });
  }
});

// Log performance metric
router.post('/performance', authenticateUser, (req, res) => {
  try {
    const { operation, duration, context } = req.body;
    
    if (!operation || typeof duration !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Operation and duration are required'
      });
    }
    
    const logContext: LogContext = {
      ...context,
      userId: req.user?.id
    };
    
    advancedLogger.logPerformance(operation, duration, logContext);
    
    res.json({
      success: true,
      message: 'Performance metric logged successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to log performance metric', error as Error, {
      service: 'loggingAPI',
      operation: 'logPerformance',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to log performance metric'
    });
  }
});

// Log business event
router.post('/business-event', authenticateUser, (req, res) => {
  try {
    const { event, data, context } = req.body;
    
    if (!event) {
      return res.status(400).json({
        success: false,
        error: 'Event name is required'
      });
    }
    
    const logContext: LogContext = {
      ...context,
      userId: req.user?.id
    };
    
    advancedLogger.logBusinessEvent(event, data, logContext);
    
    res.json({
      success: true,
      message: 'Business event logged successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to log business event', error as Error, {
      service: 'loggingAPI',
      operation: 'logBusinessEvent',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to log business event'
    });
  }
});

// Log security event
router.post('/security-event', authenticateUser, (req, res) => {
  try {
    const { event, severity, context } = req.body;
    
    if (!event || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Event and severity are required'
      });
    }
    
    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity. Use: low, medium, high, critical'
      });
    }
    
    const logContext: LogContext = {
      ...context,
      userId: req.user?.id
    };
    
    advancedLogger.logSecurityEvent(event, severity, logContext);
    
    res.json({
      success: true,
      message: 'Security event logged successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to log security event', error as Error, {
      service: 'loggingAPI',
      operation: 'logSecurityEvent',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to log security event'
    });
  }
});

// Get log statistics by service
router.get('/stats/services', authenticateUser, (req, res) => {
  try {
    const metrics = advancedLogger.getMetrics();
    const recentLogs = advancedLogger.getRecentLogs(60); // Last hour
    
    const serviceStats: Record<string, any> = {};
    
    recentLogs.forEach(log => {
      const service = log.service || 'unknown';
      if (!serviceStats[service]) {
        serviceStats[service] = {
          total: 0,
          errors: 0,
          warnings: 0,
          info: 0,
          debug: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
          responseTimeCount: 0
        };
      }
      
      serviceStats[service].total++;
      serviceStats[service][log.level]++;
      
      if (log.duration) {
        serviceStats[service].totalResponseTime += log.duration;
        serviceStats[service].responseTimeCount++;
        serviceStats[service].avgResponseTime = 
          serviceStats[service].totalResponseTime / serviceStats[service].responseTimeCount;
      }
    });
    
    res.json({
      success: true,
      data: {
        serviceStats,
        globalMetrics: metrics
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to get service statistics', error as Error, {
      service: 'loggingAPI',
      operation: 'getServiceStats',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve service statistics'
    });
  }
});

// Test alert system
router.post('/test-alert', authenticateUser, async (req, res) => {
  try {
    const { type = 'test', message = 'Test alert from logging API' } = req.body;
    
    if (type === 'critical') {
      const testError = new Error(message);
      await errorHandler.handleCriticalError(testError, {
        operation: 'test_alert',
        source: 'manual_trigger',
        timestamp: new Date().toISOString(),
        metadata: { triggeredBy: req.user?.id }
      });
    } else {
      // Emit a test alert
      advancedLogger.emit('alert', {
        type: `TEST_${type.toUpperCase()}`,
        timestamp: new Date().toISOString(),
        severity: 'warning',
        message,
        service: 'loggingAPI',
        triggeredBy: req.user?.id
      });
      
      advancedLogger.warn(`Test alert triggered: ${message}`, {
        service: 'loggingAPI',
        operation: 'testAlert',
        userId: req.user?.id,
        metadata: { alertType: type }
      });
    }
    
    res.json({
      success: true,
      message: 'Test alert sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    advancedLogger.error('Failed to send test alert', error as Error, {
      service: 'loggingAPI',
      operation: 'testAlert',
      userId: req.user?.id
    });
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert'
    });
  }
});

// Error handling statistics endpoint
router.get('/error-stats', async (req, res) => {
  try {
    const stats = errorHandler.getErrorStatistics();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Circuit breaker status endpoint
router.get('/circuit-breakers', async (req, res) => {
  try {
    const stats = errorHandler.getErrorStatistics();
    res.json({
      success: true,
      data: stats.circuitBreakers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;