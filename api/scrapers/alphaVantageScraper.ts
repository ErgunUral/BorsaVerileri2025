import axios, { AxiosInstance } from 'axios';
import { AdvancedLoggerService } from '../services/advancedLoggerService.js';
import { ErrorHandlingService } from '../services/errorHandlingService.js';

interface AlphaVantageStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  marketCap?: number;
  timestamp: string;
  source: 'alpha_vantage';
}

interface AlphaVantageQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

interface AlphaVantageResponse {
  'Global Quote': AlphaVantageQuote;
  'Error Message'?: string;
  'Note'?: string;
}

interface AlphaVantageTimeSeriesData {
  'Meta Data': {
    '1. Information': string;
    '2. Symbol': string;
    '3. Last Refreshed': string;
    '4. Time Zone': string;
  };
  'Time Series (1min)'?: { [key: string]: any };
  'Time Series (5min)'?: { [key: string]: any };
  'Time Series (15min)'?: { [key: string]: any };
  'Time Series (30min)'?: { [key: string]: any };
  'Time Series (60min)'?: { [key: string]: any };
  'Time Series (Daily)'?: { [key: string]: any };
}

class AlphaVantageScraper {
  private client: AxiosInstance;
  private logger: AdvancedLoggerService;
  private errorHandler: ErrorHandlingService;
  
  private baseUrl = 'https://www.alphavantage.co';
  private apiKey: string;
  private lastRequestTime = 0;
  private minRequestInterval = 12000; // 12 seconds (5 requests per minute limit)
  private requestCount = 0;
  private dailyRequestLimit = 500;

  constructor(logger: AdvancedLoggerService, errorHandler: ErrorHandlingService, apiKey?: string) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    
    if (!apiKey) {
      this.logger.warn('AlphaVantageScraper: Alpha Vantage API key not provided, service will be disabled');
      this.apiKey = '';
    } else {
      this.apiKey = apiKey;
    }
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Enforce rate limiting
      if (timeSinceLastRequest < this.minRequestInterval) {
        const delay = this.minRequestInterval - timeSinceLastRequest;
            this.logger.info(`AlphaVantageScraper: Alpha Vantage rate limiting: waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Check daily limit
      if (this.requestCount >= this.dailyRequestLimit) {
        throw new Error('Alpha Vantage daily request limit reached');
      }
      
      this.lastRequestTime = Date.now();
      this.requestCount++;
      
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Check for API limit messages
        if (response.data?.Note?.includes('API call frequency')) {
          this.logger.warn('AlphaVantageScraper: Alpha Vantage API frequency limit hit');
        }
        return response;
      },
      (error) => {
        this.logger.error(`AlphaVantageScraper: Alpha Vantage request failed - ${error.message} (URL: ${error.config?.url}, Status: ${error.response?.status})`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Convert Turkish stock symbol to Alpha Vantage format
   */
  private formatSymbolForAlphaVantage(symbol: string): string {
    // Alpha Vantage uses different formats for international stocks
    // For Turkish stocks, we might need to add exchange suffix
    if (symbol.includes('.')) {
      return symbol;
    }
    // Try both formats: with and without .IS suffix
    return symbol;
  }

  /**
   * Get stock data for a single symbol
   */
  async getStockData(symbol: string): Promise<AlphaVantageStockData | null> {
    if (!this.apiKey) {
      this.logger.warn(`AlphaVantageScraper: Alpha Vantage API key not available, skipping request for ${symbol}`);
      return null;
    }
    
    return this.errorHandler.executeWithRetry(
      async () => {
        const alphaSymbol = this.formatSymbolForAlphaVantage(symbol);
        this.logger.info(`AlphaVantageScraper: Fetching Alpha Vantage data for ${alphaSymbol}`);
        
        const url = `/query?function=GLOBAL_QUOTE&symbol=${alphaSymbol}&apikey=${this.apiKey}`;
        const response = await this.client.get<AlphaVantageResponse>(url);
        
        // Check for errors
        if (response.data['Error Message']) {
          this.logger.warn(`AlphaVantageScraper: Alpha Vantage error for ${symbol}: ${response.data['Error Message']}`);
          return null;
        }
        
        if (response.data.Note) {
          this.logger.warn(`AlphaVantageScraper: Alpha Vantage note for ${symbol}: ${response.data.Note}`);
          return null;
        }
        
        if (!response.data['Global Quote']) {
          this.logger.warn(`AlphaVantageScraper: No quote data found for ${symbol} on Alpha Vantage`);
          return null;
        }
        
        const quote = response.data['Global Quote'];
        const stockData = this.transformQuoteToStockData(quote, symbol);
        
        if (stockData) {
          this.logger.info(`AlphaVantageScraper: Successfully fetched Alpha Vantage data for ${symbol} (price: ${stockData.price}, change: ${stockData.change})`);
        }
        
        return stockData;
      },
      {
        operation: 'getStockData',
        source: 'AlphaVantageScraper',
        symbol,
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 15000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Get intraday data for a symbol
   */
  async getIntradayData(symbol: string, interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min'): Promise<any[]> {
    if (!this.apiKey) {
      this.logger.warn(`AlphaVantageScraper: Alpha Vantage API key not available, skipping request for ${symbol}`);
      return [];
    }
    
    return this.errorHandler.executeWithRetry(
      async () => {
        const alphaSymbol = this.formatSymbolForAlphaVantage(symbol);
        this.logger.info(`AlphaVantageScraper: Fetching Alpha Vantage intraday data for ${alphaSymbol} (${interval})`);
        
        const url = `/query?function=TIME_SERIES_INTRADAY&symbol=${alphaSymbol}&interval=${interval}&apikey=${this.apiKey}&outputsize=compact`;
        const response = await this.client.get<AlphaVantageTimeSeriesData>(url);
        
        // Check for errors
        if ((response.data as any)['Error Message']) {
          this.logger.warn(`AlphaVantageScraper: Alpha Vantage intraday error for ${symbol}: ${(response.data as any)['Error Message']}`);
          return [];
        }
        
        if ((response.data as any).Note) {
          this.logger.warn(`AlphaVantageScraper: Alpha Vantage intraday note for ${symbol}: ${(response.data as any).Note}`);
          return [];
        }
        
        const timeSeriesKey = `Time Series (${interval})`;
        const timeSeries = response.data[timeSeriesKey as keyof AlphaVantageTimeSeriesData];
        
        if (!timeSeries || typeof timeSeries !== 'object') {
          this.logger.warn(`AlphaVantageScraper: No intraday data found for ${symbol} on Alpha Vantage`);
          return [];
        }
        
        const data = Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
          timestamp,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        this.logger.info(`AlphaVantageScraper: Successfully fetched Alpha Vantage intraday data for ${symbol} (${data.length} data points)`);
        
        return data;
      },
      {
        operation: 'getIntradayData',
        source: 'AlphaVantageScraper',
        symbol,
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 15000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Get daily data for a symbol
   */
  async getDailyData(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<any[]> {
    if (!this.apiKey) {
      this.logger.warn(`AlphaVantageScraper: Alpha Vantage API key not available, skipping request for ${symbol}`);
      return [];
    }
    
    return this.errorHandler.executeWithRetry(
      async () => {
        const alphaSymbol = this.formatSymbolForAlphaVantage(symbol);
        this.logger.info(`AlphaVantageScraper: Fetching Alpha Vantage daily data for ${alphaSymbol}`);
        
        const url = `/query?function=TIME_SERIES_DAILY&symbol=${alphaSymbol}&apikey=${this.apiKey}&outputsize=${outputSize}`;
        const response = await this.client.get(url);
        const responseData = response.data as any;
        
        // Check for errors
        if (responseData['Error Message']) {
          this.logger.warn(`AlphaVantageScraper: Alpha Vantage daily error for ${symbol}: ${responseData['Error Message']}`);
          return [];
        }
        
        if (responseData.Note) {
          this.logger.warn(`AlphaVantageScraper: Alpha Vantage daily note for ${symbol}: ${responseData.Note}`);
          return [];
        }
        
        const timeSeries = responseData['Time Series (Daily)'];
        
        if (!timeSeries) {
          this.logger.warn(`AlphaVantageScraper: No daily data found for ${symbol} on Alpha Vantage`);
          return [];
        }
        
        const data = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseInt(values['5. volume'])
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        this.logger.info(`AlphaVantageScraper: Successfully fetched Alpha Vantage daily data for ${symbol} (${data.length} data points)`);
        
        return data;
      },
      {
        operation: 'getDailyData',
        source: 'AlphaVantageScraper',
        symbol,
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 15000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Search for stocks
   */
  async searchStocks(query: string): Promise<any[]> {
    if (!this.apiKey) {
      this.logger.warn(`AlphaVantageScraper: Alpha Vantage API key not available, skipping request for query: ${query}`);
      return [];
    }
    
    return this.errorHandler.executeWithRetry(
      async () => {
        this.logger.info(`AlphaVantageScraper: Searching Alpha Vantage for: ${query}`);
        
        const url = `/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${this.apiKey}`;
        const response = await this.client.get(url);
        
        if (response.data['Error Message']) {
          this.logger.warn(`AlphaVantageScraper: Alpha Vantage search error: ${response.data['Error Message']}`);
          return [];
        }
        
        const matches = response.data.bestMatches || [];
        
        // Filter for Turkish stocks or relevant matches
        const relevantMatches = matches.filter((match: any) => 
          match['4. region']?.includes('Turkey') ||
          match['1. symbol']?.includes('.IS') ||
          match['2. name']?.toLowerCase().includes(query.toLowerCase())
        );
        
        this.logger.info(`AlphaVantageScraper: Found ${relevantMatches.length} relevant matches for query: ${query}`);
        
        return relevantMatches.map((match: any) => ({
          symbol: match['1. symbol'],
          name: match['2. name'],
          type: match['3. type'],
          region: match['4. region'],
          marketOpen: match['5. marketOpen'],
          marketClose: match['6. marketClose'],
          timezone: match['7. timezone'],
          currency: match['8. currency'],
          matchScore: parseFloat(match['9. matchScore'])
        }));
      },
      {
        operation: 'searchStocks',
        source: 'AlphaVantageScraper',
        symbol: query,
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 15000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Transform Alpha Vantage quote to our stock data format
   */
  private transformQuoteToStockData(quote: AlphaVantageQuote, originalSymbol: string): AlphaVantageStockData | null {
    try {
      const price = parseFloat(quote['05. price']);
      const change = parseFloat(quote['09. change']);
      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
      const volume = parseInt(quote['06. volume']);
      const high = parseFloat(quote['03. high']);
      const low = parseFloat(quote['04. low']);
      const open = parseFloat(quote['02. open']);
      
      if (isNaN(price)) {
        this.logger.warn(`AlphaVantageScraper: Invalid price data for ${originalSymbol}`);
        return null;
      }
      
      return {
        symbol: originalSymbol,
        name: originalSymbol, // Alpha Vantage doesn't provide company name in quote
        price,
        change: isNaN(change) ? 0 : change,
        changePercent: isNaN(changePercent) ? 0 : changePercent,
        volume: isNaN(volume) ? 0 : volume,
        high: isNaN(high) ? price : high,
        low: isNaN(low) ? price : low,
        open: isNaN(open) ? price : open,
        timestamp: new Date().toISOString(),
        source: 'alpha_vantage'
      };
    } catch (error) {
      this.logger.error(`AlphaVantageScraper: Error transforming Alpha Vantage quote for ${originalSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Get current API usage statistics
   */
  getApiUsage() {
    return {
      requestCount: this.requestCount,
      dailyLimit: this.dailyRequestLimit,
      remainingRequests: this.dailyRequestLimit - this.requestCount,
      lastRequestTime: this.lastRequestTime,
      minRequestInterval: this.minRequestInterval
    };
  }

  /**
   * Reset daily request counter (should be called daily)
   */
  resetDailyCounter() {
    this.requestCount = 0;
    this.logger.info('Alpha Vantage daily request counter reset');
  }

  /**
   * Check if the scraper is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Use a simple API call to test connectivity
      const response = await this.client.get(`/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${this.apiKey}`, { timeout: 10000 });
      return response.status === 200 && !response.data['Error Message'];
    } catch (error) {
      this.logger.error(`Alpha Vantage health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    return {
      name: 'Alpha Vantage Scraper',
      baseUrl: this.baseUrl,
      hasApiKey: !!this.apiKey,
      requestCount: this.requestCount,
      dailyLimit: this.dailyRequestLimit,
      lastRequestTime: this.lastRequestTime,
      minRequestInterval: this.minRequestInterval,
      isHealthy: this.lastRequestTime > 0 && (Date.now() - this.lastRequestTime) < 300000 // 5 minutes
    };
  }

  /**
   * Update API key
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.logger.info('Alpha Vantage API key updated');
  }
}

// Singleton instance
let alphaVantageScraperInstance: AlphaVantageScraper | null = null;

export function getAlphaVantageScraper(
  logger: AdvancedLoggerService,
  errorHandler: ErrorHandlingService,
  apiKey?: string
): AlphaVantageScraper {
  if (!alphaVantageScraperInstance) {
    alphaVantageScraperInstance = new AlphaVantageScraper(logger, errorHandler, apiKey);
  } else if (apiKey) {
    alphaVantageScraperInstance.setApiKey(apiKey);
  }
  return alphaVantageScraperInstance;
}

export { AlphaVantageScraper, AlphaVantageStockData, AlphaVantageQuote };