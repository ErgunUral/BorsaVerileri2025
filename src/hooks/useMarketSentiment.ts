import { useState, useCallback, useEffect, useMemo } from 'react';

interface SentimentData {
  overall: number; // -100 to 100
  bullish: number; // percentage
  bearish: number; // percentage
  neutral: number; // percentage
  confidence: number; // 0 to 100
  volume: number;
  socialMentions: number;
  newsCount: number;
  timestamp: string;
}

interface SentimentAnalysis {
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  reliability: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface UseMarketSentimentReturn {
  sentimentData: SentimentData | null;
  analysis: SentimentAnalysis | null;
  isLoading: boolean;
  error: string | null;
  fetchSentiment: (symbol: string, forceRefresh?: boolean) => Promise<void>;
  clearError: () => void;
  lastFetchedSymbol: string | null;
}

export const useMarketSentiment = (): UseMarketSentimentReturn => {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState<string | null>(null);

  const fetchSentiment = useCallback(async (symbol: string, forceRefresh = false) => {
    // Gereksiz API çağrısını engelle
    if (!forceRefresh && lastFetchedSymbol === symbol && sentimentData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // API çağrısı simülasyonu - gerçek implementasyonda API endpoint'i kullanılacak
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data - gerçek implementasyonda API'den gelecek
      const mockSentimentData: SentimentData = {
        overall: Math.random() * 200 - 100, // -100 to 100
        bullish: Math.random() * 60 + 20, // 20-80%
        bearish: Math.random() * 40 + 10, // 10-50%
        neutral: Math.random() * 30 + 10, // 10-40%
        confidence: Math.random() * 40 + 60, // 60-100%
        volume: Math.floor(Math.random() * 10000000) + 1000000,
        socialMentions: Math.floor(Math.random() * 5000) + 100,
        newsCount: Math.floor(Math.random() * 50) + 5,
        timestamp: new Date().toISOString()
      };

      // Normalize percentages to sum to 100
      const total = mockSentimentData.bullish + mockSentimentData.bearish + mockSentimentData.neutral;
      mockSentimentData.bullish = (mockSentimentData.bullish / total) * 100;
      mockSentimentData.bearish = (mockSentimentData.bearish / total) * 100;
      mockSentimentData.neutral = (mockSentimentData.neutral / total) * 100;

      setSentimentData(mockSentimentData);
      setLastFetchedSymbol(symbol);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Market sentiment verisi alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, [lastFetchedSymbol, sentimentData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized analysis
  const analysis = useMemo((): SentimentAnalysis | null => {
    if (!sentimentData) return null;

    // Trend analysis
    let trend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
    if (sentimentData.overall > 20) trend = 'IMPROVING';
    else if (sentimentData.overall < -20) trend = 'DECLINING';

    // Strength analysis
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' = 'MODERATE';
    const absOverall = Math.abs(sentimentData.overall);
    if (absOverall > 50) strength = 'STRONG';
    else if (absOverall < 20) strength = 'WEAK';

    // Reliability analysis
    let reliability: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (sentimentData.confidence > 80 && sentimentData.socialMentions > 1000) reliability = 'HIGH';
    else if (sentimentData.confidence < 60 || sentimentData.socialMentions < 200) reliability = 'LOW';

    // Recommendation
    let recommendation: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (sentimentData.overall > 30 && sentimentData.confidence > 70) recommendation = 'BUY';
    else if (sentimentData.overall < -30 && sentimentData.confidence > 70) recommendation = 'SELL';

    // Risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
    if (reliability === 'HIGH' && Math.abs(sentimentData.overall) < 30) riskLevel = 'LOW';
    else if (reliability === 'LOW' || Math.abs(sentimentData.overall) > 60) riskLevel = 'HIGH';

    return {
      trend,
      strength,
      reliability,
      recommendation,
      riskLevel
    };
  }, [sentimentData]);

  return {
    sentimentData,
    analysis,
    isLoading,
    error,
    fetchSentiment,
    clearError,
    lastFetchedSymbol
  };
};