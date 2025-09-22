import { useState, useCallback, useMemo } from 'react';

export interface AdvancedPattern {
  id: string;
  name: string;
  type: 'HARMONIC' | 'ELLIOTT_WAVE' | 'FIBONACCI' | 'CANDLESTICK' | 'VOLUME';
  subtype: string;
  confidence: number;
  timeframe: string;
  description: string;
  parameters: Record<string, number>;
  priceTargets: {
    primary: number;
    secondary?: number;
    stopLoss: number;
  };
  fibonacciLevels?: {
    level: number;
    price: number;
    type: 'SUPPORT' | 'RESISTANCE';
  }[];
  waveCount?: {
    current: string;
    next: string;
    completion: number;
  };
  detectedAt: string;
  validUntil: string;
  status: 'FORMING' | 'ACTIVE' | 'COMPLETED' | 'INVALIDATED';
}

export interface HarmonicPatterns {
  gartley: AdvancedPattern[];
  butterfly: AdvancedPattern[];
  bat: AdvancedPattern[];
  crab: AdvancedPattern[];
  shark: AdvancedPattern[];
}

export interface ElliottWaveAnalysis {
  currentWave: string;
  waveCount: number;
  impulseWaves: AdvancedPattern[];
  correctiveWaves: AdvancedPattern[];
  projections: {
    nextTarget: number;
    confidence: number;
    timeframe: string;
  }[];
}

export interface FibonacciAnalysis {
  retracements: {
    level: number;
    price: number;
    type: 'SUPPORT' | 'RESISTANCE';
    strength: number;
  }[];
  extensions: {
    level: number;
    price: number;
    probability: number;
  }[];
  clusters: {
    price: number;
    strength: number;
    levels: string[];
  }[];
}

export interface CandlestickPatterns {
  reversal: AdvancedPattern[];
  continuation: AdvancedPattern[];
  indecision: AdvancedPattern[];
}

export interface VolumePatterns {
  volumeProfile: {
    price: number;
    volume: number;
    type: 'POC' | 'VAH' | 'VAL' | 'NORMAL';
  }[];
  volumeSpread: AdvancedPattern[];
  accumulation: AdvancedPattern[];
  distribution: AdvancedPattern[];
}

export interface AdvancedPatternAnalysis {
  harmonic: HarmonicPatterns;
  elliottWave: ElliottWaveAnalysis;
  fibonacci: FibonacciAnalysis;
  candlestick: CandlestickPatterns;
  volume: VolumePatterns;
  aiPredictions: {
    nextMove: {
      direction: 'UP' | 'DOWN' | 'SIDEWAYS';
      probability: number;
      timeframe: string;
      target: number;
    };
    patternCompletion: {
      pattern: string;
      completion: number;
      expectedCompletion: string;
    }[];
    riskAssessment: {
      level: 'LOW' | 'MEDIUM' | 'HIGH';
      factors: string[];
      recommendation: string;
    };
  };
  summary: {
    totalPatterns: number;
    activePatterns: number;
    highProbabilitySetups: number;
    conflictingSignals: number;
  };
  lastAnalysis: string;
}

export const useAdvancedPatterns = () => {
  const [advancedPatterns, setAdvancedPatterns] = useState<AdvancedPatternAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedSymbol, setLastAnalyzedSymbol] = useState<string | null>(null);
  const [lastTimeframe, setLastTimeframe] = useState<string | null>(null);

  const analyzeAdvancedPatterns = useCallback(async (symbol: string, timeframe: string = '1D', forceRefresh = false) => {
    if (!symbol) {
      setError('Hisse senedi sembolü gerekli');
      return;
    }

    // Avoid unnecessary API calls for the same symbol and timeframe
    if (!forceRefresh && lastAnalyzedSymbol === symbol && lastTimeframe === timeframe && advancedPatterns) {
      return;
    }

    setLoading(true);
    setError(null);
    setLastAnalyzedSymbol(symbol);
    setLastTimeframe(timeframe);

    try {
      const response = await fetch(`/api/advanced-patterns/${symbol}?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAdvancedPatterns(data.data);
      } else {
        throw new Error(data.message || 'Gelişmiş formasyon analizi yapılamadı');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu';
      setError(errorMessage);
      console.error('Advanced patterns error:', err);
      
      // Mock data for development
      if (process.env['NODE_ENV'] === 'development') {
        const mockHarmonicPattern: AdvancedPattern = {
          id: 'harmonic_1',
          name: 'Gartley Formasyonu',
          type: 'HARMONIC',
          subtype: 'GARTLEY',
          confidence: 82,
          timeframe: '1D',
          description: 'Bullish Gartley formasyonu D noktasında tamamlanıyor',
          parameters: {
            XA: 100,
            AB: 61.8,
            BC: 38.2,
            CD: 78.6
          },
          priceTargets: {
            primary: 128.50,
            secondary: 132.00,
            stopLoss: 115.00
          },
          fibonacciLevels: [
            { level: 0.618, price: 118.50, type: 'SUPPORT' },
            { level: 0.786, price: 116.20, type: 'SUPPORT' }
          ],
          detectedAt: new Date().toISOString(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'ACTIVE'
        };

        setAdvancedPatterns({
          harmonic: {
            gartley: [mockHarmonicPattern],
            butterfly: [],
            bat: [],
            crab: [],
            shark: []
          },
          elliottWave: {
            currentWave: 'Wave 3',
            waveCount: 3,
            impulseWaves: [],
            correctiveWaves: [],
            projections: [
              {
                nextTarget: 130.00,
                confidence: 75,
                timeframe: '2W'
              }
            ]
          },
          fibonacci: {
            retracements: [
              { level: 0.382, price: 119.50, type: 'SUPPORT', strength: 8 },
              { level: 0.618, price: 116.20, type: 'SUPPORT', strength: 9 },
              { level: 0.786, price: 114.10, type: 'SUPPORT', strength: 7 }
            ],
            extensions: [
              { level: 1.618, price: 128.50, probability: 78 },
              { level: 2.618, price: 135.20, probability: 65 }
            ],
            clusters: [
              {
                price: 116.20,
                strength: 9,
                levels: ['0.618 Retracement', 'Previous Support']
              }
            ]
          },
          candlestick: {
            reversal: [],
            continuation: [],
            indecision: []
          },
          volume: {
            volumeProfile: [
              { price: 120.00, volume: 1500000, type: 'POC' },
              { price: 125.00, volume: 800000, type: 'VAH' },
              { price: 115.00, volume: 600000, type: 'VAL' }
            ],
            volumeSpread: [],
            accumulation: [],
            distribution: []
          },
          aiPredictions: {
            nextMove: {
              direction: 'UP',
              probability: 78,
              timeframe: '1W',
              target: 128.50
            },
            patternCompletion: [
              {
                pattern: 'Gartley',
                completion: 95,
                expectedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
              }
            ],
            riskAssessment: {
              level: 'MEDIUM',
              factors: [
                'Harmonic pattern near completion',
                'Volume confirmation needed',
                'Market volatility'
              ],
              recommendation: 'Wait for pattern completion and volume confirmation'
            }
          },
          summary: {
            totalPatterns: 1,
            activePatterns: 1,
            highProbabilitySetups: 1,
            conflictingSignals: 0
          },
          lastAnalysis: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  }, [lastAnalyzedSymbol, lastTimeframe, advancedPatterns]);

  const clearData = useCallback(() => {
    setAdvancedPatterns(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized pattern analysis
  const patternSummary = useMemo(() => {
    if (!advancedPatterns) return null;

    const { harmonic, elliottWave, fibonacci, candlestick, volume, aiPredictions } = advancedPatterns;
    
    // Calculate pattern strength scores
    const harmonicScore = Object.values(harmonic).flat().reduce((sum, pattern) => 
      sum + (pattern.confidence / 100), 0);
    
    const fibonacciScore = fibonacci.retracements.reduce((sum, level) => 
      sum + (level.strength / 10), 0);
    
    const volumeScore = volume.volumeProfile.filter(vp => vp.type === 'POC').length * 2;
    
    // Calculate overall pattern strength
    const overallStrength = (harmonicScore + fibonacciScore + volumeScore) / 3;
    
    // Determine market phase
    const marketPhase = (() => {
      if (aiPredictions.nextMove.probability > 75) {
        return aiPredictions.nextMove.direction === 'UP' ? 'STRONG_BULLISH' : 'STRONG_BEARISH';
      }
      if (aiPredictions.nextMove.probability > 60) {
        return aiPredictions.nextMove.direction === 'UP' ? 'BULLISH' : 'BEARISH';
      }
      return 'NEUTRAL';
    })();
    
    // Risk assessment
    const riskLevel = (() => {
      const conflictingSignals = advancedPatterns.summary.conflictingSignals;
      const volatility = aiPredictions.riskAssessment.level;
      
      if (conflictingSignals > 2 || volatility === 'HIGH') return 'HIGH';
      if (conflictingSignals > 0 || volatility === 'MEDIUM') return 'MEDIUM';
      return 'LOW';
    })();
    
    return {
      overallStrength: Math.min(overallStrength, 10),
      marketPhase,
      riskLevel,
      activePatterns: advancedPatterns.summary.activePatterns,
      highProbabilitySetups: advancedPatterns.summary.highProbabilitySetups,
      nextTarget: aiPredictions.nextMove.target,
      confidence: aiPredictions.nextMove.probability,
      timeframe: aiPredictions.nextMove.timeframe
    };
  }, [advancedPatterns]);

  // Memoized pattern filtering functions
  const getActivePatterns = useCallback(() => {
    if (!advancedPatterns) return [];
    
    const allPatterns = [
      ...Object.values(advancedPatterns.harmonic).flat(),
      ...advancedPatterns.elliottWave.impulseWaves,
      ...advancedPatterns.elliottWave.correctiveWaves,
      ...advancedPatterns.candlestick.reversal,
      ...advancedPatterns.candlestick.continuation,
      ...advancedPatterns.volume.volumeSpread,
      ...advancedPatterns.volume.accumulation,
      ...advancedPatterns.volume.distribution
    ];
    
    return allPatterns.filter(pattern => pattern.status === 'ACTIVE');
  }, [advancedPatterns]);

  const getHighConfidencePatterns = useCallback((minConfidence: number = 70) => {
    if (!advancedPatterns) return [];
    
    return getActivePatterns().filter(pattern => pattern.confidence >= minConfidence);
  }, [advancedPatterns, getActivePatterns]);

  return {
    advancedPatterns,
    loading,
    error,
    patternSummary,
    analyzeAdvancedPatterns,
    clearData,
    clearError,
    getActivePatterns,
    getHighConfidencePatterns
  };
};