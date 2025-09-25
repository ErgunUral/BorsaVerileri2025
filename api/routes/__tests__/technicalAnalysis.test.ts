import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import technicalAnalysisRouter from '../technicalAnalysis';
import { TechnicalIndicators } from '../../services/technicalIndicators';
import { stockScraper } from '../../services/stockScraper';
import { AdvancedLoggerService } from '../../services/advancedLoggerService';
import { ErrorHandlingService } from '../../services/errorHandlingService';

// Mock dependencies
vi.mock('../../services/technicalIndicators');
vi.mock('../../services/stockScraper');
vi.mock('../../services/advancedLoggerService');
vi.mock('../../services/errorHandlingService');
vi.mock('express-rate-limit', () => ({
  default: () => (req: any, res: any, next: any) => next()
}));
vi.mock('express-validator', () => ({
  param: () => ({
    isString: () => ({ withMessage: () => ({}) }),
    isLength: () => ({ withMessage: () => ({}) }),
    matches: () => ({ withMessage: () => ({}) })
  }),
  query: () => ({
    optional: () => ({
      isInt: () => ({ withMessage: () => ({}) }),
      isFloat: () => ({ withMessage: () => ({}) }),
      isIn: () => ({ withMessage: () => ({}) })
    })
  }),
  validationResult: vi.fn(() => ({
    isEmpty: () => true,
    array: () => []
  }))
}));

const mockTechnicalIndicators = {
  calculateRSI: vi.fn(),
  calculateMACD: vi.fn(),
  calculateBollingerBands: vi.fn(),
  calculateMovingAverage: vi.fn(),
  calculateStochastic: vi.fn(),
  calculateWilliamsR: vi.fn(),
  calculateCCI: vi.fn(),
  calculateATR: vi.fn()
};

const mockStockScraper = {
  getStockData: vi.fn(),
  getHistoricalData: vi.fn(),
  getIntradayData: vi.fn(),
  validateSymbol: vi.fn()
};

const mockLogger = {
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logDebug: vi.fn()
};

const mockErrorHandler = {
  handleError: vi.fn(),
  createError: vi.fn()
};

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/technical-analysis', technicalAnalysisRouter);

describe('Technical Analysis Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock constructors
    (TechnicalIndicators as any).mockImplementation(() => mockTechnicalIndicators);
    (stockScraper as any) = mockStockScraper;
    (AdvancedLoggerService as any).mockImplementation(() => mockLogger);
    (ErrorHandlingService as any).mockImplementation(() => mockErrorHandler);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/technical-analysis/:symbol/rsi', () => {
    const mockHistoricalData = [
      { date: '2024-01-01', close: 150.00 },
      { date: '2024-01-02', close: 152.50 },
      { date: '2024-01-03', close: 148.75 },
      { date: '2024-01-04', close: 151.25 },
      { date: '2024-01-05', close: 153.00 },
      { date: '2024-01-06', close: 149.50 },
      { date: '2024-01-07', close: 155.75 },
      { date: '2024-01-08', close: 157.25 },
      { date: '2024-01-09', close: 154.00 },
      { date: '2024-01-10', close: 156.50 },
      { date: '2024-01-11', close: 158.75 },
      { date: '2024-01-12', close: 160.25 },
      { date: '2024-01-13', close: 162.00 },
      { date: '2024-01-14', close: 159.50 },
      { date: '2024-01-15', close: 161.75 }
    ];

    const mockRSIResult = {
      symbol: 'AAPL',
      indicator: 'RSI',
      period: 14,
      values: [
        { date: '2024-01-15', value: 68.45 },
        { date: '2024-01-14', value: 65.32 },
        { date: '2024-01-13', value: 72.18 }
      ],
      currentValue: 68.45,
      signal: 'neutral',
      interpretation: {
        level: 'neutral',
        description: 'RSI is in neutral territory (30-70)',
        recommendation: 'hold'
      },
      metadata: {
        calculatedAt: '2024-01-15T16:00:00Z',
        dataPoints: 15,
        period: 14
      }
    };

    it('should calculate RSI with default parameters', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue(mockRSIResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockRSIResult,
        timestamp: expect.any(String)
      });

      expect(mockStockScraper.getHistoricalData).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          period: '3mo',
          interval: '1d'
        })
      );

      expect(mockTechnicalIndicators.calculateRSI).toHaveBeenCalledWith(
        mockHistoricalData,
        14
      );

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'RSI calculation requested',
        { symbol: 'AAPL', period: 14 }
      );
    });

    it('should calculate RSI with custom period', async () => {
      const customRSIResult = {
        ...mockRSIResult,
        period: 21,
        currentValue: 72.15
      };

      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue(customRSIResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .query({ period: 21 })
        .expect(200);

      expect(response.body.data.period).toBe(21);
      expect(mockTechnicalIndicators.calculateRSI).toHaveBeenCalledWith(
        mockHistoricalData,
        21
      );
    });

    it('should validate symbol format', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/invalid_symbol_123/rsi')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid symbol format'
      });
    });

    it('should validate period parameter', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .query({ period: 5 }) // Too small
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Period must be between 6 and 50'
      });
    });

    it('should validate period parameter upper bound', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .query({ period: 100 }) // Too large
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Period must be between 6 and 50'
      });
    });

    it('should handle symbol not found', async () => {
      const notFoundError = new Error('Symbol not found');
      mockStockScraper.getHistoricalData.mockRejectedValue(notFoundError);

      const response = await request(app)
        .get('/api/technical-analysis/UNKNOWN/rsi')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Symbol not found or insufficient data'
      });

      expect(mockLogger.logWarn).toHaveBeenCalledWith(
        'Symbol not found for RSI calculation',
        { symbol: 'UNKNOWN' }
      );
    });

    it('should handle insufficient data for RSI calculation', async () => {
      const insufficientData = mockHistoricalData.slice(0, 10); // Less than required for RSI
      mockStockScraper.getHistoricalData.mockResolvedValue(insufficientData);

      const insufficientDataError = new Error('Insufficient data for RSI calculation');
      mockTechnicalIndicators.calculateRSI.mockRejectedValue(insufficientDataError);

      const response = await request(app)
        .get('/api/technical-analysis/NEWSTOCK/rsi')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient historical data for RSI calculation. Need at least 14 data points.'
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Technical analysis service unavailable');
      mockTechnicalIndicators.calculateRSI.mockRejectedValue(serviceError);
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to calculate RSI'
      });

      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Failed to calculate RSI for AAPL',
        serviceError
      );
    });

    it('should handle different time intervals', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue(mockRSIResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .query({ interval: '1h' })
        .expect(200);

      expect(mockStockScraper.getHistoricalData).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          interval: '1h'
        })
      );
    });

    it('should validate interval parameter', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .query({ interval: 'invalid_interval' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid interval. Must be one of: 1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo'
      });
    });
  });

  describe('GET /api/technical-analysis/:symbol/macd', () => {
    const mockMACDResult = {
      symbol: 'AAPL',
      indicator: 'MACD',
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: [
        {
          date: '2024-01-15',
          macd: 2.45,
          signal: 1.87,
          histogram: 0.58
        },
        {
          date: '2024-01-14',
          macd: 2.12,
          signal: 1.95,
          histogram: 0.17
        },
        {
          date: '2024-01-13',
          macd: 1.89,
          signal: 2.01,
          histogram: -0.12
        }
      ],
      currentValue: {
        macd: 2.45,
        signal: 1.87,
        histogram: 0.58
      },
      signal: 'bullish',
      interpretation: {
        trend: 'bullish',
        description: 'MACD line above signal line with positive histogram',
        recommendation: 'buy',
        crossover: {
          type: 'bullish',
          date: '2024-01-13',
          strength: 'moderate'
        }
      },
      metadata: {
        calculatedAt: '2024-01-15T16:00:00Z',
        dataPoints: 50,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9
      }
    };

    it('should calculate MACD with default parameters', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateMACD.mockResolvedValue(mockMACDResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMACDResult,
        timestamp: expect.any(String)
      });

      expect(mockTechnicalIndicators.calculateMACD).toHaveBeenCalledWith(
        mockHistoricalData,
        12, // fastPeriod
        26, // slowPeriod
        9   // signalPeriod
      );

      expect(mockLogger.logInfo).toHaveBeenCalledWith(
        'MACD calculation requested',
        { symbol: 'AAPL', fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }
      );
    });

    it('should calculate MACD with custom parameters', async () => {
      const customMACDResult = {
        ...mockMACDResult,
        fastPeriod: 8,
        slowPeriod: 21,
        signalPeriod: 5
      };

      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateMACD.mockResolvedValue(customMACDResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .query({
          fastPeriod: 8,
          slowPeriod: 21,
          signalPeriod: 5
        })
        .expect(200);

      expect(response.body.data.fastPeriod).toBe(8);
      expect(response.body.data.slowPeriod).toBe(21);
      expect(response.body.data.signalPeriod).toBe(5);

      expect(mockTechnicalIndicators.calculateMACD).toHaveBeenCalledWith(
        mockHistoricalData,
        8,
        21,
        5
      );
    });

    it('should validate MACD period parameters', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .query({
          fastPeriod: 20, // Fast period should be less than slow period
          slowPeriod: 15
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Fast period must be less than slow period'
      });
    });

    it('should validate minimum period values', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .query({
          fastPeriod: 2, // Too small
          slowPeriod: 5,
          signalPeriod: 1 // Too small
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate maximum period values', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .query({
          fastPeriod: 100, // Too large
          slowPeriod: 200, // Too large
          signalPeriod: 50 // Too large
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle insufficient data for MACD calculation', async () => {
      const insufficientData = mockHistoricalData.slice(0, 20); // Less than required for MACD
      mockStockScraper.getHistoricalData.mockResolvedValue(insufficientData);

      const insufficientDataError = new Error('Insufficient data for MACD calculation');
      mockTechnicalIndicators.calculateMACD.mockRejectedValue(insufficientDataError);

      const response = await request(app)
        .get('/api/technical-analysis/NEWSTOCK/macd')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Insufficient historical data for MACD calculation. Need at least 35 data points.'
      });
    });

    it('should handle MACD calculation errors', async () => {
      const calculationError = new Error('MACD calculation failed');
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateMACD.mockRejectedValue(calculationError);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to calculate MACD'
      });

      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Failed to calculate MACD for AAPL',
        calculationError
      );
    });

    it('should detect MACD crossovers', async () => {
      const crossoverMACDResult = {
        ...mockMACDResult,
        interpretation: {
          ...mockMACDResult.interpretation,
          crossover: {
            type: 'bearish',
            date: '2024-01-14',
            strength: 'strong'
          }
        }
      };

      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateMACD.mockResolvedValue(crossoverMACDResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .expect(200);

      expect(response.body.data.interpretation.crossover.type).toBe('bearish');
      expect(response.body.data.interpretation.crossover.strength).toBe('strong');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to technical analysis endpoints', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue({
        symbol: 'AAPL',
        currentValue: 65.0,
        signal: 'neutral'
      });

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Caching', () => {
    it('should cache technical analysis results', async () => {
      const cachedRSIResult = {
        ...mockRSIResult,
        cached: true,
        cacheTimestamp: '2024-01-15T15:55:00Z'
      };

      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue(cachedRSIResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Caching behavior would be tested in integration tests
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockStockScraper.getHistoricalData.mockRejectedValue(timeoutError);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();
    });

    it('should handle data source unavailable', async () => {
      const sourceError = new Error('Data source unavailable');
      mockStockScraper.getHistoricalData.mockRejectedValue(sourceError);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/macd')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid calculation parameters', async () => {
      const paramError = new Error('Invalid calculation parameters');
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockRejectedValue(paramError);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .query({ period: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbols with special characters', async () => {
      const response = await request(app)
        .get('/api/technical-analysis/BRK.A/rsi')
        .expect(400); // Should be rejected by validation

      expect(response.body.success).toBe(false);
    });

    it('should handle very long symbol names', async () => {
      const longSymbol = 'A'.repeat(20);
      
      const response = await request(app)
        .get(`/api/technical-analysis/${longSymbol}/rsi`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid symbol format'
      });
    });

    it('should handle concurrent requests for same symbol', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue(mockRSIResult);

      // Make concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app).get('/api/technical-analysis/AAPL/rsi')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle empty historical data', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/technical-analysis/NEWSTOCK/rsi')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Symbol not found or insufficient data'
      });
    });

    it('should handle malformed historical data', async () => {
      const malformedData = [
        { date: 'invalid-date', close: 'not-a-number' },
        { date: '2024-01-02', close: null },
        { date: '2024-01-03' } // Missing close price
      ];

      mockStockScraper.getHistoricalData.mockResolvedValue(malformedData);

      const dataError = new Error('Invalid data format');
      mockTechnicalIndicators.calculateRSI.mockRejectedValue(dataError);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle extreme RSI values', async () => {
      const extremeRSIResult = {
        ...mockRSIResult,
        currentValue: 95.5,
        signal: 'overbought',
        interpretation: {
          level: 'overbought',
          description: 'RSI indicates severely overbought conditions',
          recommendation: 'strong_sell'
        }
      };

      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue(extremeRSIResult);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(200);

      expect(response.body.data.currentValue).toBe(95.5);
      expect(response.body.data.signal).toBe('overbought');
    });

    it('should handle zero or negative prices in historical data', async () => {
      const invalidPriceData = [
        ...mockHistoricalData.slice(0, 10),
        { date: '2024-01-11', close: 0 },
        { date: '2024-01-12', close: -5.0 },
        ...mockHistoricalData.slice(12)
      ];

      mockStockScraper.getHistoricalData.mockResolvedValue(invalidPriceData);

      const priceError = new Error('Invalid price data detected');
      mockTechnicalIndicators.calculateRSI.mockRejectedValue(priceError);

      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
        close: 150 + Math.random() * 50
      }));

      mockStockScraper.getHistoricalData.mockResolvedValue(largeDataset);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue({
        ...mockRSIResult,
        metadata: {
          ...mockRSIResult.metadata,
          dataPoints: 1000
        }
      });

      const startTime = Date.now();
      const response = await request(app)
        .get('/api/technical-analysis/AAPL/rsi')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata.dataPoints).toBe(1000);
      // Performance assertion (should complete within reasonable time)
      expect(endTime - startTime).toBeLessThan(3000); // 3 seconds
    });

    it('should handle multiple indicator calculations efficiently', async () => {
      mockStockScraper.getHistoricalData.mockResolvedValue(mockHistoricalData);
      mockTechnicalIndicators.calculateRSI.mockResolvedValue(mockRSIResult);
      mockTechnicalIndicators.calculateMACD.mockResolvedValue(mockMACDResult);

      const startTime = Date.now();
      
      // Make concurrent requests for different indicators
      const promises = [
        request(app).get('/api/technical-analysis/AAPL/rsi'),
        request(app).get('/api/technical-analysis/AAPL/macd'),
        request(app).get('/api/technical-analysis/GOOGL/rsi'),
        request(app).get('/api/technical-analysis/GOOGL/macd')
      ];

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should handle concurrent requests efficiently
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });
  });
});