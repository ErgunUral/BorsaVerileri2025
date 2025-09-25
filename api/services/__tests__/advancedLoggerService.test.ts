import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdvancedLoggerService, getAdvancedLogger, AlertConfig, LogContext } from '../advancedLoggerService';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';

// Mock winston
vi.mock('winston', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  })),
  format: {
    combine: vi.fn(() => 'combined-format'),
    timestamp: vi.fn(() => 'timestamp-format'),
    errors: vi.fn(() => 'errors-format'),
    json: vi.fn(() => 'json-format'),
    printf: vi.fn(() => 'printf-format'),
    colorize: vi.fn(() => 'colorize-format'),
    simple: vi.fn(() => 'simple-format')
  },
  transports: {
    Console: vi.fn(),
    File: vi.fn()
  }
}));

// Mock winston-daily-rotate-file
vi.mock('winston-daily-rotate-file', () => {
  return {
    default: class MockDailyRotateFile {
      constructor(options: any) {
        this.options = options;
      }
      options: any;
      log = vi.fn();
      on = vi.fn();
      close = vi.fn();
    }
  };
});

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn()
}));

// Mock fetch for external alerts
global.fetch = vi.fn();

describe('AdvancedLoggerService', () => {
  let loggerService: AdvancedLoggerService;
  let mockWinstonLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    // Reset environment variables
    delete process.env['LOG_LEVEL'];
    delete process.env['ALERT_WEBHOOK_URL'];
    delete process.env['ALERT_EMAIL_RECIPIENTS'];
    delete process.env['ALERT_SLACK_CHANNEL'];

    mockWinstonLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };
    
    (winston.createLogger as any).mockReturnValue(mockWinstonLogger);
    
    loggerService = new AdvancedLoggerService();
  });

  afterEach(() => {
    vi.useRealTimers();
    loggerService.removeAllListeners();
  });

  describe('Initialization', () => {
    it('should create logs directory if it does not exist', () => {
      (fs.existsSync as any).mockReturnValue(false);
      
      new AdvancedLoggerService();
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(process.cwd(), 'logs'),
        { recursive: true }
      );
    });

    it('should not create logs directory if it already exists', () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.mkdirSync as any).mockClear();
      
      new AdvancedLoggerService();
      
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should initialize with default metrics', () => {
      const metrics = loggerService.getMetrics();
      
      expect(metrics.totalLogs).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.warningCount).toBe(0);
      expect(metrics.infoCount).toBe(0);
      expect(metrics.debugCount).toBe(0);
      expect(metrics.logsByHour).toEqual({});
      expect(metrics.errorsByService).toEqual({});
      expect(metrics.performanceMetrics.avgResponseTime).toBe(0);
      expect(metrics.performanceMetrics.slowQueries).toBe(0);
      expect(metrics.performanceMetrics.failedRequests).toBe(0);
    });

    it('should initialize with default alert configuration', () => {
      const alertConfig = loggerService.getAlertConfig();
      
      expect(alertConfig.enabled).toBe(true);
      expect(alertConfig.errorThreshold).toBe(10);
      expect(alertConfig.warningThreshold).toBe(50);
      expect(alertConfig.responseTimeThreshold).toBe(5000);
    });

    it('should use environment variables for alert configuration', () => {
      process.env['ALERT_WEBHOOK_URL'] = 'https://webhook.example.com';
      process.env['ALERT_EMAIL_RECIPIENTS'] = 'admin@example.com,dev@example.com';
      process.env['ALERT_SLACK_CHANNEL'] = '#alerts';
      
      const service = new AdvancedLoggerService();
      const alertConfig = service.getAlertConfig();
      
      expect(alertConfig.webhookUrl).toBe('https://webhook.example.com');
      expect(alertConfig.emailRecipients).toEqual(['admin@example.com', 'dev@example.com']);
      expect(alertConfig.slackChannel).toBe('#alerts');
    });
  });

  describe('Logging Methods', () => {
    const testContext: LogContext = {
      service: 'test-service',
      operation: 'test-operation',
      userId: 'user123',
      sessionId: 'session456',
      requestId: 'req789'
    };

    it('should log info messages correctly', () => {
      loggerService.info('Test info message', testContext);
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test info message', testContext);
      
      const metrics = loggerService.getMetrics();
      expect(metrics.totalLogs).toBe(1);
      expect(metrics.infoCount).toBe(1);
    });

    it('should log warning messages correctly', () => {
      loggerService.warn('Test warning message', testContext);
      
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('Test warning message', testContext);
      
      const metrics = loggerService.getMetrics();
      expect(metrics.totalLogs).toBe(1);
      expect(metrics.warningCount).toBe(1);
    });

    it('should log error messages correctly', () => {
      const testError = new Error('Test error');
      loggerService.error('Test error message', testError, testContext);
      
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Test error message', {
        error: testError.stack,
        ...testContext
      });
      
      const metrics = loggerService.getMetrics();
      expect(metrics.totalLogs).toBe(1);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorsByService['test-service']).toBe(1);
    });

    it('should log debug messages correctly', () => {
      loggerService.debug('Test debug message', testContext);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('Test debug message', testContext);
      
      const metrics = loggerService.getMetrics();
      expect(metrics.totalLogs).toBe(1);
      expect(metrics.debugCount).toBe(1);
    });

    it('should handle error logging without Error object', () => {
      loggerService.error('Test error message', undefined, testContext);
      
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('Test error message', {
        error: undefined,
        ...testContext
      });
    });

    it('should handle logging without context', () => {
      loggerService.info('Test message without context');
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('Test message without context', undefined);
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics correctly', () => {
      const context: LogContext = { service: 'api', operation: 'getData' };
      
      loggerService.logPerformance('database-query', 150, context);
      
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith(
        'Performance: database-query completed in 150ms',
        { ...context, operation: 'database-query', duration: 150 }
      );
    });

    it('should update average response time correctly', () => {
      const context: LogContext = { service: 'api', duration: 100 };
      
      loggerService.info('Request 1', context);
      loggerService.info('Request 2', { ...context, duration: 200 });
      
      const metrics = loggerService.getMetrics();
      expect(metrics.performanceMetrics.avgResponseTime).toBe(150);
    });

    it('should track slow queries', () => {
      const slowContext: LogContext = { service: 'api', duration: 6000 }; // > 5000ms threshold
      
      loggerService.info('Slow request', slowContext);
      
      const metrics = loggerService.getMetrics();
      expect(metrics.performanceMetrics.slowQueries).toBe(1);
    });
  });

  describe('Business and Security Logging', () => {
    it('should log business events correctly', () => {
      const eventData = { orderId: '12345', amount: 100 };
      const context: LogContext = { service: 'orders', userId: 'user123' };
      
      loggerService.logBusinessEvent('ORDER_CREATED', eventData, context);
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(
        'Business Event: ORDER_CREATED',
        { ...context, eventData }
      );
    });

    it('should log high severity security events as errors', () => {
      const context: LogContext = { service: 'auth', userId: 'user123' };
      
      loggerService.logSecurityEvent('UNAUTHORIZED_ACCESS', 'critical', context);
      
      expect(mockWinstonLogger.error).toHaveBeenCalledWith(
        'Security Event: UNAUTHORIZED_ACCESS',
        { ...context, securityEvent: 'UNAUTHORIZED_ACCESS', severity: 'critical', error: undefined }
      );
    });

    it('should log low severity security events as warnings', () => {
      const context: LogContext = { service: 'auth', userId: 'user123' };
      
      loggerService.logSecurityEvent('FAILED_LOGIN', 'low', context);
      
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith(
        'Security Event: FAILED_LOGIN',
        { ...context, securityEvent: 'FAILED_LOGIN', severity: 'low' }
      );
    });
  });

  describe('Metrics Collection', () => {
    it('should update hourly log counts', () => {
      const fixedTime = new Date('2023-01-01T10:30:00Z');
      vi.setSystemTime(fixedTime);
      
      loggerService.info('Test message 1');
      loggerService.info('Test message 2');
      
      const metrics = loggerService.getMetrics();
      const expectedHour = '2023-01-01T10';
      expect(metrics.logsByHour[expectedHour]).toBe(2);
    });

    it('should track errors by service', () => {
      loggerService.error('Error 1', undefined, { service: 'service-a' });
      loggerService.error('Error 2', undefined, { service: 'service-a' });
      loggerService.error('Error 3', undefined, { service: 'service-b' });
      
      const metrics = loggerService.getMetrics();
      expect(metrics.errorsByService['service-a']).toBe(2);
      expect(metrics.errorsByService['service-b']).toBe(1);
    });

    it('should update last log time', () => {
      const fixedTime = new Date('2023-01-01T10:30:00Z');
      vi.setSystemTime(fixedTime);
      
      loggerService.info('Test message');
      
      const metrics = loggerService.getMetrics();
      expect(metrics.lastLogTime).toBe('2023-01-01T10:30:00.000Z');
    });
  });

  describe('Alert System', () => {
    beforeEach(() => {
      // Enable alerts
      loggerService.updateAlertConfig({ enabled: true });
    });

    it('should trigger alert for high error rate', () => {
      const alertSpy = vi.fn();
      loggerService.on('alert', alertSpy);
      
      // Generate 11 errors (above threshold of 10)
      for (let i = 0; i < 11; i++) {
        loggerService.error(`Error ${i}`, undefined, { service: 'test-service' });
      }
      
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIGH_ERROR_RATE',
          severity: 'critical',
          threshold: 10,
          actual: 10,
          service: 'test-service'
        })
      );
    });

    it('should trigger alert for high warning rate', () => {
      const alertSpy = vi.fn();
      loggerService.on('alert', alertSpy);
      
      // Generate 51 warnings (above threshold of 50)
      for (let i = 0; i < 51; i++) {
        loggerService.warn(`Warning ${i}`, { service: 'test-service' });
      }
      
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'HIGH_WARNING_RATE',
          severity: 'warning',
          threshold: 50,
          actual: 50,
          service: 'test-service'
        })
      );
    });

    it('should trigger alert for slow response', () => {
      const alertSpy = vi.fn();
      loggerService.on('alert', alertSpy);
      
      loggerService.info('Slow request', {
        service: 'api',
        operation: 'getData',
        duration: 6000 // Above 5000ms threshold
      });
      
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SLOW_RESPONSE',
          severity: 'warning',
          threshold: 5000,
          actual: 6000,
          service: 'api',
          operation: 'getData'
        })
      );
    });

    it('should respect alert cooldown period', () => {
      const alertSpy = vi.fn();
      loggerService.on('alert', alertSpy);
      
      // First batch of errors - should trigger alert
      for (let i = 0; i < 11; i++) {
        loggerService.error(`Error ${i}`, undefined, { service: 'test-service' });
      }
      
      expect(alertSpy).toHaveBeenCalledTimes(1);
      
      // Second batch within cooldown period - should not trigger alert
      for (let i = 0; i < 11; i++) {
        loggerService.error(`Error ${i + 11}`, undefined, { service: 'test-service' });
      }
      
      expect(alertSpy).toHaveBeenCalledTimes(1);
      
      // Advance time beyond cooldown period
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000); // 5 minutes + 1 second
      
      // Third batch after cooldown - should trigger alert again
      for (let i = 0; i < 11; i++) {
        loggerService.error(`Error ${i + 22}`, undefined, { service: 'test-service' });
      }
      
      expect(alertSpy).toHaveBeenCalledTimes(2);
    });

    it('should not trigger alerts when disabled', () => {
      loggerService.updateAlertConfig({ enabled: false });
      
      const alertSpy = vi.fn();
      loggerService.on('alert', alertSpy);
      
      // Generate errors above threshold
      for (let i = 0; i < 15; i++) {
        loggerService.error(`Error ${i}`);
      }
      
      expect(alertSpy).not.toHaveBeenCalled();
    });

    it('should send external alerts via webhook', async () => {
      const webhookUrl = 'https://webhook.example.com';
      loggerService.updateAlertConfig({ webhookUrl });
      
      (global.fetch as any).mockResolvedValue({ ok: true });
      
      // Trigger an alert
      for (let i = 0; i < 11; i++) {
        loggerService.error(`Error ${i}`);
      }
      
      // Wait for async operations
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(global.fetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('HIGH_ERROR_RATE')
        })
      );
    });

    it('should handle external alert failures gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const webhookUrl = 'https://webhook.example.com';
      loggerService.updateAlertConfig({ webhookUrl });
      
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      // Trigger an alert
      for (let i = 0; i < 11; i++) {
        loggerService.error(`Error ${i}`);
      }
      
      // Wait for async operations
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send external alert:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Management', () => {
    it('should update alert configuration', () => {
      const newConfig: Partial<AlertConfig> = {
        errorThreshold: 5,
        warningThreshold: 25,
        responseTimeThreshold: 3000,
        webhookUrl: 'https://new-webhook.com'
      };
      
      loggerService.updateAlertConfig(newConfig);
      
      const config = loggerService.getAlertConfig();
      expect(config.errorThreshold).toBe(5);
      expect(config.warningThreshold).toBe(25);
      expect(config.responseTimeThreshold).toBe(3000);
      expect(config.webhookUrl).toBe('https://new-webhook.com');
      expect(config.enabled).toBe(true); // Should preserve existing values
    });
  });

  describe('Data Retrieval', () => {
    it('should return recent logs within specified time window', () => {
      const fixedTime = new Date('2023-01-01T10:30:00Z');
      vi.setSystemTime(fixedTime);
      
      loggerService.info('Recent log 1');
      loggerService.warn('Recent log 2');
      
      // Advance time by 30 minutes
      vi.advanceTimersByTime(30 * 60 * 1000);
      
      loggerService.error('Old log');
      
      // Advance time by another 45 minutes (total 75 minutes)
      vi.advanceTimersByTime(45 * 60 * 1000);
      
      const recentLogs = loggerService.getRecentLogs(60); // Last 60 minutes
      
      expect(recentLogs).toHaveLength(1);
      expect(recentLogs[0].message).toBe('Old log');
    });

    it('should return health status correctly', () => {
      // Generate some logs
      loggerService.info('Info log');
      loggerService.warn('Warning log');
      loggerService.error('Error log 1');
      loggerService.error('Error log 2');
      
      const health = loggerService.getHealthStatus();
      
      expect(health.status).toBe('healthy'); // Less than 5 errors in last 5 minutes
      expect(health.metrics.totalLogs).toBe(4);
      expect(health.alerts).toBe(0);
    });

    it('should return unhealthy status with many recent errors', () => {
      // Generate 6 errors (more than 5 threshold)
      for (let i = 0; i < 6; i++) {
        loggerService.error(`Error ${i}`);
      }
      
      const health = loggerService.getHealthStatus();
      
      expect(health.status).toBe('unhealthy');
      expect(health.metrics.errorCount).toBe(6);
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up old log buffer entries', () => {
      const fixedTime = new Date('2023-01-01T10:00:00Z');
      vi.setSystemTime(fixedTime);
      
      // Add some logs
      loggerService.info('Old log 1');
      loggerService.info('Old log 2');
      
      // Advance time by 2 hours
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);
      
      loggerService.info('Recent log');
      
      // Trigger cleanup by advancing timer
      vi.advanceTimersByTime(60 * 1000); // 1 minute
      
      const recentLogs = loggerService.getRecentLogs(90); // Last 90 minutes
      expect(recentLogs).toHaveLength(1);
      expect(recentLogs[0].message).toBe('Recent log');
    });

    it('should clean up old hourly metrics', () => {
      const fixedTime = new Date('2023-01-01T10:00:00Z');
      vi.setSystemTime(fixedTime);
      
      // Add logs to create hourly metrics
      loggerService.info('Log 1');
      
      // Advance time by 25 hours
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      
      loggerService.info('Log 2');
      
      // Trigger cleanup
      vi.advanceTimersByTime(60 * 1000);
      
      const metrics = loggerService.getMetrics();
      const hourKeys = Object.keys(metrics.logsByHour);
      
      // Should only have recent hour
      expect(hourKeys).toHaveLength(1);
      expect(hourKeys[0]).toBe('2023-01-02T11');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getAdvancedLogger();
      const instance2 = getAdvancedLogger();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = getAdvancedLogger();
      instance1.info('Test message');
      
      const instance2 = getAdvancedLogger();
      const metrics = instance2.getMetrics();
      
      expect(metrics.totalLogs).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers in performance metrics', () => {
      const context: LogContext = { service: 'api', duration: Number.MAX_SAFE_INTEGER };
      
      expect(() => {
        loggerService.info('Large duration', context);
      }).not.toThrow();
    });

    it('should handle special characters in log messages', () => {
      const specialMessage = 'Test with special chars: ñáéíóú 中文 🚀 "quotes" \'apostrophes\'';
      
      expect(() => {
        loggerService.info(specialMessage);
      }).not.toThrow();
      
      expect(mockWinstonLogger.info).toHaveBeenCalledWith(specialMessage, undefined);
    });

    it('should handle null and undefined values in context', () => {
      const contextWithNulls: any = {
        service: null,
        operation: undefined,
        userId: '',
        metadata: { key: null, value: undefined }
      };
      
      expect(() => {
        loggerService.info('Test with nulls', contextWithNulls);
      }).not.toThrow();
    });

    it('should handle circular references in context metadata', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      const context: LogContext = {
        service: 'test',
        metadata: { circular: circularObj }
      };
      
      expect(() => {
        loggerService.info('Test with circular reference', context);
      }).not.toThrow();
    });
  });
});