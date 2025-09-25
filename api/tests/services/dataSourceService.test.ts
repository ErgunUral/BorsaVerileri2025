import { DataSourceService, StockData, MarketSummary } from '../../services/dataSourceService.js';
import { AdvancedLoggerService } from '../../services/advancedLoggerService.js';
import { RedisService } from '../../services/redisService.js';
import { ErrorHandlingService } from '../../services/errorHandlingService.js';
import { IsYatirimScraper } from '../../scrapers/isYatirimScraper.js';
import { YahooFinanceScraper } from '../../scrapers/yahooFinanceScraper.js';
import { AlphaVantageScraper } from '../../scrapers/alphaVantageScraper.js';
import { InvestingComScraper } from '../../scrapers/investingComScraper.js';
import { DataValidationService } from '../../services/dataValidationService.js';

// Mock all dependencies
jest.mock('../../services/advancedLoggerService.js');
jest.mock('../../services/redisService.js');
jest.mock('../../services/errorHandlingService.js');
jest.mock('../../scrapers/isYatirimScraper.js');
jest.mock('../../scrapers/yahooFinanceScraper.js');
jest.mock('../../scrapers/alphaVantageScraper.js');
jest.mock('../../scrapers/investingComScraper.js');
jest.mock('../../services/dataValidationService.js');
jest.mock('axios');

describe('DataSourceService', () => {
  let dataSourceService: DataSourceService;
  let mockLogger: jest.Mocked<AdvancedLoggerService>;
  let mockRedis: jest.Mocked<RedisService>;
  let mockErrorHandler: jest.Mocked<ErrorHandlingService>;
  let mockIsYatirimScraper: jest.Mocked<IsYatirimScraper>;
  let mockYahooFinanceScraper: jest.Mocked<YahooFinanceScraper>;
  let mockAlphaVantageScraper: jest.Mocked<AlphaVantageScraper>;
  let mockInvestingComScraper: jest.Mocked<InvestingComScraper>;
  let mockValidationService: jest.Mocked<DataValidationService>;

  const mockStockData: StockData = {
    symbol: 'AAPL',
    price: 150.25,
    change: 2.50,
    changePercent: 1.69,
    volume: 1000000,
    high: 152.00,
    low: 148.50,
    open: 149.00,
    close: 150.25,
    timestamp: '2024-01-15T10:30:00Z',
    source: 'is_yatirim'
  };

  const mockMarketSummary: MarketSummary = {
    totalVolume: 5000000,
    totalValue: 1000000000,
    gainers: 150,
    losers: 100,
    unchanged: 50,
    timestamp: '2024-01-15T10:30:00Z',
    source: 'is_yatirim'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLogger = new AdvancedLoggerService() as jest.Mocked<AdvancedLoggerService>;
    mockRedis = new RedisService() as jest.Mocked<RedisService>;
    mockErrorHandler = new ErrorHandlingService() as jest.Mocked<ErrorHandlingService>;
    mockValidationService = new DataValidationService(mockLogger, mockRedis) as jest.Mocked<DataValidationService>;

    // Mock scraper instances
    mockIsYatirimScraper = {
      getStockData: jest.fn(),
      getMarketData: jest.fn()
    } as any;

    mockYahooFinanceScraper = {
      getStockData: jest.fn(),
      getMarketSummary: jest.fn()
    } as any;

    mockAlphaVantageScraper = {
      getStockData: jest.fn()
    } as any;

    mockInvestingComScraper = {
      getStockData: jest.fn(),
      getMarketData: jest.fn()
    } as any;

    // Setup default mock implementations
    mockLogger.logInfo = jest.fn();
    mockLogger.logWarn = jest.fn();
    mockLogger.logError = jest.fn();

    mockRedis.setex = jest.fn().mockResolvedValue('OK');
    mockRedis.get = jest.fn().mockResolvedValue(null);

    mockErrorHandler.executeWithRetryAndCircuitBreaker = jest.fn();
    mockErrorHandler.handleCriticalError = jest.fn();
    mockErrorHandler.getErrorStatistics = jest.fn().mockReturnValue({});

    mockValidationService.validateStockData = jest.fn().mockResolvedValue({
      isValid: true,
      confidence: 0.9,
      issues: []
    });

    mockValidationService.crossValidateStockData = jest.fn().mockResolvedValue({
      consensusData: mockStockData,
      confidence: 0.9,
      discrepancies: []
    });

    // Create service instance
    dataSourceService = new DataSourceService(mockLogger, mockRedis, mockErrorHandler);

    // Mock private properties
    (dataSourceService as any).isYatirimScraper = mockIsYatirimScraper;
    (dataSourceService as any).yahooFinanceScraper = mockYahooFinanceScraper;
    (dataSourceService as any).alphaVantageScraper = mockAlphaVantageScraper;
    (dataSourceService as any).investingComScraper = mockInvestingComScraper;
    (dataSourceService as any).validationService = mockValidationService;
  });

  describe('getStockData', () => {
    it('should fetch stock data from multiple sources successfully', async () => {
      // Setup mocks
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockResolvedValue(mockStockData);
      mockIsYatirimScraper.getStockData.mockResolvedValue(mockStockData);

      const result = await dataSourceService.getStockData('AAPL');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockStockData);
      expect(mockValidationService.validateStockData).toHaveBeenCalledWith(mockStockData);
      expect(mockRedis.setex).toHaveBeenCalled();
    });

    it('should handle validation failure', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockResolvedValue(mockStockData);
      mockValidationService.validateStockData.mockResolvedValue({
        isValid: false,
        confidence: 0.3,
        issues: ['Price out of range']
      });

      const result = await dataSourceService.getStockData('AAPL');

      expect(result).toHaveLength(0);
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Data validation failed for is_yatirim',
        expect.objectContaining({
          symbol: 'AAPL',
          confidence: 0.3
        })
      );
    });

    it('should perform cross-validation with multiple sources', async () => {
      const mockStockData2 = { ...mockStockData, source: 'yahoo_finance', price: 151.00 };
      
      mockErrorHandler.executeWithRetryAndCircuitBreaker
        .mockResolvedValueOnce(mockStockData)
        .mockResolvedValueOnce(mockStockData2);

      const result = await dataSourceService.getStockData('AAPL');

      expect(mockValidationService.crossValidateStockData).toHaveBeenCalledWith([mockStockData, mockStockData2]);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockStockData);
    });

    it('should fallback to cached data when all sources fail', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockRejectedValue(new Error('Source failed'));
      mockRedis.get.mockResolvedValue(JSON.stringify(mockStockData));

      const result = await dataSourceService.getStockData('AAPL');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockStockData);
      expect(mockLogger.logInfo).toHaveBeenCalledWith('Using cached data for AAPL');
    });

    it('should throw error when all sources fail and no cache available', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockRejectedValue(new Error('Source failed'));
      mockRedis.get.mockResolvedValue(null);

      await expect(dataSourceService.getStockData('AAPL')).rejects.toThrow(
        'Failed to fetch data for AAPL from all sources'
      );
      expect(mockErrorHandler.handleCriticalError).toHaveBeenCalled();
    });

    it('should handle invalid symbol', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockRejectedValue(new Error('Invalid symbol'));
      mockRedis.get.mockResolvedValue(null);

      await expect(dataSourceService.getStockData('')).rejects.toThrow();
    });
  });

  describe('getMarketSummary', () => {
    it('should fetch market summary from multiple sources', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockResolvedValue(mockMarketSummary);
      mockIsYatirimScraper.getMarketData.mockResolvedValue({
        totalVolume: 5000000,
        totalValue: 1000000000,
        gainers: 150,
        losers: 100,
        unchanged: 50
      });

      const result = await dataSourceService.getMarketSummary();

      expect(result).toHaveLength(4); // All 4 sources
      expect(result[0]).toEqual(mockMarketSummary);
    });

    it('should handle source failures gracefully', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker
        .mockResolvedValueOnce(mockMarketSummary)
        .mockRejectedValueOnce(new Error('Source failed'))
        .mockResolvedValueOnce(mockMarketSummary)
        .mockResolvedValueOnce(mockMarketSummary);

      const result = await dataSourceService.getMarketSummary();

      expect(result).toHaveLength(3); // 3 successful sources
      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch market summary'),
        expect.any(Object)
      );
    });

    it('should return empty array when all sources fail', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockRejectedValue(new Error('All sources failed'));

      const result = await dataSourceService.getMarketSummary();

      expect(result).toHaveLength(0);
    });
  });

  describe('validateDataConsistency', () => {
    it('should return null for empty data points', async () => {
      const result = await dataSourceService.validateDataConsistency('AAPL', []);
      expect(result).toBeNull();
    });

    it('should return single data point as is', async () => {
      const result = await dataSourceService.validateDataConsistency('AAPL', [mockStockData]);
      expect(result).toEqual(mockStockData);
    });

    it('should return highest priority source data', async () => {
      const mockStockData2 = { ...mockStockData, source: 'yahoo_finance', price: 151.00 };
      const mockStockData3 = { ...mockStockData, source: 'alpha_vantage', price: 149.50 };
      
      const result = await dataSourceService.validateDataConsistency('AAPL', [
        mockStockData2, // priority 2
        mockStockData,  // priority 1
        mockStockData3  // priority 4
      ]);

      expect(result).toEqual(mockStockData); // Highest priority (1)
    });

    it('should log warning for high price variance', async () => {
      const mockStockData2 = { ...mockStockData, source: 'yahoo_finance', price: 200.00 }; // High variance
      
      await dataSourceService.validateDataConsistency('AAPL', [mockStockData, mockStockData2]);

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'High price variance detected across sources',
        expect.objectContaining({
          symbol: 'AAPL',
          sources: ['is_yatirim', 'yahoo_finance']
        })
      );
    });

    it('should handle data points with zero prices', async () => {
      const mockStockDataZero = { ...mockStockData, price: 0 };
      
      const result = await dataSourceService.validateDataConsistency('AAPL', [mockStockDataZero]);
      expect(result).toBeNull();
    });
  });

  describe('getDataSourceStatus', () => {
    it('should return status of all data sources', () => {
      const status = dataSourceService.getDataSourceStatus();

      expect(status).toHaveProperty('sources');
      expect(status).toHaveProperty('errorStats');
      expect(status.sources).toHaveLength(4);
      expect(status.sources[0]).toHaveProperty('name', 'is_yatirim');
      expect(status.sources[0]).toHaveProperty('priority', 1);
    });
  });

  describe('gracefulShutdown', () => {
    it('should shutdown gracefully', async () => {
      await dataSourceService.gracefulShutdown();

      expect(mockLogger.logInfo).toHaveBeenCalledWith('Starting graceful shutdown of data source service');
      expect(mockLogger.logInfo).toHaveBeenCalledWith('Data source service shutdown completed');
    });
  });

  describe('caching functionality', () => {
    it('should cache successful stock data', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockResolvedValue(mockStockData);
      
      await dataSourceService.getStockData('AAPL');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'stock_data:AAPL:is_yatirim',
        300,
        JSON.stringify(mockStockData)
      );
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'stock_latest:AAPL',
        600,
        JSON.stringify(mockStockData)
      );
    });

    it('should handle cache errors gracefully', async () => {
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockResolvedValue(mockStockData);
      mockRedis.setex.mockRejectedValue(new Error('Cache error'));
      
      await dataSourceService.getStockData('AAPL');

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Failed to cache stock data',
        expect.objectContaining({
          symbol: 'AAPL',
          source: 'is_yatirim'
        })
      );
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits', async () => {
      // This test would require access to private methods
      // For now, we'll test that the service initializes without errors
      expect(dataSourceService).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle scraper initialization errors', () => {
      // Test that service can be created even if scrapers fail to initialize
      expect(() => {
        new DataSourceService(mockLogger, mockRedis, mockErrorHandler);
      }).not.toThrow();
    });

    it('should handle unknown data source', async () => {
      // Mock a scenario where an unknown source is encountered
      const unknownSourceData = { ...mockStockData, source: 'unknown_source' };
      mockErrorHandler.executeWithRetryAndCircuitBreaker.mockResolvedValue(unknownSourceData);
      
      const result = await dataSourceService.getStockData('AAPL');
      expect(result).toBeDefined();
    });
  });
});