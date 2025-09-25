import StockScraper from '../services/stockScraper';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      goto: jest.fn(),
      content: jest.fn().mockResolvedValue('<html><body>Mock content</body></html>'),
      close: jest.fn()
    }),
    close: jest.fn()
  })
}));

// Mock rate limit utility
jest.mock('../utils/rateLimit', () => ({
  executeWithRateLimit: jest.fn((fn) => fn())
}));

describe('StockScraper', () => {
  let stockScraper: StockScraper;

  beforeEach(() => {
    stockScraper = new StockScraper();
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockedAxios.get.mockResolvedValue({
      data: `
        <html>
          <body>
            <h1>THYAO - Türk Hava Yolları</h1>
            <div class="company-name">Türk Hava Yolları</div>
            <table>
              <tr><td>Dönen Varlıklar</td><td>1.500.000</td></tr>
              <tr><td>Toplam Varlıklar</td><td>10.000.000</td></tr>
              <tr><td>Toplam Yükümlülükler</td><td>5.000.000</td></tr>
              <tr><td>Özkaynaklar</td><td>5.000.000</td></tr>
            </table>
          </body>
        </html>
      `,
      status: 200
    });
   });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateStockCode', () => {
    test('validates correct stock codes', async () => {
      // Mock successful responses for valid stock codes
      mockedAxios.get.mockResolvedValue({
        data: '<div class="company-name">Test Company</div>'
      });
      
      const result = await stockScraper.validateStockCode('THYAO');
      expect(result).toBe(true);
    });

    test('rejects invalid stock codes', async () => {
      // Mock empty response for invalid stock codes
      mockedAxios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });
      
      const result = await stockScraper.validateStockCode('INVALID');
      expect(result).toBe(false);
    });

    test('handles network errors', async () => {
      // Mock network error
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      const result = await stockScraper.validateStockCode('THYAO');
      expect(result).toBe(false);
    });
  });

  describe('scrapeStockPrice', () => {
    test('scrapes stock price successfully', async () => {
      // Mock successful response
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <html><body>
            <div class="price">147.50</div>
            <div class="change">+3.20</div>
            <div class="change-percent">+2.22%</div>
          </body></html>
        `,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      });
      
      const result = await stockScraper.scrapeStockPrice('THYAO');
      
      expect(result).toBeDefined();
      expect(typeof result?.price).toBe('number');
      expect(result?.stockCode).toBe('THYAO');
    });

    test('returns mock data for invalid stock code', async () => {
      const result = await stockScraper.scrapeStockPrice('INVALID');
      expect(result).not.toBeNull();
      expect(result?.stockCode).toBe('INVALID');
      expect(result?.price).toBeGreaterThan(0);
    });

    test('handles network errors and returns mock data', async () => {
      // Mock all scrapers to fail
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await stockScraper.scrapeStockPrice('THYAO');
      expect(result).not.toBeNull();
      expect(result?.stockCode).toBe('THYAO');
      expect(result?.price).toBeGreaterThan(0);
    });
  });

  describe('scrapeFinancialData', () => {
    test('scrapes financial data for valid stock', async () => {
      // Mock successful response with financial data
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <html><body>
            <h1>THYAO - Türk Hava Yolları</h1>
            <table>
              <tr><td>Dönen Varlıklar</td><td>1,500,000</td></tr>
              <tr><td>Toplam Aktif</td><td>10,000,000</td></tr>
              <tr><td>Özkaynaklar</td><td>5,000,000</td></tr>
            </table>
          </body></html>
        `,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {}
      });
      
      const result = await stockScraper.scrapeFinancialData('THYAO');
      
      expect(result).toBeDefined();
      expect(result?.stockCode).toBe('THYAO');
      expect(result?.companyName).toBe('THYAO');
    });

    test('returns financial data for invalid stock code', async () => {
      // Mock axios to return empty response for invalid stock
      mockedAxios.get.mockResolvedValueOnce({
        data: '<html><body>No data found</body></html>',
        status: 200
      });
      
      const result = await stockScraper.scrapeFinancialData('INVALID');
      expect(result).not.toBeNull();
      expect(result?.stockCode).toBe('INVALID');
      expect(result?.totalAssets).toBeGreaterThanOrEqual(0);
    });

    test('handles scraping errors and returns data with browser fallback', async () => {
      // Mock axios to throw error but allow browser fallback
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      const result = await stockScraper.scrapeFinancialData('THYAO');
      expect(result).not.toBeNull();
      expect(result?.stockCode).toBe('THYAO');
      expect(result?.companyName).toBe('THYAO');
    });
  });

  describe('getPopularStocks', () => {
    test('returns array of popular stock codes', () => {
      const popularStocks = stockScraper.getPopularStocks();
      
      expect(Array.isArray(popularStocks)).toBe(true);
      expect(popularStocks.length).toBeGreaterThan(0);
      expect(popularStocks).toContain('THYAO');
      expect(popularStocks).toContain('AKBNK');
      expect(popularStocks).toContain('BIMAS');
    });

    test('returns consistent results', () => {
      const result1 = stockScraper.getPopularStocks();
      const result2 = stockScraper.getPopularStocks();
      
      expect(result1).toEqual(result2);
    });

    test('all stock codes are valid format', () => {
      const popularStocks = stockScraper.getPopularStocks();
      
      popularStocks.forEach(stockCode => {
        expect(typeof stockCode).toBe('string');
        expect(stockCode.length).toBeGreaterThan(0);
        expect(stockCode).toMatch(/^[A-Z]+$/);
      });
    });
  });



  describe('browser management', () => {
    test('initializes browser successfully', async () => {
      await expect(stockScraper.initBrowser()).resolves.not.toThrow();
    });

    test('closes browser successfully', async () => {
      await stockScraper.initBrowser();
      await expect(stockScraper.closeBrowser()).resolves.not.toThrow();
    });
  });


});