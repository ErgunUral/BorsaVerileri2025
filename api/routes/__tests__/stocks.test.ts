import request from 'supertest';
import express from 'express';
import stocksRouter from '../stocks';

// Mock the service modules
jest.mock('../../services/advancedLoggerService');
jest.mock('../../services/redisService');
jest.mock('../../services/errorHandlingService');
jest.mock('../../services/dataSourceService');

// Import mocked classes
import { AdvancedLoggerService } from '../../services/advancedLoggerService';
import { RedisService } from '../../services/redisService';
import { ErrorHandlingService } from '../../services/errorHandlingService';
import { DataSourceService } from '../../services/dataSourceService';

// Create mock instances
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    logInfo: jest.fn(),
    logWarn: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn()
  };

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn()
};

const mockErrorHandler = {
  performHealthChecks: jest.fn()
};

const mockDataSourceService = {
  getStockData: jest.fn(),
  validateDataConsistency: jest.fn(),
  getMarketSummary: jest.fn(),
  getDataSourceStatus: jest.fn(),
  searchStocks: jest.fn()
};

// Mock implementations
(AdvancedLoggerService as any).mockImplementation(() => mockLogger);
(RedisService as any).mockImplementation(() => mockRedis);
(ErrorHandlingService as any).mockImplementation(() => mockErrorHandler);
(DataSourceService as any).mockImplementation((_logger: any, _redis: any, _errorHandler: any) => mockDataSourceService);

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/stocks', stocksRouter);

describe('Stocks Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/stocks/data/:symbol', () => {
    it('should return cached stock data when available', async () => {
      const mockStockData = {
        symbol: 'AKBNK',
        price: 100.50,
        change: 2.5,
        volume: 1000000
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(mockStockData));
      
      const response = await request(app)
        .get('/api/stocks/data/akbnk')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(true);
    });

    it('should fetch fresh data when not cached', async () => {
      const mockStockDataArray = [{
        symbol: 'GARAN',
        price: 85.25,
        change: -1.2,
        volume: 500000
      }];
      
      const mockValidatedData = {
        symbol: 'GARAN',
        price: 85.25,
        change: -1.2,
        volume: 500000
      };
      
      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockResolvedValue(mockStockDataArray);
      mockDataSourceService.validateDataConsistency.mockResolvedValue(mockValidatedData);
      mockRedis.set.mockResolvedValue('OK');
      
      const response = await request(app)
        .get('/api/stocks/data/garan')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(false);
    });

    it('should return 404 when no data found', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/api/stocks/data/INVALID')
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No data found for symbol: INVALID');
    });

    it('should return 500 when data validation fails', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getStockData.mockResolvedValue([{ symbol: 'TEST' }]);
      mockDataSourceService.validateDataConsistency.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/stocks/data/TEST')
        .expect(500);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Data validation failed');
    });
  });

  describe('POST /api/stocks/data/batch', () => {
    it('should return batch stock data', async () => {
      const symbols = ['AKBNK', 'GARAN'];
      
      mockRedis.get.mockImplementation((key) => {
        if (key === 'stock_data:GARAN') {
          return Promise.resolve(JSON.stringify({ price: 85 }));
        }
        return Promise.resolve(null);
      });
      
      mockDataSourceService.getStockData.mockResolvedValue([{ symbol: 'AKBNK', price: 100 }]);
      mockDataSourceService.validateDataConsistency.mockResolvedValue({ symbol: 'AKBNK', price: 100 });
      mockRedis.set.mockResolvedValue('OK');
      
      const response = await request(app)
        .post('/api/stocks/data/batch')
        .send({ symbols })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 when symbols array is missing', async () => {
      const response = await request(app)
        .post('/api/stocks/data/batch')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Symbols array is required');
    });

    it('should return 400 when too many symbols provided', async () => {
      const symbols = Array(51).fill('AKBNK');
      
      const response = await request(app)
        .post('/api/stocks/data/batch')
        .send({ symbols })
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Maximum 50 symbols allowed per batch request');
    });
  });

  describe('GET /api/stocks/market/summary', () => {
    it('should return cached market summary when available', async () => {
      const mockSummary = {
        totalVolume: 1000000,
        totalValue: 50000000,
        gainers: 45,
        losers: 55
      };
      
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSummary));
      
      const response = await request(app)
        .get('/api/stocks/market/summary')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(true);
    });

    it('should fetch fresh market summary when not cached', async () => {
      const mockSummary = {
        totalVolume: 2000000,
        totalValue: 100000000,
        gainers: 60,
        losers: 40
      };
      
      mockRedis.get.mockResolvedValue(null);
      mockDataSourceService.getMarketSummary.mockResolvedValue(mockSummary);
      mockRedis.set.mockResolvedValue('OK');
      
      const response = await request(app)
        .get('/api/stocks/market/summary')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.cached).toBe(false);
    });
  });

  describe('GET /api/stocks/bist100', () => {
    it('should return BIST 100 stocks with default pagination', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({ price: 100 }));
      
      const response = await request(app)
        .get('/api/stocks/bist100')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should return BIST 100 stocks with custom pagination', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const response = await request(app)
        .get('/api/stocks/bist100?limit=10&offset=5')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });
  });

  describe('GET /api/stocks/sources/status', () => {
    it('should return data source status', async () => {
      const mockStatus = {
        sources: [
          { name: 'Source A', status: 'active', lastUpdate: '2024-01-01T00:00:00Z' },
          { name: 'Source B', status: 'inactive', lastUpdate: '2024-01-01T00:00:00Z' }
        ]
      };
      
      mockDataSourceService.getDataSourceStatus.mockReturnValue(mockStatus);
      
      const response = await request(app)
        .get('/api/stocks/sources/status')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatus);
    });
  });

  describe('GET /api/stocks/search', () => {
    it('should search stocks by query', async () => {
      const response = await request(app)
        .get('/api/stocks/search?q=AK')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.query).toBe('AK');
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .get('/api/stocks/search')
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Search query is required');
    });
  });

  describe('GET /api/stocks/health', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockHealthChecks = [
        { name: 'Database', status: 'healthy' },
        { name: 'Redis', status: 'healthy' }
      ];
      
      const mockSourceStatus = {
        sources: [{ name: 'Source A', status: 'active' }]
      };
      
      mockErrorHandler.performHealthChecks.mockResolvedValue(mockHealthChecks);
      mockDataSourceService.getDataSourceStatus.mockReturnValue(mockSourceStatus);
      
      const response = await request(app)
        .get('/api/stocks/health')
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
    });
  });
});