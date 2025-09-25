import {
  calculateLiquidityRatios,
  calculateLeverageRatios,
  calculateProfitabilityRatios,
  calculateFinancialRatios,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatRatio,
  formatValue,
  type StockData,
  type CalculationResult
} from '../financialCalculations';

describe('Financial Calculations', () => {
  const mockStockData: StockData = {
    currentAssets: 1000000,
    shortTermLiabilities: 500000,
    inventory: 200000,
    cashAndEquivalents: 300000,
    totalAssets: 2000000,
    totalLiabilities: 800000,
    equity: 1200000,
    longTermLiabilities: 300000,
    revenue: 5000000,
    netProfit: 500000,
    ebitda: 800000,
    grossProfit: 2000000
  };

  describe('calculateLiquidityRatios', () => {
    it('should calculate current ratio correctly', () => {
      const results = calculateLiquidityRatios(mockStockData);
      const currentRatio = results.find(r => r.label === 'Cari Oran');
      
      expect(currentRatio).toBeDefined();
      expect(currentRatio?.value).toBe(2); // 1000000 / 500000
      expect(currentRatio?.isGood).toBe(true); // >= 1.5
      expect(currentRatio?.category).toBe('liquidity');
    });

    it('should calculate acid-test ratio correctly', () => {
      const results = calculateLiquidityRatios(mockStockData);
      const acidTestRatio = results.find(r => r.label === 'Asit-Test Oranı');
      
      expect(acidTestRatio).toBeDefined();
      expect(acidTestRatio?.value).toBe(1.6); // (1000000 - 200000) / 500000
      expect(acidTestRatio?.isGood).toBe(true); // >= 1.0
    });

    it('should calculate cash ratio correctly', () => {
      const results = calculateLiquidityRatios(mockStockData);
      const cashRatio = results.find(r => r.label === 'Nakit Oranı');
      
      expect(cashRatio).toBeDefined();
      expect(cashRatio?.value).toBe(0.6); // 300000 / 500000
      expect(cashRatio?.isGood).toBe(true); // >= 0.2
    });

    it('should handle zero liabilities', () => {
      const dataWithZeroLiabilities = { ...mockStockData, shortTermLiabilities: 0 };
      const results = calculateLiquidityRatios(dataWithZeroLiabilities);
      
      expect(results).toHaveLength(0);
    });
  });

  describe('calculateLeverageRatios', () => {
    it('should calculate debt to assets ratio correctly', () => {
      const results = calculateLeverageRatios(mockStockData);
      const debtToAssets = results.find(r => r.label === 'Borç/Varlık Oranı');
      
      expect(debtToAssets).toBeDefined();
      expect(debtToAssets?.value).toBe(0.4); // 800000 / 2000000
      expect(debtToAssets?.isGood).toBe(true); // <= 0.6
    });

    it('should calculate debt to equity ratio correctly', () => {
      const results = calculateLeverageRatios(mockStockData);
      const debtToEquity = results.find(r => r.label === 'Borç/Özkaynak Oranı');
      
      expect(debtToEquity).toBeDefined();
      expect(debtToEquity?.value).toBeCloseTo(0.667, 2); // 800000 / 1200000
      expect(debtToEquity?.isGood).toBe(true); // <= 1.0
    });

    it('should calculate equity multiplier correctly', () => {
      const results = calculateLeverageRatios(mockStockData);
      const equityMultiplier = results.find(r => r.label === 'Özkaynak Çarpanı');
      
      expect(equityMultiplier).toBeDefined();
      expect(equityMultiplier?.value).toBeCloseTo(1.667, 2); // 2000000 / 1200000
      expect(equityMultiplier?.isGood).toBe(true); // <= 2.5
    });
  });

  describe('calculateProfitabilityRatios', () => {
    it('should calculate ROA correctly', () => {
      const results = calculateProfitabilityRatios(mockStockData);
      const roa = results.find(r => r.label === 'ROA (Aktif Karlılığı)');
      
      expect(roa).toBeDefined();
      expect(roa?.value).toBe(0.25); // 500000 / 2000000
      expect(roa?.isGood).toBe(true); // >= 0.05
    });

    it('should calculate ROE correctly', () => {
      const results = calculateProfitabilityRatios(mockStockData);
      const roe = results.find(r => r.label === 'ROE (Özkaynak Karlılığı)');
      
      expect(roe).toBeDefined();
      expect(roe?.value).toBeCloseTo(0.417, 2); // 500000 / 1200000
      expect(roe?.isGood).toBe(true); // >= 0.15
    });

    it('should calculate net profit margin correctly', () => {
      const results = calculateProfitabilityRatios(mockStockData);
      const netProfitMargin = results.find(r => r.label === 'Net Kar Marjı');
      
      expect(netProfitMargin).toBeDefined();
      expect(netProfitMargin?.value).toBe(0.1); // 500000 / 5000000
      expect(netProfitMargin?.isGood).toBe(true); // >= 0.1
    });

    it('should calculate gross profit margin correctly', () => {
      const results = calculateProfitabilityRatios(mockStockData);
      const grossProfitMargin = results.find(r => r.label === 'Brüt Kar Marjı');
      
      expect(grossProfitMargin).toBeDefined();
      expect(grossProfitMargin?.value).toBe(0.4); // 2000000 / 5000000
      expect(grossProfitMargin?.isGood).toBe(true); // >= 0.3
    });
  });

  describe('calculateFinancialRatios', () => {
    it('should return all financial ratios', () => {
      const results = calculateFinancialRatios(mockStockData);
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.category === 'liquidity')).toBe(true);
      expect(results.some(r => r.category === 'leverage')).toBe(true);
      expect(results.some(r => r.category === 'profitability')).toBe(true);
    });
  });

  describe('Formatting Functions', () => {
    describe('formatNumber', () => {
      it('should format numbers correctly', () => {
        expect(formatNumber(1234.567)).toBe('1.234,57');
        expect(formatNumber(0)).toBe('0,00');
        expect(formatNumber(null)).toBe('0');
        expect(formatNumber(undefined)).toBe('0');
        expect(formatNumber(NaN)).toBe('0');
        expect(formatNumber(Infinity)).toBe('0');
      });

      it('should respect decimal places', () => {
        expect(formatNumber(1234.567, 0)).toBe('1.235');
        expect(formatNumber(1234.567, 3)).toBe('1.234,567');
      });
    });

    describe('formatCurrency', () => {
      it('should format currency correctly', () => {
        expect(formatCurrency(1234.56)).toBe('1.234,56 TL');
        expect(formatCurrency(0)).toBe('0 TL');
        expect(formatCurrency(null)).toBe('0 TL');
        expect(formatCurrency(1000, 'USD')).toBe('1.000 USD');
      });
    });

    describe('formatPercentage', () => {
      it('should format percentages correctly', () => {
        expect(formatPercentage(0.1234)).toBe('%12,34');
        expect(formatPercentage(0)).toBe('%0,00');
        expect(formatPercentage(null)).toBe('%0');
        expect(formatPercentage(1.5)).toBe('%150,00');
      });
    });

    describe('formatRatio', () => {
      it('should format ratios correctly', () => {
        expect(formatRatio(1.234)).toBe('1,23x');
        expect(formatRatio(0)).toBe('0,00x');
        expect(formatRatio(null)).toBe('0x');
      });
    });

    describe('formatValue', () => {
      it('should format values based on unit', () => {
        const tlResult: CalculationResult = {
          value: 1000,
          label: 'Test',
          description: 'Test',
          category: 'liquidity',
          unit: 'TL'
        };
        expect(formatValue(tlResult)).toBe('1.000 TL');

        const percentResult: CalculationResult = {
          value: 0.15,
          label: 'Test',
          description: 'Test',
          category: 'profitability',
          unit: '%'
        };
        expect(formatValue(percentResult)).toBe('%0,15');

        const ratioResult: CalculationResult = {
          value: 1.5,
          label: 'Test',
          description: 'Test',
          category: 'leverage',
          unit: 'x'
        };
        expect(formatValue(ratioResult)).toBe('1,50x');
      });

      it('should handle null values', () => {
        const nullResult: CalculationResult = {
          value: null,
          label: 'Test',
          description: 'Test',
          category: 'liquidity',
          unit: 'TL'
        };
        expect(formatValue(nullResult)).toBe('0 TL');
      });
    });
  });
});