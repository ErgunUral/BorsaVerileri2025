import { FinancialCalculator, FinancialData } from '../financialCalculator';
import { describe, test, beforeEach, expect } from 'vitest';

describe('FinancialCalculator', () => {
  let calculator: FinancialCalculator;
  let mockFinancialData: FinancialData;

  beforeEach(() => {
    calculator = new FinancialCalculator();
    
    mockFinancialData = {
      totalAssets: 1000000,
      currentAssets: 600000,
      cash: 150000,
      totalLiabilities: 400000,
      currentLiabilities: 200000,
      totalEquity: 600000,
      revenue: 800000,
      netIncome: 80000,
      ebitda: 120000,
      retainedEarnings: 300000,
      dividendsPaid: 20000,
      marketCap: 1200000,
      sharesOutstanding: 100000,
      sector: 'Technology'
    };
  });

  describe('Working Capital Calculations', () => {
    test('should calculate net working capital correctly', () => {
      const result = calculator.calculateWorkingCapital(mockFinancialData);
      
      expect(result.netWorkingCapital).toBe(400000); // 600000 - 200000
      expect(result.workingCapitalRatio).toBe(3); // 600000 / 200000
      expect(result.cashPosition).toBe(150000);
    });

    test('should handle zero current liabilities', () => {
      const dataWithZeroLiabilities = {
        ...mockFinancialData,
        currentLiabilities: 0
      };
      
      const result = calculator.calculateWorkingCapital(dataWithZeroLiabilities);
      
      expect(result.netWorkingCapital).toBe(600000);
      expect(result.workingCapitalRatio).toBe(Infinity);
      expect(result.cashPosition).toBe(150000);
    });

    test('should handle negative working capital', () => {
      const dataWithNegativeWC = {
        ...mockFinancialData,
        currentAssets: 100000,
        currentLiabilities: 300000
      };
      
      const result = calculator.calculateWorkingCapital(dataWithNegativeWC);
      
      expect(result.netWorkingCapital).toBe(-200000);
      expect(result.workingCapitalRatio).toBeCloseTo(0.33, 2);
    });
  });

  describe('Financial Structure Calculations', () => {
    test('should calculate financial structure ratios correctly', () => {
      const result = calculator.calculateFinancialStructure(mockFinancialData);
      
      expect(result.debtToAssetRatio).toBe(0.4); // 400000 / 1000000
      expect(result.equityRatio).toBe(0.6); // 600000 / 1000000
      expect(result.currentRatio).toBe(3); // 600000 / 200000
      expect(result.quickRatio).toBe(0.75); // 150000 / 200000
    });

    test('should handle zero denominators in financial structure', () => {
      const dataWithZeros = {
        ...mockFinancialData,
        totalAssets: 0,
        currentLiabilities: 0
      };
      
      const result = calculator.calculateFinancialStructure(dataWithZeros);
      
      expect(result.debtToAssetRatio).toBe(0);
      expect(result.equityRatio).toBe(0);
      expect(result.currentRatio).toBe(Infinity);
      expect(result.quickRatio).toBe(Infinity);
    });

    test('should calculate ratios with high debt levels', () => {
      const highDebtData = {
        ...mockFinancialData,
        totalLiabilities: 800000,
        totalEquity: 200000
      };
      
      const result = calculator.calculateFinancialStructure(highDebtData);
      
      expect(result.debtToAssetRatio).toBe(0.8);
      expect(result.equityRatio).toBe(0.2);
    });
  });

  describe('EBITDA Profitability Calculations', () => {
    test('should calculate EBITDA profitability correctly', () => {
      const result = calculator.calculateEbitdaProfitability(mockFinancialData);
      
      expect(result.ebitdaMargin).toBe(0.15); // 120000 / 800000
      expect(result.returnOnAssets).toBe(0.08); // 80000 / 1000000
      expect(result.returnOnEquity).toBeCloseTo(0.133, 3); // 80000 / 600000
    });

    test('should handle zero revenue and assets', () => {
      const dataWithZeros = {
        ...mockFinancialData,
        revenue: 0,
        totalAssets: 0,
        totalEquity: 0
      };
      
      const result = calculator.calculateEbitdaProfitability(dataWithZeros);
      
      expect(result.ebitdaMargin).toBe(0);
      expect(result.returnOnAssets).toBe(0);
      expect(result.returnOnEquity).toBe(0);
    });

    test('should calculate negative profitability', () => {
      const lossData = {
        ...mockFinancialData,
        netIncome: -50000,
        ebitda: -30000
      };
      
      const result = calculator.calculateEbitdaProfitability(lossData);
      
      expect(result.ebitdaMargin).toBe(-0.0375); // -30000 / 800000
      expect(result.returnOnAssets).toBe(-0.05); // -50000 / 1000000
      expect(result.returnOnEquity).toBeCloseTo(-0.083, 3); // -50000 / 600000
    });
  });

  describe('Bonus Potential Calculations', () => {
    test('should calculate bonus potential correctly', () => {
      const result = calculator.calculateBonusPotential(mockFinancialData);
      
      expect(result.retainedEarningsRatio).toBe(0.5); // 300000 / 600000
      expect(result.dividendPayoutRatio).toBe(0.25); // 20000 / 80000
      expect(result.bonusScore).toBe(75); // Based on calculation logic
    });

    test('should handle zero equity and net income', () => {
      const dataWithZeros = {
        ...mockFinancialData,
        totalEquity: 0,
        netIncome: 0
      };
      
      const result = calculator.calculateBonusPotential(dataWithZeros);
      
      expect(result.retainedEarningsRatio).toBe(0);
      expect(result.dividendPayoutRatio).toBe(0);
      expect(result.bonusScore).toBe(0);
    });

    test('should calculate high bonus potential', () => {
      const highBonusData = {
        ...mockFinancialData,
        retainedEarnings: 500000, // High retained earnings
        dividendsPaid: 5000, // Low dividends
        netIncome: 100000
      };
      
      const result = calculator.calculateBonusPotential(highBonusData);
      
      expect(result.retainedEarningsRatio).toBeCloseTo(0.833, 3); // 500000 / 600000
      expect(result.dividendPayoutRatio).toBe(0.05); // 5000 / 100000
      expect(result.bonusScore).toBeGreaterThan(80);
    });

    test('should calculate low bonus potential', () => {
      const lowBonusData = {
        ...mockFinancialData,
        retainedEarnings: 50000, // Low retained earnings
        dividendsPaid: 60000, // High dividends
        netIncome: 80000
      };
      
      const result = calculator.calculateBonusPotential(lowBonusData);
      
      expect(result.retainedEarningsRatio).toBeCloseTo(0.083, 3); // 50000 / 600000
      expect(result.dividendPayoutRatio).toBe(0.75); // 60000 / 80000
      expect(result.bonusScore).toBeLessThan(30);
    });
  });

  describe('Risk Assessment', () => {
    test('should assess low risk correctly', () => {
      const lowRiskData = {
        ...mockFinancialData,
        totalLiabilities: 200000, // Low debt
        currentAssets: 800000, // High liquidity
        currentLiabilities: 100000,
        netIncome: 150000 // High profitability
      };
      
      const result = calculator.assessRiskLevel(lowRiskData);
      
      expect(result.riskLevel).toBe('Low');
      expect(result.riskScore).toBeLessThan(30);
      expect(result.riskFactors).toContain('Strong liquidity position');
      expect(result.riskFactors).toContain('Low debt levels');
      expect(result.riskFactors).toContain('Strong profitability');
    });

    test('should assess medium risk correctly', () => {
      const mediumRiskData = {
        ...mockFinancialData,
        totalLiabilities: 500000, // Medium debt
        currentAssets: 300000, // Medium liquidity
        currentLiabilities: 200000,
        netIncome: 40000 // Medium profitability
      };
      
      const result = calculator.assessRiskLevel(mediumRiskData);
      
      expect(result.riskLevel).toBe('Medium');
      expect(result.riskScore).toBeGreaterThanOrEqual(30);
      expect(result.riskScore).toBeLessThan(70);
    });

    test('should assess high risk correctly', () => {
      const highRiskData = {
        ...mockFinancialData,
        totalLiabilities: 900000, // High debt
        totalEquity: 100000,
        currentAssets: 150000, // Low liquidity
        currentLiabilities: 300000,
        netIncome: -20000 // Negative profitability
      };
      
      const result = calculator.assessRiskLevel(highRiskData);
      
      expect(result.riskLevel).toBe('High');
      expect(result.riskScore).toBeGreaterThanOrEqual(70);
      expect(result.riskFactors).toContain('High debt levels');
      expect(result.riskFactors).toContain('Poor liquidity');
      expect(result.riskFactors).toContain('Negative profitability');
    });

    test('should handle edge cases in risk assessment', () => {
      const edgeCaseData = {
        ...mockFinancialData,
        totalAssets: 0,
        totalEquity: 0,
        currentLiabilities: 0
      };
      
      const result = calculator.assessRiskLevel(edgeCaseData);
      
      expect(result.riskLevel).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Investment Score Calculation', () => {
    test('should calculate high investment score', () => {
      const excellentData = {
        ...mockFinancialData,
        totalLiabilities: 200000, // Low debt
        currentAssets: 800000, // High liquidity
        currentLiabilities: 100000,
        netIncome: 200000, // High profitability
        ebitda: 250000,
        retainedEarnings: 400000, // High retained earnings
        dividendsPaid: 10000 // Low dividends
      };
      
      const result = calculator.calculateInvestmentScore(excellentData);
      
      expect(result.totalScore).toBeGreaterThan(80);
      expect(result.recommendation).toBe('Strong Buy');
      expect(result.scores.financialStructure).toBeGreaterThan(20);
      expect(result.scores.profitability).toBeGreaterThan(20);
      expect(result.scores.cashPosition).toBeGreaterThan(15);
      expect(result.scores.bonusPotential).toBeGreaterThan(15);
    });

    test('should calculate medium investment score', () => {
      const averageData = {
        ...mockFinancialData,
        totalLiabilities: 500000, // Medium debt
        netIncome: 50000, // Medium profitability
        ebitda: 80000
      };
      
      const result = calculator.calculateInvestmentScore(averageData);
      
      expect(result.totalScore).toBeGreaterThanOrEqual(40);
      expect(result.totalScore).toBeLessThanOrEqual(80);
      expect(['Buy', 'Hold']).toContain(result.recommendation);
    });

    test('should calculate low investment score', () => {
      const poorData = {
        ...mockFinancialData,
        totalLiabilities: 900000, // High debt
        totalEquity: 100000,
        currentAssets: 100000, // Poor liquidity
        currentLiabilities: 300000,
        netIncome: -50000, // Negative profitability
        ebitda: -30000,
        cash: 20000 // Low cash
      };
      
      const result = calculator.calculateInvestmentScore(poorData);
      
      expect(result.totalScore).toBeLessThan(40);
      expect(result.recommendation).toBe('Sell');
    });

    test('should ensure score components sum correctly', () => {
      const result = calculator.calculateInvestmentScore(mockFinancialData);
      
      const sumOfComponents = 
        result.scores.financialStructure +
        result.scores.profitability +
        result.scores.cashPosition +
        result.scores.bonusPotential;
      
      expect(result.totalScore).toBe(sumOfComponents);
    });
  });

  describe('Recommendations Generation', () => {
    test('should generate recommendations for strong company', () => {
      const strongData = {
        ...mockFinancialData,
        totalLiabilities: 200000,
        currentAssets: 800000,
        currentLiabilities: 100000,
        netIncome: 200000,
        retainedEarnings: 400000
      };
      
      const result = calculator.generateRecommendations(strongData);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(rec => rec.includes('Strong financial position'))).toBe(true);
      expect(result.some(rec => rec.includes('excellent liquidity'))).toBe(true);
      expect(result.some(rec => rec.includes('low debt levels'))).toBe(true);
    });

    test('should generate recommendations for company with issues', () => {
      const problematicData = {
        ...mockFinancialData,
        totalLiabilities: 800000,
        currentAssets: 150000,
        currentLiabilities: 300000,
        netIncome: -20000,
        cash: 30000
      };
      
      const result = calculator.generateRecommendations(problematicData);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(rec => rec.includes('High debt levels'))).toBe(true);
      expect(result.some(rec => rec.includes('liquidity concerns'))).toBe(true);
      expect(result.some(rec => rec.includes('Negative profitability'))).toBe(true);
    });

    test('should generate bonus potential recommendations', () => {
      const highBonusData = {
        ...mockFinancialData,
        retainedEarnings: 500000,
        dividendsPaid: 5000
      };
      
      const result = calculator.generateRecommendations(highBonusData);
      
      expect(result.some(rec => rec.includes('High bonus share potential'))).toBe(true);
    });

    test('should generate sector-specific recommendations', () => {
      const bankingData = {
        ...mockFinancialData,
        sector: 'Banking'
      };
      
      const result = calculator.generateRecommendations(bankingData);
      
      expect(result.length).toBeGreaterThan(0);
      // Banking sector should have different benchmarks
    });
  });

  describe('Sector Benchmarks', () => {
    test('should return technology sector benchmarks', () => {
      const benchmarks = calculator.getSectorBenchmarks('Technology');
      
      expect(benchmarks.debtToAssetRatio).toBeDefined();
      expect(benchmarks.currentRatio).toBeDefined();
      expect(benchmarks.ebitdaMargin).toBeDefined();
      expect(benchmarks.returnOnEquity).toBeDefined();
    });

    test('should return banking sector benchmarks', () => {
      const benchmarks = calculator.getSectorBenchmarks('Banking');
      
      expect(benchmarks.debtToAssetRatio).toBeGreaterThan(0.5); // Banks typically have higher debt
      expect(benchmarks.currentRatio).toBeLessThan(2); // Banks have different liquidity requirements
    });

    test('should return manufacturing sector benchmarks', () => {
      const benchmarks = calculator.getSectorBenchmarks('Manufacturing');
      
      expect(benchmarks.currentRatio).toBeGreaterThan(1);
      expect(benchmarks.ebitdaMargin).toBeGreaterThan(0);
    });

    test('should return retail sector benchmarks', () => {
      const benchmarks = calculator.getSectorBenchmarks('Retail');
      
      expect(benchmarks.currentRatio).toBeGreaterThan(1);
      expect(benchmarks.returnOnEquity).toBeGreaterThan(0);
    });

    test('should return default benchmarks for unknown sector', () => {
      const benchmarks = calculator.getSectorBenchmarks('Unknown Sector');
      
      expect(benchmarks.debtToAssetRatio).toBe(0.4);
      expect(benchmarks.currentRatio).toBe(2);
      expect(benchmarks.ebitdaMargin).toBe(0.15);
      expect(benchmarks.returnOnEquity).toBe(0.15);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle undefined financial data gracefully', () => {
      const incompleteData = {
        totalAssets: 1000000,
        revenue: 800000
        // Missing other required fields
      } as FinancialData;
      
      expect(() => {
        calculator.calculateWorkingCapital(incompleteData);
      }).not.toThrow();
    });

    test('should handle negative values appropriately', () => {
      const negativeData = {
        ...mockFinancialData,
        totalAssets: -100000,
        netIncome: -50000,
        cash: -10000
      };
      
      const workingCapital = calculator.calculateWorkingCapital(negativeData);
      const profitability = calculator.calculateEbitdaProfitability(negativeData);
      const riskAssessment = calculator.assessRiskLevel(negativeData);
      
      expect(workingCapital).toBeDefined();
      expect(profitability).toBeDefined();
      expect(riskAssessment).toBeDefined();
    });

    test('should handle very large numbers', () => {
      const largeData = {
        ...mockFinancialData,
        totalAssets: 1e12,
        revenue: 1e11,
        netIncome: 1e10
      };
      
      const result = calculator.calculateInvestmentScore(largeData);
      
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(isFinite(result.totalScore)).toBe(true);
    });

    test('should handle zero values across all calculations', () => {
      const zeroData = {
        totalAssets: 0,
        currentAssets: 0,
        cash: 0,
        totalLiabilities: 0,
        currentLiabilities: 0,
        totalEquity: 0,
        revenue: 0,
        netIncome: 0,
        ebitda: 0,
        retainedEarnings: 0,
        dividendsPaid: 0,
        marketCap: 0,
        sharesOutstanding: 0,
        sector: 'Technology'
      };
      
      expect(() => {
        calculator.calculateWorkingCapital(zeroData);
        calculator.calculateFinancialStructure(zeroData);
        calculator.calculateEbitdaProfitability(zeroData);
        calculator.calculateBonusPotential(zeroData);
        calculator.assessRiskLevel(zeroData);
        calculator.calculateInvestmentScore(zeroData);
        calculator.generateRecommendations(zeroData);
      }).not.toThrow();
    });
  });
});