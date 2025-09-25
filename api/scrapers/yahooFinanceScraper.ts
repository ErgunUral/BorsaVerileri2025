import axios, { AxiosInstance } from 'axios';
import { AdvancedLoggerService } from '../services/advancedLoggerService.js';
import { ErrorHandlingService } from '../services/errorHandlingService.js';

interface YahooFinanceStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  marketCap: number;
  timestamp: string;
  source: 'yahoo_finance';
}

interface YahooFinanceQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  marketCap?: number;
  shortName?: string;
  longName?: string;
}

interface YahooFinanceResponse {
  quoteResponse: {
    result: YahooFinanceQuote[];
    error: any;
  };
}

class YahooFinanceScraper {
  private client: AxiosInstance;
  private logger: AdvancedLoggerService;
  private errorHandler: ErrorHandlingService;
  
  private baseUrl = 'https://query1.finance.yahoo.com';
  private lastRequestTime = 0;
  private minRequestInterval = 500; // 500ms between requests
  private apiKey: string | undefined;

  constructor(logger: AdvancedLoggerService, errorHandler: ErrorHandlingService, apiKey?: string) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.apiKey = apiKey;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minRequestInterval) {
        const delay = this.minRequestInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      this.lastRequestTime = Date.now();
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Yahoo Finance request failed', error, {
          metadata: {
            url: error.config?.url,
            status: error.response?.status
          }
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Convert Turkish stock symbol to Yahoo Finance format
   */
  private formatSymbolForYahoo(symbol: string): string {
    // Turkish stocks on Yahoo Finance have .IS suffix
    if (symbol.includes('.')) {
      return symbol;
    }
    return `${symbol}.IS`;
  }

  /**
   * Get stock data for a single symbol
   */
  async getStockData(symbol: string): Promise<YahooFinanceStockData | null> {
    return this.errorHandler.executeWithRetry(
      async () => {
        const yahooSymbol = this.formatSymbolForYahoo(symbol);
        this.logger.info(`Fetching Yahoo Finance data for ${yahooSymbol}`, {
          service: 'YahooFinanceScraper',
          operation: 'getStockData',
          symbol: yahooSymbol
        });
        
        const url = `/v7/finance/quote?symbols=${yahooSymbol}`;
        const response = await this.client.get<YahooFinanceResponse>(url);
        
        if (!response.data.quoteResponse.result || response.data.quoteResponse.result.length === 0) {
          this.logger.warn(`No data found for ${yahooSymbol} on Yahoo Finance`, {
            service: 'YahooFinanceScraper',
            operation: 'getStockData',
            symbol: yahooSymbol
          });
          return null;
        }
        
        const quote = response.data.quoteResponse.result[0];
        const stockData = this.transformQuoteToStockData(quote, symbol);
        
        if (stockData) {
          this.logger.info(`Successfully fetched Yahoo Finance data for ${symbol}`, {
            service: 'YahooFinanceScraper',
            operation: 'getStockData',
            symbol: symbol,
            metadata: {
              price: stockData.price,
              change: stockData.change
            }
          });
        }
        
        return stockData;
      },
      {
        operation: 'getStockData',
        source: 'YahooFinanceScraper',
        symbol: symbol,
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Get stock data for multiple symbols
   */
  async getBatchStockData(symbols: string[]): Promise<YahooFinanceStockData[]> {
    return this.errorHandler.executeWithRetry(
      async () => {
        const yahooSymbols = symbols.map(s => this.formatSymbolForYahoo(s));
        this.logger.info(`Fetching Yahoo Finance batch data for ${symbols.length} symbols`, {
          service: 'YahooFinanceScraper',
          operation: 'getBatchStockData',
          metadata: { symbolCount: symbols.length }
        });
        
        // Yahoo Finance allows up to 100 symbols per request
        const batchSize = 50;
        const results: YahooFinanceStockData[] = [];
        
        for (let i = 0; i < yahooSymbols.length; i += batchSize) {
          const batch = yahooSymbols.slice(i, i + batchSize);
          const symbolsParam = batch.join(',');
          
          const url = `/v7/finance/quote?symbols=${symbolsParam}`;
          const response = await this.client.get<YahooFinanceResponse>(url);
          
          if (response.data.quoteResponse.result) {
            for (const quote of response.data.quoteResponse.result) {
              const originalSymbol = quote.symbol.replace('.IS', '');
              const stockData = this.transformQuoteToStockData(quote, originalSymbol);
              if (stockData) {
                results.push(stockData);
              }
            }
          }
          
          // Add delay between batches
          if (i + batchSize < yahooSymbols.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        this.logger.info(`Successfully fetched Yahoo Finance batch data`, {
          service: 'YahooFinanceScraper',
          operation: 'getBatchStockData',
          metadata: {
            requested: symbols.length,
            received: results.length
          }
        });
        
        return results;
      },
      {
        operation: 'getBatchStockData',
        source: 'YahooFinanceScraper',
        symbol: 'batch',
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 2,
        baseDelay: 2000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(symbol: string, interval: string = '1m'): Promise<any> {
    return this.errorHandler.executeWithRetry(
      async () => {
        const yahooSymbol = this.formatSymbolForYahoo(symbol);
        this.logger.info(`Fetching Yahoo Finance historical data for ${yahooSymbol}`, {
          service: 'YahooFinanceScraper',
          operation: 'getHistoricalData',
          symbol: yahooSymbol
        });
        
        const url = `/v8/finance/chart/${yahooSymbol}?period1=0&period2=9999999999&interval=${interval}&includePrePost=false`;
        const response = await this.client.get(url);
        
        if (!response.data.chart?.result?.[0]) {
          this.logger.warn(`No historical data found for ${yahooSymbol}`, {
            service: 'YahooFinanceScraper',
            operation: 'getHistoricalData',
            symbol: yahooSymbol
          });
          return null;
        }
        
        const result = response.data.chart.result[0];
        const timestamps = result.timestamp || [];
        const quotes = result.indicators?.quote?.[0] || {};
        
        const historicalData = timestamps.map((timestamp: number, index: number) => ({
          timestamp: new Date(timestamp * 1000).toISOString(),
          open: quotes.open?.[index] || null,
          high: quotes.high?.[index] || null,
          low: quotes.low?.[index] || null,
          close: quotes.close?.[index] || null,
          volume: quotes.volume?.[index] || null
        })).filter((item: any) => item.close !== null);
        
        this.logger.info(`Successfully fetched Yahoo Finance historical data for ${symbol}`, {
          service: 'YahooFinanceScraper',
          operation: 'getHistoricalData',
          symbol: symbol,
          metadata: {
            dataPoints: historicalData.length
          }
        });
        
        return historicalData;
      },
      {
        operation: 'getHistoricalData',
        source: 'YahooFinanceScraper',
        symbol: symbol,
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Search for stocks
   */
  async searchStocks(query: string): Promise<any[]> {
    return this.errorHandler.executeWithRetry(
      async () => {
        this.logger.info(`Searching Yahoo Finance for: ${query}`, {
          service: 'YahooFinanceScraper',
          operation: 'searchStocks',
          metadata: { query }
        });
        
        const url = `/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
        const response = await this.client.get(url);
        
        const quotes = response.data.quotes || [];
        
        // Filter for Turkish stocks
        const turkishStocks = quotes.filter((quote: any) => 
          quote.symbol?.endsWith('.IS') || 
          quote.exchange === 'IST' ||
          quote.market === 'tr_market'
        );
        
        this.logger.info(`Found ${turkishStocks.length} Turkish stocks for query: ${query}`, {
          service: 'YahooFinanceScraper',
          operation: 'searchStocks',
          metadata: {
            query,
            resultsCount: turkishStocks.length
          }
        });
        
        return turkishStocks.map((quote: any) => ({
          symbol: quote.symbol?.replace('.IS', '') || quote.symbol,
          name: quote.longname || quote.shortname || quote.symbol,
          exchange: quote.exchange,
          type: quote.quoteType
        }));
      },
      {
        operation: 'searchStocks',
        source: 'YahooFinanceScraper',
        symbol: 'search',
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Transform Yahoo Finance quote to our stock data format
   */
  private transformQuoteToStockData(quote: YahooFinanceQuote, originalSymbol: string): YahooFinanceStockData | null {
    try {
      if (!quote.regularMarketPrice) {
        this.logger.warn(`Invalid quote data for ${originalSymbol}`, {
          service: 'YahooFinanceScraper',
          operation: 'transformQuoteToStockData',
          symbol: originalSymbol,
          metadata: { quote }
        });
        return null;
      }
      
      return {
        symbol: originalSymbol,
        name: quote.longName || quote.shortName || originalSymbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        volume: quote.regularMarketVolume || 0,
        high: quote.regularMarketDayHigh || quote.regularMarketPrice,
        low: quote.regularMarketDayLow || quote.regularMarketPrice,
        open: quote.regularMarketOpen || quote.regularMarketPrice,
        marketCap: quote.marketCap || 0,
        timestamp: new Date().toISOString(),
        source: 'yahoo_finance'
      };
    } catch (error) {
      this.logger.error(`Error transforming Yahoo Finance quote for ${originalSymbol}`, error instanceof Error ? error : new Error('Unknown error'), {
        service: 'YahooFinanceScraper',
        operation: 'transformQuoteToStockData',
        symbol: originalSymbol,
        metadata: { quote }
      });
      return null;
    }
  }

  /**
   * Get market summary (major indices)
   */
  async getMarketSummary(): Promise<any[]> {
    return this.errorHandler.executeWithRetry(
      async () => {
        this.logger.info('Fetching Yahoo Finance market summary', {
          service: 'YahooFinanceScraper',
          operation: 'getMarketSummary'
        });
        
        // Major Turkish and global indices
        const indices = [
          'XU100.IS', // BIST 100
          'XU030.IS', // BIST 30
          'XBANK.IS', // BIST Bank
          '^GSPC',    // S&P 500
          '^DJI',     // Dow Jones
          '^IXIC'     // NASDAQ
        ];
        
        const symbolsParam = indices.join(',');
        const url = `/v7/finance/quote?symbols=${symbolsParam}`;
        const response = await this.client.get<YahooFinanceResponse>(url);
        
        if (!response.data.quoteResponse.result) {
          return [];
        }
        
        const marketData = response.data.quoteResponse.result.map(quote => ({
          symbol: quote.symbol,
          name: quote.shortName || quote.longName || quote.symbol,
          value: quote.regularMarketPrice,
          change: quote.regularMarketChange || 0,
          changePercent: quote.regularMarketChangePercent || 0,
          timestamp: new Date().toISOString()
        }));
        
        this.logger.info(`Successfully fetched Yahoo Finance market summary`, {
          service: 'YahooFinanceScraper',
          operation: 'getMarketSummary',
          metadata: {
            indicesCount: marketData.length
          }
        });
        
        return marketData;
      },
      {
        operation: 'getMarketSummary',
        source: 'YahooFinanceScraper',
        symbol: 'market_summary',
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 8000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Check if the scraper is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/v7/finance/quote?symbols=AAPL', { timeout: 5000 });
      return response.status === 200 && response.data.quoteResponse?.result?.length > 0;
    } catch (error) {
      this.logger.error('Yahoo Finance health check failed', error instanceof Error ? error : new Error('Unknown error'), {
        service: 'YahooFinanceScraper',
        operation: 'healthCheck'
      });
      return false;
    }
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    return {
      name: 'Yahoo Finance Scraper',
      baseUrl: this.baseUrl,
      lastRequestTime: this.lastRequestTime,
      minRequestInterval: this.minRequestInterval,
      hasApiKey: !!this.apiKey,
      isHealthy: this.lastRequestTime > 0 && (Date.now() - this.lastRequestTime) < 300000 // 5 minutes
    };
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      this.client.defaults.headers['X-API-KEY'] = apiKey;
    }
  }
}

// Singleton instance
let yahooFinanceScraperInstance: YahooFinanceScraper | null = null;

export function getYahooFinanceScraper(logger: AdvancedLoggerService, errorHandler: ErrorHandlingService, apiKey?: string): YahooFinanceScraper {
  if (!yahooFinanceScraperInstance) {
    yahooFinanceScraperInstance = new YahooFinanceScraper(logger, errorHandler, apiKey);
  } else if (apiKey) {
    yahooFinanceScraperInstance.setApiKey(apiKey);
  }
  return yahooFinanceScraperInstance;
}

export { YahooFinanceScraper, YahooFinanceStockData, YahooFinanceQuote };