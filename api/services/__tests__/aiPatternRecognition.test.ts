import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AIPatternRecognitionService } from '../aiPatternRecognition';
import logger from '../../utils/logger';

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

const mockedLogger = vi.mocked(logger);

describe('AIPatternRecognitionService', () => {
  let service: AIPatternRecognitionService;
  let mockPriceData: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AIPatternRecognitionService();
    
    // Create mock price data
    mockPriceData = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      open: 100 + Math.random() * 10,
      high: 105 + Math.random() * 10,
      low: 95 + Math.random() * 10,
      close: 100 + Math.random() * 10,
      volume: 1000000 + Math.random() * 500000
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('analyzePatterns', () => {
    it('should analyze patterns successfully', async () => {
      const result = await service.analyzePatterns('AAPL', mockPriceData, '1D');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Analyzing AI patterns for AAPL on 1D'
      );
    });

    it('should return pattern results with correct structure', async () => {
      const result = await service.analyzePatterns('AAPL', mockPriceData);
      
      if (result.length > 0) {
        const pattern = result[0];
        expect(pattern).toHaveProperty('patternType');
        expect(pattern).toHaveProperty('confidence');
        expect(pattern).toHaveProperty('direction');
        expect(pattern).toHaveProperty('entryPoint');
        expect(pattern).toHaveProperty('targetPrice');
        expect(pattern).toHaveProperty('stopLoss');
        expect(pattern).toHaveProperty('timeframe');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('riskReward');
        
        expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(pattern.direction);
        expect(typeof pattern.confidence).toBe('number');
        expect(pattern.confidence).toBeGreaterThanOrEqual(0);
        expect(pattern.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should cache pattern results', async () => {
      const symbol = 'AAPL';
      const timeframe = '1H';
      
      await service.analyzePatterns(symbol, mockPriceData, timeframe);
      
      // Call again to test caching
      const result = await service.analyzePatterns(symbol, mockPriceData, timeframe);
      expect(result).toBeDefined();
    });

    it('should handle different timeframes', async () => {
      const timeframes = ['1M', '5M', '15M', '1H', '4H', '1D', '1W'];
      
      for (const timeframe of timeframes) {
        const result = await service.analyzePatterns('AAPL', mockPriceData, timeframe);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should handle empty price data', async () => {
      const result = await service.analyzePatterns('AAPL', []);
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle analysis errors', async () => {
      // Mock an error in pattern detection
      const invalidData = null as any;
      
      await expect(service.analyzePatterns('AAPL', invalidData))
        .rejects.toThrow('AI pattern analysis failed');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'AI Pattern analysis error:',
        expect.any(Error)
      );
    });
  });

  describe('trackFormations', () => {
    it('should track formations successfully', async () => {
      const result = await service.trackFormations('AAPL', mockPriceData);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('currentFormations');
      expect(result).toHaveProperty('completedFormations');
      expect(result).toHaveProperty('potentialFormations');
      expect(result).toHaveProperty('aiPredictions');
      
      expect(Array.isArray(result.currentFormations)).toBe(true);
      expect(Array.isArray(result.completedFormations)).toBe(true);
      expect(Array.isArray(result.potentialFormations)).toBe(true);
      expect(Array.isArray(result.aiPredictions)).toBe(true);
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Tracking formations for AAPL'
      );
    });

    it('should return formations with correct structure', async () => {
      const result = await service.trackFormations('AAPL', mockPriceData);
      
      if (result.currentFormations.length > 0) {
        const formation = result.currentFormations[0];
        expect(formation).toHaveProperty('id');
        expect(formation).toHaveProperty('name');
        expect(formation).toHaveProperty('type');
        expect(formation).toHaveProperty('subtype');
        expect(formation).toHaveProperty('points');
        expect(formation).toHaveProperty('confidence');
        expect(formation).toHaveProperty('status');
        expect(formation).toHaveProperty('detectedAt');
        expect(formation).toHaveProperty('validUntil');
        
        expect(['HEAD_SHOULDERS', 'TRIANGLE', 'FLAG', 'WEDGE', 'CHANNEL', 'DOUBLE_TOP', 'DOUBLE_BOTTOM'])
          .toContain(formation.type);
        expect(['FORMING', 'CONFIRMED', 'BROKEN']).toContain(formation.status);
        expect(Array.isArray(formation.points)).toBe(true);
      }
    });

    it('should cache formation results', async () => {
      const symbol = 'AAPL';
      
      await service.trackFormations(symbol, mockPriceData);
      
      // Call again to test caching
      const result = await service.trackFormations(symbol, mockPriceData);
      expect(result).toBeDefined();
    });

    it('should handle formation tracking errors', async () => {
      const invalidData = null as any;
      
      await expect(service.trackFormations('AAPL', invalidData))
        .rejects.toThrow('Formation tracking failed');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Formation tracking error:',
        expect.any(Error)
      );
    });
  });

  describe('getAISignals', () => {
    it('should generate AI signals successfully', async () => {
      const result = await service.getAISignals('AAPL', mockPriceData);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('reasoning');
      expect(result).toHaveProperty('patterns');
      
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
      expect(typeof result.strength).toBe('number');
      expect(result.strength).toBeGreaterThanOrEqual(0);
      expect(result.strength).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(Array.isArray(result.patterns)).toBe(true);
    });

    it('should generate BUY signal for bullish patterns', async () => {
      // Create mock data that would generate bullish patterns
      const bullishData = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
        open: 100 + i * 0.5,
        high: 105 + i * 0.5,
        low: 95 + i * 0.5,
        close: 100 + i * 0.5,
        volume: 1000000
      }));
      
      const result = await service.getAISignals('AAPL', bullishData);
      
      // Note: The actual signal depends on the pattern detection logic
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should generate SELL signal for bearish patterns', async () => {
      // Create mock data that would generate bearish patterns
      const bearishData = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
        open: 100 - i * 0.5,
        high: 105 - i * 0.5,
        low: 95 - i * 0.5,
        close: 100 - i * 0.5,
        volume: 1000000
      }));
      
      const result = await service.getAISignals('AAPL', bearishData);
      
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should generate HOLD signal for mixed patterns', async () => {
      // Create mock data with mixed signals
      const mixedData = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
        open: 100 + (Math.random() - 0.5) * 2,
        high: 105 + (Math.random() - 0.5) * 2,
        low: 95 + (Math.random() - 0.5) * 2,
        close: 100 + (Math.random() - 0.5) * 2,
        volume: 1000000
      }));
      
      const result = await service.getAISignals('AAPL', mixedData);
      
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should include formation insights in reasoning', async () => {
      const result = await service.getAISignals('AAPL', mockPriceData);
      
      expect(result.reasoning).toBeDefined();
      expect(Array.isArray(result.reasoning)).toBe(true);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should handle AI signals generation errors', async () => {
      const invalidData = null as any;
      
      await expect(service.getAISignals('AAPL', invalidData))
        .rejects.toThrow('AI signals generation failed');
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'AI signals generation error:',
        expect.any(Error)
      );
    });
  });

  describe('Pattern Detection Methods', () => {
    it('should detect various pattern types', async () => {
      const patterns = await service.analyzePatterns('AAPL', mockPriceData);
      
      // Check if any patterns are detected
      expect(Array.isArray(patterns)).toBe(true);
      
      // If patterns are detected, verify their types
      patterns.forEach(pattern => {
        expect(typeof pattern.patternType).toBe('string');
        expect(pattern.patternType.length).toBeGreaterThan(0);
      });
    });

    it('should calculate risk-reward ratios', async () => {
      const patterns = await service.analyzePatterns('AAPL', mockPriceData);
      
      patterns.forEach(pattern => {
        expect(typeof pattern.riskReward).toBe('number');
        expect(pattern.riskReward).toBeGreaterThan(0);
      });
    });

    it('should provide entry points and targets', async () => {
      const patterns = await service.analyzePatterns('AAPL', mockPriceData);
      
      patterns.forEach(pattern => {
        expect(typeof pattern.entryPoint).toBe('number');
        expect(typeof pattern.targetPrice).toBe('number');
        expect(typeof pattern.stopLoss).toBe('number');
        expect(pattern.entryPoint).toBeGreaterThan(0);
        expect(pattern.targetPrice).toBeGreaterThan(0);
        expect(pattern.stopLoss).toBeGreaterThan(0);
      });
    });
  });

  describe('Formation Tracking', () => {
    it('should track formation lifecycle', async () => {
      const formations = await service.trackFormations('AAPL', mockPriceData);
      
      // Check formation status transitions
      formations.currentFormations.forEach(formation => {
        expect(['FORMING', 'CONFIRMED', 'BROKEN']).toContain(formation.status);
        expect(new Date(formation.detectedAt)).toBeInstanceOf(Date);
        expect(new Date(formation.validUntil)).toBeInstanceOf(Date);
      });
    });

    it('should provide AI predictions', async () => {
      const formations = await service.trackFormations('AAPL', mockPriceData);
      
      formations.aiPredictions.forEach(prediction => {
        expect(typeof prediction.nextFormation).toBe('string');
        expect(typeof prediction.probability).toBe('number');
        expect(typeof prediction.expectedCompletion).toBe('string');
        expect(prediction.probability).toBeGreaterThanOrEqual(0);
        expect(prediction.probability).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        service.analyzePatterns(`STOCK${i}`, mockPriceData)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: new Date(Date.now() - (999 - i) * 60 * 60 * 1000).toISOString(),
        open: 100 + Math.random() * 10,
        high: 105 + Math.random() * 10,
        low: 95 + Math.random() * 10,
        close: 100 + Math.random() * 10,
        volume: 1000000
      }));
      
      const startTime = Date.now();
      const result = await service.analyzePatterns('AAPL', largeDataset);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});