import { ApiProvider } from './apiProvider.js';
import { stockDataCache, type StockData } from './cacheService.js';
import logger from '../utils/logger.js';
import { isYatirimScraper } from './isYatirimScraper.js';
import YahooFinanceScraper from './yahooFinanceScraper.js';
const yahooFinanceScraper = new YahooFinanceScraper();
import AlphaVantageScraper from './alphaVantageScraper.js';
const alphaVantageScraper = new AlphaVantageScraper();
import InvestingScraper from './investingScraper.js';
const investingScraper = new InvestingScraper();

interface ProviderConfig {
  name: string;
  priority: number;
  timeout: number;
  retryCount: number;
  healthCheck: () => Promise<boolean>;
}

interface DataValidationResult {
  isValid: boolean;
  confidence: number;
  anomalies: string[];
  source: string;
}

class EnhancedApiProvider {
  private providers: Map<string, ApiProvider> = new Map();
  private providerConfigs: Map<string, ProviderConfig> = new Map();
  private failureCount: Map<string, number> = new Map();
  private lastSuccessTime: Map<string, number> = new Map();
  private circuitBreakerThreshold = 5;
  private circuitBreakerTimeout = 60000; // 1 minute

  constructor() {
    this.initializeProviders();
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    try {
      // Stock data cache is already initialized
      logger.info('Enhanced API Provider: Stock data cache ready');
    } catch (error) {
      logger.error('Enhanced API Provider: Failed to initialize cache:', error);
    }
  }

  private initializeProviders(): void {
    // İş Yatırım Provider
    this.providers.set('isyatirim', {
      isAvailable: () => true,
      getStockPrice: async (stockCode: string) => {
        return await isYatirimScraper.getStockData(stockCode);
      },
      getFinancialData: async (stockCode: string) => {
        return await isYatirimScraper.getFinancialData(stockCode);
      }
    });

    // Yahoo Finance Provider
    this.providers.set('yahoo', {
      isAvailable: () => true,
      getStockPrice: async (stockCode: string) => {
        return await yahooFinanceScraper.getStockData(stockCode);
      },
      getFinancialData: async (stockCode: string) => {
        return null; // Yahoo Finance financial data not implemented
      }
    });

    // Alpha Vantage Provider
    this.providers.set('alphavantage', {
      isAvailable: () => !!process.env.ALPHA_VANTAGE_API_KEY,
      getStockPrice: async (stockCode: string) => {
        return await alphaVantageScraper.getStockData(stockCode);
      },
      getFinancialData: async (stockCode: string) => {
        return null; // Alpha Vantage financial data not implemented
      }
    });

    // Investing.com Provider
    this.providers.set('investing', {
      isAvailable: () => true,
      getStockPrice: async (stockCode: string) => {
        return await investingScraper.getStockData(stockCode);
      },
      getFinancialData: async (stockCode: string) => {
        return null; // Investing.com financial data not implemented
      }
    });

    // Provider configurations
    this.providerConfigs.set('isyatirim', {
      name: 'İş Yatırım',
      priority: 1,
      timeout: 10000,
      retryCount: 3,
      healthCheck: async () => true
    });

    this.providerConfigs.set('yahoo', {
      name: 'Yahoo Finance',
      priority: 2,
      timeout: 8000,
      retryCount: 2,
      healthCheck: async () => true
    });

    this.providerConfigs.set('alphavantage', {
      name: 'Alpha Vantage',
      priority: 3,
      timeout: 12000,
      retryCount: 2,
      healthCheck: async () => !!process.env.ALPHA_VANTAGE_API_KEY
    });

    this.providerConfigs.set('investing', {
      name: 'Investing.com',
      priority: 4,
      timeout: 15000,
      retryCount: 2,
      healthCheck: async () => true
    });
  }

  private isCircuitBreakerOpen(providerName: string): boolean {
    const failures = this.failureCount.get(providerName) || 0;
    const lastSuccess = this.lastSuccessTime.get(providerName) || 0;
    const now = Date.now();

    if (failures >= this.circuitBreakerThreshold) {
      if (now - lastSuccess > this.circuitBreakerTimeout) {
        // Reset circuit breaker
        this.failureCount.set(providerName, 0);
        return false;
      }
      return true;
    }
    return false;
  }

  private recordSuccess(providerName: string): void {
    this.failureCount.set(providerName, 0);
    this.lastSuccessTime.set(providerName, Date.now());
  }

  private recordFailure(providerName: string): void {
    const current = this.failureCount.get(providerName) || 0;
    this.failureCount.set(providerName, current + 1);
  }

  private validateStockData(data: StockData, source: string): DataValidationResult {
    const anomalies: string[] = [];
    let confidence = 1.0;

    // Price validation
    if (!data.price || data.price <= 0) {
      anomalies.push('Invalid price value');
      confidence -= 0.3;
    }

    // Change percent validation
    if (Math.abs(data.changePercent) > 20) {
      anomalies.push('Extreme price change detected');
      confidence -= 0.2;
    }

    // Volume validation
    if (data.volume && data.volume < 0) {
      anomalies.push('Invalid volume value');
      confidence -= 0.2;
    }

    // Timestamp validation
    if (!data.lastUpdated) {
      anomalies.push('Missing timestamp');
      confidence -= 0.1;
    } else {
      const age = Date.now() - new Date(data.lastUpdated).getTime();
      if (age > 300000) { // 5 minutes
        anomalies.push('Data is stale');
        confidence -= 0.2;
      }
    }

    return {
      isValid: confidence > 0.5,
      confidence,
      anomalies,
      source
    };
  }

  private async crossValidateData(stockCode: string, primaryData: StockData, sources: string[]): Promise<StockData> {
    try {
      const validationResults: DataValidationResult[] = [];
      const allData: { data: StockData; source: string }[] = [{ data: primaryData, source: sources[0] }];

      // Get data from other sources for validation
      for (let i = 1; i < Math.min(sources.length, 3); i++) {
        const providerName = sources[i];
        if (this.isCircuitBreakerOpen(providerName)) continue;

        try {
          const provider = this.providers.get(providerName);
          if (provider && provider.isAvailable()) {
            const data = await provider.getStockPrice(stockCode);
            if (data) {
              allData.push({ data, source: providerName });
            }
          }
        } catch (error) {
          logger.warn(`Cross-validation failed for ${providerName}:`, error);
        }
      }

      // Validate each data source
      allData.forEach(({ data, source }) => {
        validationResults.push(this.validateStockData(data, source));
      });

      // Find the most reliable data
      const bestResult = validationResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      const bestData = allData.find(d => d.source === bestResult.source)?.data || primaryData;

      // Log validation results
      if (validationResults.length > 1) {
        logger.info(`Cross-validation for ${stockCode}: ${validationResults.length} sources, best confidence: ${bestResult.confidence.toFixed(2)}`);
      }

      return bestData;
    } catch (error) {
      logger.error(`Cross-validation error for ${stockCode}:`, error);
      return primaryData;
    }
  }

  async getStockPrice(stockCode: string, useCache: boolean = true): Promise<StockData | null> {
    try {
      // Check cache first
      if (useCache) {
        const cachedData = stockDataCache.getStockData(stockCode);
        if (cachedData) {
          logger.debug(`Cache hit for ${stockCode}`);
          return cachedData;
        }
      }

      // Get sorted providers by priority
      const sortedProviders = Array.from(this.providerConfigs.entries())
        .sort(([, a], [, b]) => a.priority - b.priority)
        .map(([name]) => name);

      let lastError: Error | null = null;
      let primaryData: StockData | null = null;
      const successfulSources: string[] = [];

      // Try each provider
      for (const providerName of sortedProviders) {
        if (this.isCircuitBreakerOpen(providerName)) {
          logger.warn(`Circuit breaker open for ${providerName}, skipping`);
          continue;
        }

        const provider = this.providers.get(providerName);
        const config = this.providerConfigs.get(providerName);
        
        if (!provider || !config || !provider.isAvailable()) {
          continue;
        }

        try {
          logger.debug(`Trying ${providerName} for ${stockCode}`);
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), config.timeout);
          });

          const dataPromise = provider.getStockPrice(stockCode);
          const data = await Promise.race([dataPromise, timeoutPromise]);

          if (data) {
            this.recordSuccess(providerName);
            successfulSources.push(providerName);
            
            if (!primaryData) {
              primaryData = data;
            }
            
            logger.info(`Successfully fetched ${stockCode} from ${providerName}`);
            break;
          }
        } catch (error: any) {
          this.recordFailure(providerName);
          lastError = error;
          logger.warn(`Provider ${providerName} failed for ${stockCode}:`, error.message);
        }
      }

      if (!primaryData) {
        logger.error(`All providers failed for ${stockCode}. Last error:`, lastError);
        return null;
      }

      // Cross-validate data if multiple sources are available
      const validatedData = await this.crossValidateData(stockCode, primaryData, successfulSources);

      // Cache the validated data
      if (useCache) {
        stockDataCache.setStockData(stockCode, validatedData);
      }

      return validatedData;
    } catch (error) {
      logger.error(`Enhanced API Provider error for ${stockCode}:`, error);
      return null;
    }
  }

  async getBulkStockData(stockCodes: string[], useCache: boolean = true): Promise<Record<string, StockData | null>> {
    try {
      const result: Record<string, StockData | null> = {};
      
      // Check cache for all stocks
      let uncachedCodes = stockCodes;
      if (useCache) {
        stockCodes.forEach(code => {
          const cachedData = stockDataCache.getStockData(code);
          if (cachedData) {
            result[code] = cachedData;
          }
        });
        uncachedCodes = stockCodes.filter(code => !result[code]);
        
        if (uncachedCodes.length === 0) {
          logger.info(`All ${stockCodes.length} stocks found in cache`);
          return result;
        }
      }

      logger.info(`Fetching ${uncachedCodes.length} stocks from providers`);

      // Batch process uncached stocks
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < uncachedCodes.length; i += batchSize) {
        batches.push(uncachedCodes.slice(i, i + batchSize));
      }

      const newData: Record<string, StockData> = {};
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (stockCode) => {
          const data = await this.getStockPrice(stockCode, false); // Don't use cache in individual calls
          if (data) {
            newData[stockCode] = data;
          }
          return { stockCode, data };
        });

        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((promiseResult) => {
          if (promiseResult.status === 'fulfilled') {
            const { stockCode, data } = promiseResult.value;
            result[stockCode] = data;
          }
        });

        // Small delay between batches to avoid overwhelming providers
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Cache new data in bulk
      if (useCache && Object.keys(newData).length > 0) {
        Object.entries(newData).forEach(([code, data]) => {
          stockDataCache.setStockData(code, data);
        });
      }

      logger.info(`Bulk fetch completed: ${Object.keys(result).length}/${stockCodes.length} successful`);
      return result;
    } catch (error) {
      logger.error('Bulk stock data fetch error:', error);
      return {};
    }
  }

  async getProviderStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    
    for (const [name, config] of this.providerConfigs.entries()) {
      const provider = this.providers.get(name);
      const failures = this.failureCount.get(name) || 0;
      const lastSuccess = this.lastSuccessTime.get(name) || 0;
      const isCircuitOpen = this.isCircuitBreakerOpen(name);
      
      status[name] = {
        name: config.name,
        priority: config.priority,
        available: provider?.isAvailable() || false,
        failures,
        lastSuccess: lastSuccess ? new Date(lastSuccess).toISOString() : null,
        circuitBreakerOpen: isCircuitOpen,
        healthy: failures < this.circuitBreakerThreshold && !isCircuitOpen
      };
    }
    
    return status;
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    const cacheHealthy = true; // stockDataCache is always healthy
    const providerStatus = await this.getProviderStatus();
    const healthyProviders = Object.values(providerStatus).filter((p: any) => p.healthy).length;
    
    return {
      healthy: cacheHealthy && healthyProviders > 0,
      details: {
        cache: cacheHealthy,
        providers: providerStatus,
        healthyProviderCount: healthyProviders,
        totalProviders: Object.keys(providerStatus).length
      }
    };
  }
}

// Singleton instance
const enhancedApiProvider = new EnhancedApiProvider();

export { enhancedApiProvider, EnhancedApiProvider };
export default enhancedApiProvider;