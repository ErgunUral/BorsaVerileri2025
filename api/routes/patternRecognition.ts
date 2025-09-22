import express from 'express';
import rateLimit from 'express-rate-limit';
import { param, query, validationResult } from 'express-validator';
import { patternRecognitionService } from '../services/patternRecognition.js';
import { stockScraper } from '../services/stockScraper.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limiting - AI calls are expensive
const patternRecognitionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 dakika
  max: 10, // 5 dakikada maksimum 10 istek
  message: {
    error: 'Çok fazla pattern analizi isteği. Lütfen 5 dakika bekleyin.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateStockSymbol = [
  param('symbol')
    .isString()
    .isLength({ min: 2, max: 10 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Geçersiz hisse senedi sembolü'),
];

const validatePatternParams = [
  query('days')
    .optional()
    .isInt({ min: 20, max: 200 })
    .withMessage('Gün sayısı 20-200 arasında olmalıdır'),
  query('includeHistory')
    .optional()
    .isBoolean()
    .withMessage('includeHistory boolean değer olmalıdır')
];

// Error handling middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Geçersiz parametreler',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

// Apply rate limiting to all routes
router.use(patternRecognitionLimiter);

/**
 * AI destekli pattern recognition analizi
 * GET /api/pattern-recognition/:symbol/analyze
 */
router.get('/:symbol/analyze',
  validateStockSymbol,
  validatePatternParams,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const days = parseInt(req.query.days as string) || 50;
      const includeHistory = req.query.includeHistory === 'true';
      
      logger.info(`AI Pattern analysis başlatılıyor: ${symbol}, ${days} gün`);
      
      // Hisse senedi verilerini al
      const stockData = await stockScraper.scrapeStock(symbol);
      
      if (!stockData || !stockData.historicalData || stockData.historicalData.length < 20) {
        return res.status(404).json({
          success: false,
          error: 'Yeterli geçmiş veri bulunamadı (minimum 20 gün gerekli)',
          code: 'INSUFFICIENT_DATA',
          requiredDays: 20,
          availableData: stockData?.historicalData?.length || 0
        });
      }
      
      // Son N günlük veriyi al
      const recentData = stockData.historicalData.slice(-days);
      
      // Veriyi pattern recognition servisi için formatla
      const priceData = recentData.map(data => ({
        date: data.date,
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume || 0
      }));
      
      // AI pattern analizi yap
      const analysisResult = await patternRecognitionService.analyzePatterns(symbol, priceData);
      
      // Geçmiş verileri de dahil et (istenirse)
      let history = null;
      if (includeHistory) {
        try {
          history = await patternRecognitionService.getPatternHistory(symbol, 30);
        } catch (historyError) {
          logger.warn('Pattern history alınamadı:', historyError);
        }
      }
      
      const response = {
        success: true,
        data: {
          symbol,
          analysis: analysisResult,
          marketData: {
            currentPrice: stockData.currentPrice,
            volume: stockData.volume,
            change: stockData.change,
            changePercent: stockData.changePercent,
            marketCap: stockData.marketCap
          },
          dataRange: {
            startDate: recentData[0]?.date,
            endDate: recentData[recentData.length - 1]?.date,
            totalDays: recentData.length
          },
          history: history,
          analyzedAt: new Date().toISOString(),
          aiModel: 'gpt-4'
        }
      };
      
      logger.info(`Pattern analysis tamamlandı: ${symbol}`, {
        patternsFound: analysisResult.patterns.length,
        overallTrend: analysisResult.overallTrend,
        recommendation: analysisResult.recommendation,
        confidence: analysisResult.confidence
      });
      
      res.json(response);
      
    } catch (error) {
      logger.error('Pattern recognition hatası:', error);
      
      if (error.message.includes('API key')) {
        return res.status(500).json({
          success: false,
          error: 'AI servisi yapılandırma hatası',
          code: 'AI_CONFIG_ERROR'
        });
      }
      
      if (error.message.includes('rate limit')) {
        return res.status(429).json({
          success: false,
          error: 'AI servisi rate limit aşıldı',
          code: 'AI_RATE_LIMIT'
        });
      }
      
      res.status(500).json({
        success: false,
        error: 'Pattern analizi sırasında hata oluştu',
        details: error.message,
        code: 'PATTERN_ANALYSIS_ERROR'
      });
    }
  }
);

/**
 * Hızlı pattern özeti (cache'li)
 * GET /api/pattern-recognition/:symbol/summary
 */
router.get('/:symbol/summary',
  validateStockSymbol,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      
      logger.info(`Pattern summary istendi: ${symbol}`);
      
      // Basit cache kontrolü (gerçek uygulamada Redis kullanılabilir)
      const cacheKey = `pattern_summary_${symbol}`;
      
      // Hisse senedi verilerini al
      const stockData = await stockScraper.scrapeStock(symbol);
      
      if (!stockData || !stockData.historicalData || stockData.historicalData.length < 10) {
        return res.status(404).json({
          success: false,
          error: 'Yeterli veri bulunamadı',
          code: 'INSUFFICIENT_DATA'
        });
      }
      
      // Son 30 günlük basit analiz
      const recentData = stockData.historicalData.slice(-30);
      const priceChange = (stockData.currentPrice - recentData[0].close) / recentData[0].close;
      
      // Basit trend analizi
      let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
      let confidence = 0.5;
      
      if (priceChange > 0.05) {
        trend = 'BULLISH';
        confidence = Math.min(0.8, 0.5 + Math.abs(priceChange));
      } else if (priceChange < -0.05) {
        trend = 'BEARISH';
        confidence = Math.min(0.8, 0.5 + Math.abs(priceChange));
      }
      
      const summary = {
        symbol,
        quickAnalysis: {
          trend,
          confidence,
          priceChange: priceChange * 100,
          recommendation: priceChange > 0.1 ? 'BUY' : priceChange < -0.1 ? 'SELL' : 'HOLD',
          riskLevel: Math.abs(priceChange) > 0.15 ? 'HIGH' : Math.abs(priceChange) > 0.05 ? 'MEDIUM' : 'LOW'
        },
        currentPrice: stockData.currentPrice,
        lastUpdate: new Date().toISOString(),
        note: 'Detaylı AI analizi için /analyze endpoint kullanın'
      };
      
      res.json({
        success: true,
        data: summary
      });
      
    } catch (error) {
      logger.error('Pattern summary hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Pattern özeti alınırken hata oluştu',
        code: 'SUMMARY_ERROR'
      });
    }
  }
);

/**
 * Desteklenen pattern türleri listesi
 * GET /api/pattern-recognition/patterns
 */
router.get('/patterns', (req: express.Request, res: express.Response) => {
  const supportedPatterns = [
    {
      type: 'HEAD_AND_SHOULDERS',
      name: 'Baş ve Omuzlar',
      direction: 'BEARISH',
      description: 'Trend dönüş formasyonu, genellikle düşüş sinyali verir'
    },
    {
      type: 'INVERSE_HEAD_AND_SHOULDERS',
      name: 'Ters Baş ve Omuzlar',
      direction: 'BULLISH',
      description: 'Trend dönüş formasyonu, genellikle yükseliş sinyali verir'
    },
    {
      type: 'TRIANGLE',
      name: 'Üçgen',
      direction: 'NEUTRAL',
      description: 'Konsolidasyon formasyonu, kırılım yönüne göre sinyal verir'
    },
    {
      type: 'FLAG',
      name: 'Bayrak',
      direction: 'CONTINUATION',
      description: 'Trend devam formasyonu'
    },
    {
      type: 'DOUBLE_TOP',
      name: 'Çift Tepe',
      direction: 'BEARISH',
      description: 'Trend dönüş formasyonu, düşüş sinyali'
    },
    {
      type: 'DOUBLE_BOTTOM',
      name: 'Çift Dip',
      direction: 'BULLISH',
      description: 'Trend dönüş formasyonu, yükseliş sinyali'
    },
    {
      type: 'CUP_AND_HANDLE',
      name: 'Fincan ve Kulp',
      direction: 'BULLISH',
      description: 'Yükseliş devam formasyonu'
    },
    {
      type: 'WEDGE',
      name: 'Kama',
      direction: 'REVERSAL',
      description: 'Trend dönüş formasyonu'
    }
  ];
  
  res.json({
    success: true,
    data: {
      supportedPatterns,
      totalPatterns: supportedPatterns.length,
      aiModel: 'gpt-4',
      analysisLanguage: 'Turkish'
    }
  });
});

export default router;