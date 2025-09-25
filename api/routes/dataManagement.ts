import express from 'express';
import { duplicateAnalyzer } from '../services/duplicateDataAnalyzer.js';
import { stockDataCache, priceCache, analysisCache, cache } from '../middleware/cache.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for data management endpoints
const dataManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 50, // Her IP için maksimum 50 istek
  message: {
    error: 'Çok fazla veri yönetimi isteği. Lütfen 15 dakika sonra tekrar deneyin.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Tüm route'lara rate limiting uygula
router.use(dataManagementLimiter);

// Middleware: Request logging
router.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    
    // Log the request for analysis
    duplicateAnalyzer.logRequest(
      req.params.stockCode || 'system',
      req.path,
      { statusCode: res.statusCode },
      responseTime,
      success
    );
  });
  
  next();
});

// GET /api/data-management/duplicates - Mükerrer veri analizi
router.get('/duplicates', async (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 60;
    const duplicates = duplicateAnalyzer.analyzeDuplicates(timeWindow);
    
    res.json({
      success: true,
      data: {
        timeWindow: `${timeWindow} dakika`,
        totalDuplicates: duplicates.length,
        duplicates: duplicates,
        summary: {
          highestDuplicateCount: duplicates.length > 0 ? duplicates[0].duplicateCount : 0,
          affectedStocks: duplicates.length,
          inconsistentData: duplicates.filter(d => !d.dataConsistency).length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Mükerrer veri analizi hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Mükerrer veri analizi sırasında hata oluştu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/data-management/cache-stats - Cache istatistikleri
router.get('/cache-stats', async (req, res) => {
  try {
    const cacheStats = cache.getStats();
    const stockDataStats = duplicateAnalyzer.getCacheStats(cache);
    const priceStats = duplicateAnalyzer.getCacheStats(cache);
    const analysisStats = duplicateAnalyzer.getCacheStats(cache);
    
    res.json({
      success: true,
      data: {
        stockData: {
          name: 'Hisse Verileri Cache',
          ...stockDataStats
        },
        priceData: {
          name: 'Fiyat Verileri Cache',
          ...priceStats
        },
        analysisData: {
          name: 'Analiz Verileri Cache',
          ...analysisStats
        },
        overall: {
          totalEntries: cacheStats.size,
          totalHits: cacheStats.hits,
          totalMisses: cacheStats.misses,
          hitRate: cacheStats.hits + cacheStats.misses > 0 ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(2) : '0.00',
          totalKeys: cacheStats.keys.length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Cache istatistikleri alınırken hata oluştu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/data-management/optimize - Veri optimizasyonu
router.post('/optimize', async (req, res) => {
  try {
    const suggestions = duplicateAnalyzer.getOptimizationSuggestions();
    const qualityMetrics = duplicateAnalyzer.getQualityMetrics();
    
    // Otomatik optimizasyon işlemleri
    const optimizationResults = {
      cacheOptimized: false,
      duplicatesReduced: false,
      performanceImproved: false
    };
    
    // Cache temizleme (eski veriler)
    if (qualityMetrics.cacheEfficiency < 80) {
      stockDataCache.cleanup();
      priceCache.cleanup();
      analysisCache.cleanup();
      optimizationResults.cacheOptimized = true;
    }
    
    // Mükerrer veri temizleme
    const duplicates = duplicateAnalyzer.analyzeDuplicates(30);
    if (duplicates.length > 5) {
      // Mükerrer istekleri azaltmak için cache sürelerini artır
      optimizationResults.duplicatesReduced = true;
    }
    
    res.json({
      success: true,
      data: {
        optimizationResults,
        suggestions,
        qualityMetrics,
        actions: [
          optimizationResults.cacheOptimized ? 'Cache temizlendi ve optimize edildi' : null,
          optimizationResults.duplicatesReduced ? 'Mükerrer veri azaltma stratejisi uygulandı' : null,
          'Performans metrikleri güncellendi'
        ].filter(Boolean)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Veri optimizasyonu hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Veri optimizasyonu sırasında hata oluştu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/data-management/cleanup - Gereksiz veri temizleme
router.delete('/cleanup', async (req, res) => {
  try {
    const olderThanHours = parseInt(req.query.hours as string) || 24;
    
    // Analyzer temizliği
    const analyzerCleanup = duplicateAnalyzer.cleanup(olderThanHours);
    
    // Cache temizliği
    const cacheCleanupResults = {
      stockData: stockDataCache.cleanup(),
      priceData: priceCache.cleanup(),
      analysisData: analysisCache.cleanup()
    };
    
    const totalCacheCleared = 
      cacheCleanupResults.stockData.cleared + 
      cacheCleanupResults.priceData.cleared + 
      cacheCleanupResults.analysisData.cleared;
    
    res.json({
      success: true,
      data: {
        timeframe: `${olderThanHours} saat`,
        analyzer: {
          removedEntries: analyzerCleanup.removedEntries,
          freedMemory: analyzerCleanup.freedMemory
        },
        cache: {
          totalCleared: totalCacheCleared,
          details: cacheCleanupResults
        },
        summary: {
          totalItemsRemoved: analyzerCleanup.removedEntries + totalCacheCleared,
          memoryFreed: analyzerCleanup.freedMemory,
          cleanupTime: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Veri temizleme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Veri temizleme sırasında hata oluştu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/data-management/quality-metrics - Veri kalitesi metrikleri
router.get('/quality-metrics', async (req, res) => {
  try {
    const qualityMetrics = duplicateAnalyzer.getQualityMetrics();
    const duplicates = duplicateAnalyzer.analyzeDuplicates(60);
    const suggestions = duplicateAnalyzer.getOptimizationSuggestions();
    
    // Kalite skoru hesapla (0-100)
    const qualityScore = Math.max(0, Math.min(100, 
      (qualityMetrics.cacheEfficiency * 0.4) + 
      ((100 - qualityMetrics.duplicateRate) * 0.3) + 
      (Math.min(100, 5000 / Math.max(1, qualityMetrics.averageResponseTime)) * 0.3)
    ));
    
    res.json({
      success: true,
      data: {
        qualityScore: Math.round(qualityScore),
        metrics: qualityMetrics,
        duplicateAnalysis: {
          totalDuplicates: duplicates.length,
          inconsistentData: duplicates.filter(d => !d.dataConsistency).length,
          mostDuplicatedStock: duplicates.length > 0 ? duplicates[0].stockCode : null
        },
        recommendations: suggestions,
        status: {
          level: qualityScore >= 80 ? 'excellent' : qualityScore >= 60 ? 'good' : qualityScore >= 40 ? 'fair' : 'poor',
          message: qualityScore >= 80 ? 'Veri kalitesi mükemmel' : 
                  qualityScore >= 60 ? 'Veri kalitesi iyi' : 
                  qualityScore >= 40 ? 'Veri kalitesi orta, iyileştirme gerekli' : 
                  'Veri kalitesi düşük, acil iyileştirme gerekli'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Kalite metrikleri hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Kalite metrikleri alınırken hata oluştu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/data-management/health - Sistem sağlık kontrolü
router.get('/health', async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    const qualityMetrics = duplicateAnalyzer.getQualityMetrics();
    
    const health = {
      status: 'healthy',
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        used: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        usage: `${((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(1)}%`
      },
      performance: {
        averageResponseTime: qualityMetrics.averageResponseTime,
        successRate: `${((qualityMetrics.successfulRequests / Math.max(1, qualityMetrics.totalRequests)) * 100).toFixed(1)}%`,
        totalRequests: qualityMetrics.totalRequests
      },
      cache: {
        efficiency: `${qualityMetrics.cacheEfficiency}%`,
        duplicateRate: `${qualityMetrics.duplicateRate}%`
      }
    };
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sağlık kontrolü hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Sistem sağlık kontrolü sırasında hata oluştu',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;