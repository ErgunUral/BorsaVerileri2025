import axios from 'axios';
import StockScraper from "./stockScraper";
import { FinancialData, StockPrice } from '../types/stock';
import InvestingScraper from './investingScraper';

let stockScraper: StockScraper | null = null;
let investingScraper: InvestingScraper | null = null;

function getStockScraper(): StockScraper {
  if (!stockScraper) {
    stockScraper = new StockScraper();
  }
  return stockScraper;
}

function getInvestingScraper(): InvestingScraper {
  if (!investingScraper) {
    investingScraper = new InvestingScraper();
  }
  return investingScraper;
}

export interface ApiProvider {
  name: string;
  getStockPrice(stockCode: string): Promise<StockPrice | null>;
  getFinancialData(stockCode: string): Promise<FinancialData | null>;
  isAvailable(): Promise<boolean>;
}

// İş Yatırım API Provider
class IsYatirimProvider implements ApiProvider {
  name = 'IsYatirim';

  async getStockPrice(stockCode: string): Promise<StockPrice | null> {
    return await getStockScraper().scrapeStockPrice(stockCode);
  }

  async getFinancialData(stockCode: string): Promise<FinancialData | null> {
     return await getStockScraper().scrapeFinancialData(stockCode);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://www.isyatirim.com.tr', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Yahoo Finance API Provider
class YahooFinanceProvider implements ApiProvider {
  name = 'YahooFinance';
  private baseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';

  async getStockPrice(stockCode: string): Promise<StockPrice | null> {
    try {
      const symbol = `${stockCode}.IS`; // İstanbul Stock Exchange suffix
      const response = await axios.get(`${this.baseUrl}/${symbol}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const data = response.data?.chart?.result?.[0];
      if (!data) return null;

      const meta = data.meta;
      const price = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || price;
      const changePercent = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;

      return {
        stockCode: stockCode.toUpperCase(),
        price,
        changePercent,
        volume: meta.regularMarketVolume || 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Yahoo Finance error for ${stockCode}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async getFinancialData(_stockCode: string): Promise<FinancialData | null> {
    // Yahoo Finance doesn't provide detailed financial statements for Turkish stocks
    return null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get('https://query1.finance.yahoo.com/v1/finance/search?q=AAPL', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// Investing.com API Provider
class InvestingProvider implements ApiProvider {
  name = 'Investing';

  async getStockPrice(stockCode: string): Promise<StockPrice | null> {
    return await getInvestingScraper().scrapeStockPrice(stockCode);
  }

  async getFinancialData(_stockCode: string): Promise<FinancialData | null> {
    // Investing.com doesn't provide detailed financial statements through scraping
    return null;
  }

  async isAvailable(): Promise<boolean> {
    return await getInvestingScraper().isAvailable();
  }
}

// Alpha Vantage API Provider
class AlphaVantageProvider implements ApiProvider {
  name = 'AlphaVantage';
  private apiKey = process.env['ALPHA_VANTAGE_API_KEY'] || 'demo';
  private baseUrl = 'https://www.alphavantage.co/query';

  async getStockPrice(stockCode: string): Promise<StockPrice | null> {
    try {
      const symbol = `${stockCode}.IST`; // Istanbul Stock Exchange
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol,
          apikey: this.apiKey
        },
        timeout: 10000
      });

      const quote = response.data['Global Quote'];
      if (!quote) return null;

      const price = parseFloat(quote['05. price']) || 0;
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;
      const volume = parseInt(quote['06. volume']) || 0;

      return {
        stockCode: stockCode.toUpperCase(),
        price,
        changePercent,
        volume,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`Alpha Vantage error for ${stockCode}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  async getFinancialData(_stockCode: string): Promise<FinancialData | null> {
    // Alpha Vantage has limited support for Turkish stocks
    return null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: 'AAPL',
          interval: '1min',
          apikey: this.apiKey
        },
        timeout: 5000
      });
      return !response.data['Error Message'] && !response.data['Note'];
    } catch {
      return false;
    }
  }
}

// Fallback Data Provider with caching
class FallbackDataProvider {
  private providers: ApiProvider[];
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = {
    stockPrice: 30 * 1000, // 30 seconds
    financialData: 24 * 60 * 60 * 1000 // 24 hours
  };

  constructor() {
    this.providers = [
      new IsYatirimProvider(),
      new InvestingProvider(),
      new YahooFinanceProvider(),
      new AlphaVantageProvider()
    ];
  }

  private getCacheKey(type: string, stockCode: string): string {
    return `${type}:${stockCode.toUpperCase()}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  async getStockPrice(stockCode: string): Promise<StockPrice | null> {
    const cacheKey = this.getCacheKey('stockPrice', stockCode);
    
    // Check cache first
    const cached = this.getFromCache<StockPrice>(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for stock price: ${stockCode}`);
      return cached;
    }

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        console.log(`🔄 Trying ${provider.name} for stock price: ${stockCode}`);
        
        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          console.log(`❌ ${provider.name} is not available`);
          continue;
        }

        const result = await provider.getStockPrice(stockCode);
        if (result && result.price > 0) {
          console.log(`✅ ${provider.name} provided stock price for ${stockCode}`);
          this.setCache(cacheKey, result, this.CACHE_TTL.stockPrice);
          return result;
        }
      } catch (error) {
        console.error(`❌ ${provider.name} failed for stock price ${stockCode}:`, error instanceof Error ? error.message : 'Unknown error');
        continue;
      }
    }

    console.log(`❌ All providers failed for stock price: ${stockCode}`);
    return null;
  }

  async getFinancialData(stockCode: string): Promise<FinancialData | null> {
    const cacheKey = this.getCacheKey('financialData', stockCode);
    
    // Check cache first
    const cached = this.getFromCache<FinancialData>(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for financial data: ${stockCode}`);
      return cached;
    }

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        console.log(`🔄 Trying ${provider.name} for financial data: ${stockCode}`);
        
        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) {
          console.log(`❌ ${provider.name} is not available`);
          continue;
        }

        const result = await provider.getFinancialData(stockCode);
        if (result && result.totalAssets > 0) {
          console.log(`✅ ${provider.name} provided financial data for ${stockCode}`);
          this.setCache(cacheKey, result, this.CACHE_TTL.financialData);
          return result;
        }
      } catch (error) {
        console.error(`❌ ${provider.name} failed for financial data ${stockCode}:`, error instanceof Error ? error.message : 'Unknown error');
        continue;
      }
    }

    console.log(`❌ All providers failed for financial data: ${stockCode}`);
    return null;
  }

  // Health check for all providers
  async getProvidersHealth(): Promise<{ [key: string]: boolean }> {
    const health: { [key: string]: boolean } = {};
    
    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          health[provider.name] = await provider.isAvailable();
        } catch {
          health[provider.name] = false;
        }
      })
    );

    return health;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export default new FallbackDataProvider();