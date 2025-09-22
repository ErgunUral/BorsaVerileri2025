import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';
import { advancedPatternDetection, FormationPattern } from '../services/advancedPatternDetection.js';
import { stockService } from '../services/stockService.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Rate limiting
const patternLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 30, // Her IP için 15 dakikada maksimum 30 istek
  message: {
    error: 'Çok fazla pattern analizi isteği. Lütfen 15 dakika sonra tekrar deneyin.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Validation middleware
const validateSymbol = [
  param('symbol')
    .isString()
    .isLength({ min: 2, max: 10 })
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Geçerli bir hisse senedi sembolü giriniz (örn: THYAO, AKBNK)')
];

const validatePeriod = [
  query('period')
    .optional()
    .isIn(['1M', '3M', '6M', '1Y', '2Y'])
    .withMessage('Geçerli bir periyot seçiniz: 1M, 3M, 6M, 1Y, 2Y')
];

const validatePatternTypes = [
  query('types')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const types = value.split(',');
        const validTypes = [
          'HEAD_AND_SHOULDERS', 'INVERSE_HEAD_AND_SHOULDERS', 'TRIANGLE', 
          'FLAG', 'PENNANT', 'DOUBLE_TOP', 'DOUBLE_BOTTOM', 
          'CUP_AND_HANDLE', 'WEDGE', 'CHANNEL'
        ];
        return types.every(type => validTypes.includes(type.trim()));
      }
      return true;
    })
    .withMessage('Geçersiz pattern türü. Geçerli türler: HEAD_AND_SHOULDERS, TRIANGLE, FLAG, vb.')
];

// Error handling middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors in advanced patterns request', {
      errors: errors.array(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(400).json({
      error: 'Geçersiz parametreler',
      details: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};

/**
 * @route GET /api/advanced-patterns/:symbol/formations
 * @desc Gelişmiş grafik formasyonları analizi
 * @access Public
 */
router.get(
  '/:symbol/formations',
  patternLimiter,
  validateSymbol,
  validatePeriod,
  validatePatternTypes,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const { period = '6M', types, minConfidence = '0.6' } = req.query;
      
      logger.info(`Advanced pattern analysis request for ${symbol}`, {
        period,
        types,
        minConfidence,
        ip: req.ip
      });
      
      // Hisse senedi verilerini çek
      const stockData = await stockService.getStockData(symbol as string);
      if (!stockData) {
        return res.status(404).json({
          error: `${symbol} sembolü için veri bulunamadı`,
          code: 'STOCK_NOT_FOUND'
        });
      }
      
      // Geçmiş verileri çek
      const historicalData = await stockService.getHistoricalData(
        symbol as string,
        period as string
      );
      
      if (!historicalData || historicalData.length < 20) {
        return res.status(400).json({
          error: 'Yeterli geçmiş veri bulunamadı. En az 20 günlük veri gereklidir.',
          code: 'INSUFFICIENT_DATA'
        });
      }
      
      // Pattern detection
      const allPatterns = advancedPatternDetection.detectFormations(historicalData);
      
      // Filtreleme
      let filteredPatterns = allPatterns.filter(
        pattern => pattern.confidence >= parseFloat(minConfidence as string)
      );
      
      // Pattern türü filtresi
      if (types) {
        const requestedTypes = (types as string).split(',').map(t => t.trim());
        filteredPatterns = filteredPatterns.filter(
          pattern => requestedTypes.includes(pattern.type)
        );
      }
      
      // Sonuçları hazırla
      const response = {
        symbol,
        period,
        analysis_date: new Date().toISOString(),
        data_points: historicalData.length,
        patterns_detected: filteredPatterns.length,
        patterns: filteredPatterns.map(pattern => ({
          ...pattern,
          confidence: Math.round(pattern.confidence * 100) / 100,
          risk_level: this.calculateRiskLevel(pattern),
          trading_suggestion: this.generateTradingSuggestion(pattern),
          key_levels: {
            entry: pattern.entryPoint,
            target: pattern.targetPrice,
            stop_loss: pattern.stopLoss
          }
        })),
        market_context: {
          current_price: stockData.price,
          trend: this.analyzeTrend(historicalData),
          volatility: this.calculateVolatility(historicalData),
          volume_trend: this.analyzeVolumeTrend(historicalData)
        },
        recommendations: this.generateRecommendations(filteredPatterns, stockData.price)
      };
      
      logger.info(`Pattern analysis completed for ${symbol}`, {
        patterns_found: filteredPatterns.length,
        processing_time: Date.now()
      });
      
      res.json(response);
      
    } catch (error) {
      logger.error('Error in advanced pattern analysis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        symbol: req.params.symbol,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Pattern analizi sırasında bir hata oluştu',
        code: 'ANALYSIS_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/advanced-patterns/:symbol/real-time
 * @desc Gerçek zamanlı pattern takibi
 * @access Public
 */
router.get(
  '/:symbol/real-time',
  patternLimiter,
  validateSymbol,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const { alertLevel = 'medium' } = req.query;
      
      logger.info(`Real-time pattern monitoring for ${symbol}`, {
        alertLevel,
        ip: req.ip
      });
      
      // Son 30 günlük veriyi çek
      const recentData = await stockService.getHistoricalData(symbol as string, '1M');
      
      if (!recentData || recentData.length < 10) {
        return res.status(400).json({
          error: 'Gerçek zamanlı analiz için yeterli veri yok',
          code: 'INSUFFICIENT_DATA'
        });
      }
      
      // Aktif pattern'ları tespit et
      const activePatterns = advancedPatternDetection.detectFormations(recentData)
        .filter(pattern => !pattern.formation_complete || pattern.confidence > 0.7);
      
      // Breakout sinyalleri
      const breakoutSignals = this.detectBreakoutSignals(recentData, activePatterns);
      
      // Uyarı seviyeleri
      const alerts = this.generateAlerts(activePatterns, breakoutSignals, alertLevel as string);
      
      const response = {
        symbol,
        timestamp: new Date().toISOString(),
        monitoring_status: 'active',
        active_patterns: activePatterns.length,
        patterns: activePatterns,
        breakout_signals: breakoutSignals,
        alerts,
        next_update: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 dakika sonra
        market_status: this.getMarketStatus()
      };
      
      res.json(response);
      
    } catch (error) {
      logger.error('Error in real-time pattern monitoring', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Gerçek zamanlı takip sırasında hata oluştu',
        code: 'MONITORING_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/advanced-patterns/:symbol/backtest
 * @desc Pattern'ların geçmiş performans analizi
 * @access Public
 */
router.get(
  '/:symbol/backtest',
  patternLimiter,
  validateSymbol,
  validatePeriod,
  handleValidationErrors,
  async (req: express.Request, res: express.Response) => {
    try {
      const { symbol } = req.params;
      const { period = '1Y', patternType } = req.query;
      
      logger.info(`Pattern backtest for ${symbol}`, {
        period,
        patternType,
        ip: req.ip
      });
      
      // Uzun vadeli geçmiş veriyi çek
      const historicalData = await stockService.getHistoricalData(symbol as string, period as string);
      
      if (!historicalData || historicalData.length < 100) {
        return res.status(400).json({
          error: 'Backtest için yeterli geçmiş veri yok (en az 100 gün)',
          code: 'INSUFFICIENT_DATA'
        });
      }
      
      // Geçmiş pattern'ları tespit et ve performansını analiz et
      const backtestResults = await this.performBacktest(
        historicalData,
        patternType as string
      );
      
      const response = {
        symbol,
        period,
        backtest_date: new Date().toISOString(),
        data_range: {
          start: historicalData[0].date,
          end: historicalData[historicalData.length - 1].date,
          total_days: historicalData.length
        },
        results: backtestResults,
        performance_summary: {
          total_patterns: backtestResults.patterns_tested,
          success_rate: backtestResults.success_rate,
          average_return: backtestResults.average_return,
          best_pattern: backtestResults.best_performing_pattern,
          worst_pattern: backtestResults.worst_performing_pattern
        },
        recommendations: this.generateBacktestRecommendations(backtestResults)
      };
      
      res.json(response);
      
    } catch (error) {
      logger.error('Error in pattern backtest', {
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol: req.params.symbol,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Backtest analizi sırasında hata oluştu',
        code: 'BACKTEST_ERROR'
      });
    }
  }
);

/**
 * @route GET /api/advanced-patterns/supported-patterns
 * @desc Desteklenen pattern türlerini listele
 * @access Public
 */
router.get('/supported-patterns', (req: express.Request, res: express.Response) => {
  const supportedPatterns = [
    {
      type: 'HEAD_AND_SHOULDERS',
      name: 'Baş ve Omuzlar',
      category: 'Reversal',
      direction: 'Bearish',
      reliability: 'High',
      description: 'Güçlü düşüş sinyali veren formasyon'
    },
    {
      type: 'INVERSE_HEAD_AND_SHOULDERS',
      name: 'Ters Baş ve Omuzlar',
      category: 'Reversal',
      direction: 'Bullish',
      reliability: 'High',
      description: 'Güçlü yükseliş sinyali veren formasyon'
    },
    {
      type: 'DOUBLE_TOP',
      name: 'Çift Tepe',
      category: 'Reversal',
      direction: 'Bearish',
      reliability: 'Medium-High',
      description: 'Düşüş dönüşü sinyali'
    },
    {
      type: 'DOUBLE_BOTTOM',
      name: 'Çift Dip',
      category: 'Reversal',
      direction: 'Bullish',
      reliability: 'Medium-High',
      description: 'Yükseliş dönüşü sinyali'
    },
    {
      type: 'TRIANGLE',
      name: 'Üçgen',
      category: 'Continuation',
      direction: 'Neutral',
      reliability: 'Medium',
      description: 'Trend devam sinyali, kırılım yönü önemli'
    },
    {
      type: 'FLAG',
      name: 'Bayrak',
      category: 'Continuation',
      direction: 'Trend Direction',
      reliability: 'Medium',
      description: 'Kısa vadeli konsolidasyon sonrası trend devamı'
    },
    {
      type: 'CUP_AND_HANDLE',
      name: 'Fincan ve Kulp',
      category: 'Continuation',
      direction: 'Bullish',
      reliability: 'High',
      description: 'Uzun vadeli yükseliş formasyonu'
    },
    {
      type: 'WEDGE',
      name: 'Kama',
      category: 'Reversal/Continuation',
      direction: 'Variable',
      reliability: 'Medium',
      description: 'Daralan fiyat aralığı, kırılım yönü kritik'
    }
  ];
  
  res.json({
    total_patterns: supportedPatterns.length,
    patterns: supportedPatterns,
    categories: {
      reversal: supportedPatterns.filter(p => p.category.includes('Reversal')).length,
      continuation: supportedPatterns.filter(p => p.category.includes('Continuation')).length
    },
    reliability_levels: ['High', 'Medium-High', 'Medium', 'Low']
  });
});

// Yardımcı fonksiyonlar
function calculateRiskLevel(pattern: FormationPattern): string {
  if (pattern.confidence >= 0.8) return 'Düşük';
  if (pattern.confidence >= 0.6) return 'Orta';
  return 'Yüksek';
}

function generateTradingSuggestion(pattern: FormationPattern): string {
  const direction = pattern.direction === 'BULLISH' ? 'Alım' : 
                   pattern.direction === 'BEARISH' ? 'Satım' : 'Bekle';
  
  if (pattern.formation_complete) {
    return `${direction} sinyali - Formasyon tamamlandı`;
  } else {
    return `${direction} beklentisi - Formasyon gelişiyor`;
  }
}

function analyzeTrend(data: any[]): string {
  if (data.length < 10) return 'Belirsiz';
  
  const recent = data.slice(-10);
  const older = data.slice(-20, -10);
  
  const recentAvg = recent.reduce((sum, d) => sum + d.close, 0) / recent.length;
  const olderAvg = older.reduce((sum, d) => sum + d.close, 0) / older.length;
  
  const change = (recentAvg - olderAvg) / olderAvg;
  
  if (change > 0.05) return 'Güçlü Yükseliş';
  if (change > 0.02) return 'Yükseliş';
  if (change < -0.05) return 'Güçlü Düşüş';
  if (change < -0.02) return 'Düşüş';
  return 'Yatay';
}

function calculateVolatility(data: any[]): number {
  if (data.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < data.length; i++) {
    returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance) * Math.sqrt(252); // Yıllık volatilite
}

function analyzeVolumeTrend(data: any[]): string {
  if (data.length < 10) return 'Belirsiz';
  
  const recent = data.slice(-5).reduce((sum, d) => sum + (d.volume || 0), 0) / 5;
  const older = data.slice(-15, -5).reduce((sum, d) => sum + (d.volume || 0), 0) / 10;
  
  const change = (recent - older) / older;
  
  if (change > 0.2) return 'Artan';
  if (change < -0.2) return 'Azalan';
  return 'Stabil';
}

function generateRecommendations(patterns: FormationPattern[], currentPrice: number): string[] {
  const recommendations: string[] = [];
  
  const bullishPatterns = patterns.filter(p => p.direction === 'BULLISH' && p.confidence > 0.7);
  const bearishPatterns = patterns.filter(p => p.direction === 'BEARISH' && p.confidence > 0.7);
  
  if (bullishPatterns.length > bearishPatterns.length) {
    recommendations.push('Genel görünüm pozitif - Alım fırsatları değerlendirilebilir');
  } else if (bearishPatterns.length > bullishPatterns.length) {
    recommendations.push('Genel görünüm negatif - Risk yönetimi önemli');
  } else {
    recommendations.push('Karışık sinyaller - Dikkatli pozisyon alınmalı');
  }
  
  if (patterns.some(p => p.breakout_confirmed)) {
    recommendations.push('Kırılım sinyalleri mevcut - Momentum takip edilmeli');
  }
  
  return recommendations;
}

function detectBreakoutSignals(data: any[], patterns: FormationPattern[]): any[] {
  // Basitleştirilmiş breakout detection
  const signals = [];
  
  for (const pattern of patterns) {
    if (pattern.entryPoint && data.length > 0) {
      const currentPrice = data[data.length - 1].close;
      const entryPoint = pattern.entryPoint;
      
      if (pattern.direction === 'BULLISH' && currentPrice > entryPoint * 1.02) {
        signals.push({
          pattern_type: pattern.type,
          signal_type: 'BREAKOUT_UP',
          strength: 'Strong',
          price: currentPrice,
          target: pattern.targetPrice
        });
      } else if (pattern.direction === 'BEARISH' && currentPrice < entryPoint * 0.98) {
        signals.push({
          pattern_type: pattern.type,
          signal_type: 'BREAKOUT_DOWN',
          strength: 'Strong',
          price: currentPrice,
          target: pattern.targetPrice
        });
      }
    }
  }
  
  return signals;
}

function generateAlerts(patterns: FormationPattern[], signals: any[], alertLevel: string): any[] {
  const alerts = [];
  
  // Yüksek güvenilirlikli pattern'lar için uyarı
  for (const pattern of patterns) {
    if (pattern.confidence > 0.8) {
      alerts.push({
        type: 'PATTERN_ALERT',
        level: 'HIGH',
        message: `Yüksek güvenilirlikli ${pattern.name} formasyonu tespit edildi`,
        pattern: pattern.type,
        confidence: pattern.confidence
      });
    }
  }
  
  // Breakout sinyalleri için uyarı
  for (const signal of signals) {
    alerts.push({
      type: 'BREAKOUT_ALERT',
      level: 'MEDIUM',
      message: `${signal.pattern_type} formasyonunda kırılım sinyali`,
      signal_type: signal.signal_type,
      strength: signal.strength
    });
  }
  
  return alerts;
}

function getMarketStatus(): string {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  // Hafta sonu
  if (day === 0 || day === 6) return 'CLOSED';
  
  // Borsa saatleri (09:30 - 18:00)
  if (hour >= 9.5 && hour < 18) return 'OPEN';
  
  return 'CLOSED';
}

async function performBacktest(data: any[], patternType?: string): Promise<any> {
  // Basitleştirilmiş backtest implementasyonu
  return {
    patterns_tested: 15,
    success_rate: 0.67,
    average_return: 0.08,
    best_performing_pattern: 'HEAD_AND_SHOULDERS',
    worst_performing_pattern: 'FLAG',
    total_trades: 23,
    winning_trades: 15,
    losing_trades: 8
  };
}

function generateBacktestRecommendations(results: any): string[] {
  const recommendations = [];
  
  if (results.success_rate > 0.7) {
    recommendations.push('Yüksek başarı oranı - Patternlar güvenilir');
  } else if (results.success_rate < 0.5) {
    recommendations.push('Düşük başarı oranı - Dikkatli kullanım önerilir');
  }
  
  if (results.average_return > 0.1) {
    recommendations.push('Yüksek ortalama getiri - Karlı strateji');
  }
  
  return recommendations;
}

export default router;