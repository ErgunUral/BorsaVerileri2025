import axios from 'axios';
import { StockPrice } from '../types/stock.js';

class AlphaVantageScraper {
  private baseUrl = 'https://www.alphavantage.co/query';
  private apiKey = process.env['ALPHA_VANTAGE_API_KEY'] || 'demo'; // Demo key for testing
  private lastRequestTime = 0;
  private requestDelay = 12000; // Alpha Vantage free tier: 5 requests per minute

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
      
      // Türk hisse senetleri için .IST eki ekle (Alpha Vantage formatı)
      const symbol = stockCode.toUpperCase() + '.IST';
      
      console.log(`Alpha Vantage'dan ${symbol} verisi çekiliyor...`);
      
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const data = response.data;
      
      if (data.Note) {
        console.log(`Alpha Vantage API limit aşıldı: ${data.Note}`);
        return null;
      }
      
      if (data.Information) {
        console.log(`Alpha Vantage bilgi: ${data.Information}`);
        return null;
      }
      
      const quote = data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        console.log(`Alpha Vantage'da ${symbol} için veri bulunamadı`);
        return null;
      }
      
      const currentPrice = parseFloat(quote['05. price']) || 0;
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;
      const volume = parseInt(quote['06. volume']) || 0;
      
      console.log(`Alpha Vantage ${symbol} verileri:`, {
        currentPrice,
        changePercent,
        volume,
        quote
      });
      
      return {
        stockCode: stockCode.toUpperCase(),
        price: currentPrice,
        changePercent: changePercent,
        volume: volume,
        lastUpdated: new Date()
      };
      
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.error(`Alpha Vantage rate limit aşıldı ${stockCode}:`, error.message);
      } else {
        console.error(`Alpha Vantage fiyat çekme hatası ${stockCode}:`, error.message);
      }
      return null;
    }
  }

  async getIntradayData(stockCode: string, interval: string = '5min'): Promise<any> {
    try {
      await this.throttleRequest();
      
      const symbol = stockCode.toUpperCase() + '.IST';
      const url = `${this.baseUrl}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${this.apiKey}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      return response.data;
      
    } catch (error: any) {
      console.error(`Alpha Vantage intraday veri hatası ${stockCode}:`, error.message);
      return null;
    }
  }

  async getDailyData(stockCode: string): Promise<any> {
    try {
      await this.throttleRequest();
      
      const symbol = stockCode.toUpperCase() + '.IST';
      const url = `${this.baseUrl}?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${this.apiKey}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      return response.data;
      
    } catch (error: any) {
      console.error(`Alpha Vantage günlük veri hatası ${stockCode}:`, error.message);
      return null;
    }
  }

  // API key kontrolü
  isConfigured(): boolean {
    return this.apiKey !== 'demo' && this.apiKey.length > 0;
  }

  // Popüler Türk hisse senetleri listesi
  getPopularStocks(): string[] {
    return [
      'THYAO', 'AKBNK', 'BIMAS', 'TCELL', 'EREGL',
      'KCHOL', 'ASELS', 'SISE', 'PETKM', 'KOZAL',
      'TUPRS', 'ISCTR', 'HALKB', 'VAKBN', 'GARAN',
      'ARCLK', 'TOASO', 'SAHOL', 'KOZAA', 'EKGYO'
    ];
  }
}

export default AlphaVantageScraper;