import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, validationResult } from 'express-validator';
import TechnicalIndicators, { 
  RSIResult, 
  MACDResult, 
  BollingerBandsResult 
} from '../services/technicalIndicators.js';
import { stockScraper } from '../services/stockScraper.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limiting
const technicalAnalysisLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 30, // dakikada maksimum 30 istek
  message: {
    error: 'Çok fazla teknik analiz isteği. Lütfen 1 dakika bekleyin.',
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

const validateTechnicalParams = [
  body('period')
    .optional()
    .isInt({ min: 5, max: 200 })
    .withMessage('Periyot 5-200 arasında olmalıdır'),
  body('fastPeriod')
    .optional()
    .isInt({ min: 5, max: 50 })
    .withMessage('Hızlı periyot 5-50 arasında olmalıdır'),
  body('slowPeriod')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('Yavaş periyot 10-100 arasında olmalıdır'),
  body('signalPeriod')
    .optional()
    .isInt({ min: 5, max: 50 })
    .withMessage('Sinyal periyodu 5-50 arasında olmalıdır'),
  body('stdDev')
    .optional()
    .isFloat({ min: 1, max: 3 })
    .withMessage('Standart sapma 1-3 arasında olmalıdır')
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
router.use(technicalAnalysisLimiter);

/**
 * RSI (Relative Strength Index) hesaplar
 * GET /api/technical-analysis/:symbol/rsi
 */
router.get('/:symbol/rsi', 
  validateStockSymbol,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const period = parseInt(req.query.period as string) || 14;
      
      logger.info(`RSI hesaplanıyor: ${symbol}, periyot: ${period}`);
      
      // Hisse senedi verilerini al
      const stockData = await stockScraper.scrapeStock(symbol);
      if (!stockData || !stockData.historicalData || stockData.historicalData.length < period + 1) {
        return res.status(404).json({
          success: false,
          error: 'Yeterli geçmiş veri bulunamadı',
          code: 'INSUFFICIENT_DATA',
          requiredPeriod: period + 1,
          availableData: stockData?.historicalData?.length || 0
        });
      }
      
      // Kapanış fiyatlarını çıkar
      const closePrices = stockData.historicalData.map(data => data.close);
      
      // RSI hesapla
      const rsiResult = TechnicalIndicators.calculateRSI(closePrices, period);
      
      if (!rsiResult) {
        return res.status(500).json({
          success: false,
          error: 'RSI hesaplanamadı',
          code: 'CALCULATION_ERROR'
        });
      }
      
      res.json({
        success: true,
        data: {
          symbol,
          indicator: 'RSI',
          result: rsiResult,
          currentPrice: stockData.currentPrice,
          calculatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('RSI hesaplama hatası:', error);
      res.status(500).json({
        success: false,
        error: 'RSI hesaplanırken hata oluştu',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * MACD (Moving Average Convergence Divergence) hesaplar
 * GET /api/technical-analysis/:symbol/macd
 */
router.get('/:symbol/macd',
  validateStockSymbol,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const fastPeriod = parseInt(req.query.fastPeriod as string) || 12;
      const slowPeriod = parseInt(req.query.slowPeriod as string) || 26;
      const signalPeriod = parseInt(req.query.signalPeriod as string) || 9;
      
      logger.info(`MACD hesaplanıyor: ${symbol}, fast: ${fastPeriod}, slow: ${slowPeriod}, signal: ${signalPeriod}`);
      
      // Hisse senedi verilerini al
      const stockData = await stockScraper.scrapeStock(symbol);
      const requiredData = slowPeriod + signalPeriod;
      
      if (!stockData || !stockData.historicalData || stockData.historicalData.length < requiredData) {
        return res.status(404).json({
          success: false,
          error: 'Yeterli geçmiş veri bulunamadı',
          code: 'INSUFFICIENT_DATA',
          requiredPeriod: requiredData,
          availableData: stockData?.historicalData?.length || 0
        });
      }
      
      // Kapanış fiyatlarını çıkar
      const closePrices = stockData.historicalData.map(data => data.close);
      
      // MACD hesapla
      const macdResult = TechnicalIndicators.calculateMACD(closePrices, fastPeriod, slowPeriod, signalPeriod);
      
      if (!macdResult) {
        return res.status(500).json({
          success: false,
          error: 'MACD hesaplanamadı',
          code: 'CALCULATION_ERROR'
        });
      }
      
      res.json({
        success: true,
        data: {
          symbol,
          indicator: 'MACD',
          result: macdResult,
          parameters: { fastPeriod, slowPeriod, signalPeriod },
          currentPrice: stockData.currentPrice,
          calculatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('MACD hesaplama hatası:', error);
      res.status(500).json({
        success: false,
        error: 'MACD hesaplanırken hata oluştu',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Bollinger Bands hesaplar
 * GET /api/technical-analysis/:symbol/bollinger
 */
router.get('/:symbol/bollinger',
  validateStockSymbol,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const period = parseInt(req.query.period as string) || 20;
      const stdDev = parseFloat(req.query.stdDev as string) || 2;
      
      logger.info(`Bollinger Bands hesaplanıyor: ${symbol}, periyot: ${period}, stdDev: ${stdDev}`);
      
      // Hisse senedi verilerini al
      const stockData = await stockScraper.scrapeStock(symbol);
      
      if (!stockData || !stockData.historicalData || stockData.historicalData.length < period) {
        return res.status(404).json({
          success: false,
          error: 'Yeterli geçmiş veri bulunamadı',
          code: 'INSUFFICIENT_DATA',
          requiredPeriod: period,
          availableData: stockData?.historicalData?.length || 0
        });
      }
      
      // Kapanış fiyatlarını çıkar
      const closePrices = stockData.historicalData.map(data => data.close);
      
      // Bollinger Bands hesapla
      const bollingerResult = TechnicalIndicators.calculateBollingerBands(closePrices, period, stdDev);
      
      if (!bollingerResult) {
        return res.status(500).json({
          success: false,
          error: 'Bollinger Bands hesaplanamadı',
          code: 'CALCULATION_ERROR'
        });
      }
      
      res.json({
        success: true,
        data: {
          symbol,
          indicator: 'BOLLINGER_BANDS',
          result: bollingerResult,
          parameters: { period, stdDev },
          currentPrice: stockData.currentPrice,
          calculatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Bollinger Bands hesaplama hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Bollinger Bands hesaplanırken hata oluştu',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Birleşik teknik analiz (RSI + MACD + Bollinger Bands)
 * GET /api/technical-analysis/:symbol/combined
 */
router.get('/:symbol/combined',
  validateStockSymbol,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      
      logger.info(`Birleşik teknik analiz hesaplanıyor: ${symbol}`);
      
      // Hisse senedi verilerini al
      const stockData = await stockScraper.scrapeStock(symbol);
      
      if (!stockData || !stockData.historicalData || stockData.historicalData.length < 50) {
        return res.status(404).json({
          success: false,
          error: 'Yeterli geçmiş veri bulunamadı (minimum 50 gün)',
          code: 'INSUFFICIENT_DATA',
          requiredPeriod: 50,
          availableData: stockData?.historicalData?.length || 0
        });
      }
      
      // Kapanış fiyatlarını çıkar
      const closePrices = stockData.historicalData.map(data => data.close);
      
      // Birleşik analiz hesapla
      const combinedResult = TechnicalIndicators.getCombinedSignal(closePrices);
      
      res.json({
        success: true,
        data: {
          symbol,
          indicator: 'COMBINED_ANALYSIS',
          result: combinedResult,
          currentPrice: stockData.currentPrice,
          marketData: {
            volume: stockData.volume,
            change: stockData.change,
            changePercent: stockData.changePercent
          },
          calculatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Birleşik teknik analiz hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Birleşik teknik analiz hesaplanırken hata oluştu',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

/**
 * Teknik analiz geçmişi
 * GET /api/technical-analysis/:symbol/history
 */
router.get('/:symbol/history',
  validateStockSymbol,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      const indicator = req.query.indicator as string || 'rsi';
      
      logger.info(`Teknik analiz geçmişi: ${symbol}, ${days} gün, ${indicator}`);
      
      // Hisse senedi verilerini al
      const stockData = await stockScraper.scrapeStock(symbol);
      
      if (!stockData || !stockData.historicalData || stockData.historicalData.length < days) {
        return res.status(404).json({
          success: false,
          error: 'Yeterli geçmiş veri bulunamadı',
          code: 'INSUFFICIENT_DATA'
        });
      }
      
      const history: any[] = [];
      const closePrices = stockData.historicalData.map(data => data.close);
      
      // Son N gün için hesapla
      for (let i = Math.max(0, closePrices.length - days); i < closePrices.length; i++) {
        const priceSlice = closePrices.slice(0, i + 1);
        
        if (priceSlice.length >= 14) { // Minimum RSI için
          let result: any = {};
          
          switch (indicator.toLowerCase()) {
            case 'rsi':
              result = TechnicalIndicators.calculateRSI(priceSlice);
              break;
            case 'macd':
              result = TechnicalIndicators.calculateMACD(priceSlice);
              break;
            case 'bollinger':
              result = TechnicalIndicators.calculateBollingerBands(priceSlice);
              break;
            default:
              result = TechnicalIndicators.getCombinedSignal(priceSlice);
          }
          
          if (result) {
            history.push({
              date: stockData.historicalData[i].date,
              price: stockData.historicalData[i].close,
              indicator: result
            });
          }
        }
      }
      
      res.json({
        success: true,
        data: {
          symbol,
          indicator: indicator.toUpperCase(),
          history,
          totalDays: history.length,
          calculatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      logger.error('Teknik analiz geçmişi hatası:', error);
      res.status(500).json({
        success: false,
        error: 'Teknik analiz geçmişi hesaplanırken hata oluştu',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

export default router;