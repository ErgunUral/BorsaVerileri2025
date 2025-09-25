import { describe, it, expect } from 'vitest';
import { RatioCalculationService, type FinancialData } from '../ratioCalculationService';

describe('RatioCalculationService', () => {
  const mockFinancialData: FinancialData = {
    toplamVarliklar: 1000000,
    donenVarliklar: 600000,
    nakitVeNakitBenzerleri: 100000,
    stoklar: 200000,
    kısaVadeliYukumlulukler: 300000,
    uzunVadeliYukumlulukler: 200000,
    toplamYukumlulukler: 500000,
    finansalYatirimlar: 50000,
    finansalBorclar: 150000,
    ozKaynak: 500000,
    odenmisSermaye: 300000,
    hasılat: 2000000,
    brutKar: 800000,
    favok: 400000,
    netKar: 200000
  };

  describe('calculateLiquidityRatios', () => {
    it('should calculate liquidity ratios correctly', () => {
      const ratios = RatioCalculationService.calculateLiquidityRatios(mockFinancialData);

      expect(ratios.cariOran).toBeCloseTo(2.0); // 600000 / 300000
      expect(ratios.asitTestOrani).toBeCloseTo(1.33); // (600000 - 200000) / 300000
      expect(ratios.nakitOrani).toBeCloseTo(0.33); // 100000 / 300000
      expect(ratios.calısmaSermayes).toBe(300000); // 600000 - 300000
    });

    it('should handle zero short-term liabilities', () => {
      const dataWithZeroLiabilities = {
        ...mockFinancialData,
        kısaVadeliYukumlulukler: 0
      };

      const ratios = RatioCalculationService.calculateLiquidityRatios(dataWithZeroLiabilities);

      expect(ratios.cariOran).toBe(0);
      expect(ratios.asitTestOrani).toBe(0);
      expect(ratios.nakitOrani).toBe(0);
      expect(ratios.calısmaSermayes).toBe(600000);
    });

    it('should handle missing inventory data', () => {
      const dataWithoutInventory = {
        ...mockFinancialData,
        stoklar: undefined
      };

      const ratios = RatioCalculationService.calculateLiquidityRatios(dataWithoutInventory);

      expect(ratios.cariOran).toBeCloseTo(2.0);
      expect(ratios.asitTestOrani).toBeCloseTo(2.0); // Same as current ratio when no inventory
      expect(ratios.nakitOrani).toBeCloseTo(0.33);
    });

    it('should handle negative working capital', () => {
      const dataWithNegativeWorkingCapital = {
        ...mockFinancialData,
        donenVarliklar: 200000,
        kısaVadeliYukumlulukler: 300000
      };

      const ratios = RatioCalculationService.calculateLiquidityRatios(dataWithNegativeWorkingCapital);

      expect(ratios.calısmaSermayes).toBe(-100000);
      expect(ratios.cariOran).toBeCloseTo(0.67);
    });

    it('should handle missing current assets', () => {
      const dataWithoutCurrentAssets = {
        ...mockFinancialData,
        donenVarliklar: undefined
      };

      const ratios = RatioCalculationService.calculateLiquidityRatios(dataWithoutCurrentAssets);

      expect(ratios.cariOran).toBe(0);
      expect(ratios.asitTestOrani).toBe(0);
      expect(ratios.calısmaSermayes).toBe(-300000);
    });
  });

  describe('calculateProfitabilityRatios', () => {
    it('should calculate profitability ratios correctly', () => {
      const ratios = RatioCalculationService.calculateProfitabilityRatios(mockFinancialData);

      expect(ratios.brutKarMarjı).toBeCloseTo(0.4); // 800000 / 2000000
      expect(ratios.favokMarjı).toBeCloseTo(0.2); // 400000 / 2000000
      expect(ratios.netKarMarjı).toBeCloseTo(0.1); // 200000 / 2000000
      expect(ratios.aktifKarlilik).toBeCloseTo(0.2); // 200000 / 1000000
      expect(ratios.ozKaynakKarlilik).toBeCloseTo(0.4); // 200000 / 500000
    });

    it('should handle zero revenue', () => {
      const dataWithZeroRevenue = {
        ...mockFinancialData,
        hasılat: 0
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(dataWithZeroRevenue);

      expect(ratios.brutKarMarjı).toBe(0);
      expect(ratios.favokMarjı).toBe(0);
      expect(ratios.netKarMarjı).toBe(0);
      expect(ratios.aktifKarlilik).toBeCloseTo(0.2);
      expect(ratios.ozKaynakKarlilik).toBeCloseTo(0.4);
    });

    it('should handle zero total assets', () => {
      const dataWithZeroAssets = {
        ...mockFinancialData,
        toplamVarliklar: 0
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(dataWithZeroAssets);

      expect(ratios.aktifKarlilik).toBe(0);
      expect(ratios.brutKarMarjı).toBeCloseTo(0.4);
      expect(ratios.netKarMarjı).toBeCloseTo(0.1);
    });

    it('should handle zero equity', () => {
      const dataWithZeroEquity = {
        ...mockFinancialData,
        ozKaynak: 0
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(dataWithZeroEquity);

      expect(ratios.ozKaynakKarlilik).toBe(0);
      expect(ratios.aktifKarlilik).toBeCloseTo(0.2);
      expect(ratios.netKarMarjı).toBeCloseTo(0.1);
    });

    it('should handle negative profit margins', () => {
      const dataWithNegativeProfit = {
        ...mockFinancialData,
        netKar: -100000,
        brutKar: -50000,
        favok: -75000
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(dataWithNegativeProfit);

      expect(ratios.netKarMarjı).toBeCloseTo(-0.05);
      expect(ratios.brutKarMarjı).toBeCloseTo(-0.025);
      expect(ratios.favokMarjı).toBeCloseTo(-0.0375);
      expect(ratios.aktifKarlilik).toBeCloseTo(-0.1);
      expect(ratios.ozKaynakKarlilik).toBeCloseTo(-0.2);
    });

    it('should handle missing profit data', () => {
      const dataWithMissingProfit = {
        ...mockFinancialData,
        netKar: undefined,
        brutKar: undefined,
        favok: undefined
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(dataWithMissingProfit);

      expect(ratios.netKarMarjı).toBe(0);
      expect(ratios.brutKarMarjı).toBe(0);
      expect(ratios.favokMarjı).toBe(0);
      expect(ratios.aktifKarlilik).toBe(0);
      expect(ratios.ozKaynakKarlilik).toBe(0);
    });
  });

  describe('calculateLeverageRatios', () => {
    it('should calculate leverage ratios correctly', () => {
      const ratios = RatioCalculationService.calculateLeverageRatios(mockFinancialData);

      expect(ratios.borcOrani).toBeCloseTo(0.5); // 500000 / 1000000
      expect(ratios.ozKaynakOrani).toBeCloseTo(0.5); // 500000 / 1000000
      expect(ratios.borcOzKaynakOrani).toBeCloseTo(1.0); // 500000 / 500000
      expect(ratios.uzunVadeliBorcOrani).toBeCloseTo(0.2); // 200000 / 1000000
      expect(ratios.kısaVadeliBorcOrani).toBeCloseTo(0.3); // 300000 / 1000000
    });

    it('should handle zero total assets', () => {
      const dataWithZeroAssets = {
        ...mockFinancialData,
        toplamVarliklar: 0
      };

      const ratios = RatioCalculationService.calculateLeverageRatios(dataWithZeroAssets);

      expect(ratios.borcOrani).toBe(0);
      expect(ratios.ozKaynakOrani).toBe(0);
      expect(ratios.uzunVadeliBorcOrani).toBe(0);
      expect(ratios.kısaVadeliBorcOrani).toBe(0);
      expect(ratios.borcOzKaynakOrani).toBeCloseTo(1.0);
    });

    it('should handle zero equity', () => {
      const dataWithZeroEquity = {
        ...mockFinancialData,
        ozKaynak: 0
      };

      const ratios = RatioCalculationService.calculateLeverageRatios(dataWithZeroEquity);

      expect(ratios.borcOzKaynakOrani).toBe(0);
      expect(ratios.borcOrani).toBeCloseTo(0.5);
      expect(ratios.ozKaynakOrani).toBe(0);
    });

    it('should handle missing liability data', () => {
      const dataWithMissingLiabilities = {
        ...mockFinancialData,
        toplamYukumlulukler: undefined,
        uzunVadeliYukumlulukler: undefined,
        kısaVadeliYukumlulukler: undefined
      };

      const ratios = RatioCalculationService.calculateLeverageRatios(dataWithMissingLiabilities);

      expect(ratios.borcOrani).toBe(0);
      expect(ratios.uzunVadeliBorcOrani).toBe(0);
      expect(ratios.kısaVadeliBorcOrani).toBe(0);
      expect(ratios.borcOzKaynakOrani).toBe(0);
      expect(ratios.ozKaynakOrani).toBeCloseTo(0.5);
    });

    it('should handle high leverage scenarios', () => {
      const highLeverageData = {
        ...mockFinancialData,
        toplamYukumlulukler: 900000,
        ozKaynak: 100000
      };

      const ratios = RatioCalculationService.calculateLeverageRatios(highLeverageData);

      expect(ratios.borcOrani).toBeCloseTo(0.9);
      expect(ratios.ozKaynakOrani).toBeCloseTo(0.1);
      expect(ratios.borcOzKaynakOrani).toBeCloseTo(9.0);
    });
  });

  describe('calculateActivityRatios', () => {
    it('should calculate activity ratios correctly', () => {
      const ratios = RatioCalculationService.calculateActivityRatios(mockFinancialData);

      expect(ratios.aktifDevirHızı).toBeCloseTo(2.0); // 2000000 / 1000000
      expect(ratios.stokDevirHızı).toBeCloseTo(10.0); // 2000000 / 200000
      expect(ratios.alacakDevirHızı).toBe(0); // No receivables data
    });

    it('should handle zero total assets', () => {
      const dataWithZeroAssets = {
        ...mockFinancialData,
        toplamVarliklar: 0
      };

      const ratios = RatioCalculationService.calculateActivityRatios(dataWithZeroAssets);

      expect(ratios.aktifDevirHızı).toBe(0);
      expect(ratios.stokDevirHızı).toBeCloseTo(10.0);
    });

    it('should handle zero inventory', () => {
      const dataWithZeroInventory = {
        ...mockFinancialData,
        stoklar: 0
      };

      const ratios = RatioCalculationService.calculateActivityRatios(dataWithZeroInventory);

      expect(ratios.stokDevirHızı).toBe(0);
      expect(ratios.aktifDevirHızı).toBeCloseTo(2.0);
    });

    it('should handle zero revenue', () => {
      const dataWithZeroRevenue = {
        ...mockFinancialData,
        hasılat: 0
      };

      const ratios = RatioCalculationService.calculateActivityRatios(dataWithZeroRevenue);

      expect(ratios.aktifDevirHızı).toBe(0);
      expect(ratios.stokDevirHızı).toBe(0);
      expect(ratios.alacakDevirHızı).toBe(0);
    });

    it('should handle missing inventory data', () => {
      const dataWithoutInventory = {
        ...mockFinancialData,
        stoklar: undefined
      };

      const ratios = RatioCalculationService.calculateActivityRatios(dataWithoutInventory);

      expect(ratios.stokDevirHızı).toBe(0);
      expect(ratios.aktifDevirHızı).toBeCloseTo(2.0);
    });
  });

  describe('calculateMarketRatios', () => {
    it('should calculate market ratios correctly with share data', () => {
      const dataWithShares = {
        ...mockFinancialData,
        hisseSayısı: 100000,
        hisseFiyatı: 50
      };

      const ratios = RatioCalculationService.calculateMarketRatios(dataWithShares);

      expect(ratios.hisseBasınaKazanc).toBeCloseTo(2.0); // 200000 / 100000
      expect(ratios.hisseBasınaDegerDefteri).toBeCloseTo(5.0); // 500000 / 100000
      expect(ratios.fiyatKazancOrani).toBeCloseTo(25.0); // 50 / 2.0
      expect(ratios.fiyatDegerDefteri).toBeCloseTo(10.0); // 50 / 5.0
      expect(ratios.piyasaDegeri).toBe(5000000); // 100000 * 50
    });

    it('should handle missing share count', () => {
      const dataWithoutShares = {
        ...mockFinancialData,
        hisseFiyatı: 50
      };

      const ratios = RatioCalculationService.calculateMarketRatios(dataWithoutShares);

      expect(ratios.hisseBasınaKazanc).toBe(0);
      expect(ratios.hisseBasınaDegerDefteri).toBe(0);
      expect(ratios.fiyatKazancOrani).toBe(0);
      expect(ratios.fiyatDegerDefteri).toBe(0);
      expect(ratios.piyasaDegeri).toBe(0);
    });

    it('should handle missing share price', () => {
      const dataWithoutPrice = {
        ...mockFinancialData,
        hisseSayısı: 100000
      };

      const ratios = RatioCalculationService.calculateMarketRatios(dataWithoutPrice);

      expect(ratios.hisseBasınaKazanc).toBeCloseTo(2.0);
      expect(ratios.hisseBasınaDegerDefteri).toBeCloseTo(5.0);
      expect(ratios.fiyatKazancOrani).toBe(0);
      expect(ratios.fiyatDegerDefteri).toBe(0);
      expect(ratios.piyasaDegeri).toBe(0);
    });

    it('should handle zero earnings per share', () => {
      const dataWithZeroEarnings = {
        ...mockFinancialData,
        netKar: 0,
        hisseSayısı: 100000,
        hisseFiyatı: 50
      };

      const ratios = RatioCalculationService.calculateMarketRatios(dataWithZeroEarnings);

      expect(ratios.hisseBasınaKazanc).toBe(0);
      expect(ratios.fiyatKazancOrani).toBe(0);
      expect(ratios.hisseBasınaDegerDefteri).toBeCloseTo(5.0);
      expect(ratios.fiyatDegerDefteri).toBeCloseTo(10.0);
    });

    it('should handle zero book value per share', () => {
      const dataWithZeroEquity = {
        ...mockFinancialData,
        ozKaynak: 0,
        hisseSayısı: 100000,
        hisseFiyatı: 50
      };

      const ratios = RatioCalculationService.calculateMarketRatios(dataWithZeroEquity);

      expect(ratios.hisseBasınaDegerDefteri).toBe(0);
      expect(ratios.fiyatDegerDefteri).toBe(0);
      expect(ratios.hisseBasınaKazanc).toBeCloseTo(2.0);
      expect(ratios.fiyatKazancOrani).toBeCloseTo(25.0);
    });

    it('should handle negative earnings', () => {
      const dataWithNegativeEarnings = {
        ...mockFinancialData,
        netKar: -100000,
        hisseSayısı: 100000,
        hisseFiyatı: 50
      };

      const ratios = RatioCalculationService.calculateMarketRatios(dataWithNegativeEarnings);

      expect(ratios.hisseBasınaKazanc).toBeCloseTo(-1.0);
      expect(ratios.fiyatKazancOrani).toBeCloseTo(-50.0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle completely empty financial data', () => {
      const emptyData = {} as FinancialData;

      expect(() => {
        RatioCalculationService.calculateLiquidityRatios(emptyData);
        RatioCalculationService.calculateProfitabilityRatios(emptyData);
        RatioCalculationService.calculateLeverageRatios(emptyData);
        RatioCalculationService.calculateActivityRatios(emptyData);
        RatioCalculationService.calculateMarketRatios(emptyData);
      }).not.toThrow();
    });

    it('should handle null values in financial data', () => {
      const dataWithNulls = {
        toplamVarliklar: null,
        donenVarliklar: null,
        hasılat: null,
        netKar: null
      } as any;

      expect(() => {
        RatioCalculationService.calculateLiquidityRatios(dataWithNulls);
        RatioCalculationService.calculateProfitabilityRatios(dataWithNulls);
      }).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const dataWithLargeNumbers = {
        ...mockFinancialData,
        toplamVarliklar: 1e12,
        hasılat: 1e13,
        netKar: 1e11
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(dataWithLargeNumbers);

      expect(ratios.aktifKarlilik).toBeCloseTo(0.1);
      expect(ratios.netKarMarjı).toBeCloseTo(0.01);
    });

    it('should handle very small numbers', () => {
      const dataWithSmallNumbers = {
        ...mockFinancialData,
        toplamVarliklar: 0.01,
        hasılat: 0.1,
        netKar: 0.001
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(dataWithSmallNumbers);

      expect(ratios.aktifKarlilik).toBeCloseTo(0.1);
      expect(ratios.netKarMarjı).toBeCloseTo(0.01);
    });

    it('should handle infinite values gracefully', () => {
      const dataWithInfinity = {
        ...mockFinancialData,
        toplamVarliklar: 0,
        hasılat: 1000000
      };

      const ratios = RatioCalculationService.calculateActivityRatios(dataWithInfinity);

      expect(ratios.aktifDevirHızı).toBe(0); // Should handle division by zero
    });
  });

  describe('Calculation precision', () => {
    it('should maintain precision for decimal calculations', () => {
      const precisionData = {
        ...mockFinancialData,
        toplamVarliklar: 333333,
        netKar: 100000
      };

      const ratios = RatioCalculationService.calculateProfitabilityRatios(precisionData);

      expect(ratios.aktifKarlilik).toBeCloseTo(0.3, 5);
    });

    it('should handle rounding consistently', () => {
      const roundingData = {
        ...mockFinancialData,
        donenVarliklar: 333333,
        kısaVadeliYukumlulukler: 100000
      };

      const ratios = RatioCalculationService.calculateLiquidityRatios(roundingData);

      expect(ratios.cariOran).toBeCloseTo(3.33333, 5);
    });
  });
});