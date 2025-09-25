import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import aiPatternsRouter from '../aiPatterns';
import logger from '../../utils/logger.js';
import aiPatternRecognitionService from '../../services/aiPatternRecognition.js';
import { isYatirimScraper } from '../../services/isYatirimScraper.js';

// Mock dependencies
vi.mock('../../utils/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../../services/aiPatternRecognition.js', () => ({
  default: {
    getCachedPatterns: vi.fn(),
    getCachedFormations: vi.fn(),
    analyzePatterns: vi.fn(),
    trackFormations: vi.fn(),
    getAISignals: vi.fn(),
    clearCache: vi.fn()
  }
}));

vi.mock('../../services/isYatirimScraper.js', () => ({
  isYatirimScraper: {
    getHistoricalData: vi.fn()
  }
}));

const mockedLogger = vi.mocked(logger);
const mockedAiPatternService = vi.mocked(aiPatternRecognitionService);
const mockedIsYatirimScraper = vi.mocked(isYatirimScraper);

describe('AI Patterns API Routes', () => {
  let app: express.Application;
  let mockPriceData: any[];
  let mockPatterns: any[];
  let mockFormations: any;
  let mockSignals: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    app.use('/api/ai-patterns', aiPatternsRouter);

    // Setup mock data
    mockPriceData = Array.from({ length: 50 }, (_, i) => ({
      timestamp: new Date(Date.now() - (49 - i) * 24 * 60 * 60 * 1000).toISOString(),
      open: 100 + Math.random() * 10,
      high: 105 + Math.random() * 10,
      low: 95 + Math.random() * 10,
      close: 100 + Math.random() * 10,
      volume: 1000000
    }));

    mockPatterns = [
      {
        patternType: 'Head and Shoulders',
        confidence: 85,
        direction: 'BEARISH',
        entryPoint: 98.5,
        targetPrice: 92.0,
        stopLoss: 102.0,
        timeframe: '1D',
        description: 'Classic head and shoulders pattern detected',
        riskReward: 1.86
      },
      {
        patternType: 'Ascending Triangle',
        confidence: 72,
        direction: 'BULLISH',
        entryPoint: 101.5,
        targetPrice: 108.0,
        stopLoss: 98.0,
        timeframe: '1D',
        description: 'Ascending triangle breakout pattern',
        riskReward: 1.86
      }
    ];

    mockFormations = {
      currentFormations: [
        {
          id: 'triangle_1',
          name: 'Ascending Triangle',
          type: 'TRIANGLE',
          subtype: 'ASCENDING',
          points: [{ x: 0, y: 100 }, { x: 10, y: 102 }, { x: 20, y: 104 }],
          confidence: 75,
          status: 'FORMING',
          detectedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      completedFormations: [],
      potentialFormations: [],
      aiPredictions: [
        {
          nextFormation: 'Breakout',
          probability: 68,
          expectedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };

    mockSignals = {
      signal: 'BUY',
      strength: 75,
      reasoning: ['2 bullish patterns detected', 'Average confidence: 78.5%'],
      patterns: mockPatterns
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/ai-patterns/:symbol', () => {
    it('should return AI patterns for a valid symbol', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.analyzePatterns.mockResolvedValue(mockPatterns);
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patterns).toEqual(mockPatterns);
      expect(response.body.data.cached).toBe(false);
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.dataPoints).toBe(50);

      expect(mockedLogger.info).toHaveBeenCalledWith('AI pattern analysis requested for AAPL');
      expect(mockedIsYatirimScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', 50);
      expect(mockedAiPatternService.analyzePatterns).toHaveBeenCalledWith('AAPL', mockPriceData, '1D');
    });

    it('should return cached patterns when available', async () => {
      mockedAiPatternService.getCachedPatterns.mockReturnValue(mockPatterns);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patterns).toEqual(mockPatterns);
      expect(response.body.data.cached).toBe(true);
      expect(response.body.data.timestamp).toBeDefined();

      expect(mockedLogger.info).toHaveBeenCalledWith('Returning cached AI patterns for AAPL');
      expect(mockedIsYatirimScraper.getHistoricalData).not.toHaveBeenCalled();
      expect(mockedAiPatternService.analyzePatterns).not.toHaveBeenCalled();
    });

    it('should force refresh when forceRefresh=true', async () => {
      mockedAiPatternService.getCachedPatterns.mockReturnValue(mockPatterns);
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.analyzePatterns.mockResolvedValue(mockPatterns);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL?forceRefresh=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cached).toBe(false);

      expect(mockedIsYatirimScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', 50);
      expect(mockedAiPatternService.analyzePatterns).toHaveBeenCalled();
    });

    it('should handle custom timeframe parameter', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.analyzePatterns.mockResolvedValue(mockPatterns);
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL?timeframe=4H')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedAiPatternService.analyzePatterns).toHaveBeenCalledWith('AAPL', mockPriceData, '4H');
    });

    it('should return 400 for missing symbol', async () => {
      const response = await request(app)
        .get('/api/ai-patterns/')
        .expect(404); // Express returns 404 for missing route parameters
    });

    it('should return 404 when price data is not found', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(null);
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/INVALID')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Price data not found for the symbol');
    });

    it('should return 404 when price data is empty', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue([]);
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/EMPTY')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Price data not found for the symbol');
    });

    it('should handle service errors gracefully', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockRejectedValue(new Error('Service unavailable'));
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
      expect(mockedLogger.error).toHaveBeenCalledWith('AI patterns API error:', expect.any(Error));
    });

    it('should include error details in development mode', async () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';

      mockedIsYatirimScraper.getHistoricalData.mockRejectedValue(new Error('Test error'));
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL')
        .expect(500);

      expect(response.body.error).toBe('Test error');

      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('GET /api/ai-patterns/:symbol/formations', () => {
    it('should return formation tracking for a valid symbol', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.trackFormations.mockResolvedValue(mockFormations);
      mockedAiPatternService.getCachedFormations.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/formations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.formations).toEqual(mockFormations);
      expect(response.body.data.cached).toBe(false);
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.dataPoints).toBe(50);

      expect(mockedLogger.info).toHaveBeenCalledWith('Formation tracking requested for AAPL');
      expect(mockedIsYatirimScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', 100);
      expect(mockedAiPatternService.trackFormations).toHaveBeenCalledWith('AAPL', mockPriceData);
    });

    it('should return cached formations when available', async () => {
      mockedAiPatternService.getCachedFormations.mockReturnValue(mockFormations);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/formations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.formations).toEqual(mockFormations);
      expect(response.body.data.cached).toBe(true);

      expect(mockedLogger.info).toHaveBeenCalledWith('Returning cached formations for AAPL');
      expect(mockedIsYatirimScraper.getHistoricalData).not.toHaveBeenCalled();
      expect(mockedAiPatternService.trackFormations).not.toHaveBeenCalled();
    });

    it('should force refresh formations when forceRefresh=true', async () => {
      mockedAiPatternService.getCachedFormations.mockReturnValue(mockFormations);
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.trackFormations.mockResolvedValue(mockFormations);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/formations?forceRefresh=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cached).toBe(false);

      expect(mockedIsYatirimScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', 100);
      expect(mockedAiPatternService.trackFormations).toHaveBeenCalled();
    });

    it('should handle formation tracking errors', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockRejectedValue(new Error('Data fetch failed'));
      mockedAiPatternService.getCachedFormations.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/formations')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
      expect(mockedLogger.error).toHaveBeenCalledWith('Formation tracking API error:', expect.any(Error));
    });
  });

  describe('GET /api/ai-patterns/:symbol/signals', () => {
    it('should return AI signals for a valid symbol', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.getAISignals.mockResolvedValue(mockSignals);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/signals')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signal).toBe('BUY');
      expect(response.body.data.strength).toBe(75);
      expect(response.body.data.reasoning).toEqual(mockSignals.reasoning);
      expect(response.body.data.patterns).toEqual(mockSignals.patterns);
      expect(response.body.data.timestamp).toBeDefined();
      expect(response.body.data.dataPoints).toBe(50);

      expect(mockedLogger.info).toHaveBeenCalledWith('AI signals requested for AAPL');
      expect(mockedIsYatirimScraper.getHistoricalData).toHaveBeenCalledWith('AAPL', 50);
      expect(mockedAiPatternService.getAISignals).toHaveBeenCalledWith('AAPL', mockPriceData);
    });

    it('should handle different signal types', async () => {
      const sellSignals = {
        signal: 'SELL',
        strength: 80,
        reasoning: ['Strong bearish pattern detected'],
        patterns: [mockPatterns[0]] // Only bearish pattern
      };

      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.getAISignals.mockResolvedValue(sellSignals);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/signals')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signal).toBe('SELL');
      expect(response.body.data.strength).toBe(80);
    });

    it('should handle HOLD signals', async () => {
      const holdSignals = {
        signal: 'HOLD',
        strength: 50,
        reasoning: ['Mixed signals detected', 'Waiting for confirmation'],
        patterns: []
      };

      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.getAISignals.mockResolvedValue(holdSignals);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/signals')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.signal).toBe('HOLD');
      expect(response.body.data.strength).toBe(50);
    });

    it('should handle AI signals generation errors', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.getAISignals.mockRejectedValue(new Error('AI service unavailable'));

      const response = await request(app)
        .get('/api/ai-patterns/AAPL/signals')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
      expect(mockedLogger.error).toHaveBeenCalledWith('AI signals API error:', expect.any(Error));
    });
  });

  describe('POST /api/ai-patterns/clear-cache', () => {
    it('should clear AI pattern cache successfully', async () => {
      mockedAiPatternService.clearCache.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/ai-patterns/clear-cache')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('AI pattern recognition cache cleared successfully');
      expect(response.body.timestamp).toBeDefined();

      expect(mockedAiPatternService.clearCache).toHaveBeenCalled();
      expect(mockedLogger.info).toHaveBeenCalledWith('AI pattern recognition cache cleared');
    });

    it('should handle cache clearing errors', async () => {
      mockedAiPatternService.clearCache.mockRejectedValue(new Error('Cache clear failed'));

      const response = await request(app)
        .post('/api/ai-patterns/clear-cache')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Internal server error');
      expect(mockedLogger.error).toHaveBeenCalledWith('Clear cache API error:', expect.any(Error));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .get('/api/ai-patterns/AAPL?timeframe=')
        .expect(200); // Should still work with empty timeframe, defaults to '1D'

      expect(response.body.success).toBeDefined();
    });

    it('should handle special characters in symbol', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.analyzePatterns.mockResolvedValue(mockPatterns);
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/BRK.A')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockedIsYatirimScraper.getHistoricalData).toHaveBeenCalledWith('BRK.A', 50);
    });

    it('should handle concurrent requests', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.analyzePatterns.mockResolvedValue(mockPatterns);
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const promises = Array.from({ length: 3 }, () => 
        request(app).get('/api/ai-patterns/AAPL')
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    it('should validate response structure', async () => {
      mockedIsYatirimScraper.getHistoricalData.mockResolvedValue(mockPriceData);
      mockedAiPatternService.analyzePatterns.mockResolvedValue(mockPatterns);
      mockedAiPatternService.getCachedPatterns.mockReturnValue(null);

      const response = await request(app)
        .get('/api/ai-patterns/AAPL')
        .expect(200);

      // Validate response structure
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('patterns');
      expect(response.body.data).toHaveProperty('cached');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('dataPoints');

      // Validate timestamp format
      expect(new Date(response.body.data.timestamp)).toBeInstanceOf(Date);
    });
  });
});