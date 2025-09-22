import { useState, useCallback, useMemo } from 'react';

export interface RSIData {
  value: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  period: number;
  timestamp: string;
}

export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp: string;
}

export interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  position: 'ABOVE_UPPER' | 'BELOW_LOWER' | 'MIDDLE' | 'UNKNOWN';
  squeeze: boolean;
  timestamp: string;
}

export interface MovingAverageData {
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  timestamp: string;
}

export interface TechnicalIndicators {
  rsi: RSIData;
  macd: MACDData;
  bollinger: BollingerData;
  movingAverages: MovingAverageData;
  volume: {
    current: number;
    average: number;
    trend: 'HIGH' | 'LOW' | 'NORMAL';
  };
  momentum: {
    roc: number; // Rate of Change
    stochastic: {
      k: number;
      d: number;
      signal: 'BUY' | 'SELL' | 'HOLD';
    };
  };
  support: number[];
  resistance: number[];
  overallSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
}

export const useTechnicalIndicators = () => {
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState<string | null>(null);

  const fetchIndicators = useCallback(async (symbol: string, forceRefresh = false) => {
    if (!symbol) {
      setError('Hisse senedi sembolü gerekli');
      return;
    }

    // Avoid unnecessary API calls for the same symbol
    if (!forceRefresh && lastFetchedSymbol === symbol && indicators) {
      return;
    }

    setLoading(true);
    setError(null);
    setLastFetchedSymbol(symbol);

    try {
      const response = await fetch(`/api/technical-indicators/${symbol}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setIndicators(data.data);
      } else {
        throw new Error(data.message || 'Teknik indikatörler alınamadı');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu';
      setError(errorMessage);
      console.error('Technical indicators fetch error:', err);
      
      // Mock data for development
      if (process.env['NODE_ENV'] === 'development') {
        setIndicators({
          rsi: {
            value: 45.2,
            signal: 'HOLD',
            period: 14,
            timestamp: new Date().toISOString()
          },
          macd: {
            macd: 0.15,
            signal: 0.12,
            histogram: 0.03,
            trend: 'BULLISH',
            timestamp: new Date().toISOString()
          },
          bollinger: {
            upper: 125.50,
            middle: 120.00,
            lower: 114.50,
            position: 'MIDDLE',
            squeeze: false,
            timestamp: new Date().toISOString()
          },
          movingAverages: {
            sma20: 118.75,
            sma50: 115.20,
            sma200: 110.80,
            ema12: 119.30,
            ema26: 116.90,
            trend: 'UPTREND',
            timestamp: new Date().toISOString()
          },
          volume: {
            current: 1250000,
            average: 980000,
            trend: 'HIGH'
          },
          momentum: {
            roc: 2.5,
            stochastic: {
              k: 65.2,
              d: 62.8,
              signal: 'HOLD'
            }
          },
          support: [115.00, 112.50, 110.00],
          resistance: [125.00, 128.50, 132.00],
          overallSignal: 'BUY'
        });
      }
    } finally {
      setLoading(false);
    }
  }, [lastFetchedSymbol, indicators]);

  const clearData = useCallback(() => {
    setIndicators(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized computed values
  const analysis = useMemo(() => {
    if (!indicators) return null;

    const { rsi, macd, bollinger, movingAverages } = indicators;
    
    // Calculate trend strength
    const trendStrength = {
      rsi: rsi.value > 70 ? 'overbought' : rsi.value < 30 ? 'oversold' : 'neutral',
      macd: macd.trend === 'BULLISH' ? 'bullish' : macd.trend === 'BEARISH' ? 'bearish' : 'neutral',
      bollinger: bollinger.position === 'ABOVE_UPPER' ? 'overbought' : 
                bollinger.position === 'BELOW_LOWER' ? 'oversold' : 'neutral',
      movingAverage: movingAverages.trend === 'UPTREND' ? 'bullish' : 
                    movingAverages.trend === 'DOWNTREND' ? 'bearish' : 'neutral'
    };

    // Calculate overall sentiment score
    const sentimentScore = [
      trendStrength.rsi === 'neutral' ? 0 : trendStrength.rsi === 'oversold' ? 1 : -1,
      trendStrength.macd === 'bullish' ? 1 : trendStrength.macd === 'bearish' ? -1 : 0,
      trendStrength.bollinger === 'oversold' ? 1 : trendStrength.bollinger === 'overbought' ? -1 : 0,
      trendStrength.movingAverage === 'bullish' ? 1 : trendStrength.movingAverage === 'bearish' ? -1 : 0
    ].reduce((sum, score) => sum + score, 0);

    return {
      trendStrength,
      sentimentScore,
      recommendation: sentimentScore > 1 ? 'BUY' : sentimentScore < -1 ? 'SELL' : 'HOLD',
      volatility: bollinger.squeeze ? 'LOW' : 'NORMAL',
      momentum: indicators.momentum.roc > 0 ? 'POSITIVE' : 'NEGATIVE'
    };
  }, [indicators]);

  return {
    indicators,
    loading,
    error,
    analysis,
    fetchIndicators,
    clearData,
    clearError
  };
};