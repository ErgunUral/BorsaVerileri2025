import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../utils/logger';
import { StockPrice } from '../types/stock';

class InvestingScraper {
  private baseUrl = 'https://tr.investing.com';
  private userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private lastRequestTime = 0;
  private requestDelay = 2000; // 2 saniye delay

  // Türk hisse senetleri için Investing.com URL mapping
  private stockUrlMap: { [key: string]: string } = {
    'THYAO': 'turk-hava-yollari',
    'AKBNK': 'akbank',
    'ASELS': 'aselsan',
    'BIMAS': 'bim-birlesik-magazalar',
    'EREGL': 'eregli-demir-celik',
    'SISE': 'turkiye-sise-ve-cam-fabrikalari',
    'GARAN': 'garanti-bankasi',
    'ISCTR': 'turkiye-is-bankasi',
    'KCHOL': 'koc-holding',
    'TCELL': 'turkcell',
    'PETKM': 'petkim',
    'TUPRS': 'tupras',
    'HALKB': 'turkiye-halk-bankasi',
    'VAKBN': 'vakiflar-bankasi',
    'ARCLK': 'arcelik',
    'TOASO': 'tofas-turk-otomobil-fabrikasi',
    'SAHOL': 'sabanci-holding',
    'KOZAL': 'koza-altin-isletmeleri',
    'KOZAA': 'koza-anadolu-metal-madencilik',
    'EKGYO': 'emlak-konut-gayrimenkul-yatirim-ortakligi'
  };

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const delay = this.requestDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  async scrapeStockPrice(stockCode: string): Promise<StockPrice | null> {
    try {
      await this.throttleRequest();
      
      const upperStockCode = stockCode.toUpperCase();
      const stockUrl = this.stockUrlMap[upperStockCode];
      
      if (!stockUrl) {
        logger.warn(`Investing.com'da ${upperStockCode} için URL mapping bulunamadı`);
        return null;
      }
      
      const url = `${this.baseUrl}/equities/${stockUrl}`;
      logger.info(`Investing.com'dan ${upperStockCode} verisi çekiliyor: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const $ = cheerio.load(response.data);
      
      // Investing.com'da fiyat bilgilerini çek
      const priceData = this.extractPriceData($, upperStockCode);
      
      if (priceData) {
        logger.info(`Investing.com'dan ${upperStockCode} verisi başarıyla çekildi:`, priceData);
        return {
          stockCode: upperStockCode,
          price: priceData.price,
          changePercent: priceData.changePercent,
          volume: priceData.volume,
          lastUpdated: new Date()
        };
      }
      
      return null;
      
    } catch (error) {
      logger.error(`Investing.com scraping hatası ${stockCode}:`, error as Error);
      return null;
    }
  }

  private extractPriceData($: cheerio.CheerioAPI, stockCode: string): { price: number; changePercent: number; volume: number } | null {
    try {
      // Investing.com'da fiyat selectors
      const priceSelectors = [
        '[data-test="instrument-price-last"]',
        '.text-2xl.font-bold',
        '.instrument-price_last__KQzyA',
        '.last-price-value',
        '.price-section-current-price',
        '.instrument-price-last'
      ];
      
      // Değişim yüzdesi selectors
      const changeSelectors = [
        '[data-test="instrument-price-change-percent"]',
        '.instrument-price_change-percent__qhfnM',
        '.change-percent',
        '.price-section-current-change-percent'
      ];
      
      // Hacim selectors
      const volumeSelectors = [
        '[data-test="instrument-metadata-volume"]',
        '.instrument-metadata_volume__TjAWG',
        '.volume-value',
        '.summary-data-field[data-field="volume"]'
      ];
      
      let price = 0;
      let changePercent = 0;
      let volume = 0;
      
      // Fiyat çek
      for (const selector of priceSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          const text = element.text().trim();
          const priceMatch = text.match(/([\d.,]+)/g);
          if (priceMatch && priceMatch.length > 0) {
            const priceStr = priceMatch[0].replace(/\./g, '').replace(',', '.');
            const parsedPrice = parseFloat(priceStr);
            if (!isNaN(parsedPrice) && parsedPrice > 0) {
              price = parsedPrice;
              logger.info(`Investing.com fiyat bulundu (${selector}): ${price}`);
              break;
            }
          }
        }
      }
      
      // Değişim yüzdesi çek
      for (const selector of changeSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          const text = element.text().trim();
          const changeMatch = text.match(/([+-]?[\d.,]+)%?/g);
          if (changeMatch && changeMatch.length > 0) {
            const changeStr = changeMatch[0].replace('%', '').replace(',', '.');
            const parsedChange = parseFloat(changeStr);
            if (!isNaN(parsedChange)) {
              changePercent = parsedChange;
              logger.info(`Investing.com değişim yüzdesi bulundu (${selector}): ${changePercent}%`);
              break;
            }
          }
        }
      }
      
      // Hacim çek
      for (const selector of volumeSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          const text = element.text().trim();
          const volumeMatch = text.match(/([\d.,]+[KMB]?)/g);
          if (volumeMatch && volumeMatch.length > 0) {
            let volumeStr = volumeMatch[0];
            let multiplier = 1;
            
            if (volumeStr.includes('K')) {
              multiplier = 1000;
              volumeStr = volumeStr.replace('K', '');
            } else if (volumeStr.includes('M')) {
              multiplier = 1000000;
              volumeStr = volumeStr.replace('M', '');
            } else if (volumeStr.includes('B')) {
              multiplier = 1000000000;
              volumeStr = volumeStr.replace('B', '');
            }
            
            volumeStr = volumeStr.replace(/\./g, '').replace(',', '.');
            const parsedVolume = parseFloat(volumeStr) * multiplier;
            if (!isNaN(parsedVolume) && parsedVolume >= 0) {
              volume = Math.round(parsedVolume);
              logger.info(`Investing.com hacim bulundu (${selector}): ${volume}`);
              break;
            }
          }
        }
      }
      
      if (price > 0) {
        return { price, changePercent, volume };
      }
      
      logger.warn(`Investing.com'da ${stockCode} için fiyat bilgisi bulunamadı`);
      return null;
      
    } catch (error) {
      logger.error(`Investing.com veri çıkarma hatası ${stockCode}:`, error as Error);
      return null;
    }
  }

  // Desteklenen hisse senetleri listesi
  getSupportedStocks(): string[] {
    return Object.keys(this.stockUrlMap);
  }

  // Hisse senedi desteklenip desteklenmediğini kontrol et
  isStockSupported(stockCode: string): boolean {
    return this.stockUrlMap.hasOwnProperty(stockCode.toUpperCase());
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(this.baseUrl, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export default InvestingScraper;