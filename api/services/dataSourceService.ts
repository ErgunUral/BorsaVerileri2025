import axios, { AxiosInstance } from 'axios';
import { AdvancedLoggerService } from './advancedLoggerService';
import { RedisService } from './redisService';
import { ErrorHandlingService } from './errorHandlingService';
import { IsYatirimScraper } from '../scrapers/isYatirimScraper';
import { YahooFinanceScraper } from '../scrapers/yahooFinanceScraper';
import { AlphaVantageScraper } from '../scrapers/alphaVantageScraper';
import { InvestingComScraper } from '../scrapers/investingComScraper';
import { DataValidationService } from './dataValidationService';
// Internal interface definitions
interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: string;
  source: string;
}

interface MarketSummary {
  totalVolume: number;
  totalValue: number;
  gainers: number;
  losers: number;
  unchanged: number;
  timestamp: string;
  source: string;
}

interface DataSourceConfig {
  name: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  rateLimit: number; // requests per minute
  headers?: Record<string, string>;
  priority: number; // 1 = highest priority
}



class DataSourceService {
  private logger: AdvancedLoggerService;
  private redis: RedisService;
  private errorHandler: ErrorHandlingService;
  
  private httpClients: Map<string, AxiosInstance> = new Map();
  private rateLimiters: Map<string, { requests: number; resetTime: number }> = new Map();
  private lastRequests: Map<string, number> = new Map();
  private isYatirimScraper: IsYatirimScraper;
  private yahooFinanceScraper: YahooFinanceScraper;
  private alphaVantageScraper: AlphaVantageScraper;
  private investingComScraper: InvestingComScraper;
  private validationService: DataValidationService;

  private dataSources: DataSourceConfig[] = [
    {
      name: 'is_yatirim',
      baseUrl: 'https://www.isyatirim.com.tr',
      timeout: 10000,
      retryAttempts: 3,
      rateLimit: 60, // 60 requests per minute
      priority: 1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    },
    {
      name: 'yahoo_finance',
      baseUrl: 'https://query1.finance.yahoo.com',
      timeout: 8000,
      retryAttempts: 3,
      rateLimit: 100,
      priority: 2,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    },
    {
      name: 'investing_com',
      baseUrl: 'https://www.investing.com',
      timeout: 12000,
      retryAttempts: 2,
      rateLimit: 30,
      priority: 3,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    },
    {
      name: 'alpha_vantage',
      baseUrl: 'https://www.alphavantage.co',
      timeout: 15000,
      retryAttempts: 2,
      rateLimit: 5, // Free tier limit
      priority: 4,
      headers: {
        'Accept': 'application/json'
      }
    }
  ];

  constructor(logger: AdvancedLoggerService, redis: RedisService, errorHandler: ErrorHandlingService) {
    this.logger = logger;
    this.redis = redis;
    this.errorHandler = errorHandler;
    this.isYatirimScraper = new IsYatirimScraper(logger, errorHandler);
    this.yahooFinanceScraper = new YahooFinanceScraper(logger, errorHandler);
    this.alphaVantageScraper = new AlphaVantageScraper(logger, errorHandler, process.env['ALPHA_VANTAGE_API_KEY']);
    this.investingComScraper = new InvestingComScraper(logger, errorHandler);
    this.validationService = new DataValidationService(logger, redis);
    
    // Initialize HTTP clients
    this.initializeHttpClients();
  }

  private initializeHttpClients(): void {
    this.dataSources.forEach(source => {
      const client = axios.create({
        baseURL: source.baseUrl,
        timeout: source.timeout,
        headers: source.headers || {}
      });
      
      this.httpClients.set(source.name, client);
      this.logger.logInfo(`HTTP client initialized for ${source.name}`);
    });
  }





  async getStockData(symbol: string): Promise<StockData[]> {
    const results: StockData[] = [];
    const errors: Error[] = [];

    // Sort sources by priority
    const sortedSources = [...this.dataSources].sort((a, b) => a.priority - b.priority);

    for (const source of sortedSources) {
      try {
        const data = await this.errorHandler.executeWithRetryAndCircuitBreaker(
          () => this.fetchStockDataFromSource(symbol, source),
          source.name,
          {
            operation: 'fetch_stock_data',
            source: source.name,
            symbol,
            timestamp: new Date().toISOString()
          },
          { maxAttempts: source.retryAttempts }
        );

        if (data) {
          // Validate data before adding to results
          const validation = await this.validationService.validateStockData(data);
          if (validation.isValid && validation.confidence > 0.7) {
            results.push(data);
            
            // Cache successful result
            await this.cacheStockData(symbol, data, source.name);
          } else {
            this.logger.logWarn(`Data validation failed for ${source.name}`, { 
              symbol, 
              metadata: {
                confidence: validation.confidence, 
                issues: validation.issues
              }
            });
          }
        }
      } catch (error) {
        errors.push(error as Error);
        this.logger.logWarn(`Failed to fetch data from ${source.name} for ${symbol}`, {
          symbol,
          metadata: {
            source: source.name,
            error: (error as Error).message
          }
        });
      }
    }

    // If we have multiple results, perform cross-validation
    if (results.length > 1) {
      const crossValidation = await this.validationService.crossValidateStockData(results);
      if (crossValidation.consensusData && crossValidation.confidence > 0.8) {
        return [crossValidation.consensusData];
      }
    }

    // If no data was fetched, try to get from cache
    if (results.length === 0) {
      const cachedData = await this.getCachedStockData(symbol);
      if (cachedData) {
        this.logger.logInfo(`Using cached data for ${symbol}`);
        return [cachedData];
      }
      
      // If still no data, throw aggregated error
      const aggregatedError = new Error(`Failed to fetch data for ${symbol} from all sources: ${errors.map(e => e.message).join(', ')}`);
      await this.errorHandler.handleCriticalError(aggregatedError, {
        operation: 'fetch_stock_data_all_sources',
        symbol,
        timestamp: new Date().toISOString(),
        metadata: { errorCount: errors.length }
      });
      throw aggregatedError;
    }

    return results;
  }

  private async fetchStockDataFromSource(symbol: string, source: DataSourceConfig): Promise<StockData | null> {
    const client = this.httpClients.get(source.name);
    if (!client) {
      throw new Error(`HTTP client not found for source: ${source.name}`);
    }

    let rawData: any = null;
    
    switch (source.name) {
      case 'is_yatirim':
        // Special handling for ASELS and ASLSN - use simple method for better accuracy
        if (symbol === 'ASELS' || symbol === 'ASLSN') {
          rawData = await this.isYatirimScraper.getStockDataSimple(symbol);
        } else {
          rawData = await this.isYatirimScraper.getStockData(symbol);
        }
        break;
      case 'yahoo_finance':
        rawData = await this.yahooFinanceScraper.getStockData(symbol);
        break;
      case 'alpha_vantage':
        rawData = await this.alphaVantageScraper.getStockData(symbol);
        break;
      case 'investing_com':
        rawData = await this.investingComScraper.getStockData(symbol);
        break;
      default:
        throw new Error(`Unknown data source: ${source.name}`);
    }
    
    if (!rawData) return null;
    
    // Transform to StockData format
    return {
      symbol: rawData.symbol || symbol,
      price: rawData.price || 0,
      change: rawData.change || 0,
      changePercent: rawData.changePercent || 0,
      volume: rawData.volume || 0,
      high: rawData.high || rawData.price || 0,
      low: rawData.low || rawData.price || 0,
      open: rawData.open || rawData.price || 0,
      close: rawData.close || rawData.price || 0, // Use price as close if close is not available
      timestamp: rawData.timestamp || new Date().toISOString(),
      source: rawData.source || source.name
    };
  }



  async getMarketSummary(): Promise<MarketSummary[]> {
    const results: MarketSummary[] = [];
    
    for (const source of this.dataSources) {
      try {
        const summary = await this.errorHandler.executeWithRetryAndCircuitBreaker(
          () => this.fetchMarketSummaryFromSource(source),
          source.name,
          {
            operation: 'fetch_market_summary',
            source: source.name,
            timestamp: new Date().toISOString()
          }
        );
        
        if (summary) {
          results.push(summary);
        }
      } catch (error) {
        this.logger.logWarn(`Failed to fetch market summary from ${source.name}`, {
          metadata: {
            error: (error as Error).message
          }
        });
      }
    }
    
    return results;
  }

  private async fetchMarketSummaryFromSource(source: DataSourceConfig): Promise<MarketSummary | null> {
    try {
      switch (source.name) {
        case 'is_yatirim':
          const isMarketData = await this.isYatirimScraper.getMarketData();
          // IsYatirimScraper returns array of market indices, aggregate the data
          const isGainers = isMarketData.filter(item => item.change > 0).length;
          const isLosers = isMarketData.filter(item => item.change < 0).length;
          const isUnchanged = isMarketData.filter(item => item.change === 0).length;
          
          return {
            totalVolume: 0, // Not available from İş Yatırım indices
            totalValue: 0, // Not available from İş Yatırım indices
            gainers: isGainers,
            losers: isLosers,
            unchanged: isUnchanged,
            timestamp: new Date().toISOString(),
            source: source.name
          };
        case 'yahoo_finance':
          const yahooMarketData = await this.yahooFinanceScraper.getMarketSummary();
          // YahooFinanceScraper returns array of market indices, aggregate the data
          const yahooGainers = yahooMarketData.filter(item => item.change > 0).length;
          const yahooLosers = yahooMarketData.filter(item => item.change < 0).length;
          const yahooUnchanged = yahooMarketData.filter(item => item.change === 0).length;
          
          return {
            totalVolume: 0, // Not available from Yahoo Finance market summary
            totalValue: 0, // Not available from Yahoo Finance market summary
            gainers: yahooGainers,
            losers: yahooLosers,
            unchanged: yahooUnchanged,
            timestamp: new Date().toISOString(),
            source: source.name
          };
        case 'investing_com':
          await this.investingComScraper.getMarketData();
          return {
            totalVolume: 0, // Investing.com doesn't provide these specific metrics
            totalValue: 0,
            gainers: 0,
            losers: 0,
            unchanged: 0,
            timestamp: new Date().toISOString(),
            source: source.name
          };
        default:
          return {
            totalVolume: 0,
            totalValue: 0,
            gainers: 0,
            losers: 0,
            unchanged: 0,
            timestamp: new Date().toISOString(),
            source: source.name
          };
      }
    } catch (error) {
      this.logger.logError(`Failed to fetch market summary from ${source.name}`, error as Error);
      return null;
    }
  }

  private async cacheStockData(symbol: string, data: StockData, source: string): Promise<void> {
    try {
      const cacheKey = `stock_data:${symbol}:${source}`;
      await this.redis.set(cacheKey, JSON.stringify(data), 60); // Cache for 1 minute (gerçek zamanlı için kısaltıldı)
      
      // Also cache as latest data for the symbol
      const latestKey = `stock_latest:${symbol}`;
      await this.redis.set(latestKey, JSON.stringify(data), 120); // Cache for 2 minutes (gerçek zamanlı için kısaltıldı)
    } catch (error) {
      this.logger.logWarn('Failed to cache stock data', {
        symbol,
        metadata: {
          source,
          error: (error as Error).message
        }
      });
    }
  }

  private async getCachedStockData(symbol: string): Promise<StockData | null> {
    try {
      const cacheKey = `stock_latest:${symbol}`;
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.logWarn('Failed to get cached stock data', {
        symbol,
        metadata: {
          error: (error as Error).message
        }
      });
      return null;
    }
  }

  async validateDataConsistency(symbol: string, dataPoints: StockData[]): Promise<StockData | null> {
    if (dataPoints.length === 0) {
      return null;
    }
    
    if (dataPoints.length === 1) {
      return dataPoints[0];
    }
    
    // Cross-validation logic
    const prices = dataPoints.map(d => d.price).filter(p => p > 0);
    if (prices.length === 0) {
      return null;
    }
    
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceVariance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const priceStdDev = Math.sqrt(priceVariance);
    
    // If price variance is too high, log warning
    if (priceStdDev / avgPrice > 0.05) { // 5% threshold
      this.logger.logWarn('High price variance detected across sources', {
        symbol,
        metadata: {
          avgPrice,
          stdDev: priceStdDev,
          sources: dataPoints.map(d => d.source),
          prices
        }
      });
    }
    
    // Return data from highest priority source
    const sortedByPriority = dataPoints.sort((a, b) => {
      const sourceA = this.dataSources.find(s => s.name === a.source);
      const sourceB = this.dataSources.find(s => s.name === b.source);
      return (sourceA?.priority || 999) - (sourceB?.priority || 999);
    });
    
    return sortedByPriority[0];
  }

  getDataSourceStatus() {
    return {
      sources: this.dataSources.map(source => ({
        name: source.name,
        priority: source.priority,
        rateLimit: source.rateLimit,
        rateLimiter: this.rateLimiters.get(source.name),
        lastRequest: this.lastRequests.get(source.name)
      })),
      errorStats: this.errorHandler.getErrorStatistics()
    };
  }

  async gracefulShutdown(): Promise<void> {
    this.logger.logInfo('Starting graceful shutdown of data source service');
    
    // Clear rate limiters
    this.rateLimiters.clear();
    this.lastRequests.clear();
    
    this.logger.logInfo('Data source service shutdown completed');
  }
}

// Singleton instance
let dataSourceServiceInstance: DataSourceService | null = null;

export const getDataSourceService = (): DataSourceService => {
  if (!dataSourceServiceInstance) {
    // Import required services
    const { getAdvancedLoggerService } = require('./advancedLoggerService');
    const { getRedisService } = require('./redisService');
    const { getErrorHandlingService } = require('./errorHandlingService');
    
    const logger = getAdvancedLoggerService();
    const redis = getRedisService();
    const errorHandler = getErrorHandlingService();
    
    dataSourceServiceInstance = new DataSourceService(logger, redis, errorHandler);
  }
  return dataSourceServiceInstance;
};

export { DataSourceService, DataSourceConfig };
export default getDataSourceService;