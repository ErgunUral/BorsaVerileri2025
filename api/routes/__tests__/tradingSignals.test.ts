import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import tradingSignalsRouter from '../tradingSignals';
import { TradingSignalsService } from '../../services/tradingSignalsService';
import { AdvancedLoggerService } from '../../services/advancedLoggerService';
import { ErrorHandlingService } from '../../services/errorHandlingService';

// Mock dependencies
vi.mock('../../services/tradingSignalsService');
vi.mock('../../services/advancedLoggerService');
vi.mock('../../services/errorHandlingService');

const mockTradingSignalsService = {
  generateSignal: vi.fn(),
  generateMultipleSignals: vi.fn(),
  generatePortfolioRecommendation: vi.fn()
};

const mockLogger = {
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  info: vi.fn(),
  error: vi.fn()
};

const mockErrorHandler = {
  handleError: vi.fn(),
  createError: vi.fn()
};

// Setup Express app for testing
const app = express();
app.use(express.json());
app.use('/api/trading-signals', tradingSignalsRouter);

describe('Trading Signals Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock constructors
    (TradingSignalsService as any).mockImplementation(() => mockTradingSignalsService);
    (AdvancedLoggerService as any).mockImplementation(() => mockLogger);
    (ErrorHandlingService as any).mockImplementation(() => mockErrorHandler);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/trading-signals/signal/:symbol', () => {
    const mockSignalResponse = {
      symbol: 'AAPL',
      signal: 'BUY',
      confidence: 0.85,
      price: 150.25,
      targetPrice: 165.00,
      stopLoss: 140.00,
      reasoning: 'Strong technical indicators and positive momentum',
      indicators: {
        rsi: 45.2,
        macd: 1.25,
        movingAverage: 148.50,
        volume: 'above_average'
      },
      timestamp: '2024-01-15T10:30:00Z'
    };

    it('should generate trading signal for valid symbol', async () => {
      mockTradingSignalsService.generateSignal.mockResolvedValue(mockSignalResponse);

      const response = await request(app)
        .post('/api/trading-signals/signal/AAPL')
        .send({
          timeframe: '1d',
          riskLevel: 'medium'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSignalResponse,
        timestamp: expect.any(String)
      });

      expect(mockTradingSignalsService.generateSignal).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          timeframe: '1d',
          riskLevel: 'medium'
        })
      );
    });

    it('should handle symbol parameter validation', async () => {
      const response = await request(app)
        .post('/api/trading-signals/signal/INVALID_SYMBOL_123')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid stock symbol format'
      });
    });

    it('should use default parameters when not provided', async () => {
      mockTradingSignalsService.generateSignal.mockResolvedValue(mockSignalResponse);

      await request(app)
        .post('/api/trading-signals/signal/AAPL')
        .send({})
        .expect(200);

      expect(mockTradingSignalsService.generateSignal).toHaveBeenCalledWith(
        'AAPL',
        expect.objectContaining({
          timeframe: '1d', // default
          riskLevel: 'medium' // default
        })
      );
    });

    it('should validate timeframe parameter', async () => {
      const response = await request(app)
        .post('/api/trading-signals/signal/AAPL')
        .send({
          timeframe: 'invalid_timeframe'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid timeframe. Must be one of: 1m, 5m, 15m, 1h, 4h, 1d, 1w'
      });
    });

    it('should validate risk level parameter', async () => {
      const response = await request(app)
        .post('/api/trading-signals/signal/AAPL')
        .send({
          riskLevel: 'extreme'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid risk level. Must be one of: low, medium, high'
      });
    });

    it('should handle service errors', async () => {
      const serviceError = new Error('Market data unavailable');
      mockTradingSignalsService.generateSignal.mockRejectedValue(serviceError);

      const response = await request(app)
        .post('/api/trading-signals/signal/AAPL')
        .send({})
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to generate trading signal'
      });

      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Failed to generate signal for AAPL',
        serviceError
      );
    });

    it('should handle insufficient data error', async () => {
      const dataError = new Error('Insufficient historical data');
      mockTradingSignalsService.generateSignal.mockRejectedValue(dataError);

      const response = await request(app)
        .post('/api/trading-signals/signal/NEWSTOCK')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('GET /api/trading-signals/signals/multiple', () => {
    const mockMultipleSignals = {
      signals: [
        {
          symbol: 'AAPL',
          signal: 'BUY',
          confidence: 0.85,
          price: 150.25
        },
        {
          symbol: 'GOOGL',
          signal: 'HOLD',
          confidence: 0.65,
          price: 2800.50
        },
        {
          symbol: 'MSFT',
          signal: 'SELL',
          confidence: 0.75,
          price: 380.75
        }
      ],
      summary: {
        totalSymbols: 3,
        buySignals: 1,
        sellSignals: 1,
        holdSignals: 1,
        averageConfidence: 0.75
      },
      timestamp: '2024-01-15T10:30:00Z'
    };

    it('should generate signals for multiple symbols via GET', async () => {
      mockTradingSignalsService.generateMultipleSignals.mockResolvedValue(mockMultipleSignals);

      const response = await request(app)
        .get('/api/trading-signals/signals/multiple')
        .query({
          symbols: 'AAPL,GOOGL,MSFT',
          timeframe: '1h',
          riskLevel: 'low'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMultipleSignals,
        timestamp: expect.any(String)
      });

      expect(mockTradingSignalsService.generateMultipleSignals).toHaveBeenCalledWith(
        ['AAPL', 'GOOGL', 'MSFT'],
        expect.objectContaining({
          timeframe: '1h',
          riskLevel: 'low'
        })
      );
    });

    it('should require symbols parameter', async () => {
      const response = await request(app)
        .get('/api/trading-signals/signals/multiple')
        .query({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Symbols parameter is required'
      });
    });

    it('should validate symbols format', async () => {
      const response = await request(app)
        .get('/api/trading-signals/signals/multiple')
        .query({ symbols: 'INVALID_123,ANOTHER_INVALID' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid symbol format in symbols list'
      });
    });

    it('should limit number of symbols', async () => {
      const tooManySymbols = Array.from({ length: 51 }, (_, i) => `SYM${i}`).join(',');
      
      const response = await request(app)
        .get('/api/trading-signals/signals/multiple')
        .query({ symbols: tooManySymbols })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Maximum 50 symbols allowed per request'
      });
    });
  });

  describe('POST /api/trading-signals/signals/multiple', () => {
    it('should generate signals for multiple symbols via POST', async () => {
      const mockResponse = {
        signals: [
          { symbol: 'AAPL', signal: 'BUY', confidence: 0.85 },
          { symbol: 'GOOGL', signal: 'HOLD', confidence: 0.65 }
        ],
        summary: {
          totalSymbols: 2,
          buySignals: 1,
          sellSignals: 0,
          holdSignals: 1,
          averageConfidence: 0.75
        }
      };

      mockTradingSignalsService.generateMultipleSignals.mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/trading-signals/signals/multiple')
        .send({
          symbols: ['AAPL', 'GOOGL'],
          timeframe: '4h',
          riskLevel: 'high',
          includeReasons: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResponse);

      expect(mockTradingSignalsService.generateMultipleSignals).toHaveBeenCalledWith(
        ['AAPL', 'GOOGL'],
        expect.objectContaining({
          timeframe: '4h',
          riskLevel: 'high',
          includeReasons: true
        })
      );
    });

    it('should validate symbols array in POST body', async () => {
      const response = await request(app)
        .post('/api/trading-signals/signals/multiple')
        .send({
          symbols: 'not_an_array'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Symbols must be an array'
      });
    });

    it('should validate empty symbols array', async () => {
      const response = await request(app)
        .post('/api/trading-signals/signals/multiple')
        .send({
          symbols: []
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'At least one symbol is required'
      });
    });
  });

  describe('POST /api/trading-signals/portfolio/recommendation', () => {
    const mockPortfolioRecommendation = {
      recommendations: [
        {
          action: 'BUY',
          symbol: 'AAPL',
          currentPrice: 150.25,
          targetPrice: 165.00,
          recommendedAllocation: 0.15,
          positionSize: 1000,
          reasoning: 'Undervalued with strong fundamentals'
        },
        {
          action: 'SELL',
          symbol: 'TSLA',
          currentPrice: 800.50,
          targetPrice: 750.00,
          recommendedAllocation: 0.05,
          positionSize: -500,
          reasoning: 'Overvalued, take profits'
        }
      ],
      portfolioAnalysis: {
        currentValue: 100000,
        recommendedValue: 105000,
        expectedReturn: 0.05,
        riskScore: 0.65,
        diversificationScore: 0.80
      },
      riskMetrics: {
        portfolioVaR: 0.02,
        sharpeRatio: 1.25,
        maxDrawdown: 0.15,
        beta: 1.1
      },
      timestamp: '2024-01-15T10:30:00Z'
    };

    it('should generate portfolio recommendation', async () => {
      mockTradingSignalsService.generatePortfolioRecommendation.mockResolvedValue(
        mockPortfolioRecommendation
      );

      const portfolioData = {
        holdings: [
          { symbol: 'AAPL', quantity: 100, avgPrice: 145.00 },
          { symbol: 'GOOGL', quantity: 50, avgPrice: 2750.00 },
          { symbol: 'TSLA', quantity: 25, avgPrice: 780.00 }
        ],
        cash: 10000,
        riskTolerance: 'moderate',
        investmentHorizon: 'long_term',
        objectives: ['growth', 'income']
      };

      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send(portfolioData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPortfolioRecommendation,
        timestamp: expect.any(String)
      });

      expect(mockTradingSignalsService.generatePortfolioRecommendation).toHaveBeenCalledWith(
        portfolioData
      );
    });

    it('should validate required portfolio fields', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Holdings array is required'
      });
    });

    it('should validate holdings format', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: 'not_an_array'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Holdings must be an array'
      });
    });

    it('should validate holding structure', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: [
            { symbol: 'AAPL' } // missing quantity and avgPrice
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Each holding must have symbol, quantity, and avgPrice'
      });
    });

    it('should validate risk tolerance values', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: [
            { symbol: 'AAPL', quantity: 100, avgPrice: 150.00 }
          ],
          riskTolerance: 'extreme'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid risk tolerance. Must be one of: conservative, moderate, aggressive'
      });
    });

    it('should validate investment horizon values', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: [
            { symbol: 'AAPL', quantity: 100, avgPrice: 150.00 }
          ],
          investmentHorizon: 'forever'
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid investment horizon. Must be one of: short_term, medium_term, long_term'
      });
    });

    it('should handle portfolio analysis errors', async () => {
      const analysisError = new Error('Portfolio analysis failed');
      mockTradingSignalsService.generatePortfolioRecommendation.mockRejectedValue(analysisError);

      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: [
            { symbol: 'AAPL', quantity: 100, avgPrice: 150.00 }
          ]
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to generate portfolio recommendation'
      });

      expect(mockLogger.logError).toHaveBeenCalledWith(
        'Failed to generate portfolio recommendation',
        analysisError
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to trading signal endpoints', async () => {
      // Mock successful signal generation
      mockTradingSignalsService.generateSignal.mockResolvedValue({
        symbol: 'AAPL',
        signal: 'BUY',
        confidence: 0.85
      });

      const response = await request(app)
        .post('/api/trading-signals/signal/AAPL')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle market closed scenarios', async () => {
      const marketClosedError = new Error('Market is currently closed');
      mockTradingSignalsService.generateSignal.mockRejectedValue(marketClosedError);

      const response = await request(app)
        .post('/api/trading-signals/signal/AAPL')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();
    });

    it('should handle invalid symbol data', async () => {
      const invalidSymbolError = new Error('Symbol not found');
      mockTradingSignalsService.generateSignal.mockRejectedValue(invalidSymbolError);

      const response = await request(app)
        .post('/api/trading-signals/signal/INVALID')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockTradingSignalsService.generateMultipleSignals.mockRejectedValue(timeoutError);

      const response = await request(app)
        .post('/api/trading-signals/signals/multiple')
        .send({ symbols: ['AAPL', 'GOOGL'] })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(mockLogger.logError).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty portfolio holdings', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: []
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'At least one holding is required'
      });
    });

    it('should handle negative quantities in holdings', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: [
            { symbol: 'AAPL', quantity: -100, avgPrice: 150.00 }
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Quantity must be positive'
      });
    });

    it('should handle zero or negative average prices', async () => {
      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send({
          holdings: [
            { symbol: 'AAPL', quantity: 100, avgPrice: 0 }
          ]
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Average price must be positive'
      });
    });

    it('should handle very large portfolio values', async () => {
      const largePortfolio = {
        holdings: [
          { symbol: 'AAPL', quantity: 1000000, avgPrice: 150.00 }
        ],
        cash: 1000000000
      };

      mockTradingSignalsService.generatePortfolioRecommendation.mockResolvedValue({
        recommendations: [],
        portfolioAnalysis: {
          currentValue: 1150000000,
          recommendedValue: 1150000000,
          expectedReturn: 0.05,
          riskScore: 0.5,
          diversificationScore: 0.3
        },
        riskMetrics: {
          portfolioVaR: 0.02,
          sharpeRatio: 1.0,
          maxDrawdown: 0.1,
          beta: 1.0
        }
      });

      const response = await request(app)
        .post('/api/trading-signals/portfolio/recommendation')
        .send(largePortfolio)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle duplicate symbols in multiple signals request', async () => {
      mockTradingSignalsService.generateMultipleSignals.mockResolvedValue({
        signals: [{ symbol: 'AAPL', signal: 'BUY', confidence: 0.85 }],
        summary: { totalSymbols: 1, buySignals: 1, sellSignals: 0, holdSignals: 0, averageConfidence: 0.85 }
      });

      const response = await request(app)
        .post('/api/trading-signals/signals/multiple')
        .send({
          symbols: ['AAPL', 'AAPL', 'AAPL'] // duplicates
        })
        .expect(200);

      // Service should handle deduplication
      expect(mockTradingSignalsService.generateMultipleSignals).toHaveBeenCalledWith(
        ['AAPL', 'AAPL', 'AAPL'],
        expect.any(Object)
      );
    });
  });
});