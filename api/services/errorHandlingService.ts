import { AdvancedLoggerService, getAdvancedLogger } from './advancedLoggerService';
import { RedisService, getRedisService } from './redisService';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

interface ErrorContext {
  operation: string;
  source?: string;
  symbol?: string;
  attempt?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  timestamp: string;
}

class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private successCount: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'closed';
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

class ErrorHandlingService {
  private logger: AdvancedLoggerService;
  private redis: RedisService;
  
  constructor(logger: AdvancedLoggerService, redis: RedisService) {
    this.logger = logger;
    this.redis = redis;
  }
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private lastHealthCheck: number = 0;

  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  };

  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeout: 60000,
    monitoringPeriod: 300000
  };

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.logInfo('Operation succeeded after retry', {
            ...context,
            attempt,
            totalAttempts: retryConfig.maxAttempts
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        this.logger.logWarn('Operation failed, will retry', {
          ...context,
          attempt,
          totalAttempts: retryConfig.maxAttempts,
          error: lastError.message
        });
        
        this.incrementErrorCount(context.operation);
        
        if (attempt === retryConfig.maxAttempts) {
          break;
        }
        
        const delay = this.calculateDelay(attempt, retryConfig);
        await this.sleep(delay);
      }
    }
    
    this.logger.logError('Operation failed after all retries', lastError!, {
      ...context,
      totalAttempts: retryConfig.maxAttempts
    });
    
    throw lastError!;
  }

  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceName: string,
    context: ErrorContext,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName, config);
    
    try {
      return await circuitBreaker.execute(operation);
    } catch (error) {
      const cbState = circuitBreaker.getState();
      
      this.logger.logError('Circuit breaker operation failed', error as Error, {
        ...context,
        serviceName,
        circuitBreakerState: cbState.state,
        failures: cbState.failures
      });
      
      throw error;
    }
  }

  async executeWithRetryAndCircuitBreaker<T>(
    operation: () => Promise<T>,
    serviceName: string,
    context: ErrorContext,
    retryConfig?: Partial<RetryConfig>,
    circuitConfig?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    return this.executeWithCircuitBreaker(
      () => this.executeWithRetry(operation, context, retryConfig),
      serviceName,
      context,
      circuitConfig
    );
  }

  private getCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const cbConfig = { ...this.defaultCircuitBreakerConfig, ...config };
      this.circuitBreakers.set(serviceName, new CircuitBreaker(cbConfig));
    }
    return this.circuitBreakers.get(serviceName)!;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, config.maxDelay);
    
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private incrementErrorCount(operation: string) {
    const current = this.errorCounts.get(operation) || 0;
    this.errorCounts.set(operation, current + 1);
  }

  async performHealthChecks(): Promise<HealthCheckResult[]> {
    const now = Date.now();
    
    // Only perform health checks every 30 seconds
    if (now - this.lastHealthCheck < 30000) {
      return Array.from(this.healthChecks.values());
    }
    
    this.lastHealthCheck = now;
    const results: HealthCheckResult[] = [];
    
    // Check Redis health
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;
      
      const result: HealthCheckResult = {
        service: 'redis',
        status: responseTime < 100 ? 'healthy' : responseTime < 500 ? 'degraded' : 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
      
      this.healthChecks.set('redis', result);
      results.push(result);
    } catch (error) {
      const result: HealthCheckResult = {
        service: 'redis',
        status: 'unhealthy',
        responseTime: -1,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
      
      this.healthChecks.set('redis', result);
      results.push(result);
    }
    
    // Check external APIs health
    const apiEndpoints = [
      { name: 'is_yatirim', url: 'https://www.isyatirim.com.tr' },
      { name: 'yahoo_finance', url: 'https://finance.yahoo.com' },
      { name: 'investing_com', url: 'https://www.investing.com' }
    ];
    
    for (const endpoint of apiEndpoints) {
      try {
        const start = Date.now();
        const response = await fetch(endpoint.url, {
          method: 'HEAD'
        });
        const responseTime = Date.now() - start;
        
        const result: HealthCheckResult = {
          service: endpoint.name,
          status: response.ok && responseTime < 2000 ? 'healthy' : 
                 response.ok && responseTime < 5000 ? 'degraded' : 'unhealthy',
          responseTime,
          timestamp: new Date().toISOString()
        };
        
        this.healthChecks.set(endpoint.name, result);
        results.push(result);
      } catch (error) {
        const result: HealthCheckResult = {
          service: endpoint.name,
          status: 'unhealthy',
          responseTime: -1,
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        };
        
        this.healthChecks.set(endpoint.name, result);
        results.push(result);
      }
    }
    
    return results;
  }

  async handleCriticalError(error: Error, context: ErrorContext): Promise<void> {
    this.logger.logError('Critical error occurred', error, {
      ...context,
      severity: 'critical'
    });
    
    // Store critical error in Redis for monitoring
    try {
      const errorKey = `critical_error:${Date.now()}`;
      await this.redis.set(errorKey, JSON.stringify({
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
      }), 3600);
    } catch (redisError) {
      console.error('Failed to store critical error in Redis:', redisError);
    }
    
    // Send alert (in a real implementation, this would send to monitoring service)
    console.error('🚨 CRITICAL ERROR ALERT:', {
      operation: context.operation,
      error: error.message,
      timestamp: context.timestamp
    });
  }

  getErrorStatistics() {
    const circuitBreakerStates = Array.from(this.circuitBreakers.entries()).map(([name, cb]) => ({
      service: name,
      ...cb.getState()
    }));
    
    return {
      errorCounts: Object.fromEntries(this.errorCounts),
      circuitBreakers: circuitBreakerStates,
      healthChecks: Array.from(this.healthChecks.values()),
      lastHealthCheck: new Date(this.lastHealthCheck).toISOString()
    };
  }

  async gracefulShutdown(): Promise<void> {
    this.logger.logInfo('Starting graceful shutdown of error handling service');
    
    // Clear all intervals and timeouts
    this.circuitBreakers.clear();
    this.healthChecks.clear();
    this.errorCounts.clear();
    
    this.logger.logInfo('Error handling service shutdown completed');
  }

  // Utility method for wrapping async operations
  wrapOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options?: {
      serviceName?: string;
      retryConfig?: Partial<RetryConfig>;
      circuitConfig?: Partial<CircuitBreakerConfig>;
      metadata?: Record<string, any>;
    }
  ) {
    return async (): Promise<T> => {
      const context: ErrorContext = {
        operation: operationName,
        timestamp: new Date().toISOString(),
        ...options?.metadata
      };
      
      if (options?.serviceName) {
        return this.executeWithRetryAndCircuitBreaker(
          operation,
          options.serviceName,
          context,
          options.retryConfig,
          options.circuitConfig
        );
      } else {
        return this.executeWithRetry(operation, context, options?.retryConfig);
      }
    };
  }
}

// Singleton instance
let errorHandlingServiceInstance: ErrorHandlingService | null = null;

export const getErrorHandlingService = (): ErrorHandlingService => {
  if (!errorHandlingServiceInstance) {
    const logger = getAdvancedLogger();
    const redis = getRedisService();
    
    errorHandlingServiceInstance = new ErrorHandlingService(logger, redis);
  }
  return errorHandlingServiceInstance;
};

export { ErrorHandlingService, RetryConfig, CircuitBreakerConfig, ErrorContext, HealthCheckResult };
export default getErrorHandlingService;