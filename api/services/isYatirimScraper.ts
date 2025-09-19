import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';

export interface FinancialData {
  donenVarliklar?: number;           // Dönen Varlıklar
  kisaVadeliYukumlulukler?: number;  // Kısa Vadeli Yükümlülükler(BORÇ)
  nakitVeNakitBenzerleri?: number;   // Nakit ve Nakit Benzerleri
  finansalYatirimlar?: number;       // Finansal Yatırımlar
  finansalBorclar?: number;          // Finansal Borçlar
  toplamVarliklar?: number;          // Toplam Varlıklar
  toplamYukumlulukler?: number;      // Toplam Yükümlülükler (BORÇ)
  favok?: number;                    // Favök
  netDonemKari?: number;             // Net Dönem Karı/Zararı
  ozkaynaklar?: number;              // Özkaynaklar
  sermaye?: number;                  // Ödenmiş Sermaye
  
  // Legacy fields for backward compatibility
  aktifToplami?: number;
  netKar?: number;
}

export interface StockPrice {
  current: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdate: string;
}

export class IsYatirimScraper {
  private baseUrl = 'https://www.isyatirim.com.tr';
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  private async fetchPage(stockCode: string): Promise<cheerio.CheerioAPI> {
    try {
      // Sadece ASELS için veri çekme
      if (stockCode.toUpperCase() !== 'ASELS') {
        throw new Error(`Bu sistem sadece ASELS hissesi için veri sağlamaktadır. İstenen: ${stockCode}`);
      }
      
      const url = `${this.baseUrl}/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS`;
      
      logger.info(`Fetching ASELS data from ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info(`Successfully fetched page for ${stockCode}, size: ${response.data.length} characters`);
      return cheerio.load(response.data);
    } catch (error) {
      logger.error(`Error fetching page for ${stockCode}:`, error);
      throw error;
    }
  }

  private extractFinancialValue(text: string): number | undefined {
    if (!text) return undefined;
    
    // Remove non-numeric characters except dots and commas
    const cleanText = text.replace(/[^0-9.,\-]/g, '');
    
    if (!cleanText || cleanText === '-') return undefined;
    
    // Handle Turkish number format (comma as decimal separator)
    const normalizedText = cleanText.replace(/\./g, '').replace(',', '.');
    
    const value = parseFloat(normalizedText);
    return isNaN(value) ? undefined : value;
  }

  private findFinancialData($: cheerio.CheerioAPI): FinancialData {
    const data: FinancialData = {};
    
    // Define search terms and their corresponding data fields
    const searchTerms = {
      'Dönen Varlıklar': 'donenVarliklar',
      'Kısa Vadeli Yükümlülükler': 'kisaVadeliYukumlulukler',
      'Nakit ve Nakit Benzerleri': 'nakitVeNakitBenzerleri',
      'Finansal Yatırımlar': 'finansalYatirimlar',
      'Finansal Borçlar': 'finansalBorclar',
      'Toplam Varlıklar': 'toplamVarliklar',
      'Toplam Yükümlülükler': 'toplamYukumlulukler',
      'FAVÖK': 'favok',
      'Net Dönem Karı': 'netDonemKari',
      'Net Dönem Zararı': 'netDonemKari',
      'Özkaynaklar': 'ozkaynaklar',
      'Ödenmiş Sermaye': 'sermaye',
      // Legacy mappings for backward compatibility
      'Aktif Toplamı': 'aktifToplami',
      'Ana Ortaklık Payları': 'netKar'
    };

    // Search for each term in the page
    Object.entries(searchTerms).forEach(([term, field]) => {
      try {
        const elements = $('*').filter(function() {
          return $(this).text().includes(term);
        });

        if (elements.length > 0) {
          // Try to find the associated value
          let found = false;
          elements.each((_i, el) => {
            if (found) return;
            const $el = $(el);
            const text = $el.text();
            
            // Look for numbers in the same element or nearby elements
            const matches = text.match(/[0-9.,]+/g);
            if (matches && matches.length > 0) {
              // Take the largest number (likely the main value)
              const values = matches.map(m => this.extractFinancialValue(m)).filter(v => v !== undefined);
              if (values.length > 0) {
                const maxValue = Math.max(...values as number[]);
                if (maxValue > 0) {
                  (data as any)[field] = maxValue;
                  logger.info(`Found ${term}: ${maxValue}`);
                  found = true;
                }
              }
            }
          });
        }
      } catch (error) {
        logger.warn(`Error processing ${term}:`, error);
      }
    });

    return data;
  }

  private findStockPrice($: cheerio.CheerioAPI): StockPrice | null {
    try {
      // Look for current price in various possible locations
      const priceSelectors = [
        '.price',
        '.current-price',
        '[data-field="price"]',
        'span:contains("TL")',
        'td:contains("TL")'
      ];

      let currentPrice: number | undefined;
      
      for (const selector of priceSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
          let priceFound = false;
          elements.each((_i, el) => {
            if (priceFound) return;
            const text = $(el).text();
            const price = this.extractFinancialValue(text);
            if (price && price > 0 && price < 10000) { // Reasonable price range
              currentPrice = price;
              priceFound = true;
            }
          });
          if (currentPrice) break;
        }
      }

      if (!currentPrice) {
        // Fallback: search for any price-like pattern
        const allText = $('body').text();
        const priceMatches = allText.match(/\d+[.,]\d+\s*TL/g);
        if (priceMatches && priceMatches.length > 0) {
          const price = this.extractFinancialValue(priceMatches[0]);
          if (price && price > 0) {
            currentPrice = price;
          }
        }
      }

      if (currentPrice) {
        return {
          current: currentPrice,
          change: 0, // Will be enhanced later
          changePercent: 0,
          volume: 0,
          lastUpdate: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      logger.error('Error extracting stock price:', error);
      return null;
    }
  }

  async scrapeStockData(stockCode: string): Promise<{ price: StockPrice | null; financialData: FinancialData }> {
    try {
      const $ = await this.fetchPage(stockCode);
      
      const financialData = this.findFinancialData($);
      const price = this.findStockPrice($);
      
      logger.info(`Scraped data for ${stockCode}:`, {
        financialDataFields: Object.keys(financialData).length,
        priceFound: !!price
      });
      
      return {
        price,
        financialData
      };
    } catch (error) {
      logger.error(`Failed to scrape data for ${stockCode}:`, error);
      throw error;
    }
  }

  async scrapeStockPrice(stockCode: string): Promise<StockPrice | null> {
    try {
      const result = await this.scrapeStockData(stockCode);
      return result.price;
    } catch (error) {
      logger.error(`Failed to scrape price for ${stockCode}:`, error);
      return null;
    }
  }

  private extractNumbersFromRow(rowText: string): number[] {
    // Look for complete Turkish financial numbers: 169.002,7
    const fullNumberPattern = /\d+(?:\.\d{3})*,\d+/g;
    const matches = rowText.match(fullNumberPattern) || [];
    
    const numbers: number[] = [];
    
    for (const match of matches) {
      // Convert Turkish format: 169.002,7 -> 169002700 (in thousands TL)
      const wholePart = match.split(',')[0].replace(/\./g, '');
      const decimalPart = match.split(',')[1];
      
      // Combine and convert to proper scale
      const fullNumber = wholePart + decimalPart.padEnd(3, '0');
      const finalValue = parseInt(fullNumber, 10);
      
      // Only accept reasonable financial values
      if (!isNaN(finalValue) && finalValue > 1000 && finalValue < 1e12) {
        numbers.push(finalValue);
      }
    }
    
    return numbers;
  }

  async scrapeFinancialData(stockCode: string, retries: number = 3): Promise<FinancialData> {
    // Sadece ASELS için veri çekme
    if (stockCode.toUpperCase() !== 'ASELS') {
      throw new Error(`Bu sistem sadece ASELS hissesi için veri sağlamaktadır. İstenen: ${stockCode}`);
    }
    
    const url = `https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`Attempting to scrape ${stockCode} (attempt ${attempt}/${retries})`);
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 10000 // 10 second timeout
        });
      
      const $ = cheerio.load(response.data);
      
      const financialData: FinancialData = {};
      
      // Find the table containing financial data
      const tables = $('table');
      let financialTable: any = null;
      
      let tableFound = false;
       tables.each((_i, table) => {
         if (tableFound) return;
         const $table = $(table);
         const tableText = $table.text();
         
         // Check if this table contains key financial terms
         if (tableText.includes('Özkaynaklar') || tableText.includes('Net Kar')) {
           financialTable = $table;
           logger.info(`Found financial table: Table ${_i + 1}`);
           tableFound = true;
         }
       });
      
      if (!financialTable) {
        throw new Error('Financial data table not found');
      }
      
      // Extract data from table rows
      const rows = financialTable?.find('tr') || [];
      logger.info(`Processing ${rows.length} rows...`);
      
      // Financial terms mapping with their expected row patterns
      const financialTerms = {
        // Primary fields requested by user
        donenVarliklar: /Dönen Varlıklar/i,
        kisaVadeliYukumlulukler: /Kısa Vadeli Yükümlülükler/i,
        nakitVeNakitBenzerleri: /Nakit ve Nakit Benzerleri/i,
        finansalYatirimlar: /Finansal Yatırımlar/i,
        finansalBorclar: /Finansal Borçlar/i,
        toplamVarliklar: /Toplam Varlıklar|Aktif Toplamı/i,
        toplamYukumlulukler: /Toplam Yükümlülükler|Toplam Borçlar/i,
        favok: /FAVÖK|EBITDA/i,
        netDonemKari: /Net Dönem Karı|Net Dönem Zararı|Dönem Net Kar|Net Kar/i,
        ozkaynaklar: /Özkaynaklar/i,
        sermaye: /Ödenmiş Sermaye/i,
        
        // Legacy fields for backward compatibility
        aktifToplami: /Aktif Toplamı/i,
        netKar: /Dönem Net Kar|Net Kar/i,
        anaOrtaklikPayi: /Ana Ortaklığa Ait Özkaynaklar/i,
        uzunVadeliYukumlulukler: /Uzun Vadeli Yükümlülükler/i,
        stoklar: /Stoklar/i,
        hasılat: /Hasılat|Net Satışlar/i,
        brutKar: /Brüt Kar/i
      };
      
      rows.each((_i: any, row: any) => {
        const $row = $(row);
        const rowText = $row.text().trim();
        
        // Check each financial term
        Object.entries(financialTerms).forEach(([field, pattern]) => {
          if (pattern.test(rowText)) {
            logger.info(`Found ${field} in row: ${rowText}`);
            
            // Extract the most recent value (usually the first number after the term)
            const numbers = this.extractNumbersFromRow(rowText);
            if (numbers.length > 0) {
              // Take the first (most recent) value
              const value = numbers[0];
              (financialData as any)[field] = value;
              logger.info(`  Extracted value: ${value}`);
            }
          }
        });
      });
      
        return financialData;
        
      } catch (error) {
        logger.error(`Error scraping financial data (attempt ${attempt}/${retries}):`, error);
        
        if (attempt === retries) {
          // Last attempt failed, throw the error
          throw new Error(`Failed to scrape financial data for ${stockCode} after ${retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
        logger.info(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // This should never be reached, but TypeScript requires it
    throw new Error(`Failed to scrape financial data for ${stockCode}`);
  }
}

export const isYatirimScraper = new IsYatirimScraper();