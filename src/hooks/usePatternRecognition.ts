import { useState, useCallback } from 'react';

export interface PatternData {
  id: string;
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  timeframe: string;
  description: string;
  expectedMove: {
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    target: number;
    probability: number;
  };
  detectedAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
}

export interface BasicPattern {
  triangles: {
    ascending: PatternData[];
    descending: PatternData[];
    symmetrical: PatternData[];
  };
  channels: {
    uptrend: PatternData[];
    downtrend: PatternData[];
    horizontal: PatternData[];
  };
  reversal: {
    doubleTop: PatternData[];
    doubleBottom: PatternData[];
    headAndShoulders: PatternData[];
    inverseHeadAndShoulders: PatternData[];
  };
  continuation: {
    flags: PatternData[];
    pennants: PatternData[];
    rectangles: PatternData[];
  };
}

export interface PatternAnalysis {
  patterns: BasicPattern;
  summary: {
    totalPatterns: number;
    bullishPatterns: number;
    bearishPatterns: number;
    neutralPatterns: number;
    highConfidencePatterns: number;
  };
  recommendations: {
    action: 'BUY' | 'SELL' | 'HOLD' | 'WAIT';
    confidence: number;
    reasoning: string;
    timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG';
  };
  riskFactors: string[];
  lastAnalysis: string;
}

export const usePatternRecognition = () => {
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzePatterns = useCallback(async (symbol: string, timeframe: string = '1D') => {
    if (!symbol) {
      setError('Hisse senedi sembolü gerekli');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pattern-recognition/${symbol}/analyze?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPatterns(data.data);
      } else {
        throw new Error(data.message || 'Formasyon analizi yapılamadı');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu';
      setError(errorMessage);
      console.error('Pattern recognition error:', err);
      
      // Mock data for development
      const isDevelopment = (() => {
        try {
          return import.meta.env?.DEV || false;
        } catch {
          return false;
        }
      })();
      
      if (isDevelopment) {
        const mockPattern: PatternData = {
          id: '1',
          name: 'Yükselen Üçgen',
          type: 'BULLISH',
          confidence: 78,
          timeframe: '1D',
          description: 'Fiyat yükselen bir üçgen formasyonu içinde hareket ediyor',
          expectedMove: {
            direction: 'UP',
            target: 125.50,
            probability: 75
          },
          detectedAt: new Date().toISOString(),
          status: 'ACTIVE'
        };

        setPatterns({
          patterns: {
            triangles: {
              ascending: [mockPattern],
              descending: [],
              symmetrical: []
            },
            channels: {
              uptrend: [],
              downtrend: [],
              horizontal: []
            },
            reversal: {
              doubleTop: [],
              doubleBottom: [],
              headAndShoulders: [],
              inverseHeadAndShoulders: []
            },
            continuation: {
              flags: [],
              pennants: [],
              rectangles: []
            }
          },
          summary: {
            totalPatterns: 1,
            bullishPatterns: 1,
            bearishPatterns: 0,
            neutralPatterns: 0,
            highConfidencePatterns: 1
          },
          recommendations: {
            action: 'BUY',
            confidence: 78,
            reasoning: 'Yükselen üçgen formasyonu yukarı kırılım sinyali veriyor',
            timeHorizon: 'MEDIUM'
          },
          riskFactors: [
            'Genel piyasa volatilitesi',
            'Hacim onayı bekleniyor'
          ],
          lastAnalysis: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setPatterns(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    patterns,
    loading,
    error,
    analyzePatterns,
    clearData,
    clearError
  };
};