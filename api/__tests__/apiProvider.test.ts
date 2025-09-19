import apiProvider from '../services/apiProvider';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock stockScraper
jest.mock('../services/stockScraper', () => ({
  scrapeStockPrice: jest.fn(),
  scrapeFinancialData: jest.fn(),
  getPopularStocks: jest.fn(() => ['THYAO', 'AKBNK'])
}));

describe('ApiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiProvider.clearCache();
  });

  describe('getStockPrice', () => {
    it('should return cached data when available', async () => {
      // First call
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 100,
                previousClose: 95,
                regularMarketVolume: 1000000
              }
            }]
          }
        }
      });

      const result1 = await apiProvider.getStockPrice('THYAO');
      expect(result1).toBeTruthy();
      expect(result1?.price).toBe(100);

      // Second call should use cache
      const result2 = await apiProvider.getStockPrice('THYAO');
      expect(result2).toBeTruthy();
      expect(result2?.price).toBe(100);
      
      // Axios should only be called once for availability check
      expect(mockedAxios.get).toHaveBeenCalledTimes(2); // 1 for availability, 1 for data
    });

    it('should handle provider failures gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      
      const result = await apiProvider.getStockPrice('INVALID');
      expect(result).toBeNull();
    });

    it('should calculate change percentage correctly', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200 }); // availability check
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 105,
                previousClose: 100,
                regularMarketVolume: 500000
              }
            }]
          }
        }
      });

      const result = await apiProvider.getStockPrice('THYAO');
      expect(result).toBeTruthy();
      expect(result?.changePercent).toBe(5); // (105-100)/100 * 100
    });
  });

  describe('getFinancialData', () => {
    it('should return null when no providers have financial data', async () => {
      mockedAxios.get.mockResolvedValue({ status: 200 }); // availability checks
      
      const result = await apiProvider.getFinancialData('THYAO');
      expect(result).toBeNull();
    });
  });

  describe('getProvidersHealth', () => {
    it('should check all providers health status', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 }) // IsYatirim
        .mockResolvedValueOnce({ status: 200 }) // Yahoo Finance
        .mockResolvedValueOnce({ status: 200 }); // Alpha Vantage

      const health = await apiProvider.getProvidersHealth();
      
      expect(health).toHaveProperty('IsYatirim', true);
      expect(health).toHaveProperty('YahooFinance', true);
      expect(health).toHaveProperty('AlphaVantage', true);
    });

    it('should handle provider failures in health check', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error')) // IsYatirim fails
        .mockResolvedValueOnce({ status: 200 }) // Yahoo Finance works
        .mockResolvedValueOnce({ status: 200 }); // Alpha Vantage works

      const health = await apiProvider.getProvidersHealth();
      
      expect(health).toHaveProperty('IsYatirim', false);
      expect(health).toHaveProperty('YahooFinance', true);
      expect(health).toHaveProperty('AlphaVantage', true);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache correctly', () => {
      apiProvider.clearCache();
      const stats = apiProvider.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should provide cache statistics', async () => {
      mockedAxios.get.mockResolvedValueOnce({ status: 200 }); // availability
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          chart: {
            result: [{
              meta: {
                regularMarketPrice: 100,
                previousClose: 95,
                regularMarketVolume: 1000000
              }
            }]
          }
        }
      });

      await apiProvider.getStockPrice('THYAO');
      
      const stats = apiProvider.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('stockPrice:THYAO');
    });
  });
});