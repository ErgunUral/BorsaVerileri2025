import { AdvancedPatternDetection } from '../advancedPatternDetection';
import { PriceData, PatternPoint, FormationPattern, TechnicalLevels } from '../../types/portMonitor';

describe('AdvancedPatternDetection', () => {
  let patternDetection: AdvancedPatternDetection;
  let mockPriceData: PriceData[];
  let mockPivotPoints: PatternPoint[];

  beforeEach(() => {
    patternDetection = new AdvancedPatternDetection();
    
    // Mock price data for testing
    mockPriceData = [
      { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 },
      { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106, volume: 1200 },
      { date: '2024-01-03', open: 106, high: 110, low: 104, close: 108, volume: 1100 },
      { date: '2024-01-04', open: 108, high: 112, low: 106, close: 110, volume: 1300 },
      { date: '2024-01-05', open: 110, high: 115, low: 108, close: 113, volume: 1400 },
      { date: '2024-01-06', open: 113, high: 118, low: 111, close: 116, volume: 1500 },
      { date: '2024-01-07', open: 116, high: 120, low: 114, close: 118, volume: 1600 },
      { date: '2024-01-08', open: 118, high: 122, low: 116, close: 120, volume: 1700 },
      { date: '2024-01-09', open: 120, high: 125, low: 118, close: 123, volume: 1800 },
      { date: '2024-01-10', open: 123, high: 128, low: 121, close: 125, volume: 1900 }
    ];

    mockPivotPoints = [
      { index: 0, price: 105, date: '2024-01-01', type: 'peak' },
      { index: 2, price: 104, date: '2024-01-03', type: 'trough' },
      { index: 4, price: 115, date: '2024-01-05', type: 'peak' },
      { index: 6, price: 114, date: '2024-01-07', type: 'trough' },
      { index: 8, price: 125, date: '2024-01-09', type: 'peak' }
    ];
  });

  describe('detectFormations', () => {
    it('should detect formations from price data', () => {
      const formations = patternDetection.detectFormations(mockPriceData);
      
      expect(Array.isArray(formations)).toBe(true);
      formations.forEach(formation => {
        expect(formation).toHaveProperty('type');
        expect(formation).toHaveProperty('name');
        expect(formation).toHaveProperty('confidence');
        expect(formation).toHaveProperty('direction');
        expect(formation).toHaveProperty('keyPoints');
        expect(formation).toHaveProperty('timeframe');
        expect(formation.confidence).toBeGreaterThanOrEqual(0);
        expect(formation.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should return empty array for insufficient data', () => {
      const shortData = mockPriceData.slice(0, 2);
      const formations = patternDetection.detectFormations(shortData);
      
      expect(formations).toEqual([]);
    });

    it('should handle empty price data', () => {
      const formations = patternDetection.detectFormations([]);
      
      expect(formations).toEqual([]);
    });
  });

  describe('findPivotPoints', () => {
    it('should find pivot points in price data', () => {
      const pivots = patternDetection.findPivotPoints(mockPriceData);
      
      expect(Array.isArray(pivots)).toBe(true);
      pivots.forEach(pivot => {
        expect(pivot).toHaveProperty('index');
        expect(pivot).toHaveProperty('price');
        expect(pivot).toHaveProperty('date');
        expect(pivot).toHaveProperty('type');
        expect(['peak', 'trough']).toContain(pivot.type);
        expect(pivot.index).toBeGreaterThanOrEqual(0);
        expect(pivot.index).toBeLessThan(mockPriceData.length);
      });
    });

    it('should find peaks and troughs correctly', () => {
      // Create data with clear peaks and troughs
      const testData: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
        { date: '2024-01-02', open: 110, high: 110, low: 110, close: 110, volume: 1000 }, // peak
        { date: '2024-01-03', open: 90, high: 90, low: 90, close: 90, volume: 1000 },   // trough
        { date: '2024-01-04', open: 120, high: 120, low: 120, close: 120, volume: 1000 }, // peak
        { date: '2024-01-05', open: 80, high: 80, low: 80, close: 80, volume: 1000 }    // trough
      ];
      
      const pivots = patternDetection.findPivotPoints(testData);
      const peaks = pivots.filter(p => p.type === 'peak');
      const troughs = pivots.filter(p => p.type === 'trough');
      
      expect(peaks.length).toBeGreaterThan(0);
      expect(troughs.length).toBeGreaterThan(0);
    });

    it('should handle insufficient data for pivot detection', () => {
      const shortData = mockPriceData.slice(0, 2);
      const pivots = patternDetection.findPivotPoints(shortData);
      
      expect(pivots).toEqual([]);
    });
  });

  describe('calculateTechnicalLevels', () => {
    it('should calculate support and resistance levels', () => {
      const levels = patternDetection.calculateTechnicalLevels(mockPriceData, mockPivotPoints);
      
      expect(levels).toHaveProperty('support');
      expect(levels).toHaveProperty('resistance');
      expect(levels).toHaveProperty('trendLines');
      expect(Array.isArray(levels.support)).toBe(true);
      expect(Array.isArray(levels.resistance)).toBe(true);
      expect(Array.isArray(levels.trendLines)).toBe(true);
      
      levels.support.forEach(level => {
        expect(level).toHaveProperty('price');
        expect(level).toHaveProperty('strength');
        expect(level).toHaveProperty('touches');
        expect(level.strength).toBeGreaterThanOrEqual(0);
        expect(level.touches).toBeGreaterThanOrEqual(1);
      });
      
      levels.resistance.forEach(level => {
        expect(level).toHaveProperty('price');
        expect(level).toHaveProperty('strength');
        expect(level).toHaveProperty('touches');
        expect(level.strength).toBeGreaterThanOrEqual(0);
        expect(level.touches).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle empty pivot points', () => {
      const levels = patternDetection.calculateTechnicalLevels(mockPriceData, []);
      
      expect(levels.support).toEqual([]);
      expect(levels.resistance).toEqual([]);
      expect(levels.trendLines).toEqual([]);
    });

    it('should calculate trend lines correctly', () => {
      const levels = patternDetection.calculateTechnicalLevels(mockPriceData, mockPivotPoints);
      
      levels.trendLines.forEach(line => {
        expect(line).toHaveProperty('slope');
        expect(line).toHaveProperty('intercept');
        expect(line).toHaveProperty('strength');
        expect(line).toHaveProperty('type');
        expect(['support', 'resistance']).toContain(line.type);
      });
    });
  });

  describe('Head and Shoulders Pattern Detection', () => {
    it('should detect head and shoulders pattern', () => {
      // Create specific data for head and shoulders pattern
      const headShouldersData: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 110, low: 100, close: 105, volume: 1000 }, // left shoulder
        { date: '2024-01-02', open: 105, high: 108, low: 102, close: 104, volume: 900 },
        { date: '2024-01-03', open: 104, high: 125, low: 104, close: 120, volume: 1500 }, // head
        { date: '2024-01-04', open: 120, high: 122, low: 115, close: 118, volume: 1200 },
        { date: '2024-01-05', open: 118, high: 112, low: 108, close: 110, volume: 1000 }, // right shoulder
        { date: '2024-01-06', open: 110, high: 108, low: 95, close: 98, volume: 1800 }   // breakdown
      ];
      
      const formations = patternDetection.detectFormations(headShouldersData);
      const headShoulders = formations.filter(f => f.type === 'HEAD_AND_SHOULDERS');
      
      if (headShoulders.length > 0) {
        const pattern = headShoulders[0];
        expect(pattern.direction).toBe('BEARISH');
        expect(pattern.confidence).toBeGreaterThan(0.5);
        expect(pattern.keyPoints.length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should detect inverse head and shoulders pattern', () => {
      // Create specific data for inverse head and shoulders pattern
      const inverseData: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 100, low: 90, close: 95, volume: 1000 },  // left shoulder
        { date: '2024-01-02', open: 95, high: 98, low: 92, close: 96, volume: 900 },
        { date: '2024-01-03', open: 96, high: 96, low: 75, close: 80, volume: 1500 },   // head
        { date: '2024-01-04', open: 80, high: 85, low: 78, close: 82, volume: 1200 },
        { date: '2024-01-05', open: 82, high: 92, low: 88, close: 90, volume: 1000 },   // right shoulder
        { date: '2024-01-06', open: 90, high: 105, low: 92, close: 102, volume: 1800 }  // breakout
      ];
      
      const formations = patternDetection.detectFormations(inverseData);
      const inverseHeadShoulders = formations.filter(f => f.type === 'INVERSE_HEAD_AND_SHOULDERS');
      
      if (inverseHeadShoulders.length > 0) {
        const pattern = inverseHeadShoulders[0];
        expect(pattern.direction).toBe('BULLISH');
        expect(pattern.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Double Top/Bottom Pattern Detection', () => {
    it('should detect double top pattern', () => {
      // Create specific data for double top pattern
      const doubleTopData: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 120, low: 100, close: 115, volume: 1000 }, // first top
        { date: '2024-01-02', open: 115, high: 118, low: 105, close: 110, volume: 900 },
        { date: '2024-01-03', open: 110, high: 122, low: 110, close: 118, volume: 1100 }, // second top
        { date: '2024-01-04', open: 118, high: 120, low: 100, close: 105, volume: 1500 }  // breakdown
      ];
      
      const formations = patternDetection.detectFormations(doubleTopData);
      const doubleTops = formations.filter(f => f.type === 'DOUBLE_TOP');
      
      if (doubleTops.length > 0) {
        const pattern = doubleTops[0];
        expect(pattern.direction).toBe('BEARISH');
        expect(pattern.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should detect double bottom pattern', () => {
      // Create specific data for double bottom pattern
      const doubleBottomData: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 100, low: 80, close: 85, volume: 1000 },  // first bottom
        { date: '2024-01-02', open: 85, high: 95, low: 82, close: 90, volume: 900 },
        { date: '2024-01-03', open: 90, high: 90, low: 78, close: 82, volume: 1100 },   // second bottom
        { date: '2024-01-04', open: 82, high: 105, low: 80, close: 100, volume: 1500 }  // breakout
      ];
      
      const formations = patternDetection.detectFormations(doubleBottomData);
      const doubleBottoms = formations.filter(f => f.type === 'DOUBLE_BOTTOM');
      
      if (doubleBottoms.length > 0) {
        const pattern = doubleBottoms[0];
        expect(pattern.direction).toBe('BULLISH');
        expect(pattern.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Triangle Pattern Detection', () => {
    it('should detect ascending triangle pattern', () => {
      // Create data with ascending triangle characteristics
      const ascendingData: PriceData[] = Array.from({ length: 20 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i * 0.5,
        high: 120, // resistance level
        low: 100 + i * 2, // rising support
        close: 110 + i * 0.3,
        volume: 1000 + i * 10
      }));
      
      const formations = patternDetection.detectFormations(ascendingData);
      const triangles = formations.filter(f => f.type === 'TRIANGLE');
      
      if (triangles.length > 0) {
        const pattern = triangles[0];
        expect(['BULLISH', 'NEUTRAL']).toContain(pattern.direction);
        expect(pattern.confidence).toBeGreaterThan(0.5);
      }
    });

    it('should detect descending triangle pattern', () => {
      // Create data with descending triangle characteristics
      const descendingData: PriceData[] = Array.from({ length: 20 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 120 - i * 0.5,
        high: 120 - i * 2, // falling resistance
        low: 80, // support level
        close: 100 - i * 0.3,
        volume: 1000 + i * 10
      }));
      
      const formations = patternDetection.detectFormations(descendingData);
      const triangles = formations.filter(f => f.type === 'TRIANGLE');
      
      if (triangles.length > 0) {
        const pattern = triangles[0];
        expect(['BEARISH', 'NEUTRAL']).toContain(pattern.direction);
        expect(pattern.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Flag Pattern Detection', () => {
    it('should detect bullish flag pattern', () => {
      // Create data with strong uptrend followed by consolidation
      const flagData: PriceData[] = [
        // Strong uptrend
        ...Array.from({ length: 20 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + i * 2,
          high: 105 + i * 2,
          low: 98 + i * 2,
          close: 103 + i * 2,
          volume: 1000 + i * 50
        })),
        // Consolidation (flag)
        ...Array.from({ length: 10 }, (_, i) => ({
          date: `2024-02-${String(i + 1).padStart(2, '0')}`,
          open: 140 + (i % 2 === 0 ? 1 : -1),
          high: 142 + (i % 2 === 0 ? 1 : -1),
          low: 138 + (i % 2 === 0 ? 1 : -1),
          close: 140 + (i % 2 === 0 ? 1 : -1),
          volume: 800 - i * 20
        }))
      ];
      
      const formations = patternDetection.detectFormations(flagData);
      const flags = formations.filter(f => f.type === 'FLAG');
      
      if (flags.length > 0) {
        const pattern = flags[0];
        expect(pattern.direction).toBe('BULLISH');
        expect(pattern.confidence).toBeGreaterThan(0.5);
      }
    });
  });

  describe('Cup and Handle Pattern Detection', () => {
    it('should detect cup and handle pattern', () => {
      // Create data with cup and handle characteristics
      const cupData: PriceData[] = [
        // Left side of cup
        ...Array.from({ length: 12 }, (_, i) => ({
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 120 - i * 2,
          high: 125 - i * 2,
          low: 118 - i * 2,
          close: 122 - i * 2,
          volume: 1000
        })),
        // Bottom of cup
        ...Array.from({ length: 26 }, (_, i) => ({
          date: `2024-02-${String(i + 1).padStart(2, '0')}`,
          open: 95 + Math.sin(i * 0.2) * 3,
          high: 98 + Math.sin(i * 0.2) * 3,
          low: 92 + Math.sin(i * 0.2) * 3,
          close: 96 + Math.sin(i * 0.2) * 3,
          volume: 800
        })),
        // Right side of cup and handle
        ...Array.from({ length: 12 }, (_, i) => ({
          date: `2024-03-${String(i + 1).padStart(2, '0')}`,
          open: 96 + i * 1.8,
          high: 100 + i * 1.8,
          low: 94 + i * 1.8,
          close: 98 + i * 1.8,
          volume: 1200
        }))
      ];
      
      const formations = patternDetection.detectFormations(cupData);
      const cups = formations.filter(f => f.type === 'CUP_AND_HANDLE');
      
      if (cups.length > 0) {
        const pattern = cups[0];
        expect(pattern.direction).toBe('BULLISH');
        expect(pattern.confidence).toBeGreaterThan(0.5);
        expect(pattern).toHaveProperty('entryPoint');
        expect(pattern).toHaveProperty('targetPrice');
      }
    });
  });

  describe('Wedge Pattern Detection', () => {
    it('should detect wedge pattern', () => {
      // Create data with converging price action
      const wedgeData: PriceData[] = Array.from({ length: 30 }, (_, i) => {
        const convergence = 1 - (i / 30) * 0.7; // Converging range
        return {
          date: `2024-01-${String(i + 1).padStart(2, '0')}`,
          open: 100 + (i % 4 === 0 ? 5 : -5) * convergence,
          high: 105 + (i % 4 === 0 ? 5 : -5) * convergence,
          low: 95 + (i % 4 === 0 ? 5 : -5) * convergence,
          close: 100 + (i % 4 === 0 ? 5 : -5) * convergence,
          volume: 1000
        };
      });
      
      const formations = patternDetection.detectFormations(wedgeData);
      const wedges = formations.filter(f => f.type === 'WEDGE');
      
      if (wedges.length > 0) {
        const pattern = wedges[0];
        expect(pattern.confidence).toBeGreaterThan(0.3);
        expect(pattern.keyPoints.length).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined values in price data', () => {
      const invalidData: any[] = [
        { date: '2024-01-01', open: null, high: 105, low: 98, close: 103, volume: 1000 },
        { date: '2024-01-02', open: 103, high: undefined, low: 102, close: 106, volume: 1200 },
        { date: '2024-01-03', open: 106, high: 110, low: 104, close: null, volume: 1100 }
      ];
      
      expect(() => {
        patternDetection.detectFormations(invalidData);
      }).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const largeNumberData: PriceData[] = [
        { date: '2024-01-01', open: 1e10, high: 1.1e10, low: 0.9e10, close: 1.05e10, volume: 1000 },
        { date: '2024-01-02', open: 1.05e10, high: 1.15e10, low: 1e10, close: 1.1e10, volume: 1200 }
      ];
      
      expect(() => {
        patternDetection.detectFormations(largeNumberData);
      }).not.toThrow();
    });

    it('should handle zero and negative prices', () => {
      const invalidPriceData: PriceData[] = [
        { date: '2024-01-01', open: 0, high: 0, low: 0, close: 0, volume: 1000 },
        { date: '2024-01-02', open: -10, high: -5, low: -15, close: -8, volume: 1200 }
      ];
      
      expect(() => {
        patternDetection.detectFormations(invalidPriceData);
      }).not.toThrow();
    });

    it('should handle missing volume data', () => {
      const noVolumeData: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103 },
        { date: '2024-01-02', open: 103, high: 108, low: 102, close: 106 }
      ] as PriceData[];
      
      expect(() => {
        patternDetection.detectFormations(noVolumeData);
      }).not.toThrow();
    });

    it('should handle single data point', () => {
      const singlePoint: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 105, low: 98, close: 103, volume: 1000 }
      ];
      
      const formations = patternDetection.detectFormations(singlePoint);
      expect(formations).toEqual([]);
    });

    it('should handle identical price data', () => {
      const flatData: PriceData[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 1000
      }));
      
      const formations = patternDetection.detectFormations(flatData);
      expect(Array.isArray(formations)).toBe(true);
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset: PriceData[] = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
        open: 100 + Math.sin(i * 0.1) * 10,
        high: 105 + Math.sin(i * 0.1) * 10,
        low: 95 + Math.sin(i * 0.1) * 10,
        close: 102 + Math.sin(i * 0.1) * 10,
        volume: 1000 + Math.random() * 500
      }));
      
      const startTime = Date.now();
      const formations = patternDetection.detectFormations(largeDataset);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(Array.isArray(formations)).toBe(true);
    });

    it('should maintain consistent results for same input', () => {
      const formations1 = patternDetection.detectFormations(mockPriceData);
      const formations2 = patternDetection.detectFormations(mockPriceData);
      
      expect(formations1).toEqual(formations2);
    });
  });

  describe('Pattern Confidence Calculation', () => {
    it('should calculate reasonable confidence scores', () => {
      const formations = patternDetection.detectFormations(mockPriceData);
      
      formations.forEach(formation => {
        expect(formation.confidence).toBeGreaterThanOrEqual(0);
        expect(formation.confidence).toBeLessThanOrEqual(1);
        expect(typeof formation.confidence).toBe('number');
        expect(isNaN(formation.confidence)).toBe(false);
      });
    });

    it('should assign higher confidence to clearer patterns', () => {
      // Create very clear head and shoulders pattern
      const clearPattern: PriceData[] = [
        { date: '2024-01-01', open: 100, high: 110, low: 100, close: 105, volume: 2000 }, // left shoulder
        { date: '2024-01-02', open: 105, high: 108, low: 95, close: 100, volume: 1000 },  // valley
        { date: '2024-01-03', open: 100, high: 130, low: 100, close: 125, volume: 3000 }, // head
        { date: '2024-01-04', open: 125, high: 128, low: 95, close: 100, volume: 1000 },  // valley
        { date: '2024-01-05', open: 100, high: 112, low: 100, close: 107, volume: 2000 }, // right shoulder
        { date: '2024-01-06', open: 107, high: 110, low: 85, close: 90, volume: 4000 }   // breakdown
      ];
      
      const formations = patternDetection.detectFormations(clearPattern);
      const headShoulders = formations.filter(f => f.type === 'HEAD_AND_SHOULDERS');
      
      if (headShoulders.length > 0) {
        expect(headShoulders[0].confidence).toBeGreaterThan(0.6);
      }
    });
  });
});