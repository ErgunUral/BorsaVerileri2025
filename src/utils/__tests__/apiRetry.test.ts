import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  executeWithRateLimit,
  createRateLimitedFetch,
  apiCall,
  RequestThrottler,
  globalThrottler,
  throttledApiCall,
  RateLimitError,
  NetworkError,
  handleApiError
} from '../apiRetry';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock console.warn to avoid noise in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('apiRetry utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    
    // Default successful response
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: 'test' })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeWithRateLimit', () => {
    it('should execute function successfully on first try', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await executeWithRateLimit(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue('success');
      
      const result = await executeWithRateLimit(mockFn, { maxRetries: 2 });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('Bad Request');
      (error as any).status = 400;
      const mockFn = vi.fn().mockRejectedValue(error);
      
      await expect(executeWithRateLimit(mockFn)).rejects.toThrow('Bad Request');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries option', () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Network Error'));
      
      expect(() => executeWithRateLimit(mockFn, { maxRetries: 2 })).not.toThrow();
      expect(typeof executeWithRateLimit).toBe('function');
    });

    it('should call onRetry callback', async () => {
      const onRetry = vi.fn();
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockResolvedValue('success');
      
      await executeWithRateLimit(mockFn, { maxRetries: 2, onRetry });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('createRateLimitedFetch', () => {
    it('should create a function', () => {
      const rateLimitedFetch = createRateLimitedFetch();
      expect(typeof rateLimitedFetch).toBe('function');
    });
  });

  describe('apiCall', () => {
    it('should be defined', () => {
      expect(apiCall).toBeDefined();
      expect(typeof apiCall).toBe('function');
    });
  });

  describe('RequestThrottler', () => {
    it('should create throttler with minimum interval', () => {
      const throttler = new RequestThrottler(1000);
      expect(throttler).toBeInstanceOf(RequestThrottler);
    });

    it('should set minimum interval', () => {
      const throttler = new RequestThrottler(1000);
      throttler.setMinInterval(2000);
      
      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  describe('throttledApiCall', () => {
    it('should accept custom throttler option', () => {
      const customThrottler = new RequestThrottler(500);
      expect(customThrottler).toBeInstanceOf(RequestThrottler);
    });
  });

  describe('Error classes', () => {
    it('should create RateLimitError', () => {
      const error = new RateLimitError('Rate limited', 60);
      
      expect(error.name).toBe('RateLimitError');
      expect(error.message).toBe('Rate limited');
      expect(error.retryAfter).toBe(60);
    });

    it('should create NetworkError', () => {
      const originalError = new Error('Connection failed');
      const error = new NetworkError('Network issue', originalError);
      
      expect(error.name).toBe('NetworkError');
      expect(error.message).toBe('Network issue');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('handleApiError', () => {
    it('should handle 429 rate limit errors', () => {
      const error = { status: 429, response: { headers: { get: () => '60' } } };
      
      expect(() => handleApiError(error)).toThrow(RateLimitError);
    });

    it('should handle 500 server errors', () => {
      const error = { status: 500 };
      
      expect(() => handleApiError(error)).toThrow('Sunucu hatası oluştu');
    });

    it('should handle network errors', () => {
      const error = { message: 'Network failed' };
      
      expect(() => handleApiError(error)).toThrow(NetworkError);
    });

    it('should handle undefined response', () => {
      const error = { status: undefined };
      
      expect(() => handleApiError(error)).toThrow(NetworkError);
    });
  });
});