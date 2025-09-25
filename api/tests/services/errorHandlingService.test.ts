import { ErrorHandlingService, RetryConfig, CircuitBreakerConfig, ErrorContext, HealthCheckResult } from '../../services/errorHandlingService.js';
import { AdvancedLoggerService } from '../../services/advancedLoggerService.js';
import { RedisService } from '../../services/redisService.js';

// Mock dependencies
jest.mock('../../services/advancedLoggerService.js');
jest.mock('../../services/redisService.js');

// Mock global fetch
global.fetch = jest.fn();

describe('ErrorHandlingService', () => {
  let errorHandlingService: ErrorHandlingService;
  let mockLogger: jest.Mocked<AdvancedLoggerService>;
  let mockRedis: jest.Mocked<RedisService>;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  const mockContext: ErrorContext = {
    operation: 'test_operation',
    source: 'test_source',
    symbol: 'AAPL',
    timestamp: '2024-01-15T10:30:00Z',
    metadata: { test: 'data' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock instances
    mockLogger = new AdvancedLoggerService() as jest.Mocked<AdvancedLoggerService>;
    mockRedis = new RedisService() as jest.Mocked<RedisService>;
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;

    // Setup default mock implementations
    mockLogger.logInfo = jest.fn();
    mockLogger.logWarn = jest.fn();
    mockLogger.logError = jest.fn();

    mockRedis.ping = jest.fn().mockResolvedValue('PONG');
    mockRedis.setex = jest.fn().mockResolvedValue('OK');

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    } as Response);

    // Create service instance
    errorHandlingService = new ErrorHandlingService(mockLogger, mockRedis);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('executeWithRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await errorHandlingService.executeWithRetry(mockOperation, mockContext);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockLogger.logInfo).not.toHaveBeenCalled();
    });

    it('should retry operation on failure and succeed', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce('success');

      const result = await errorHandlingService.executeWithRetry(mockOperation, mockContext);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Operation failed, will retry',
        expect.objectContaining({
          operation: 'test_operation',
          attempt: 1,
          totalAttempts: 3
        })
      );
      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Operation succeeded after retry',
        expect.objectContaining({
          operation: 'test_operation',
          attempt: 2
        })
      );
    });

    it('should fail after all retry attempts', async () => {
      const mockError = new Error('Persistent failure');
      const mockOperation = jest.fn().mockRejectedValue(mockError);

      await expect(errorHandlingService.executeWithRetry(mockOperation, mockContext))
        .rejects.toThrow('Persistent failure');

      expect(mockOperation).toHaveBeenCalledTimes(3); // Default max attempts
      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Operation failed after all retries',
        mockError,
        expect.objectContaining({
          operation: 'test_operation',
          totalAttempts: 3
        })
      );
    });

    it('should respect custom retry configuration', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 5,
        baseDelay: 500
      };

      await expect(errorHandlingService.executeWithRetry(mockOperation, mockContext, customConfig))
        .rejects.toThrow('Failure');

      expect(mockOperation).toHaveBeenCalledTimes(5);
    });

    it('should apply exponential backoff with jitter', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      const startTime = Date.now();

      try {
        await errorHandlingService.executeWithRetry(mockOperation, mockContext);
      } catch (error) {
        // Expected to fail
      }

      // Fast forward timers to simulate delays
      jest.advanceTimersByTime(10000);

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute operation when circuit breaker is closed', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await errorHandlingService.executeWithCircuitBreaker(
        mockOperation,
        'test_service',
        mockContext
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit breaker after threshold failures', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service failure'));

      // Trigger failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandlingService.executeWithCircuitBreaker(
            mockOperation,
            'test_service',
            mockContext
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit breaker should now be open
      await expect(errorHandlingService.executeWithCircuitBreaker(
        mockOperation,
        'test_service',
        mockContext
      )).rejects.toThrow('Circuit breaker is open');
    });

    it('should transition to half-open after reset timeout', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Service failure'));

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await errorHandlingService.executeWithCircuitBreaker(
            mockOperation,
            'test_service',
            mockContext
          );
        } catch (error) {
          // Expected failures
        }
      }

      // Fast forward past reset timeout
      jest.advanceTimersByTime(61000); // 61 seconds

      // Should now allow operation (half-open state)
      mockOperation.mockResolvedValueOnce('success');
      const result = await errorHandlingService.executeWithCircuitBreaker(
        mockOperation,
        'test_service',
        mockContext
      );

      expect(result).toBe('success');
    });
  });

  describe('executeWithRetryAndCircuitBreaker', () => {
    it('should combine retry and circuit breaker functionality', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success');

      const result = await errorHandlingService.executeWithRetryAndCircuitBreaker(
        mockOperation,
        'test_service',
        mockContext
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('performHealthChecks', () => {
    it('should perform health checks for all services', async () => {
      mockRedis.ping.mockResolvedValue('PONG');
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200
      } as Response);

      const results = await errorHandlingService.performHealthChecks();

      expect(results).toHaveLength(4); // Redis + 3 external APIs
      expect(results[0]).toMatchObject({
        service: 'redis',
        status: 'healthy',
        responseTime: expect.any(Number)
      });
    });

    it('should mark services as unhealthy when they fail', async () => {
      mockRedis.ping.mockRejectedValue(new Error('Redis connection failed'));
      mockFetch.mockRejectedValue(new Error('Network error'));

      const results = await errorHandlingService.performHealthChecks();

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.status).toBe('unhealthy');
        expect(result.error).toBeDefined();
      });
    });

    it('should mark services as degraded for slow responses', async () => {
      mockRedis.ping.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('PONG'), 300);
        });
      });

      const results = await errorHandlingService.performHealthChecks();

      expect(results[0]).toMatchObject({
        service: 'redis',
        status: 'degraded'
      });
    });

    it('should cache health check results for 30 seconds', async () => {
      // First call
      await errorHandlingService.performHealthChecks();
      
      // Second call immediately after
      const results = await errorHandlingService.performHealthChecks();

      // Should return cached results without making new calls
      expect(mockRedis.ping).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(4);
    });
  });

  describe('handleCriticalError', () => {
    it('should log critical error and store in Redis', async () => {
      const criticalError = new Error('Critical system failure');

      await errorHandlingService.handleCriticalError(criticalError, mockContext);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Critical error occurred',
        criticalError,
        expect.objectContaining({
          operation: 'test_operation',
          severity: 'critical'
        })
      );

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^critical_error:/),
        3600,
        expect.stringContaining('Critical system failure')
      );
    });

    it('should handle Redis storage failure gracefully', async () => {
      const criticalError = new Error('Critical system failure');
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await errorHandlingService.handleCriticalError(criticalError, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to store critical error in Redis:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getErrorStatistics', () => {
    it('should return comprehensive error statistics', async () => {
      // Generate some errors to create statistics
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await errorHandlingService.executeWithRetry(mockOperation, mockContext);
      } catch (error) {
        // Expected failure
      }

      const stats = errorHandlingService.getErrorStatistics();

      expect(stats).toHaveProperty('errorCounts');
      expect(stats).toHaveProperty('circuitBreakers');
      expect(stats).toHaveProperty('healthChecks');
      expect(stats).toHaveProperty('lastHealthCheck');
      expect(stats.errorCounts).toHaveProperty('test_operation', 3); // 3 retry attempts
    });
  });

  describe('wrapOperation', () => {
    it('should wrap operation with retry only', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const wrappedOperation = errorHandlingService.wrapOperation(
        mockOperation,
        'wrapped_operation'
      );

      const result = await wrappedOperation();

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should wrap operation with retry and circuit breaker', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const wrappedOperation = errorHandlingService.wrapOperation(
        mockOperation,
        'wrapped_operation',
        {
          serviceName: 'test_service',
          retryConfig: { maxAttempts: 2 },
          metadata: { custom: 'data' }
        }
      );

      const result = await wrappedOperation();

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('gracefulShutdown', () => {
    it('should shutdown gracefully and clear all state', async () => {
      // Create some state first
      const mockOperation = jest.fn().mockRejectedValue(new Error('Test'));
      try {
        await errorHandlingService.executeWithCircuitBreaker(
          mockOperation,
          'test_service',
          mockContext
        );
      } catch (error) {
        // Expected failure
      }

      await errorHandlingService.gracefulShutdown();

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Starting graceful shutdown of error handling service'
      );
      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'Error handling service shutdown completed'
      );

      // Verify state is cleared
      const stats = errorHandlingService.getErrorStatistics();
      expect(Object.keys(stats.errorCounts)).toHaveLength(0);
      expect(stats.circuitBreakers).toHaveLength(0);
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle operation that throws non-Error objects', async () => {
      const mockOperation = jest.fn().mockRejectedValue('String error');

      await expect(errorHandlingService.executeWithRetry(mockOperation, mockContext))
        .rejects.toBe('String error');
    });

    it('should handle very large retry delays', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Failure'));
      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 2,
        baseDelay: 50000, // 50 seconds
        maxDelay: 10000   // Should cap at 10 seconds
      };

      const startTime = Date.now();
      
      try {
        await errorHandlingService.executeWithRetry(mockOperation, mockContext, customConfig);
      } catch (error) {
        // Expected to fail
      }

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent operations on same circuit breaker', async () => {
      const mockOperation1 = jest.fn().mockResolvedValue('success1');
      const mockOperation2 = jest.fn().mockResolvedValue('success2');

      const [result1, result2] = await Promise.all([
        errorHandlingService.executeWithCircuitBreaker(mockOperation1, 'shared_service', mockContext),
        errorHandlingService.executeWithCircuitBreaker(mockOperation2, 'shared_service', mockContext)
      ]);

      expect(result1).toBe('success1');
      expect(result2).toBe('success2');
    });
  });
});