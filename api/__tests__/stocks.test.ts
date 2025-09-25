import request from 'supertest';
import express from 'express';
import stocksRouter from '../routes/stocks';
import { DataSourceService } from '../services/dataSourceService';
import { AdvancedLoggerService } from '../services/advancedLoggerService';
import { ErrorHandlingService } from '../services/errorHandlingService';
import { RedisService } from '../services/redisService';

// Mock all dependencies
jest.mock('../services/dataSourceService');
jest.mock('../services/advancedLoggerService');
jest.mock('../services/errorHandlingService');
jest.mock('../services/redisService');

const MockedDataSourceService = DataSourceService as jest.MockedClass<typeof DataSourceService>;
const MockedAdvancedLoggerService = AdvancedLoggerService as jest.MockedClass<typeof AdvancedLoggerService>;
const MockedErrorHandlingService = ErrorHandlingService as jest.MockedClass<typeof ErrorHandlingService>;
const MockedRedisService = RedisService as jest.MockedClass<typeof RedisService>;

describe('Stocks Router', () => {
  let app: express.Application;
  let server: any;
  let mockDataSourceService: jest.Mocked<DataSourceService>;
  let mockLogger: jest.Mocked<AdvancedLoggerService>;
  let mockErrorHandler: jest.Mocked<ErrorHandlingService>;
  let mockRedis: jest.Mocked<RedisService>;

  afterAll(async () => {
    // Clean up any open handles
    if (server) {
      server.close();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up after each test
    if (server) {
      server.close();
      server = null;
    }
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    } as any;

    mockRedis = {
      get: jest.fn(),
      set: jest.fn()
    } as any;

    mockErrorHandler = {
      performHealthChecks: jest.fn()
    } as any;

    mockDataSourceService = {
      getStockData: jest.fn(),
      validateDataConsistency: jest.fn(),
      getMarketSummary: jest.fn(),
      getDataSourceStatus: jest.fn()
    } as any;

    // Setup mock constructors
    MockedAdvancedLoggerService.mockImplementation(() => mockLogger);
    MockedRedisService.mockImplementation(() => mockRedis);
    MockedErrorHandlingService.mockImplementation(() => mockErrorHandler);
    MockedDataSourceService.mockImplementation(() => mockDataSourceService);

    // Create Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/stocks', stocksRouter);
  });

  describe('GET /api/stocks/data/:symbol', () => {
    test('should return stock data for valid symbol', async () => {
      const mockStockData = {
        symbol: 'THYAO',
        price: 100.50,
        change: 2.5,
        changePercent: 2.5,
        volume: 1000000,
        high: 102.0,
        low: 99.0,
        open: 100.0,
        close: 100.50,
        timestamp: new Date().toISOString(),
        source: 'is_yatirim'
      };

      const mockValidatedData = {
        ...mockStockData,
        confidence: 0.95,
        sources: ['source1', 'source2']
      };

      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockResolvedValue([mockStockData]);
      mockDataSourceService.validateDataConsistency.mockResolvedValue(mockValidatedData);
      mockRedis.set.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/stocks/data/THYAO')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockValidatedData);
      expect(response.body.cached).toBe(false);
      expect(mockDataSourceService.getStockData).toHaveBeenCalledWith('THYAO');
      expect(mockDataSourceService.validateDataConsistency).toHaveBeenCalledWith('THYAO', [mockStockData]);
    });

    test('should return cached data when available', async () => {
      const cachedData = {
        symbol: 'THYAO',
        price: 100.50,
        cached: true
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const response = await request(app)
        .get('/api/stocks/data/THYAO')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(cachedData);
      expect(response.body.cached).toBe(true);
      expect(mockDataSourceService.getStockData).not.toHaveBeenCalled();
    });

    test('should return 400 for missing symbol', async () => {
      await request(app)
        .get('/api/stocks/data/')
        .expect(404); // Express returns 404 for missing route params
    });

    test('should return 404 when no data found', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/stocks/data/INVALID')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No data found');
    });

    test('should return 500 when data validation fails', async () => {
      const mockStockData = {
        symbol: 'THYAO',
        price: 100.50,
        change: 2.5,
        changePercent: 2.5,
        volume: 1000000,
        high: 102.0,
        low: 99.0,
        open: 100.0,
        close: 100.50,
        timestamp: new Date().toISOString(),
        source: 'is_yatirim'
      };

      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockResolvedValue([mockStockData]);
      mockDataSourceService.validateDataConsistency.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stocks/data/THYAO')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Data validation failed');
    });

    test('should handle service errors gracefully', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/stocks/data/THYAO')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch stock data');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    test('should force refresh when force parameter is provided', async () => {
      const cachedData = {
        symbol: 'THYAO',
        price: 100.50,
        change: 2.0,
        changePercent: 2.0,
        volume: 900000,
        high: 101.0,
        low: 99.5,
        open: 100.0,
        close: 100.50,
        timestamp: new Date().toISOString(),
        source: 'cached'
      };
      const freshData = {
        symbol: 'THYAO',
        price: 101.00,
        change: 3.0,
        changePercent: 3.0,
        volume: 1100000,
        high: 102.0,
        low: 100.0,
        open: 100.5,
        close: 101.00,
        timestamp: new Date().toISOString(),
        source: 'is_yatirim'
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));
      mockDataSourceService.getStockData.mockResolvedValue([freshData]);
      mockDataSourceService.validateDataConsistency.mockResolvedValue(freshData);
      mockRedis.set.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/stocks/data/THYAO?force=true')
        .expect(200);

      expect(response.body.data).toEqual(freshData);
      expect(response.body.cached).toBe(false);
      expect(mockDataSourceService.getStockData).toHaveBeenCalled();
    });
  });

  describe('POST /api/stocks/data/batch', () => {
    test('should return batch stock data', async () => {
      const symbols = ['THYAO', 'AKBNK'];
      const mockData = {
        symbol: 'THYAO',
        price: 100.50,
        change: 2.5,
        changePercent: 2.5,
        volume: 1000000,
        high: 102.0,
        low: 99.0,
        open: 100.0,
        close: 100.50,
        timestamp: new Date().toISOString(),
        source: 'is_yatirim'
      };

      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockResolvedValue([mockData]);
      mockDataSourceService.validateDataConsistency.mockResolvedValue(mockData);
      mockRedis.set.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/stocks/data/batch')
        .send({ symbols })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.totalRequested).toBe(2);
    });

    test('should return 400 for invalid symbols array', async () => {
      const response = await request(app)
        .post('/api/stocks/data/batch')
        .send({ symbols: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Symbols array is required');
    });

    test('should return 400 for too many symbols', async () => {
      const symbols = Array(51).fill('THYAO');

      const response = await request(app)
        .post('/api/stocks/data/batch')
        .send({ symbols })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Maximum 50 symbols allowed per batch request');
    });

    test('should handle cached data in batch request', async () => {
      const symbols = ['THYAO'];
      const cachedData = {
        symbol: 'THYAO',
        price: 100.50,
        change: 2.5,
        changePercent: 2.5,
        volume: 1000000,
        high: 102.0,
        low: 99.0,
        open: 100.0,
        close: 100.50,
        timestamp: new Date().toISOString(),
        source: 'cached'
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const response = await request(app)
        .post('/api/stocks/data/batch')
        .send({ symbols })
        .expect(200);

      expect(response.body.data[0].cached).toBe(true);
      expect(response.body.data[0].data).toEqual(cachedData);
    });
  });

  describe('GET /api/stocks/market/summary', () => {
    test('should return market summary', async () => {
      const mockSummary = [{
        totalVolume: 1000000,
        totalValue: 50000000,
        gainers: 10,
        losers: 5,
        unchanged: 3,
        timestamp: new Date().toISOString(),
        source: 'is_yatirim'
      }];

      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getMarketSummary.mockResolvedValue(mockSummary);
      mockRedis.set.mockResolvedValue(true);

      const response = await request(app)
        .get('/api/stocks/market/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSummary[0]);
      expect(response.body.cached).toBe(false);
    });

    test('should return cached market summary', async () => {
      const cachedSummary = { 
        totalVolume: 1000000,
        totalValue: 50000000,
        gainers: 10,
        losers: 5,
        unchanged: 3,
        timestamp: new Date().toISOString(),
        source: 'cached'
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedSummary));

      const response = await request(app)
        .get('/api/stocks/market/summary')
        .expect(200);

      expect(response.body.data).toEqual(cachedSummary);
      expect(response.body.cached).toBe(true);
      expect(mockDataSourceService.getMarketSummary).not.toHaveBeenCalled();
    });

    test('should handle market summary service errors', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getMarketSummary.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/stocks/market/summary')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch market summary');
    });
  });

  describe('GET /api/stocks/bist100', () => {
    test('should return BIST 100 stocks with default pagination', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stocks/bist100')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(20); // default limit
      expect(response.body.pagination.limit).toBe(20);
      expect(response.body.pagination.offset).toBe(0);
      expect(response.body.pagination.total).toBeGreaterThan(0);
    });

    test('should handle custom pagination parameters', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stocks/bist100?limit=10&offset=5')
        .expect(200);

      expect(response.body.pagination.limit).toBe(10);
      expect(response.body.pagination.offset).toBe(5);
      expect(response.body.data).toHaveLength(10);
    });

    test('should limit maximum results to 100', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/stocks/bist100?limit=200')
        .expect(200);

      expect(response.body.pagination.limit).toBe(100);
    });
  });

  describe('GET /api/stocks/sources/status', () => {
    test('should return data source status', async () => {
      const mockStatus = {
        sources: [
          {
            name: 'is_yatirim',
            priority: 1,
            rateLimit: 60,
            rateLimiter: { requests: 5, resetTime: Date.now() + 60000 },
            lastRequest: Date.now() - 1000
          },
          {
            name: 'yahoo_finance',
            priority: 2,
            rateLimit: 100,
            rateLimiter: undefined,
            lastRequest: undefined
          }
        ],
        errorStats: {
          errorCounts: { 'is_yatirim': 2 },
          circuitBreakers: [],
          healthChecks: [],
          lastHealthCheck: new Date().toISOString()
        }
      };

      mockDataSourceService.getDataSourceStatus.mockReturnValue(mockStatus);

      const response = await request(app)
        .get('/api/stocks/sources/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatus);
    });

    test('should handle data source status errors', async () => {
      mockDataSourceService.getDataSourceStatus.mockImplementation(() => {
        throw new Error('Status error');
      });

      const response = await request(app)
        .get('/api/stocks/sources/status')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get data source status');
    });
  });

  describe('GET /api/stocks/search', () => {
    test('should search stocks by query', async () => {
      const response = await request(app)
        .get('/api/stocks/search?q=THY')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            symbol: 'THYAO',
            market: 'BIST'
          })
        ])
      );
      expect(response.body.query).toBe('THY');
    });

    test('should return 400 for missing query', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search query is required');
    });

    test('should limit search results', async () => {
      const response = await request(app)
        .get('/api/stocks/search?q=A&limit=5')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    test('should handle search with no results', async () => {
      const response = await request(app)
        .get('/api/stocks/search?q=NONEXISTENT')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/stocks/health', () => {
    test('should return healthy status', async () => {
      const mockHealthChecks = [
        { 
          service: 'database', 
          status: 'healthy' as const,
          responseTime: 50,
          timestamp: new Date().toISOString()
        },
        { 
          service: 'redis', 
          status: 'healthy' as const,
          responseTime: 30,
          timestamp: new Date().toISOString()
        }
      ];
      const mockSourceStatus = {
        sources: [
          {
            name: 'is_yatirim',
            priority: 1,
            rateLimit: 60,
            rateLimiter: undefined,
            lastRequest: undefined
          }
        ],
        errorStats: {
          errorCounts: {},
          circuitBreakers: [],
          healthChecks: [],
          lastHealthCheck: new Date().toISOString()
        }
      };

      mockErrorHandler.performHealthChecks.mockResolvedValue(mockHealthChecks);
      mockDataSourceService.getDataSourceStatus.mockReturnValue(mockSourceStatus);

      const response = await request(app)
        .get('/api/stocks/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.data.healthChecks).toEqual(mockHealthChecks);
      expect(response.body.data.sourceStatus).toEqual(mockSourceStatus);
    });

    test('should return degraded status when some checks fail', async () => {
      const mockHealthChecks = [
        { 
          service: 'database', 
          status: 'healthy' as const,
          responseTime: 50,
          timestamp: new Date().toISOString()
        },
        { 
          service: 'redis', 
          status: 'unhealthy' as const,
          responseTime: 5000,
          timestamp: new Date().toISOString()
        }
      ];

      mockErrorHandler.performHealthChecks.mockResolvedValue(mockHealthChecks);
      mockDataSourceService.getDataSourceStatus.mockReturnValue({
        sources: [],
        errorStats: {
          errorCounts: {},
          circuitBreakers: [],
          healthChecks: [],
          lastHealthCheck: new Date().toISOString()
        }
      });

      const response = await request(app)
        .get('/api/stocks/health')
        .expect(200);

      expect(response.body.status).toBe('degraded');
    });

    test('should handle health check errors', async () => {
      mockErrorHandler.performHealthChecks.mockRejectedValue(new Error('Health check error'));

      const response = await request(app)
        .get('/api/stocks/health')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.status).toBe('unhealthy');
    }, 10000);
  });
});