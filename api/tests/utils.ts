import { Express } from 'express';
import request from 'supertest';
import Redis from 'ioredis';

// Mock data generators
export const generateMockStock = (overrides = {}) => ({
  symbol: 'AAPL',
  name: 'Apple Inc.',
  price: 150.25,
  change: 2.5,
  changePercent: 1.69,
  volume: 50000000,
  marketCap: 2500000000000,
  peRatio: 25.5,
  week52High: 180.0,
  week52Low: 120.0,
  dividendYield: 0.5,
  lastUpdated: new Date().toISOString(),
  ...overrides,
});

export const generateMockMarketData = (overrides = {}) => ({
  indices: [
    {
      symbol: 'BIST100',
      name: 'BIST 100',
      value: 8500.25,
      change: 125.5,
      changePercent: 1.5,
    },
    {
      symbol: 'BIST30',
      name: 'BIST 30',
      value: 12500.75,
      change: -85.25,
      changePercent: -0.68,
    },
  ],
  topGainers: [
    {
      symbol: 'THYAO',
      name: 'Türk Hava Yolları',
      price: 125.5,
      change: 8.5,
      changePercent: 7.26,
    },
  ],
  topLosers: [
    {
      symbol: 'AKBNK',
      name: 'Akbank',
      price: 45.2,
      change: -2.8,
      changePercent: -5.83,
    },
  ],
  ...overrides,
});

export const generateMockNews = (overrides = {}) => ({
  id: '1',
  title: 'Market Update',
  summary: 'Latest market developments',
  content: 'Detailed market analysis...',
  source: 'Financial Times',
  publishedAt: new Date().toISOString(),
  url: 'https://example.com/news/1',
  imageUrl: 'https://example.com/image.jpg',
  category: 'market',
  tags: ['stocks', 'market'],
  ...overrides,
});

// API response helpers
export const apiResponse = {
  success: (data: any, message = 'Success') => ({
    success: true,
    data,
    message,
  }),
  error: (message = 'An error occurred', status = 400) => ({
    success: false,
    data: null,
    message,
    error: message,
    status,
  }),
};

// Test helpers
export class TestHelper {
  private app: Express;
  private redisClient: Redis;

  constructor(app: Express, redisClient?: Redis) {
    this.app = app;
    this.redisClient = redisClient || new Redis();
  }

  // HTTP request helpers
  get(url: string) {
    return request(this.app).get(url);
  }

  post(url: string, data?: any) {
    return request(this.app).post(url).send(data);
  }

  put(url: string, data?: any) {
    return request(this.app).put(url).send(data);
  }

  delete(url: string) {
    return request(this.app).delete(url);
  }

  // Redis helpers
  async setRedisData(key: string, value: any, ttl?: number) {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl) {
      await this.redisClient.setex(key, ttl, serialized);
    } else {
      await this.redisClient.set(key, serialized);
    }
  }

  async getRedisData(key: string) {
    const data = await this.redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  async clearRedisData(pattern?: string) {
    if (pattern) {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } else {
      await this.redisClient.flushall();
    }
  }

  // WebSocket helpers
  createMockWebSocket() {
    const mockWs = {
      send: jest.fn(),
      close: jest.fn(),
      ping: jest.fn(),
      pong: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      readyState: 1, // OPEN
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    };
    return mockWs;
  }

  // Mock external API responses
  mockExternalApi(mockImplementation: any) {
    const axios = require('axios');
    axios.get.mockImplementation(mockImplementation);
    return axios.get;
  }

  // Wait for async operations
  async waitFor(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  async cleanup() {
    await this.clearRedisData();
    await this.redisClient.quit();
  }
}

// Mock external services
export const mockExternalServices = {
  stockApi: {
    getStock: jest.fn(),
    searchStocks: jest.fn(),
    getMarketData: jest.fn(),
  },
  newsApi: {
    getNews: jest.fn(),
    getStockNews: jest.fn(),
  },
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  },
};

// Database mock helpers
export const createMockDatabase = () => {
  const data = new Map();
  
  return {
    get: jest.fn((key: string) => data.get(key)),
    set: jest.fn((key: string, value: any) => data.set(key, value)),
    delete: jest.fn((key: string) => data.delete(key)),
    clear: jest.fn(() => data.clear()),
    has: jest.fn((key: string) => data.has(key)),
    size: () => data.size,
    keys: () => Array.from(data.keys()),
    values: () => Array.from(data.values()),
  };
};

// Error simulation helpers
export const simulateError = {
  networkError: () => {
    const error = new Error('Network Error');
    (error as any).code = 'ECONNREFUSED';
    return error;
  },
  timeoutError: () => {
    const error = new Error('Request Timeout');
    (error as any).code = 'ECONNABORTED';
    return error;
  },
  serverError: (status = 500, message = 'Internal Server Error') => {
    const error = new Error(message);
    (error as any).response = {
      status,
      data: { message },
    };
    return error;
  },
  redisError: () => {
    const error = new Error('Redis connection failed');
    (error as any).code = 'ECONNREFUSED';
    return error;
  },
};

// Performance testing helpers
export const performanceTest = {
  measureTime: async (fn: () => Promise<any>) => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
  },
  
  loadTest: async (fn: () => Promise<any>, concurrency = 10, iterations = 100) => {
    const results: any[] = [];
    const errors: any[] = [];
    
    const batches = Math.ceil(iterations / concurrency);
    
    for (let batch = 0; batch < batches; batch++) {
      const promises = [];
      const batchSize = Math.min(concurrency, iterations - batch * concurrency);
      
      for (let i = 0; i < batchSize; i++) {
        promises.push(
          fn().then(result => results.push(result)).catch(error => errors.push(error))
        );
      }
      
      await Promise.all(promises);
    }
    
    return { results, errors, successRate: results.length / iterations };
  },
};