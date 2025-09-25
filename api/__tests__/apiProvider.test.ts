import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock axios
jest.mock('axios');
const axios = require('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock stockScraper
jest.mock('../services/stockScraper');
const stockScraper = require('../services/stockScraper');
const mockScrapeStockPrice = jest.fn() as jest.MockedFunction<any>;
const mockScrapeFinancialData = jest.fn() as jest.MockedFunction<any>;
stockScraper.default = jest.fn().mockImplementation(() => ({
  scrapeStockPrice: mockScrapeStockPrice,
  scrapeFinancialData: mockScrapeFinancialData
}));

// Mock investingScraper
jest.mock('../services/investingScraper');
const investingScraper = require('../services/investingScraper');
const mockInvestingIsAvailable = jest.fn() as jest.MockedFunction<any>;
const mockInvestingScrapeStockPrice = jest.fn() as jest.MockedFunction<any>;
investingScraper.default = jest.fn().mockImplementation(() => ({
  scrapeStockPrice: mockInvestingScrapeStockPrice,
  isAvailable: mockInvestingIsAvailable
}));

// Import after mocks
import apiProvider from '../services/apiProvider';

describe('ApiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiProvider.clearCache();
    
    // Reset mock implementations
    mockScrapeStockPrice.mockReset();
    mockScrapeFinancialData.mockReset();
    mockInvestingIsAvailable.mockReset();
    mockInvestingScrapeStockPrice.mockReset();
  });

  describe('getStockPrice', () => {
    it('should return cached data when available', async () => {
      // Mock IsYatirim availability check (first provider)
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });
      
      // Mock stockScraper to return data
      mockScrapeStockPrice.mockResolvedValue({
        stockCode: 'THYAO',
        price: 100,
        changePercent: 5.26,
        volume: 1000000,
        lastUpdated: new Date()
      });

      const result1 = await apiProvider.getStockPrice('THYAO');
      expect(result1).toBeTruthy();
      expect(result1?.price).toBe(100);

      // Second call should use cache
      const result2 = await apiProvider.getStockPrice('THYAO');
      expect(result2).toBeTruthy();
      expect(result2?.price).toBe(100);
      
      // Should call availability check for first call only
      expect(mockedAxios.get).toHaveBeenCalledWith('https://www.isyatirim.com.tr', { timeout: 5000 });
    });

    it('should handle provider failures gracefully', async () => {
      // Mock all providers to fail
      mockedAxios.get.mockRejectedValue(new Error('Network error'));
      mockInvestingIsAvailable.mockRejectedValue(new Error('Network error'));
      
      const result = await apiProvider.getStockPrice('INVALID');
      expect(result).toBeNull();
    });

    it('should calculate change percentage correctly', async () => {
      // Clear cache first
      apiProvider.clearCache();
      
      // Mock IsYatirim availability check
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });
      
      // Mock stockScraper to return data with specific change percentage
      mockScrapeStockPrice.mockResolvedValue({
        stockCode: 'THYAO',
        price: 105,
        changePercent: 5,
        volume: 500000,
        lastUpdated: new Date()
      });

      const result = await apiProvider.getStockPrice('THYAO');
      expect(result).toBeTruthy();
      expect(result?.changePercent).toBe(5);
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
      // Mock all provider availability checks
      mockedAxios.get
        .mockResolvedValueOnce({ status: 200 }) // IsYatirim
        .mockResolvedValueOnce({ status: 200 }) // Yahoo Finance  
        .mockResolvedValueOnce({ status: 200, data: {} }); // Alpha Vantage (no Error Message or Note)
      
      // Mock investing scraper availability
      mockInvestingIsAvailable.mockResolvedValue(true);

      const health = await apiProvider.getProvidersHealth();
      
      expect(health).toHaveProperty('IsYatirim', true);
      expect(health).toHaveProperty('Investing', true);
      expect(health).toHaveProperty('YahooFinance', true);
      expect(health).toHaveProperty('AlphaVantage', true);
    });

    it('should handle provider failures in health check', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error')) // IsYatirim fails
        .mockResolvedValueOnce({ status: 200 }) // Yahoo Finance works
        .mockResolvedValueOnce({ status: 200, data: {} }); // Alpha Vantage works
      
      // Mock investing scraper to fail
      mockInvestingIsAvailable.mockRejectedValue(new Error('Network error'));

      const health = await apiProvider.getProvidersHealth();
      
      expect(health).toHaveProperty('IsYatirim', false);
      expect(health).toHaveProperty('Investing', false);
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
      // Clear cache first
      apiProvider.clearCache();
      
      // Mock IsYatirim availability check
      mockedAxios.get.mockResolvedValueOnce({ status: 200 });
      
      // Mock stockScraper to return data
      mockScrapeStockPrice.mockResolvedValue({
        stockCode: 'THYAO',
        price: 100,
        changePercent: 5.26,
        volume: 1000000,
        lastUpdated: new Date()
      });

      await apiProvider.getStockPrice('THYAO');
      
      const stats = apiProvider.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('stockPrice:THYAO');
    });
  });
});