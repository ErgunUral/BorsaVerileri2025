import { describe, it, expect, beforeEach } from '@jest/globals';
import { FinancialCalculator } from '../../services/financialCalculator.js';
import type { FinancialData } from '../../services/stockScraper.js';

describe('FinancialCalculator', () => {
  let calculator: FinancialCalculator;
  let mockFinancialData: FinancialData;

  beforeEach(() => {
    calculator = new FinancialCalculator();
    mockFinancialData = {
      stockCode: 'THYAO',
      companyName: 'Türk Hava Yolları',
      period: '2023-Q4',
      totalAssets: 100000,
      currentAssets: 30000,
      shortTermLiabilities: 20000,
      longTermLiabilities: 40000,
      totalLiabilities: 60000,
      equity: 40000,
      paidCapital: 25000,
      cashAndEquivalents: 15000,
      financialInvestments: 5000,
      financialDebts: 10000,
      ebitda: 8000,
      netProfit: 5000,
      lastUpdated: new Date()
    };
  });

  describe('calculateRatios', () => {
    it('should calculate financial ratios correctly', () => {
      const ratios = calculator['calculateRatios'](mockFinancialData);

      expect(ratios.netWorkingCapital).toBe(2000000000);
      expect(ratios.cashPosition).toBe(-3000000000);
      expect(ratios.financialStructure.debtToAssetRatio).toBeCloseTo(44, 0);
      expect(ratios.financialStructure.equityRatio).toBeCloseTo(32, 0);
      expect(ratios.financialStructure.currentRatio).toBeCloseTo(1.33, 2);
      expect(ratios.ebitdaProfitability.returnOnEquity).toBeCloseTo(25, 0);
      expect(ratios.ebitdaProfitability.returnOnAssets).toBeCloseTo(8, 0);
      expect(ratios.bonusPotential.bonusScore).toBeGreaterThan(0);
    });

    it('should handle zero values gracefully', () => {
      const dataWithZeros = {
        ...mockFinancialData,
        netProfit: 0,
        equity: 0
      };

      const ratios = calculator['calculateRatios'](dataWithZeros);

      expect(ratios.ebitdaProfitability.returnOnEquity).toBe(0);
      expect(ratios.ebitdaProfitability.returnOnAssets).toBe(0);
    });
  });

  describe('calculateNetWorkingCapital', () => {
    it('should calculate net working capital correctly', () => {
      const nwc = calculator['calculateNetWorkingCapital'](mockFinancialData);
      expect(nwc).toBe(2000000000);
    });
  });

  describe('calculateCashPosition', () => {
    it('should calculate cash position correctly', () => {
      const cashPosition = calculator['calculateCashPosition'](mockFinancialData);
      
      expect(cashPosition).toBe(-3000000000);
    });
  });

  describe('calculateFinancialStructure', () => {
    it('should calculate financial structure correctly', () => {
      const structure = calculator['calculateFinancialStructure'](mockFinancialData);
      
      expect(structure.debtToAssetRatio).toBeCloseTo(44, 0);
      expect(structure.equityRatio).toBeCloseTo(32, 0);
      expect(structure.currentRatio).toBeCloseTo(1.33, 2);
      expect(structure.longTermDebtRatio).toBeCloseTo(20, 0);
    });
  });

  describe('calculateEbitdaProfitability', () => {
    it('should calculate EBITDA profitability correctly', () => {
      const ebitdaProf = calculator['calculateEbitdaProfitability'](mockFinancialData);
      
      expect(ebitdaProf.ebitdaMargin).toBeCloseTo(16, 0);
      expect(ebitdaProf.returnOnAssets).toBeCloseTo(8, 0);
      expect(ebitdaProf.returnOnEquity).toBeCloseTo(25, 0);
    });
  });

  describe('calculateBonusPotential', () => {
    it('should calculate bonus potential correctly', () => {
      const bonusPotential = calculator['calculateBonusPotential'](mockFinancialData);
      
      expect(bonusPotential.bonusScore).toBeGreaterThan(0);
      expect(bonusPotential.bonusScore).toBeLessThanOrEqual(100);
      expect(bonusPotential.retainedEarningsRatio).toBeGreaterThanOrEqual(0);
      expect(bonusPotential.payoutRatio).toBeGreaterThanOrEqual(0);
    });
  });

  describe('assessRiskLevel', () => {
    it('should assess risk level correctly', () => {
      const ratios = calculator['calculateRatios'](mockFinancialData);
      const riskLevel = calculator['assessRiskLevel'](ratios);
      
      expect(['Düşük', 'Orta', 'Yüksek']).toContain(riskLevel);
    });

    it('should identify high risk for poor financial metrics', () => {
      const highRiskData = {
        ...mockFinancialData,
        currentAssets: 3000000000,
        shortTermLiabilities: 6000000000,
        totalLiabilities: 20000000000,
        netProfit: -1000000000
      };

      const ratios = calculator['calculateRatios'](highRiskData);
      const riskLevel = calculator['assessRiskLevel'](ratios);
      expect(['Orta', 'Yüksek']).toContain(riskLevel);
    });
  });

  describe('calculateInvestmentScore', () => {
    it('should calculate investment score correctly', () => {
      const ratios = calculator['calculateRatios'](mockFinancialData);
      const investmentScore = calculator['calculateInvestmentScore'](ratios);
      
      expect(investmentScore).toBeGreaterThan(0);
      expect(investmentScore).toBeLessThanOrEqual(100);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate appropriate recommendations', () => {
      const ratios = calculator['calculateRatios'](mockFinancialData);
      const recommendations = calculator['generateRecommendations'](mockFinancialData, ratios);
      
      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(rec => {
        expect(typeof rec).toBe('string');
      });
    });
  });

  describe('calculateAnalysis', () => {
    it('should perform complete financial analysis', () => {
      const analysis = calculator.calculateAnalysis(mockFinancialData);
      
      expect(analysis).toHaveProperty('stockCode');
      expect(analysis).toHaveProperty('companyName');
      expect(analysis).toHaveProperty('financialData');
      expect(analysis).toHaveProperty('ratios');
      expect(analysis).toHaveProperty('recommendations');
      expect(analysis).toHaveProperty('riskLevel');
      expect(analysis).toHaveProperty('investmentScore');
      
      expect(analysis.stockCode).toBe('THYAO');
      expect(analysis.investmentScore).toBeGreaterThan(0);
      expect(analysis.investmentScore).toBeLessThanOrEqual(100);
      expect(['Düşük', 'Orta', 'Yüksek']).toContain(analysis.riskLevel);
    });
  });
});