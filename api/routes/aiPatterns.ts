import express from 'express';
import logger from '../utils/logger.js';
import aiPatternRecognitionService from '../services/aiPatternRecognition.js';
import { isYatirimScraper } from '../services/isYatirimScraper.js';

const router = express.Router();

/**
 * GET /api/ai-patterns/:symbol
 * Get AI-powered pattern analysis for a stock
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1D', forceRefresh = 'false' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol is required'
      });
    }

    logger.info(`AI pattern analysis requested for ${symbol}`);

    // Check cache first
    if (forceRefresh !== 'true') {
      const cachedPatterns = aiPatternRecognitionService.getCachedPatterns(symbol, timeframe as string);
      if (cachedPatterns) {
        logger.info(`Returning cached AI patterns for ${symbol}`);
        return res.json({
          success: true,
          data: {
            patterns: cachedPatterns,
            cached: true,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Get price data
    const priceData = await isYatirimScraper.getHistoricalData(symbol, 50);
    if (!priceData || priceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Price data not found for the symbol'
      });
    }

    // Analyze patterns
    const patterns = await aiPatternRecognitionService.analyzePatterns(
      symbol,
      priceData,
      timeframe as string
    );

    res.json({
      success: true,
      data: {
        patterns,
        cached: false,
        timestamp: new Date().toISOString(),
        dataPoints: priceData.length
      }
    });

  } catch (error) {
    logger.error('AI patterns API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env['NODE_ENV'] === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ai-patterns/:symbol/formations
 * Get chart formation tracking for a stock
 */
router.get('/:symbol/formations', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { forceRefresh = 'false' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol is required'
      });
    }

    logger.info(`Formation tracking requested for ${symbol}`);

    // Check cache first
    if (forceRefresh !== 'true') {
      const cachedFormations = aiPatternRecognitionService.getCachedFormations(symbol);
      if (cachedFormations) {
        logger.info(`Returning cached formations for ${symbol}`);
        return res.json({
          success: true,
          data: {
            formations: cachedFormations,
            cached: true,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Get price data
    const priceData = await isYatirimScraper.getHistoricalData(symbol, 100);
    if (!priceData || priceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Price data not found for the symbol'
      });
    }

    // Track formations
    const formations = await aiPatternRecognitionService.trackFormations(symbol, priceData);

    res.json({
      success: true,
      data: {
        formations,
        cached: false,
        timestamp: new Date().toISOString(),
        dataPoints: priceData.length
      }
    });

  } catch (error) {
    logger.error('Formation tracking API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env['NODE_ENV'] === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ai-patterns/:symbol/signals
 * Get AI-powered trading signals for a stock
 */
router.get('/:symbol/signals', async (req, res) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol is required'
      });
    }

    logger.info(`AI signals requested for ${symbol}`);

    // Get price data
    const priceData = await isYatirimScraper.getHistoricalData(symbol, 50);
    if (!priceData || priceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Price data not found for the symbol'
      });
    }

    // Get AI signals
    const signals = await aiPatternRecognitionService.getAISignals(symbol, priceData);

    res.json({
      success: true,
      data: {
        ...signals,
        timestamp: new Date().toISOString(),
        dataPoints: priceData.length
      }
    });

  } catch (error) {
    logger.error('AI signals API error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env['NODE_ENV'] === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/ai-patterns/clear-cache
 * Clear AI pattern recognition cache
 */
router.post('/clear-cache', async (req, res) => {
  try {
    aiPatternRecognitionService.clearCache();
    logger.info('AI pattern recognition cache cleared');

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: process.env['NODE_ENV'] === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ai-patterns/:symbol/comprehensive
 * Get comprehensive AI analysis including patterns, formations, and signals
 */
router.get('/:symbol/comprehensive', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1D' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol is required'
      });
    }

    logger.info(`Comprehensive AI analysis requested for ${symbol}`);

    // Get price data
    const priceData = await isYatirimScraper.getHistoricalData(symbol, 100);
    if (!priceData || priceData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Price data not found for the symbol'
      });
    }

    // Run all analyses in parallel
    const [patterns, formations, signals] = await Promise.all([
      aiPatternRecognitionService.analyzePatterns(symbol, priceData, timeframe as string),
      aiPatternRecognitionService.trackFormations(symbol, priceData),
      aiPatternRecognitionService.getAISignals(symbol, priceData)
    ]);

    // Calculate comprehensive score
    const comprehensiveScore = {
      patternStrength: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length || 0,
      formationCount: formations.currentFormations.length,
      signalStrength: signals.strength,
      overallRating: 0
    };

    comprehensiveScore.overallRating = (
      comprehensiveScore.patternStrength * 0.4 +
      Math.min(comprehensiveScore.formationCount * 20, 100) * 0.3 +
      comprehensiveScore.signalStrength * 0.3
    );

    res.json({
      success: true,
      data: {
        patterns,
        formations,
        signals,
        comprehensiveScore,
        timestamp: new Date().toISOString(),
        dataPoints: priceData.length,
        analysis: {
          recommendation: signals.signal,
          confidence: Math.round(comprehensiveScore.overallRating),
          riskLevel: comprehensiveScore.overallRating > 70 ? 'LOW' : 
                    comprehensiveScore.overallRating > 50 ? 'MEDIUM' : 'HIGH',
          timeHorizon: timeframe,
          keyFactors: [
            `${patterns.length} AI patterns detected`,
            `${formations.currentFormations.length} active formations`,
            `Signal strength: ${signals.strength}%`,
            ...signals.reasoning
          ]
        }
      }
    });

  } catch (error) {
    logger.error('Comprehensive AI analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env['NODE_ENV'] === 'development' ? error.message : undefined
    });
  }
});

export default router;