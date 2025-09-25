import express from 'express';
import rateLimit from 'express-rate-limit';
import { DataSourceService } from '../services/dataSourceService';
import { getAdvancedLogger } from '../services/advancedLoggerService';
import { getErrorHandlingService } from '../services/errorHandlingService';
import { getRedisService } from '../services/redisService';
import { getIsYatirimScraper } from '../scrapers/isYatirimScraper';

const router = express.Router();

// Initialize services using singletons
const logger = getAdvancedLogger();
const redis = getRedisService();
const errorHandler = getErrorHandlingService();
const dataSourceService = new DataSourceService(logger, redis, errorHandler);

// Rate limiting for stock data endpoints
const stockDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many stock data requests, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const marketDataLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    error: 'Too many market data requests, please try again later.',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
router.use(stockDataLimiter);

// BIST 100 stock symbols
const BIST100_SYMBOLS = [
  'AKBNK', 'ARCLK', 'ASELS', 'ASLSN', 'BIMAS', 'EKGYO', 'EREGL', 'FROTO', 'GARAN',
  'HALKB', 'ISCTR', 'KCHOL', 'KOZAL', 'KOZAA', 'KRDMD', 'PETKM', 'PGSUS',
  'SAHOL', 'SISE', 'SKBNK', 'TAVHL', 'TCELL', 'THYAO', 'TKFEN', 'TOASO',
  'TUPRS', 'VAKBN', 'YKBNK', 'ZIRAAT', 'AEFES', 'AGHOL', 'AKSA', 'ALARK',
  'ANACM', 'ASUZU', 'AYDEM', 'BAGFS', 'BASGZ', 'BERA', 'BIENY', 'BINHO',
  'BRISA', 'BRSAN', 'BRYAT', 'BYDNR', 'CCOLA', 'CEMAS', 'CEMTS', 'CLEBI',
  'CWENE', 'DEVA', 'DOAS', 'DOHOL', 'ECILC', 'EGEEN', 'ENKAI', 'ENJSA',
  'EUPWR', 'EUREN', 'FENER', 'FLAP', 'GLYHO', 'GOODY', 'GUBRF', 'GWIND',
  'HEKTS', 'IHEVA', 'IHGZT', 'IHLAS', 'IHLGM', 'INDES', 'IPEKE', 'ISDMR',
  'ISGYO', 'IZMDC', 'JANTS', 'KARSN', 'KATMR', 'KAYSE', 'KERVT', 'KLMSN',
  'KONTR', 'KONYA', 'KORDS', 'KOZAL', 'KRONT', 'KUTPO', 'LOGO', 'MAVI',
  'MPARK', 'NETAS', 'NTHOL', 'ODAS', 'OTKAR', 'OYAKC', 'PAPIL', 'PARSN',
  'PENTA', 'PRKME', 'QUAGR', 'RALYH', 'REEDR', 'RGYAS', 'RTALB', 'RUBNS',
  'RYGYO', 'SAFKR', 'SELEC', 'SNGYO', 'SOKM', 'TATEN', 'TBORG', 'TCELL',
  'TEZOL', 'TGOOD', 'TKNSA', 'TLMAN', 'TMSN', 'TOASO', 'TRCAS', 'TSKB',
  'TTKOM', 'TTRAK', 'ULKER', 'ULUUN', 'VAKKO', 'VESTL', 'VESBE', 'YATAS'
];

// Get single stock data
router.get('/data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { sources } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Stock symbol is required'
      });
    }
    
    const upperSymbol = symbol.toUpperCase();
    
    logger.info('Stock data request', {
      symbol: upperSymbol,
      metadata: {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    // Check cache first
    const cacheKey = `stock_data:${upperSymbol}`;
    const cached = await redis.get(cacheKey);
    
    if (cached && !req.query['force']) {
      const cachedData = JSON.parse(cached);
      return res.json({
        success: true,
        data: cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch from data sources
    const stockDataArray = await dataSourceService.getStockData(upperSymbol);
    
    if (stockDataArray.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No data found for symbol: ${upperSymbol}`
      });
    }
    
    // Validate and get best data
    const validatedData = await dataSourceService.validateDataConsistency(upperSymbol, stockDataArray);
    
    if (!validatedData) {
      return res.status(500).json({
        success: false,
        error: 'Data validation failed'
      });
    }
    
    // Cache the result for 1 minute (60 seconds) - gerçek zamanlı veri için kısaltıldı
    await redis.set(cacheKey, JSON.stringify({
      ...validatedData,
      allSources: stockDataArray
    }), 60);
    
    return res.json({
      success: true,
      data: validatedData,
      allSources: sources === 'all' ? stockDataArray : undefined,
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get stock data', error as Error, {
      symbol: req.params.symbol,
      metadata: {
        ip: req.ip
      }
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stock data',
      details: process.env['NODE_ENV'] === 'development' ? (error as Error).message : undefined
    });
  }
});

// Get multiple stocks data
router.post('/data/batch', async (req, res) => {
  try {
    const { symbols, maxConcurrent = 5 } = req.body;
    
    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Symbols array is required'
      });
    }
    
    if (symbols.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 symbols allowed per batch request'
      });
    }
    
    const upperSymbols = symbols.map((s: string) => s.toUpperCase());
    
    logger.info('Batch stock data request', {
      metadata: {
        symbolCount: upperSymbols.length,
        symbols: upperSymbols,
        ip: req.ip
      }
    });
    
    const results: any[] = [];
    const errors: any[] = [];
    
    // Process symbols in batches to avoid overwhelming the sources
    for (let i = 0; i < upperSymbols.length; i += maxConcurrent) {
      const batch = upperSymbols.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          // Check cache first
          const cacheKey = `stock_data:${symbol}`;
          const cached = await redis.get(cacheKey);
          
          if (cached) {
            return {
              symbol,
              data: JSON.parse(cached),
              cached: true
            };
          }
          
          // Fetch from sources
          const stockDataArray = await dataSourceService.getStockData(symbol);
          const validatedData = await dataSourceService.validateDataConsistency(symbol, stockDataArray);
          
          if (validatedData) {
            // Cache the result
            await redis.set(cacheKey, JSON.stringify(validatedData), 30);
            
            return {
              symbol,
              data: validatedData,
              cached: false
            };
          }
          
          return null;
        } catch (error) {
          errors.push({
            symbol,
            error: (error as Error).message
          });
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));
      
      // Small delay between batches to be respectful to data sources
      if (i + maxConcurrent < upperSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return res.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      totalRequested: upperSymbols.length,
      totalReturned: results.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get batch stock data', error as Error, {
      metadata: {
        ip: req.ip
      }
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch batch stock data'
    });
  }
});

// Get market summary
router.get('/market/summary', marketDataLimiter, async (req, res) => {
  try {
    logger.info('Market summary request', {
      metadata: {
        ip: req.ip
      }
    });
    
    // Check cache first
    const cacheKey = 'market_summary';
    const cached = await redis.get(cacheKey);
    
    if (cached && !req.query['force']) {
      return res.json({
        success: true,
        data: JSON.parse(cached),
        cached: true,
        timestamp: new Date().toISOString()
      });
    }
    
    const summaries = await dataSourceService.getMarketSummary();
    
    // Cache for 1 minute
    await redis.set(cacheKey, JSON.stringify(summaries), 60);
    
    return res.json({
      success: true,
      data: summaries,
      cached: false,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get market summary', error as Error, {
      metadata: {
        ip: req.ip
      }
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch market summary'
    });
  }
});

// Get BIST 100 stocks
router.get('/bist100', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0);
    
    const symbols = BIST100_SYMBOLS.slice(offsetNum, offsetNum + limitNum);
    
    logger.info('BIST 100 request', {
      metadata: {
        limit: limitNum,
        offset: offsetNum,
        ip: req.ip
      }
    });
    
    // Get cached data for these symbols
    const results = [];
    
    for (const symbol of symbols) {
      try {
        const cacheKey = `stock_data:${symbol}`;
        const cached = await redis.get(cacheKey);
        
        if (cached) {
          results.push({
            symbol,
            data: JSON.parse(cached),
            cached: true
          });
        } else {
          results.push({
            symbol,
            data: null,
            cached: false
          });
        }
      } catch (error) {
        // Continue with other symbols if one fails
        continue;
      }
    }
    
    res.json({
      success: true,
      data: results,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: BIST100_SYMBOLS.length,
        hasMore: offsetNum + limitNum < BIST100_SYMBOLS.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get BIST 100 data', error as Error, {
      metadata: {
        ip: req.ip
      }
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch BIST 100 data'
    });
  }
});

// Get data source status
router.get('/sources/status', async (req, res) => {
  try {
    const status = dataSourceService.getDataSourceStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get data source status', error as Error, {
      metadata: {
        ip: req.ip
      }
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get data source status'
    });
  }
});

// Search stocks
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    const query = q.toUpperCase();
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);
    
    // Search in BIST 100 symbols
    const matches = BIST100_SYMBOLS
      .filter(symbol => symbol.includes(query))
      .slice(0, limitNum)
      .map(symbol => ({
        symbol,
        name: symbol, // In a real implementation, you'd have company names
        market: 'BIST'
      }));
    
    return res.json({
      success: true,
      data: matches,
      query,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to search stocks', error as Error, {
      metadata: {
        query: req.query['q'],
        ip: req.ip
      }
    });
    
    return res.status(500).json({
      success: false,
      error: 'Failed to search stocks'
    });
  }
});

// Test XPath scraper endpoint
router.get('/test-xpath/:symbol', async (req, res) => {
  const startTime = Date.now();
  try {
    const { symbol } = req.params;
    const scraper = getIsYatirimScraper(logger, errorHandler);
    
    // Test both methods
    logger.info(`Testing XPath methods for ${symbol}`);
    
    // Try Playwright method first
    let data = null;
    let method = 'playwright';
    
    try {
      data = await scraper.getStockDataWithPlaywright(symbol.toUpperCase());
    } catch (playwrightError) {
      logger.warn(`Playwright failed for ${symbol}, trying optimized XPath method`, playwrightError as Error);
      method = 'optimized';
      try {
        data = await scraper.getStockDataOptimizedXPath(symbol.toUpperCase());
      } catch (optimizedError) {
        logger.warn(`Optimized XPath failed for ${symbol}, trying standard method`, optimizedError as Error);
        method = 'standard';
        data = await scraper.getStockDataWithXPath(symbol.toUpperCase());
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data,
      method,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error(`XPath test failed for ${req.params.symbol}`, error as Error);
    res.status(500).json({
      success: false,
      error: 'Failed to test XPath scraper',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// Test simple HTTP scraper endpoint
router.get('/test-simple/:symbol', async (req, res) => {
  const startTime = Date.now();
  try {
    const { symbol } = req.params;
    console.log(`[DEBUG] Getting scraper instance for ${symbol}`);
    const scraper = getIsYatirimScraper(logger, errorHandler);
    console.log(`[DEBUG] Scraper instance:`, scraper ? 'exists' : 'null');
    console.log(`[DEBUG] Calling getStockDataSimple for ${symbol}`);
    const data = await scraper.getStockDataSimple(symbol.toUpperCase());
    console.log(`[DEBUG] Received data:`, data);
    
    const executionTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: 'Failed to test simple HTTP scraper',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
      executionTime: `${executionTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check for stock data service
router.get('/health', async (req, res) => {
  try {
    const healthChecks = await errorHandler.performHealthChecks();
    const sourceStatus = dataSourceService.getDataSourceStatus();
    
    const overallHealth = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'degraded';
    
    res.json({
      success: true,
      status: overallHealth,
      data: {
        healthChecks,
        sourceStatus,
        bist100Count: BIST100_SYMBOLS.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to get stock service health', error as Error, {
      metadata: {
        ip: req.ip
      }
    });
    
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Failed to get health status'
    });
  }
});

export default router;