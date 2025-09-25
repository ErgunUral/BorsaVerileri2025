import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { AdvancedLoggerService } from '../services/advancedLoggerService.js';
import { ErrorHandlingService } from '../services/errorHandlingService.js';

interface InvestingComStockData {
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
  source: 'investing_com';
}

interface InvestingComMarketData {
  indices: Array<{
    name: string;
    value: number;
    change: number;
    changePercent: number;
  }>;
  topGainers: InvestingComStockData[];
  topLosers: InvestingComStockData[];
  mostActive: InvestingComStockData[];
}

class InvestingComScraper {
  private client: AxiosInstance;
  private logger: AdvancedLoggerService;
  private errorHandler: ErrorHandlingService;
  
  private baseUrl = 'https://tr.investing.com';
  private lastRequestTime = 0;
  private minRequestInterval = 2000; // 2 seconds between requests
  private requestCount = 0;
  private maxRequestsPerMinute = 20;
  private requestTimes: number[] = [];

  constructor(logger: AdvancedLoggerService, errorHandler: ErrorHandlingService) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      const now = Date.now();
      
      // Clean old request times (older than 1 minute)
      this.requestTimes = this.requestTimes.filter(time => now - time < 60000);
      
      // Check rate limit
      if (this.requestTimes.length >= this.maxRequestsPerMinute) {
        const oldestRequest = Math.min(...this.requestTimes);
        const waitTime = 60000 - (now - oldestRequest);
        if (waitTime > 0) {
          this.logger.info(`Investing.com rate limiting: waiting ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // Enforce minimum interval
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        const delay = this.minRequestInterval - timeSinceLastRequest;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      this.lastRequestTime = Date.now();
      this.requestTimes.push(this.lastRequestTime);
      this.requestCount++;
      
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        this.logger.error(`Investing.com request failed: ${error.message} (URL: ${error.config?.url}, Status: ${error.response?.status})`);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Convert Turkish stock symbol to Investing.com format
   */
  private formatSymbolForInvesting(symbol: string): string {
    // Remove .IS suffix if present
    const cleanSymbol = symbol.replace('.IS', '').replace('.E', '');
    return cleanSymbol.toLowerCase();
  }

  /**
   * Get stock data for a single symbol
   */
  async getStockData(symbol: string): Promise<InvestingComStockData | null> {
    return this.errorHandler.executeWithRetry(
          async () => {
            const investingSymbol = this.formatSymbolForInvesting(symbol);
            this.logger.info(`Fetching Investing.com data for ${investingSymbol}`);
            
            // Try different URL patterns for Turkish stocks
            const possibleUrls = [
              `/equities/${investingSymbol}`,
              `/equities/${investingSymbol}-hisse-senedi`,
              `/equities/${symbol.toLowerCase()}`,
              `/equities/borsa-istanbul-${investingSymbol}`
            ];
            
            for (const url of possibleUrls) {
              try {
                const response = await this.client.get(url);
                const stockData = this.parseStockPage(response.data, symbol);
                
                if (stockData) {
                  this.logger.info(`Successfully fetched Investing.com data for ${symbol} (price: ${stockData.price}, change: ${stockData.change}, url: ${url})`);
                  return stockData;
                }
              } catch (error) {
                this.logger.debug(`Failed to fetch from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                continue;
              }
            }
            
            this.logger.warn(`No data found for ${symbol} on Investing.com`);
            return null;
          },
          {
            operation: 'getStockData',
            source: 'InvestingComScraper',
            symbol: symbol,
            timestamp: new Date().toISOString()
          },
          {
            maxAttempts: 2,
            baseDelay: 3000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            jitter: true
          }
        );
  }

  /**
   * Get BIST 100 stocks data
   */
  async getBist100Data(): Promise<InvestingComStockData[]> {
    return this.errorHandler.executeWithRetry(
          async () => {
            this.logger.info('Fetching BIST 100 data from Investing.com');
            
            const response = await this.client.get('/indices/ise-100-components');
            const $ = cheerio.load(response.data);
            const stocks: InvestingComStockData[] = [];
            
            // Parse the components table
            $('table.genTbl tbody tr').each((index, element) => {
              try {
                const $row = $(element);
                const nameCell = $row.find('td').eq(1);
                const priceCell = $row.find('td').eq(2);
                const changeCell = $row.find('td').eq(3);
                const changePercentCell = $row.find('td').eq(4);
                const volumeCell = $row.find('td').eq(5);
                
                const name = nameCell.find('a').text().trim();
                const symbol = this.extractSymbolFromName(name);
                
                if (!symbol) return;
                
                const priceText = priceCell.text().trim().replace(/[^\d.,]/g, '').replace(',', '.');
                const changeText = changeCell.text().trim().replace(/[^\d.,-]/g, '').replace(',', '.');
                const changePercentText = changePercentCell.text().trim().replace(/[^\d.,-]/g, '').replace(',', '.');
                const volumeText = volumeCell.text().trim().replace(/[^\d.,]/g, '').replace(',', '');
                
                const price = parseFloat(priceText);
                const change = parseFloat(changeText);
                const changePercent = parseFloat(changePercentText);
                const volume = parseInt(volumeText) || 0;
                
                if (!isNaN(price) && price > 0) {
                  stocks.push({
                    symbol,
                    name,
                    price,
                    change: isNaN(change) ? 0 : change,
                    changePercent: isNaN(changePercent) ? 0 : changePercent,
                    volume,
                    high: price, // Will be updated with more detailed data if available
                    low: price,
                    open: price,
                    timestamp: new Date().toISOString(),
                    source: 'investing_com'
                  });
                }
              } catch (error) {
                this.logger.debug(`Error parsing BIST 100 row ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            });
            
            this.logger.info(`Successfully fetched ${stocks.length} BIST 100 stocks from Investing.com`);
            return stocks;
          },
          {
            operation: 'getBist100Data',
            source: 'InvestingComScraper',
            symbol: 'BIST100',
            timestamp: new Date().toISOString()
          },
          {
            maxAttempts: 3,
            baseDelay: 5000,
            maxDelay: 15000,
            backoffMultiplier: 2,
            jitter: true
          }
        );
  }

  /**
   * Get market summary data
   */
  async getMarketData(): Promise<InvestingComMarketData> {
    return this.errorHandler.executeWithRetry(
      async () => {
        this.logger.info('Fetching market data from Investing.com');
        
        const response = await this.client.get('/markets/turkey');
        const $ = cheerio.load(response.data);
        
        const marketData: InvestingComMarketData = {
          indices: [],
          topGainers: [],
          topLosers: [],
          mostActive: []
        };
        
        // Parse indices data
        $('.js-market-summary-table tbody tr').each((index, element) => {
          try {
            const $row = $(element);
            const name = $row.find('td').eq(0).text().trim();
            const valueText = $row.find('td').eq(1).text().trim().replace(/[^\d.,]/g, '').replace(',', '.');
            const changeText = $row.find('td').eq(2).text().trim().replace(/[^\d.,-]/g, '').replace(',', '.');
            const changePercentText = $row.find('td').eq(3).text().trim().replace(/[^\d.,-]/g, '').replace(',', '.');
            
            const value = parseFloat(valueText);
            const change = parseFloat(changeText);
            const changePercent = parseFloat(changePercentText);
            
            if (!isNaN(value) && name) {
              marketData.indices.push({
                name,
                value,
                change: isNaN(change) ? 0 : change,
                changePercent: isNaN(changePercent) ? 0 : changePercent
              });
            }
          } catch (error) {
            this.logger.debug(`Error parsing indices row ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
        
        // Parse top gainers, losers, and most active
        // This would require additional requests to specific pages
        // For now, we'll return the indices data
        
        this.logger.info(`Successfully fetched market data from Investing.com (indices count: ${marketData.indices.length})`);
        
        return marketData;
      },
      {
        operation: 'getMarketData',
        source: 'InvestingComScraper',
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 3,
        baseDelay: 5000,
        maxDelay: 15000,
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
        this.logger.info(`Searching Investing.com for: ${query}`);
        
        const response = await this.client.get(`/search/?q=${encodeURIComponent(query)}`);
        const $ = cheerio.load(response.data);
        const results: any[] = [];
        
        // Parse search results
        $('.js-inner-all-results-quotes-wrapper .js-inner-all-results-quote-item').each((index, element) => {
          try {
            const $item = $(element);
            const name = $item.find('.js-inner-all-results-quote-item-title').text().trim();
            const symbol = $item.find('.js-inner-all-results-quote-item-symbol').text().trim();
            const type = $item.find('.js-inner-all-results-quote-item-type').text().trim();
            const exchange = $item.find('.js-inner-all-results-quote-item-exchange').text().trim();
            
            if (name && symbol) {
              results.push({
                symbol,
                name,
                type,
                exchange,
                source: 'investing_com'
              });
            }
          } catch (error) {
            this.logger.debug(`Error parsing search result ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
        
        this.logger.info(`Found ${results.length} search results for query: ${query}`);
        return results;
      },
      {
        operation: 'searchStocks',
        source: 'InvestingComScraper',
        symbol: query,
        timestamp: new Date().toISOString()
      },
      {
        maxAttempts: 2,
        baseDelay: 3000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        jitter: true
      }
    );
  }

  /**
   * Parse stock page HTML to extract stock data
   */
  private parseStockPage(html: string, symbol: string): InvestingComStockData | null {
    try {
      const $ = cheerio.load(html);
      
      // Try different selectors for price data
      const priceSelectors = [
        '[data-test="instrument-price-last"]',
        '.text-2xl',
        '.instrument-price_last__KQzyA',
        '#last_last',
        '.pid-last'
      ];
      
      let priceText = '';
      for (const selector of priceSelectors) {
        priceText = $(selector).first().text().trim();
        if (priceText) break;
      }
      
      if (!priceText) {
        this.logger.debug(`No price found for ${symbol} on Investing.com page`);
        return null;
      }
      
      // Clean and parse price
      const cleanPriceText = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
      const price = parseFloat(cleanPriceText);
      
      if (isNaN(price) || price <= 0) {
        this.logger.debug(`Invalid price for ${symbol}: ${priceText}`);
        return null;
      }
      
      // Try to get change data
      const changeSelectors = [
        '[data-test="instrument-price-change"]',
        '.instrument-price_change__VWuUw',
        '#last_change',
        '.pid-change'
      ];
      
      let changeText = '';
      for (const selector of changeSelectors) {
        changeText = $(selector).first().text().trim();
        if (changeText) break;
      }
      
      const cleanChangeText = changeText.replace(/[^\d.,-]/g, '').replace(',', '.');
      const change = parseFloat(cleanChangeText) || 0;
      
      // Try to get change percent
      const changePercentSelectors = [
        '[data-test="instrument-price-change-percent"]',
        '.instrument-price_changePercent__KJXra',
        '#last_changePct',
        '.pid-changePct'
      ];
      
      let changePercentText = '';
      for (const selector of changePercentSelectors) {
        changePercentText = $(selector).first().text().trim();
        if (changePercentText) break;
      }
      
      const cleanChangePercentText = changePercentText.replace(/[^\d.,-]/g, '').replace(',', '.');
      const changePercent = parseFloat(cleanChangePercentText) || 0;
      
      // Try to get company name
      const nameSelectors = [
        'h1[data-test="instrument-header-title"]',
        '.instrument-header_title__GTlAw',
        'h1.float_lang_base_1',
        '.instrumentHeader h1'
      ];
      
      let name = symbol;
      for (const selector of nameSelectors) {
        const nameText = $(selector).first().text().trim();
        if (nameText && nameText !== symbol) {
          name = nameText;
          break;
        }
      }
      
      // Try to get volume (if available)
      const volumeSelectors = [
        '[data-test="instrument-metadata-volume"]',
        '.pid-volume',
        '#volume'
      ];
      
      let volumeText = '';
      for (const selector of volumeSelectors) {
        volumeText = $(selector).first().text().trim();
        if (volumeText) break;
      }
      
      const cleanVolumeText = volumeText.replace(/[^\d.,]/g, '').replace(',', '');
      const volume = parseInt(cleanVolumeText) || 0;
      
      return {
        symbol,
        name,
        price,
        change,
        changePercent,
        volume,
        high: price, // These would need additional parsing or API calls
        low: price,
        open: price,
        timestamp: new Date().toISOString(),
        source: 'investing_com'
      };
    } catch (error) {
      this.logger.error(`Error parsing Investing.com page for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Extract symbol from company name
   */
  private extractSymbolFromName(name: string): string | null {
    // Try to extract symbol from name patterns like "AKBNK (Akbank)"
    const symbolMatch = name.match(/^([A-Z]{3,6})\s*\(/i);
    if (symbolMatch) {
      return symbolMatch[1].toUpperCase();
    }
    
    // If no pattern match, try to use the name as symbol
    const cleanName = name.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (cleanName.length >= 3 && cleanName.length <= 6) {
      return cleanName;
    }
    
    return null;
  }

  /**
   * Get current request statistics
   */
  getRequestStats() {
    const now = Date.now();
    const recentRequests = this.requestTimes.filter(time => now - time < 60000);
    
    return {
      totalRequests: this.requestCount,
      requestsLastMinute: recentRequests.length,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      lastRequestTime: this.lastRequestTime,
      minRequestInterval: this.minRequestInterval
    };
  }

  /**
   * Check if the scraper is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/', { timeout: 10000 });
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Investing.com health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    const requestStats = this.getRequestStats();
    
    return {
      name: 'Investing.com Scraper',
      baseUrl: this.baseUrl,
      requestCount: this.requestCount,
      requestsLastMinute: requestStats.requestsLastMinute,
      maxRequestsPerMinute: this.maxRequestsPerMinute,
      lastRequestTime: this.lastRequestTime,
      minRequestInterval: this.minRequestInterval,
      isHealthy: this.lastRequestTime > 0 && (Date.now() - this.lastRequestTime) < 300000 // 5 minutes
    };
  }
}

// Singleton instance
let investingComScraperInstance: InvestingComScraper | null = null;

export function getInvestingComScraper(logger?: AdvancedLoggerService, errorHandler?: ErrorHandlingService): InvestingComScraper {
  if (!investingComScraperInstance) {
    if (!logger || !errorHandler) {
      throw new Error('Logger and ErrorHandler are required for first initialization');
    }
    investingComScraperInstance = new InvestingComScraper(logger, errorHandler);
  }
  return investingComScraperInstance;
}

export { InvestingComScraper, InvestingComStockData, InvestingComMarketData };