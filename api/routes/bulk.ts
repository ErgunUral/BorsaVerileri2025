import express from 'express';
import { bulkDataService } from '../services/bulkDataService.js';
import { SECTOR_GROUPS } from '../data/bist100.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting
const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 30, // Dakikada maksimum 30 istek
  message: {
    error: 'Çok fazla istek gönderildi',
    retryAfter: '1 dakika sonra tekrar deneyin'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// BIST 100 tüm hisseler
router.get('/bist100', rateLimitMiddleware, async (req, res): Promise<void> => {
  const startTime = Date.now();
  try {
    const { useCache = 'true', maxConcurrency = '10' } = req.query;
    
    const result = await bulkDataService.getBist100Data({
      useCache: useCache === 'true',
      maxConcurrency: parseInt(maxConcurrency as string) || 10
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        source: 'BIST 100 Bulk Data Service'
      }
    });
  } catch (error) {
    console.error('BIST 100 bulk data hatası:', error);
    res.status(500).json({
      error: 'BIST 100 verileri alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Popüler hisseler
router.get('/popular', rateLimitMiddleware, async (req, res): Promise<void> => {
  const startTime = Date.now();
  try {
    const { useCache = 'true', maxConcurrency = '15' } = req.query;
    
    const result = await bulkDataService.getPopularStocksData({
      useCache: useCache === 'true',
      maxConcurrency: parseInt(maxConcurrency as string) || 15
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        source: 'Popular Stocks Bulk Data Service'
      }
    });
  } catch (error) {
    console.error('Popüler hisseler bulk data hatası:', error);
    res.status(500).json({
      error: 'Popüler hisse verileri alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Sektör bazında veri
router.get('/sector/:sectorName', rateLimitMiddleware, async (req, res): Promise<void> => {
  const startTime = Date.now();
  try {
    const { sectorName } = req.params;
    const { useCache = 'true', maxConcurrency = '10' } = req.query;
    
    // Sektör kontrolü
    if (!SECTOR_GROUPS[sectorName as keyof typeof SECTOR_GROUPS]) {
      res.status(400).json({
        error: 'Geçersiz sektör adı',
        availableSectors: Object.keys(SECTOR_GROUPS),
        received: sectorName
      });
      return;
    }
    
    const result = await bulkDataService.getSectorData(
      sectorName as keyof typeof SECTOR_GROUPS,
      {
        useCache: useCache === 'true',
        maxConcurrency: parseInt(maxConcurrency as string) || 10
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        source: `${sectorName} Sector Bulk Data Service`,
        sector: sectorName
      }
    });
  } catch (error) {
    console.error('Sektör bulk data hatası:', error);
    res.status(500).json({
      error: 'Sektör verileri alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Özel hisse listesi
router.post('/custom', rateLimitMiddleware, async (req, res): Promise<void> => {
  const startTime = Date.now();
  try {
    const { stockCodes, useCache = true, maxConcurrency = 10 } = req.body;
    
    if (!Array.isArray(stockCodes) || stockCodes.length === 0) {
      res.status(400).json({
        error: 'stockCodes dizisi gereklidir',
        example: { stockCodes: ['THYAO', 'AKBNK', 'BIMAS'] }
      });
      return;
    }
    
    if (stockCodes.length > 100) {
      res.status(400).json({
        error: 'Maksimum 100 hisse kodu sorgulanabilir',
        received: stockCodes.length
      });
      return;
    }
    
    const result = await bulkDataService.getBulkData({
      stockCodes,
      useCache,
      maxConcurrency
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        source: 'Custom Bulk Data Service'
      }
    });
  } catch (error) {
    console.error('Custom bulk data hatası:', error);
    res.status(500).json({
      error: 'Custom bulk veri alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Watchlist veri çekme
router.post('/watchlist', rateLimitMiddleware, async (req, res): Promise<void> => {
  const startTime = Date.now();
  try {
    const { stockCodes, useCache = true } = req.body;
    
    if (!Array.isArray(stockCodes) || stockCodes.length === 0) {
      res.status(400).json({
        error: 'stockCodes dizisi gereklidir',
        example: { stockCodes: ['THYAO', 'AKBNK', 'BIMAS'] }
      });
      return;
    }
    
    if (stockCodes.length > 50) {
      res.status(400).json({
        error: 'Watchlist için maksimum 50 hisse kodu sorgulanabilir',
        received: stockCodes.length
      });
      return;
    }
    
    const result = await bulkDataService.getWatchlistData(stockCodes, {
      useCache
    });
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: result,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        source: 'Watchlist Bulk Data Service'
      }
    });
  } catch (error) {
    console.error('Watchlist bulk data hatası:', error);
    res.status(500).json({
      error: 'Watchlist verileri alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Sistem durumu
router.get('/status', async (req, res): Promise<void> => {
  try {
    const status = bulkDataService.getStatus();
    
    res.json({
      success: true,
      data: status,
      meta: {
        timestamp: new Date().toISOString(),
        source: 'Bulk Data Service Status'
      }
    });
  } catch (error) {
    console.error('Bulk data status hatası:', error);
    res.status(500).json({
      error: 'Sistem durumu alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Otomatik güncelleme kontrolü
router.post('/auto-update/start', rateLimitMiddleware, async (req, res): Promise<void> => {
  try {
    const { intervalMs = 30000 } = req.body; // Default 30 saniye
    
    if (intervalMs < 5000) {
      res.status(400).json({
        error: 'Minimum güncelleme aralığı 5 saniyedir',
        received: intervalMs
      });
      return;
    }
    
    bulkDataService.startAutoUpdate(intervalMs);
    
    res.json({
      success: true,
      message: 'Otomatik güncelleme başlatıldı',
      data: {
        intervalMs,
        intervalText: `${intervalMs / 1000} saniye`
      }
    });
  } catch (error) {
    console.error('Otomatik güncelleme başlatma hatası:', error);
    res.status(500).json({
      error: 'Otomatik güncelleme başlatılamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

router.post('/auto-update/stop', rateLimitMiddleware, async (req, res): Promise<void> => {
  try {
    bulkDataService.stopAutoUpdate();
    
    res.json({
      success: true,
      message: 'Otomatik güncelleme durduruldu'
    });
  } catch (error) {
    console.error('Otomatik güncelleme durdurma hatası:', error);
    res.status(500).json({
      error: 'Otomatik güncelleme durdurulamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Mevcut sektörleri listele
router.get('/sectors', async (req, res): Promise<void> => {
  try {
    const sectors = Object.entries(SECTOR_GROUPS).map(([key, stocks]) => ({
      name: key,
      stockCount: stocks.length,
      stocks: stocks
    }));
    
    res.json({
      success: true,
      data: sectors,
      meta: {
        totalSectors: sectors.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Sektör listesi hatası:', error);
    res.status(500).json({
      error: 'Sektör listesi alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

export default router;