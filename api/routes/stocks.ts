import { Router, Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { StockScraper } from '../services/stockScraper.js';
import { FinancialCalculator } from '../services/financialCalculator.js';
// Validation middleware'leri gerektiğinde import edilecek
import { stockDataCache, analysisCache, priceCache } from '../middleware/cache.js';

const router = Router();
const stockScraper = new StockScraper();
const financialCalculator = new FinancialCalculator();

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 60,
});

const rateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rateLimiter.consume(req.ip || 'unknown');
    next();
  } catch (rejRes) {
    res.status(429).json({ error: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' });
  }
};

// Hisse kodu doğrulama middleware
const validateStockCodeLocal = (req: Request, res: Response, next: NextFunction): void => {
  const { stockCode } = req.params;
  
  if (!stockCode || stockCode.length < 2) {
    res.status(400).json({
      error: 'Geçersiz hisse kodu',
      message: 'Hisse kodu en az 2 karakter olmalıdır'
    });
    return;
  }
  
  if (!/^[A-Z0-9]+$/.test(stockCode.toUpperCase())) {
    res.status(400).json({
      error: 'Geçersiz hisse kodu formatı',
      message: 'Hisse kodu sadece harf ve rakam içerebilir'
    });
    return;
  }
  
  next();
};

// Popüler hisse kodları listesi
router.get('/popular', rateLimitMiddleware, (_req, res) => {
  try {
    const popularStocks = stockScraper.getPopularStocks();
    res.json({
      success: true,
      data: popularStocks,
      count: popularStocks.length
    });
  } catch (error) {
    console.error('Popüler hisseler listesi hatası:', error);
    res.status(500).json({
      error: 'Popüler hisseler listesi alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Hisse kodu doğrulama
router.get('/validate/:stockCode', rateLimitMiddleware, validateStockCodeLocal, async (req, res) => {
  try {
    const { stockCode } = req.params;
    const isValid = await stockScraper.validateStockCode(stockCode);
    
    res.json({
      success: true,
      stockCode: stockCode.toUpperCase(),
      isValid,
      message: isValid ? 'Geçerli hisse kodu' : 'Geçersiz hisse kodu'
    });
  } catch (error) {
    console.error('Hisse kodu doğrulama hatası:', error);
    res.status(500).json({
      error: 'Hisse kodu doğrulanamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Hisse fiyat bilgisi
router.get('/price/:stockCode', rateLimitMiddleware, priceCache, validateStockCodeLocal, async (req, res): Promise<void> => {
  try {
    const { stockCode } = req.params;
    const priceData = await stockScraper.scrapeStockPrice(stockCode);
    
    if (!priceData) {
      res.status(404).json({
        error: 'Hisse fiyat bilgisi bulunamadı',
        stockCode: stockCode.toUpperCase()
      });
      return;
    }
    
    res.json({
      success: true,
      data: priceData
    });
  } catch (error) {
    console.error('Fiyat bilgisi hatası:', error);
    res.status(500).json({
      error: 'Fiyat bilgisi alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Mali tablo verisi
router.get('/financial/:stockCode', rateLimitMiddleware, stockDataCache, validateStockCodeLocal, async (req, res): Promise<void> => {
  try {
    const { stockCode } = req.params;
    const financialData = await stockScraper.scrapeFinancialData(stockCode);
    
    if (!financialData) {
      res.status(404).json({
        error: 'Mali tablo verisi bulunamadı',
        stockCode: stockCode.toUpperCase(),
        suggestion: 'Hisse kodunu kontrol ediniz veya daha sonra tekrar deneyiniz'
      });
      return;
    }
    
    res.json({
      success: true,
      data: financialData
    });
  } catch (error) {
    console.error('Mali tablo hatası:', error);
    res.status(500).json({
      error: 'Mali tablo verisi alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Finansal analiz (mali tablo + hesaplamalar)
router.get('/analysis/:stockCode', rateLimitMiddleware, analysisCache, validateStockCodeLocal, async (req, res): Promise<void> => {
  try {
    const { stockCode } = req.params;
    
    // Mali tablo verisini çek
    const financialData = await stockScraper.scrapeFinancialData(stockCode);
    
    if (!financialData) {
      res.status(404).json({
        error: 'Mali tablo verisi bulunamadı',
        stockCode: stockCode.toUpperCase(),
        suggestion: 'Hisse kodunu kontrol ediniz veya daha sonra tekrar deneyiniz'
      });
      return;
    }
    
    // Finansal analizi hesapla
    const analysis = financialCalculator.calculateAnalysis(financialData);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Finansal analiz hatası:', error);
    res.status(500).json({
      error: 'Finansal analiz yapılamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Kapsamlı hisse bilgisi (fiyat + mali tablo + analiz)
router.get('/comprehensive/:stockCode', rateLimitMiddleware, validateStockCodeLocal, async (req, res): Promise<void> => {
  try {
    const { stockCode } = req.params;
    
    // Paralel olarak fiyat ve mali tablo verilerini çek
    const [priceData, financialData] = await Promise.all([
      stockScraper.scrapeStockPrice(stockCode),
      stockScraper.scrapeFinancialData(stockCode)
    ]);
    
    if (!financialData) {
      res.status(404).json({
        error: 'Hisse verisi bulunamadı',
        stockCode: stockCode.toUpperCase(),
        suggestion: 'Hisse kodunu kontrol ediniz veya daha sonra tekrar deneyiniz'
      });
      return;
    }
    
    // Finansal analizi hesapla
    const analysis = financialCalculator.calculateAnalysis(financialData);
    
    res.json({
      success: true,
      data: {
        stockCode: stockCode.toUpperCase(),
        price: priceData,
        analysis,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Kapsamlı veri hatası:', error);
    res.status(500).json({
      error: 'Hisse verisi alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Çoklu hisse analizi
router.post('/batch-analysis', rateLimitMiddleware, async (req, res): Promise<void> => {
  try {
    const { stockCodes } = req.body;
    
    if (!Array.isArray(stockCodes) || stockCodes.length === 0) {
      res.status(400).json({
        error: 'stockCodes dizisi gereklidir',
        example: { stockCodes: ['THYAO', 'AKBNK', 'BIMAS'] }
      });
      return;
    }
    
    if (stockCodes.length > 10) {
      res.status(400).json({
        error: 'Maksimum 10 hisse kodu analiz edilebilir',
        received: stockCodes.length
      });
      return;
    }
    
    // Her hisse için analiz yap
    const results = await Promise.allSettled(
      stockCodes.map(async (stockCode: string) => {
        const financialData = await stockScraper.scrapeFinancialData(stockCode);
        if (!financialData) {
          throw new Error(`${stockCode} için veri bulunamadı`);
        }
        return financialCalculator.calculateAnalysis(financialData);
      })
    );
    
    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result, index) => ({
        stockCode: stockCodes[index],
        error: result.reason.message
      }));
    
    res.json({
      success: true,
      data: {
        successful,
        failed,
        summary: {
          total: stockCodes.length,
          successful: successful.length,
          failed: failed.length
        }
      }
    });
  } catch (error) {
    console.error('Çoklu analiz hatası:', error);
    res.status(500).json({
      error: 'Çoklu analiz yapılamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Sektör karşılaştırması
router.get('/sector-benchmarks', rateLimitMiddleware, async (_req, res) => {
  try {
    const benchmarks = financialCalculator.getSectorBenchmarks();
    res.json({
      success: true,
      data: benchmarks
    });
  } catch (error) {
    console.error('Benchmark hatası:', error);
    res.status(500).json({
      error: 'Benchmark verileri alınamadı',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Hata yakalama middleware
router.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Stocks router hatası:', error);
  res.status(500).json({
    error: 'Sunucu hatası',
    details: error.message,
    timestamp: new Date().toISOString()
  });
});

export default router;