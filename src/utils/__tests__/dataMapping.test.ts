import { describe, it, expect } from 'vitest';
import {
  fieldMapping,
  mapFinancialData,
  getTurkishKey,
  getEnglishKey,
  type FinancialDataMapping
} from '../dataMapping';

describe('dataMapping utilities', () => {
  describe('fieldMapping', () => {
    it('should contain English to Turkish mappings', () => {
      expect(fieldMapping['totalAssets']).toBe('toplamVarliklar');
      expect(fieldMapping['currentAssets']).toBe('donenVarliklar');
      expect(fieldMapping['cashAndEquivalents']).toBe('nakitVeNakitBenzerleri');
      expect(fieldMapping['revenue']).toBe('hasılat');
      expect(fieldMapping['netProfit']).toBe('netKar');
    });

    it('should contain Turkish to English mappings', () => {
      expect(fieldMapping['toplamVarliklar']).toBe('totalAssets');
      expect(fieldMapping['donenVarliklar']).toBe('currentAssets');
      expect(fieldMapping['nakitVeNakitBenzerleri']).toBe('cashAndEquivalents');
      expect(fieldMapping['hasılat']).toBe('revenue');
      expect(fieldMapping['netKar']).toBe('netProfit');
    });

    it('should have bidirectional mappings', () => {
      const englishKeys = [
        'totalAssets', 'currentAssets', 'cashAndEquivalents', 'inventory',
        'shortTermLiabilities', 'longTermLiabilities', 'totalLiabilities',
        'financialInvestments', 'financialDebts', 'equity', 'paidCapital',
        'revenue', 'grossProfit', 'ebitda', 'netProfit'
      ];

      englishKeys.forEach(englishKey => {
        const turkishKey = fieldMapping[englishKey];
        expect(turkishKey).toBeDefined();
        expect(fieldMapping[turkishKey]).toBe(englishKey);
      });
    });
  });

  describe('mapFinancialData', () => {
    it('should map English fields to Turkish equivalents', () => {
      const apiData = {
        totalAssets: 1000000,
        currentAssets: 500000,
        revenue: 2000000,
        netProfit: 100000,
        otherField: 'unchanged'
      };

      const result = mapFinancialData(apiData);

      expect(result.toplamVarliklar).toBe(1000000);
      expect(result.donenVarliklar).toBe(500000);
      expect(result.hasılat).toBe(2000000);
      expect(result.netKar).toBe(100000);
      expect(result.otherField).toBe('unchanged');
      
      // Original fields should still exist
      expect(result.totalAssets).toBe(1000000);
      expect(result.currentAssets).toBe(500000);
    });

    it('should not overwrite existing Turkish fields', () => {
      const apiData = {
        totalAssets: 1000000,
        toplamVarliklar: 2000000, // Already exists in Turkish
        currentAssets: 500000
      };

      const result = mapFinancialData(apiData);

      // Should not overwrite existing Turkish field
      expect(result.toplamVarliklar).toBe(2000000);
      expect(result.donenVarliklar).toBe(500000);
    });

    it('should handle null and undefined values', () => {
      expect(mapFinancialData(null)).toBe(null);
      expect(mapFinancialData(undefined)).toBe(undefined);
    });

    it('should handle non-object values', () => {
      expect(mapFinancialData('string')).toBe('string');
      expect(mapFinancialData(123)).toBe(123);
      expect(mapFinancialData(true)).toBe(true);
    });

    it('should handle empty objects', () => {
      const result = mapFinancialData({});
      expect(result).toEqual({});
    });

    it('should handle objects with undefined values', () => {
      const apiData = {
        totalAssets: undefined,
        currentAssets: null,
        revenue: 0,
        netProfit: 100000
      };

      const result = mapFinancialData(apiData);

      expect(result.toplamVarliklar).toBeUndefined();
      expect(result.donenVarliklar).toBeNull();
      expect(result.hasılat).toBe(0);
      expect(result.netKar).toBe(100000);
    });

    it('should handle complex nested objects', () => {
      const apiData = {
        totalAssets: 1000000,
        details: {
          currentAssets: 500000,
          breakdown: {
            cashAndEquivalents: 100000
          }
        },
        metadata: {
          source: 'API',
          timestamp: '2023-01-01'
        }
      };

      const result = mapFinancialData(apiData);

      expect(result.toplamVarliklar).toBe(1000000);
      expect(result.details).toEqual(apiData.details);
      expect(result.metadata).toEqual(apiData.metadata);
    });

    it('should handle arrays', () => {
      const apiData = {
        totalAssets: 1000000,
        quarterlyData: [
          { revenue: 500000, netProfit: 50000 },
          { revenue: 600000, netProfit: 60000 }
        ]
      };

      const result = mapFinancialData(apiData);

      expect(result.toplamVarliklar).toBe(1000000);
      expect(result.quarterlyData).toEqual(apiData.quarterlyData);
    });
  });

  describe('getTurkishKey', () => {
    it('should return Turkish equivalent for English keys', () => {
      expect(getTurkishKey('totalAssets')).toBe('toplamVarliklar');
      expect(getTurkishKey('currentAssets')).toBe('donenVarliklar');
      expect(getTurkishKey('revenue')).toBe('hasılat');
      expect(getTurkishKey('netProfit')).toBe('netKar');
    });

    it('should return original key if no mapping exists', () => {
      expect(getTurkishKey('unknownField')).toBe('unknownField');
      expect(getTurkishKey('customProperty')).toBe('customProperty');
    });

    it('should handle empty and special strings', () => {
      expect(getTurkishKey('')).toBe('');
      expect(getTurkishKey(' ')).toBe(' ');
      expect(getTurkishKey('123')).toBe('123');
    });

    it('should be case sensitive', () => {
      expect(getTurkishKey('totalassets')).toBe('totalassets');
      expect(getTurkishKey('TOTALASSETS')).toBe('TOTALASSETS');
      expect(getTurkishKey('TotalAssets')).toBe('TotalAssets');
    });
  });

  describe('getEnglishKey', () => {
    it('should return English equivalent for Turkish keys', () => {
      expect(getEnglishKey('toplamVarliklar')).toBe('totalAssets');
      expect(getEnglishKey('donenVarliklar')).toBe('currentAssets');
      expect(getEnglishKey('hasılat')).toBe('revenue');
      expect(getEnglishKey('netKar')).toBe('netProfit');
    });

    it('should return original key if no mapping exists', () => {
      expect(getEnglishKey('bilinmeyenAlan')).toBe('bilinmeyenAlan');
      expect(getEnglishKey('ozelOzellik')).toBe('ozelOzellik');
    });

    it('should handle empty and special strings', () => {
      expect(getEnglishKey('')).toBe('');
      expect(getEnglishKey(' ')).toBe(' ');
      expect(getEnglishKey('123')).toBe('123');
    });

    it('should be case sensitive', () => {
      expect(getEnglishKey('toplamvarliklar')).toBe('toplamvarliklar');
      expect(getEnglishKey('TOPLAMVARLIKLAR')).toBe('TOPLAMVARLIKLAR');
    });
  });

  describe('Bidirectional mapping consistency', () => {
    it('should maintain consistency between getTurkishKey and getEnglishKey', () => {
      const testPairs = [
        ['totalAssets', 'toplamVarliklar'],
        ['currentAssets', 'donenVarliklar'],
        ['cashAndEquivalents', 'nakitVeNakitBenzerleri'],
        ['revenue', 'hasılat'],
        ['netProfit', 'netKar']
      ];

      testPairs.forEach(([english, turkish]) => {
        expect(getTurkishKey(english)).toBe(turkish);
        expect(getEnglishKey(turkish)).toBe(english);
      });
    });

    it('should handle round-trip conversions', () => {
      const englishKeys = [
        'totalAssets', 'currentAssets', 'cashAndEquivalents',
        'inventory', 'shortTermLiabilities', 'revenue', 'netProfit'
      ];

      englishKeys.forEach(englishKey => {
        const turkishKey = getTurkishKey(englishKey);
        const backToEnglish = getEnglishKey(turkishKey);
        expect(backToEnglish).toBe(englishKey);
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle special characters in field names', () => {
      const apiData = {
        'field-with-dashes': 'value1',
        'field_with_underscores': 'value2',
        'field.with.dots': 'value3',
        'field with spaces': 'value4'
      };

      const result = mapFinancialData(apiData);

      expect(result['field-with-dashes']).toBe('value1');
      expect(result['field_with_underscores']).toBe('value2');
      expect(result['field.with.dots']).toBe('value3');
      expect(result['field with spaces']).toBe('value4');
    });

    it('should handle numeric field names', () => {
      const apiData = {
        '123': 'numeric key',
        '0': 'zero key'
      };

      const result = mapFinancialData(apiData);

      expect(result['123']).toBe('numeric key');
      expect(result['0']).toBe('zero key');
    });

    it('should handle symbol field names', () => {
      const apiData = {
        '@symbol': 'at symbol',
        '#hash': 'hash symbol',
        '$dollar': 'dollar symbol'
      };

      const result = mapFinancialData(apiData);

      expect(result['@symbol']).toBe('at symbol');
      expect(result['#hash']).toBe('hash symbol');
      expect(result['$dollar']).toBe('dollar symbol');
    });

    it('should handle objects with methods', () => {
      class CustomData {
        totalAssets = 1000000;
        customMethod() {
          return 'custom';
        }
      }

      const apiData = new CustomData();
      const result = mapFinancialData(apiData);

      expect(result.toplamVarliklar).toBe(1000000);
      // Note: mapFinancialData creates a new plain object, so methods are not preserved
      expect(typeof result.customMethod).toBe('undefined');
      expect(result instanceof CustomData).toBe(false);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large objects efficiently', () => {
      const largeApiData: any = {};
      
      // Create a large object with 1000 fields
      for (let i = 0; i < 1000; i++) {
        largeApiData[`field${i}`] = `value${i}`;
      }
      
      // Add some mappable fields
      largeApiData.totalAssets = 1000000;
      largeApiData.currentAssets = 500000;
      largeApiData.revenue = 2000000;

      const startTime = performance.now();
      const result = mapFinancialData(largeApiData);
      const endTime = performance.now();

      expect(result.toplamVarliklar).toBe(1000000);
      expect(result.donenVarliklar).toBe(500000);
      expect(result.hasılat).toBe(2000000);
      
      // Should complete within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});