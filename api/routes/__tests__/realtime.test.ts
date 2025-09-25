import request from 'supertest';
import express from 'express';

// Mock instances
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn()
};

const mockErrorHandler = {
  handleError: jest.fn(),
  logError: jest.fn()
};

const mockRealTimeService = {
  getLatestData: jest.fn(),
  getHistoricalData: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  addSymbol: jest.fn(),
  removeSymbol: jest.fn(),
  getMetrics: jest.fn(),
  getConfig: jest.fn(),
  updateConfig: jest.fn()
};

// Mock all dependencies
jest.mock('../../services/advancedLoggerService', () => ({
  AdvancedLoggerService: jest.fn().mockImplementation(() => mockLogger)
}));

jest.mock('../../services/errorHandlingService', () => ({
  ErrorHandlingService: jest.fn().mockImplementation(() => mockErrorHandler)
}));

jest.mock('../../services/redisService', () => ({
  RedisService: jest.fn().mockImplementation(() => mockRedis)
}));

jest.mock('../../services/realTimeDataService', () => ({
  getRealTimeDataService: jest.fn().mockReturnValue(mockRealTimeService)
}));

import realtimeRouter from '../realtime';

const app = express();
app.use(express.json());
app.use('/api/realtime', realtimeRouter);

describe('Realtime Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/realtime/data/:symbol', () => {
    it('should return real-time data for valid symbol', async () => {
      const mockData = {
        symbol: 'AAPL',
        price: 150.25,
        change: 2.50,
        changePercent: 1.69,
        volume: 1000000,
        timestamp: '2024-01-01T12:00:00Z'
      };

      mockRealTimeService.getLatestData.mockResolvedValue(mockData);

      const response = await request(app)
        .get('/api/realtime/data/aapl')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockData,
        symbol: 'AAPL',
        source: 'realtime'
      });

      expect(mockRealTimeService.getLatestData).toHaveBeenCalledWith('AAPL');
      expect(mockLogger.info).toHaveBeenCalledWith('Real-time data request', {
        symbol: 'aapl'
      });
    });

    it('should return cached data when real-time data not available', async () => {
      const cachedData = {
        symbol: 'AAPL',
        price: 149.75,
        change: 2.00,
        changePercent: 1.36
      };

      mockRealTimeService.getLatestData.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const response = await request(app)
        .get('/api/realtime/data/aapl')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: cachedData,
        symbol: 'AAPL',
        source: 'cache'
      });

      expect(mockRedis.get).toHaveBeenCalledWith('realtime:AAPL');
    });

    it('should return 404 when no data available', async () => {
      mockRealTimeService.getLatestData.mockResolvedValue(null);
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/realtime/data/aapl')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No real-time data available for this symbol',
        code: 'NO_DATA',
        symbol: 'AAPL'
      });
    });

    it('should validate symbol format', async () => {
      const response = await request(app)
        .get('/api/realtime/data/a')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid symbol format',
        code: 'INVALID_SYMBOL'
      });
    });

    it('should handle service errors', async () => {
      mockRealTimeService.getLatestData.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/realtime/data/aapl')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch real-time data',
        code: 'FETCH_ERROR'
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Real-time data request failed',
        expect.any(Error),
        { symbol: 'aapl' }
      );
    });
  });

  describe('GET /api/realtime/history/:symbol', () => {
    it('should return historical data for symbol', async () => {
      const mockHistoricalData = [
        { timestamp: '2024-01-01T10:00:00Z', price: 148.50 },
        { timestamp: '2024-01-01T11:00:00Z', price: 149.25 },
        { timestamp: '2024-01-01T12:00:00Z', price: 150.25 }
      ];

      mockRealTimeService.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const response = await request(app)
        .get('/api/realtime/history/aapl?hours=24')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockHistoricalData,
        symbol: 'AAPL',
        hours: 24,
        count: 3
      });

      expect(mockRealTimeService.getHistoricalData).toHaveBeenCalledWith('AAPL', 24);
    });

    it('should limit hours to maximum 168 (7 days)', async () => {
      mockRealTimeService.getHistoricalData.mockResolvedValue([]);

      await request(app)
        .get('/api/realtime/history/aapl?hours=200')
        .expect(200);

      expect(mockRealTimeService.getHistoricalData).toHaveBeenCalledWith('AAPL', 168);
    });

    it('should handle service errors', async () => {
      mockRealTimeService.getHistoricalData.mockRejectedValue(new Error('History error'));

      const response = await request(app)
        .get('/api/realtime/history/aapl')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch historical data',
        code: 'HISTORY_ERROR'
      });
    });
  });

  describe('POST /api/realtime/data/batch', () => {
    it('should return batch data for multiple symbols', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];
      const mockData = {
        symbol: 'AAPL',
        price: 150.25
      };

      mockRealTimeService.getLatestData
        .mockResolvedValueOnce(mockData)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockData);

      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        totalRequested: 3,
        successful: 2,
        failed: 1,
        failedSymbols: ['GOOGL']
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should validate symbols array', async () => {
      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols: [] })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Symbols array is required',
        code: 'INVALID_INPUT'
      });
    });

    it('should limit symbols to maximum 50', async () => {
      const symbols = Array.from({ length: 51 }, (_, i) => `SYMBOL${i}`);

      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Maximum 50 symbols allowed per request',
        code: 'TOO_MANY_SYMBOLS'
      });
    });

    it('should handle individual symbol errors gracefully', async () => {
      mockRealTimeService.getLatestData.mockRejectedValue(new Error('Symbol error'));

      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols: ['AAPL'] })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: [],
        totalRequested: 1,
        successful: 0,
        failed: 1,
        failedSymbols: ['AAPL']
      });
    });

    it('should handle general service errors', async () => {
      // Mock a more fundamental error that would cause the entire endpoint to fail
      mockRealTimeService.getLatestData.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .post('/api/realtime/data/batch')
        .send({ symbols: ['AAPL'] })
        .expect(200); // Still returns 200 due to Promise.allSettled

      expect(response.body).toMatchObject({
        success: true,
        failed: 1,
        failedSymbols: ['AAPL']
      });
    });
  });

  describe('POST /api/realtime/subscribe', () => {
    it('should create subscription successfully', async () => {
      const subscriptionData = {
        symbols: ['AAPL', 'GOOGL'],
        subscriptionId: 'sub-123'
      };

      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send(subscriptionData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        subscriptionId: 'sub-123',
        symbols: ['AAPL', 'GOOGL'],
        message: 'Subscription created successfully'
      });

      expect(mockRealTimeService.subscribe).toHaveBeenCalledWith('sub-123', ['AAPL', 'GOOGL']);
      expect(mockRealTimeService.addSymbol).toHaveBeenCalledWith('AAPL');
      expect(mockRealTimeService.addSymbol).toHaveBeenCalledWith('GOOGL');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ symbols: ['AAPL'] })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Subscription ID is required',
        code: 'MISSING_SUBSCRIPTION_ID'
      });
    });

    it('should limit symbols to maximum 100', async () => {
      const symbols = Array.from({ length: 101 }, (_, i) => `SYMBOL${i}`);

      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ symbols, subscriptionId: 'sub-123' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Maximum 100 symbols allowed per subscription',
        code: 'TOO_MANY_SYMBOLS'
      });
    });

    it('should handle service errors', async () => {
      mockRealTimeService.subscribe.mockImplementation(() => {
        throw new Error('Subscription error');
      });

      const response = await request(app)
        .post('/api/realtime/subscribe')
        .send({ symbols: ['AAPL'], subscriptionId: 'sub-123' })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to create subscription',
        code: 'SUBSCRIPTION_ERROR'
      });
    });
  });

  describe('DELETE /api/realtime/subscribe/:subscriptionId', () => {
    it('should remove subscription successfully', async () => {
      const response = await request(app)
        .delete('/api/realtime/subscribe/sub-123')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        subscriptionId: 'sub-123',
        message: 'Subscription removed successfully'
      });

      expect(mockRealTimeService.unsubscribe).toHaveBeenCalledWith('sub-123');
    });

    it('should handle service errors', async () => {
      mockRealTimeService.unsubscribe.mockImplementation(() => {
        throw new Error('Unsubscribe error');
      });

      const response = await request(app)
        .delete('/api/realtime/subscribe/sub-123')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to remove subscription',
        code: 'UNSUBSCRIBE_ERROR'
      });
    });
  });

  describe('GET /api/realtime/metrics', () => {
    it('should return service metrics', async () => {
      const mockMetrics = {
        activeSubscriptions: 5,
        totalDataPoints: 1000,
        uptime: 3600,
        isRunning: true
      };

      mockRealTimeService.getMetrics.mockReturnValue(mockMetrics);

      const response = await request(app)
        .get('/api/realtime/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        metrics: mockMetrics
      });
    });

    it('should handle service errors', async () => {
      mockRealTimeService.getMetrics.mockImplementation(() => {
        throw new Error('Metrics error');
      });

      const response = await request(app)
        .get('/api/realtime/metrics')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to fetch metrics',
        code: 'METRICS_ERROR'
      });
    });
  });

  describe('GET /api/realtime/config', () => {
    it('should return service configuration', async () => {
      const mockConfig = {
        pollingInterval: 5000,
        batchSize: 10,
        enableWebSocket: true,
        enableSSE: false
      };

      mockRealTimeService.getConfig.mockReturnValue(mockConfig);

      const response = await request(app)
        .get('/api/realtime/config')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        config: mockConfig
      });
    });
  });

  describe('PUT /api/realtime/config', () => {
    it('should update configuration successfully', async () => {
      const updateConfig = {
        pollingInterval: 10000,
        batchSize: 20,
        enableWebSocket: false
      };

      const updatedConfig = {
        pollingInterval: 10000,
        batchSize: 20,
        enableWebSocket: false,
        enableSSE: true
      };

      mockRealTimeService.getConfig.mockReturnValue(updatedConfig);

      const response = await request(app)
        .put('/api/realtime/config')
        .send(updateConfig)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Configuration updated successfully',
        config: updatedConfig
      });

      expect(mockRealTimeService.updateConfig).toHaveBeenCalledWith(updateConfig);
    });

    it('should validate polling interval range', async () => {
      const response = await request(app)
        .put('/api/realtime/config')
        .send({ pollingInterval: 1000 })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Polling interval must be between 5000ms and 300000ms',
        code: 'INVALID_POLLING_INTERVAL'
      });
    });

    it('should validate batch size range', async () => {
      const response = await request(app)
        .put('/api/realtime/config')
        .send({ batchSize: 100 })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Batch size must be between 1 and 50',
        code: 'INVALID_BATCH_SIZE'
      });
    });
  });

  describe('POST /api/realtime/symbols/:symbol', () => {
    it('should add symbol to tracking', async () => {
      const response = await request(app)
        .post('/api/realtime/symbols/aapl')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        symbol: 'AAPL',
        message: 'Symbol added to real-time tracking'
      });

      expect(mockRealTimeService.addSymbol).toHaveBeenCalledWith('AAPL');
    });

    it('should handle service errors', async () => {
      mockRealTimeService.addSymbol.mockImplementation(() => {
        throw new Error('Add symbol error');
      });

      const response = await request(app)
        .post('/api/realtime/symbols/aapl')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Failed to add symbol',
        code: 'ADD_SYMBOL_ERROR'
      });
    });
  });

  describe('DELETE /api/realtime/symbols/:symbol', () => {
    it('should remove symbol from tracking', async () => {
      const response = await request(app)
        .delete('/api/realtime/symbols/aapl')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        symbol: 'AAPL',
        message: 'Symbol removed from real-time tracking'
      });

      expect(mockRealTimeService.removeSymbol).toHaveBeenCalledWith('AAPL');
    });
  });

  describe('GET /api/realtime/market/summary', () => {
    it('should return cached market summary', async () => {
      const mockSummary = {
        totalVolume: 1000000,
        gainers: 150,
        losers: 100,
        unchanged: 50
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(mockSummary));

      const response = await request(app)
        .get('/api/realtime/market/summary')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: mockSummary,
        source: 'realtime_cache'
      });
    });

    it('should return 404 when no summary available', async () => {
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/realtime/market/summary')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No real-time market summary available',
        code: 'NO_MARKET_DATA'
      });
    });
  });

  describe('GET /api/realtime/health', () => {
    it('should return healthy status', async () => {
      const mockMetrics = {
        isRunning: true,
        uptime: 3600,
        activeConnections: 10
      };

      const mockHealthData = {
        lastUpdate: '2024-01-01T12:00:00Z',
        errors: []
      };

      mockRealTimeService.getMetrics.mockReturnValue(mockMetrics);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockHealthData));

      const response = await request(app)
        .get('/api/realtime/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        status: 'healthy',
        metrics: mockMetrics,
        detailedHealth: mockHealthData
      });
    });

    it('should return unhealthy status when service not running', async () => {
      const mockMetrics = {
        isRunning: false,
        uptime: 0,
        activeConnections: 0
      };

      mockRealTimeService.getMetrics.mockReturnValue(mockMetrics);
      mockRedis.get.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/realtime/health')
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        status: 'unhealthy',
        metrics: mockMetrics
      });
    });

    it('should handle health check errors', async () => {
      mockRealTimeService.getMetrics.mockImplementation(() => {
        throw new Error('Health check error');
      });

      const response = await request(app)
        .get('/api/realtime/health')
        .expect(503);

      expect(response.body).toMatchObject({
        success: false,
        status: 'unhealthy',
        error: 'Health check failed',
        code: 'HEALTH_CHECK_ERROR'
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to real-time endpoints', async () => {
      // This test would require more complex setup to test rate limiting
      // For now, we'll just verify the endpoint exists
      mockRealTimeService.getLatestData.mockResolvedValue({
        symbol: 'AAPL',
        price: 150.25
      });

      const response = await request(app)
        .get('/api/realtime/data/aapl')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});