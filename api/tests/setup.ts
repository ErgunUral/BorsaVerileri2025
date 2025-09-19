import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.WEBSOCKET_PORT = '3002';

// Mock external dependencies
jest.mock('../services/stockScraper.js', () => ({
  default: {
    getPopularStocks: jest.fn().mockResolvedValue(['THYAO', 'AKBNK']),
    getStockPrice: jest.fn().mockResolvedValue({
      stockCode: 'THYAO',
      price: 100,
      changePercent: 5,
      volume: 1000,
      lastUpdated: new Date().toISOString()
    }),
    getStockAnalysis: jest.fn().mockResolvedValue({
      stockCode: 'THYAO',
      companyName: 'Türk Hava Yolları',
      financialData: {},
      ratios: {},
      recommendations: ['BUY'],
      riskLevel: 'Orta',
      investmentScore: 75
    })
  }
}));

jest.mock('../services/financialCalculator.js', () => ({
  default: {
    calculateRatios: jest.fn().mockReturnValue({}),
    generateRecommendations: jest.fn().mockReturnValue(['BUY'])
  }
}));

// Increase timeout for async operations
jest.setTimeout(30000);