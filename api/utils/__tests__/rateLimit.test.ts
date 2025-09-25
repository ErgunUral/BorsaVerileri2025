import { RateLimiter, executeWithRateLimit, throttleRequest } from '../rateLimit';

describe('RateLimit Utility Functions', () => {
  describe('RateLimiter Class', () => {
    it('should create instance with correct parameters', () => {
      const rateLimiter = new RateLimiter(1000, 60);
      expect(rateLimiter).toBeInstanceOf(RateLimiter);
    });

    it('should handle zero values', () => {
      const rateLimiter = new RateLimiter(0, 0);
      expect(rateLimiter).toBeInstanceOf(RateLimiter);
    });

    it('should have waitForNextRequest method', () => {
      const rateLimiter = new RateLimiter(1000, 60);
      expect(typeof rateLimiter.waitForNextRequest).toBe('function');
    });
  });

  describe('executeWithRateLimit Function', () => {
    it('should execute function successfully', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await executeWithRateLimit(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle function that returns immediately', async () => {
      const mockFn = jest.fn().mockReturnValue('immediate');
      
      const result = await executeWithRateLimit(mockFn);
      
      expect(result).toBe('immediate');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValue('success');
      
      const result = await executeWithRateLimit(mockFn, {
        maxRetries: 2,
        baseDelay: 10,
        maxDelay: 100
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const error = new Error('Persistent error');
      const mockFn = jest.fn().mockRejectedValue(error);
      
      await expect(executeWithRateLimit(mockFn, {
        maxRetries: 1,
        baseDelay: 10,
        maxDelay: 100
      })).rejects.toThrow('Persistent error');
      
      expect(mockFn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should respect custom retry condition', async () => {
      const networkError = new Error('Network error');
      const validationError = new Error('Validation error');
      
      const mockFn = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(validationError);
      
      const retryCondition = (error: any) => error.message.includes('Network');
      
      await expect(executeWithRateLimit(mockFn, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 100,
        retryCondition
      })).rejects.toThrow('Validation error');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should use default options', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await executeWithRateLimit(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttleRequest Function', () => {
    it('should be a function', () => {
      expect(typeof throttleRequest).toBe('function');
    });

    it('should return a promise', () => {
      const result = throttleRequest();
      expect(result).toBeInstanceOf(Promise);
      return result; // Ensure promise resolves
    });

    it('should resolve without errors', async () => {
      await expect(throttleRequest()).resolves.toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle synchronous errors', async () => {
      const mockFn = jest.fn(() => {
        throw new Error('Sync error');
      });
      
      await expect(executeWithRateLimit(mockFn, {
        maxRetries: 1,
        baseDelay: 10,
        maxDelay: 100
      })).rejects.toThrow('Sync error');
    });

    it('should handle zero retry options', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await executeWithRateLimit(mockFn, {
        maxRetries: 0,
        baseDelay: 0,
        maxDelay: 0
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle edge case parameters', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await executeWithRateLimit(mockFn, {
        maxRetries: 0,
        baseDelay: 1,
        maxDelay: 1
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});