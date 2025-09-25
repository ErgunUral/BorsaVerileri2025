/**
 * Global API retry utility with exponential backoff
 * Handles rate limiting and network errors gracefully
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 2, // 3'ten 2'ye düşürüldü
  baseDelay: 5000, // 5 seconds (1'den artırıldı)
  maxDelay: 30000, // 30 seconds
  retryCondition: (error: any) => {
    // Retry on network errors, 429 (rate limit), and 5xx server errors
    const status = error?.status || error?.response?.status;
    return (
      !status || // Network error
      status === 429 || // Rate limit
      (status >= 500 && status < 600) // Server errors
    );
  },
  onRetry: () => {}
};

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Calculate exponential backoff delay with jitter
 */
const calculateDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
};

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function executeWithRateLimit<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry if this is the last attempt or if retry condition is not met
      if (attempt > opts.maxRetries || !opts.retryCondition(error)) {
        throw error;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(attempt, opts.baseDelay, opts.maxDelay);
      
      // Call onRetry callback if provided
      opts.onRetry(attempt, error);
      
      console.warn(`API call failed (attempt ${attempt}/${opts.maxRetries + 1}), retrying in ${delay}ms:`, error);
      
      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a rate-limited fetch function
 */
export function createRateLimitedFetch(options: RetryOptions = {}) {
  return async function rateLimitedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    return executeWithRateLimit(async () => {
      const response = await fetch(input, init);
      
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }
      
      return response;
    }, options);
  };
}

/**
 * Utility for API calls with automatic JSON parsing
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit & { retryOptions?: RetryOptions } = {}
): Promise<T> {
  const { retryOptions, ...fetchOptions } = options;
  
  return executeWithRateLimit(async () => {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      (error as any).status = response.status;
      (error as any).response = response;
      
      // Try to get error message from response
      try {
        const errorData = await response.json();
        (error as any).data = errorData;
        if (errorData.error || errorData.message) {
          error.message = errorData.error || errorData.message;
        }
      } catch {
        // Ignore JSON parsing errors for error responses
      }
      
      throw error;
    }
    
    return response.json();
  }, retryOptions);
}

/**
 * Rate limiter for controlling request frequency
 */
export class RequestThrottler {
  private lastRequestTime = 0;
  private minInterval: number;

  constructor(minIntervalMs: number = 1000) {
    this.minInterval = minIntervalMs;
  }

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await sleep(waitTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  setMinInterval(intervalMs: number): void {
    this.minInterval = intervalMs;
  }
}

// Global throttler instance
export const globalThrottler = new RequestThrottler(3000); // 3 seconds between requests (2'den artırıldı)

/**
 * Throttled API call that respects rate limits
 */
export async function throttledApiCall<T = any>(
  url: string,
  options: RequestInit & { 
    retryOptions?: RetryOptions;
    throttler?: RequestThrottler;
  } = {}
): Promise<T> {
  const { retryOptions, throttler = globalThrottler, ...fetchOptions } = options;
  
  // Throttle the request
  await throttler.throttle();
  
  return apiCall<T>(url, { ...fetchOptions, retryOptions });
}

/**
 * Error types for better error handling
 */
export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ServerError extends Error {
  constructor(message: string, public status: number, public response?: Response) {
    super(message);
    this.name = 'ServerError';
  }
}

/**
 * Enhanced error handler that creates appropriate error types
 */
export function handleApiError(error: any): never {
  const status = error?.status || error?.response?.status;
  
  if (status === 429) {
    const retryAfter = error?.response?.headers?.get('Retry-After');
    throw new RateLimitError(
      'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
      retryAfter ? parseInt(retryAfter) * 1000 : undefined
    );
  }
  
  if (status >= 500) {
    throw new ServerError(
      'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.',
      status,
      error?.response
    );
  }
  
  if (!status) {
    throw new NetworkError(
      'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.',
      error
    );
  }
  
  throw error;
}