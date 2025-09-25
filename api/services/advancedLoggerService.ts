import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  lastLogTime: string;
  logsByHour: Record<string, number>;
  errorsByService: Record<string, number>;
  performanceMetrics: {
    avgResponseTime: number;
    slowQueries: number;
    failedRequests: number;
  };
}

export interface AlertConfig {
  enabled: boolean;
  errorThreshold: number; // errors per minute
  warningThreshold: number; // warnings per minute
  responseTimeThreshold: number; // milliseconds
  webhookUrl?: string;
  emailRecipients?: string[];
  slackChannel?: string;
}

export interface LogContext {
  service?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  symbol?: string;
  duration?: number;
  metadata?: Record<string, any>;
  eventData?: any;
  severity?: string;
  attempt?: number;
  totalAttempts?: number;
  serviceName?: string;
  error?: string;
  circuitBreakerState?: string;
  failures?: number;
}

class AdvancedLoggerService extends EventEmitter {
  private logger!: winston.Logger;
  private metrics!: LogMetrics;
  private alertConfig!: AlertConfig;
  private logBuffer: any[] = [];
  private alertCooldown: Map<string, number> = new Map();
  private readonly COOLDOWN_PERIOD = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
    this.initializeMetrics();
    this.initializeAlertConfig();
    this.createLogger();
    this.startMetricsCollection();
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      debugCount: 0,
      lastLogTime: new Date().toISOString(),
      logsByHour: {},
      errorsByService: {},
      performanceMetrics: {
        avgResponseTime: 0,
        slowQueries: 0,
        failedRequests: 0
      }
    };
  }

  private initializeAlertConfig(): void {
    this.alertConfig = {
      enabled: true,
      errorThreshold: 10, // 10 errors per minute
      warningThreshold: 50, // 50 warnings per minute
      responseTimeThreshold: 5000, // 5 seconds
      webhookUrl: process.env['ALERT_WEBHOOK_URL'] || '',
      ...(process.env['ALERT_EMAIL_RECIPIENTS'] && { emailRecipients: process.env['ALERT_EMAIL_RECIPIENTS'].split(',') }),
      ...(process.env['ALERT_SLACK_CHANNEL'] && { slackChannel: process.env['ALERT_SLACK_CHANNEL'] })
    };
  }

  private createLogger(): void {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Custom format for structured logging
    const customFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, operation, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          service,
          operation,
          ...meta
        });
      })
    );

    this.logger = winston.createLogger({
      level: process.env['LOG_LEVEL'] || 'info',
      format: customFormat,
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),

        // Daily rotate file for all logs
        new DailyRotateFile({
          filename: path.join(logsDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info'
        }),

        // Daily rotate file for errors only
        new DailyRotateFile({
          filename: path.join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error'
        }),

        // Daily rotate file for performance logs
        new DailyRotateFile({
          filename: path.join(logsDir, 'performance-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '7d',
          level: 'debug',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      ]
    });
  }

  private updateMetrics(level: string, context?: LogContext): void {
    this.metrics.totalLogs++;
    this.metrics.lastLogTime = new Date().toISOString();

    // Update level counts
    switch (level) {
      case 'error':
        this.metrics.errorCount++;
        if (context?.service) {
          this.metrics.errorsByService[context.service] = 
            (this.metrics.errorsByService[context.service] || 0) + 1;
        }
        break;
      case 'warn':
        this.metrics.warningCount++;
        break;
      case 'info':
        this.metrics.infoCount++;
        break;
      case 'debug':
        this.metrics.debugCount++;
        break;
    }

    // Update hourly logs
    const hour = new Date().toISOString().slice(0, 13);
    this.metrics.logsByHour[hour] = (this.metrics.logsByHour[hour] || 0) + 1;

    // Update performance metrics
    if (context?.duration) {
      const currentAvg = this.metrics.performanceMetrics.avgResponseTime;
      const totalRequests = this.metrics.totalLogs;
      this.metrics.performanceMetrics.avgResponseTime = 
        (currentAvg * (totalRequests - 1) + context.duration) / totalRequests;

      if (context.duration > this.alertConfig.responseTimeThreshold) {
        this.metrics.performanceMetrics.slowQueries++;
      }
    }

    // Check for alerts
    this.checkAlerts(level, context);
  }

  private checkAlerts(level: string, context?: LogContext): void {
    if (!this.alertConfig.enabled) return;

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Check error threshold
    if (level === 'error') {
      const recentErrors = this.logBuffer.filter(
        log => log.level === 'error' && log.timestamp > oneMinuteAgo
      ).length;

      if (recentErrors >= this.alertConfig.errorThreshold) {
        this.sendAlert('HIGH_ERROR_RATE', {
          message: `High error rate detected: ${recentErrors} errors in the last minute`,
          threshold: this.alertConfig.errorThreshold,
          actual: recentErrors,
          service: context?.service
        });
      }
    }

    // Check warning threshold
    if (level === 'warn') {
      const recentWarnings = this.logBuffer.filter(
        log => log.level === 'warn' && log.timestamp > oneMinuteAgo
      ).length;

      if (recentWarnings >= this.alertConfig.warningThreshold) {
        this.sendAlert('HIGH_WARNING_RATE', {
          message: `High warning rate detected: ${recentWarnings} warnings in the last minute`,
          threshold: this.alertConfig.warningThreshold,
          actual: recentWarnings,
          service: context?.service
        });
      }
    }

    // Check response time
    if (context?.duration && context.duration > this.alertConfig.responseTimeThreshold) {
      this.sendAlert('SLOW_RESPONSE', {
        message: `Slow response detected: ${context.duration}ms`,
        threshold: this.alertConfig.responseTimeThreshold,
        actual: context.duration,
        service: context?.service,
        operation: context?.operation
      });
    }
  }

  private sendAlert(type: string, data: any): void {
    const cooldownKey = `${type}_${data.service || 'global'}`;
    const lastAlert = this.alertCooldown.get(cooldownKey);
    const now = Date.now();

    if (lastAlert && (now - lastAlert) < this.COOLDOWN_PERIOD) {
      return; // Still in cooldown period
    }

    this.alertCooldown.set(cooldownKey, now);

    const alert = {
      type,
      timestamp: new Date().toISOString(),
      severity: type.includes('ERROR') ? 'critical' : 'warning',
      ...data
    };

    // Emit alert event
    this.emit('alert', alert);

    // Log the alert
    this.logger.error('ALERT_TRIGGERED', alert);

    // Send to external systems (webhook, email, slack)
    this.sendExternalAlert(alert);
  }

  private async sendExternalAlert(alert: any): Promise<void> {
    try {
      // Webhook notification
      if (this.alertConfig.webhookUrl) {
        await fetch(this.alertConfig.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      }

      // Additional integrations can be added here
      // - Email notifications
      // - Slack notifications
      // - SMS alerts
      // - PagerDuty integration
    } catch (error) {
      console.error('Failed to send external alert:', error);
    }
  }

  private startMetricsCollection(): void {
    // Clean up old log buffer entries every minute
    setInterval(() => {
      const oneHourAgo = Date.now() - 3600000;
      this.logBuffer = this.logBuffer.filter(log => log.timestamp > oneHourAgo);

      // Clean up old hourly metrics (keep last 24 hours)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600000).toISOString().slice(0, 13);
      Object.keys(this.metrics.logsByHour).forEach(hour => {
        if (hour < twentyFourHoursAgo) {
          delete this.metrics.logsByHour[hour];
        }
      });
    }, 60000);
  }

  // Public logging methods
  public info(message: string, context?: LogContext): void {
    const logEntry = { level: 'info', message, timestamp: Date.now(), ...context };
    this.logBuffer.push(logEntry);
    this.updateMetrics('info', context);
    this.logger.info(message, context);
  }

  public warn(message: string, context?: LogContext): void {
    const logEntry = { level: 'warn', message, timestamp: Date.now(), ...context };
    this.logBuffer.push(logEntry);
    this.updateMetrics('warn', context);
    this.logger.warn(message, context);
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    const logEntry = { 
      level: 'error', 
      message, 
      timestamp: Date.now(), 
      error: error?.stack || error?.message,
      ...context 
    };
    this.logBuffer.push(logEntry);
    this.updateMetrics('error', context);
    this.logger.error(message, { error: error?.stack || error?.message, ...context });
  }

  public debug(message: string, context?: LogContext): void {
    const logEntry = { level: 'debug', message, timestamp: Date.now(), ...context };
    this.logBuffer.push(logEntry);
    this.updateMetrics('debug', context);
    this.logger.debug(message, context);
  }

  // Alias methods for backward compatibility
  public logInfo(message: string, context?: LogContext): void {
    this.info(message, context);
  }

  public logWarn(message: string, context?: LogContext): void {
    this.warn(message, context);
  }

  public logError(message: string, error?: Error, context?: LogContext): void {
    this.error(message, error, context);
  }

  public logDebug(message: string, context?: LogContext): void {
    this.debug(message, context);
  }

  // Performance logging
  public logPerformance(operation: string, duration: number, context?: LogContext): void {
    const perfContext = { ...context, operation, duration };
    this.debug(`Performance: ${operation} completed in ${duration}ms`, perfContext);
  }

  // Business logic logging
  public logBusinessEvent(event: string, data: any, context?: LogContext): void {
    this.info(`Business Event: ${event}`, { ...context, eventData: data });
  }

  // Security logging
  public logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const securityContext = { ...context, securityEvent: event, severity };
    if (severity === 'critical' || severity === 'high') {
      this.error(`Security Event: ${event}`, undefined, securityContext);
    } else {
      this.warn(`Security Event: ${event}`, securityContext);
    }
  }

  // Metrics and monitoring
  public getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  public getRecentLogs(minutes: number = 60): any[] {
    const cutoff = Date.now() - (minutes * 60000);
    return this.logBuffer.filter(log => log.timestamp > cutoff);
  }

  public updateAlertConfig(config: Partial<AlertConfig>): void {
    this.alertConfig = { ...this.alertConfig, ...config };
  }

  public getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  // Health check
  public getHealthStatus(): { status: string; metrics: LogMetrics; alerts: number } {
    const recentErrors = this.getRecentLogs(5).filter(log => log.level === 'error').length;
    const status = recentErrors > 5 ? 'unhealthy' : 'healthy';
    
    return {
      status,
      metrics: this.getMetrics(),
      alerts: this.alertCooldown.size
    };
  }
}

// Singleton instance
let advancedLoggerInstance: AdvancedLoggerService | null = null;

export function getAdvancedLogger(): AdvancedLoggerService {
  if (!advancedLoggerInstance) {
    advancedLoggerInstance = new AdvancedLoggerService();
  }
  return advancedLoggerInstance;
}

export { AdvancedLoggerService };