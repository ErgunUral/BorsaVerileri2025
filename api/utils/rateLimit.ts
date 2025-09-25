// Rate limiting utility for API requests

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: any) => boolean;
}

interface RateLimitState {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
}

class RateLimiter {
  private state: RateLimitState = {
    lastRequestTime: 0,
    requestCount: 0,
    resetTime: 0
  };
  
  private readonly minInterval: number;
  private readonly maxRequestsPerMinute: number;
  
  constructor(minInterval: number = 1000, maxRequestsPerMinute: number = 30) {
    this.minInterval = minInterval;
    this.maxRequestsPerMinute = maxRequestsPerMinute;
  }
  
  async waitForNextRequest(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if a minute has passed
    if (now > this.state.resetTime) {
      this.state.requestCount = 0;
      this.state.resetTime = now + 60000; // Next minute
    }
    
    // Check if we've exceeded the rate limit
    if (this.state.requestCount >= this.maxRequestsPerMinute) {
      const waitTime = this.state.resetTime - now;
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.state.requestCount = 0;
        this.state.resetTime = Date.now() + 60000;
      }
    }
    
    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.state.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.state.lastRequestTime = Date.now();
    this.state.requestCount++;
  }
}

// Global rate limiter instance
const globalRateLimiter = new RateLimiter(1000, 30);

// Execute function with rate limiting and retry logic
export async function executeWithRateLimit<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  }
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      // Wait for rate limit before making request
      await globalRateLimiter.waitForNextRequest();
      
      // Execute the function
      return await fn();
      
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      if (attempt === options.maxRetries) {
        break;
      }
      
      // Check retry condition if provided
      if (options.retryCondition && !options.retryCondition(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt),
        options.maxDelay
      );
      
      console.log(`Request failed (attempt ${attempt + 1}/${options.maxRetries + 1}), retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Simple throttle function
export async function throttleRequest(): Promise<void> {
  await globalRateLimiter.waitForNextRequest();
}

export { RateLimiter, type RetryOptions, type RateLimitState };