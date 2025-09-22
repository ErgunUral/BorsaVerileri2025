import { useState, useCallback, useEffect, useMemo } from 'react';

interface RiskMetrics {
  volatility: number; // percentage
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number; // percentage
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  correlationToMarket: number;
  liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  creditRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
}

interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  riskScore: number; // 0-100
  recommendation: string;
  warnings: string[];
  strengths: string[];
  suitableFor: string[];
}

interface UseRiskAnalysisReturn {
  riskData: RiskMetrics | null;
  assessment: RiskAssessment | null;
  isLoading: boolean;
  error: string | null;
  fetchRiskAnalysis: (symbol: string, forceRefresh?: boolean) => Promise<void>;
  clearError: () => void;
  lastAnalyzedSymbol: string | null;
}

export const useRiskAnalysis = (): UseRiskAnalysisReturn => {
  const [riskData, setRiskData] = useState<RiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedSymbol, setLastAnalyzedSymbol] = useState<string | null>(null);

  const fetchRiskAnalysis = useCallback(async (symbol: string, forceRefresh = false) => {
    // Gereksiz API çağrısını engelle
    if (!forceRefresh && lastAnalyzedSymbol === symbol && riskData) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // API çağrısı simülasyonu - gerçek implementasyonda API endpoint'i kullanılacak
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Mock data - gerçek implementasyonda API'den gelecek
      const volatility = Math.random() * 40 + 5; // 5-45%
      const beta = Math.random() * 2 + 0.3; // 0.3-2.3
      const sharpeRatio = (Math.random() - 0.3) * 3; // -0.9 to 2.1
      
      const mockRiskData: RiskMetrics = {
        volatility,
        beta,
        sharpeRatio,
        maxDrawdown: Math.random() * 30 + 5, // 5-35%
        var95: Math.random() * 15 + 2, // 2-17%
        var99: Math.random() * 25 + 5, // 5-30%
        correlationToMarket: (Math.random() - 0.5) * 2, // -1 to 1
        liquidityRisk: volatility > 25 ? 'HIGH' : volatility > 15 ? 'MEDIUM' : 'LOW',
        creditRisk: beta > 1.5 ? 'HIGH' : beta > 1 ? 'MEDIUM' : 'LOW',
        timestamp: new Date().toISOString()
      };

      setRiskData(mockRiskData);
      setLastAnalyzedSymbol(symbol);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Risk analizi verisi alınamadı');
    } finally {
      setIsLoading(false);
    }
  }, [lastAnalyzedSymbol, riskData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Memoized risk assessment
  const assessment = useMemo((): RiskAssessment | null => {
    if (!riskData) return null;

    // Calculate overall risk score
    let riskScore = 0;
    
    // Volatility component (0-40 points)
    if (riskData.volatility >= 30) riskScore += 40;
    else if (riskData.volatility >= 20) riskScore += 30;
    else if (riskData.volatility >= 15) riskScore += 20;
    else riskScore += 10;
    
    // Beta component (0-25 points)
    if (riskData.beta > 1.5) riskScore += 25;
    else if (riskData.beta > 1.2) riskScore += 20;
    else if (riskData.beta > 0.8) riskScore += 15;
    else riskScore += 10;
    
    // Sharpe ratio component (0-20 points, inverse)
    if (riskData.sharpeRatio < 0) riskScore += 20;
    else if (riskData.sharpeRatio < 0.5) riskScore += 15;
    else if (riskData.sharpeRatio < 1) riskScore += 10;
    else riskScore += 5;
    
    // Max drawdown component (0-15 points)
    if (riskData.maxDrawdown > 25) riskScore += 15;
    else if (riskData.maxDrawdown > 15) riskScore += 10;
    else riskScore += 5;

    riskScore = Math.min(riskScore, 100);

    // Determine overall risk level
    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
    if (riskScore >= 80) overallRisk = 'VERY_HIGH';
    else if (riskScore >= 60) overallRisk = 'HIGH';
    else if (riskScore >= 35) overallRisk = 'MEDIUM';
    else overallRisk = 'LOW';

    // Generate warnings
    const warnings: string[] = [];
    if (riskData.volatility > 25) warnings.push('Yüksek volatilite - fiyat dalgalanmaları büyük olabilir');
    if (riskData.beta > 1.3) warnings.push('Piyasadan daha riskli - genel piyasa düşüşlerinde daha fazla etkilenebilir');
    if (riskData.sharpeRatio < 0) warnings.push('Negatif risk-ayarlı getiri - risksiz yatırımdan daha kötü performans');
    if (riskData.maxDrawdown > 20) warnings.push('Yüksek maksimum kayıp potansiyeli');
    if (riskData.liquidityRisk === 'HIGH') warnings.push('Yüksek likidite riski - pozisyon kapatmada zorluk yaşanabilir');
    if (riskData.var95 > 10) warnings.push('Yüksek VaR - günlük kayıp potansiyeli yüksek');

    // Generate strengths
    const strengths: string[] = [];
    if (riskData.volatility < 15) strengths.push('Düşük volatilite - istikrarlı fiyat hareketi');
    if (riskData.beta < 0.8) strengths.push('Piyasadan daha az riskli - savunma karakteri');
    if (riskData.sharpeRatio > 1) strengths.push('İyi risk-ayarlı getiri');
    if (riskData.sharpeRatio > 2) strengths.push('Mükemmel risk-ayarlı getiri');
    if (riskData.maxDrawdown < 10) strengths.push('Düşük maksimum kayıp geçmişi');
    if (riskData.liquidityRisk === 'LOW') strengths.push('Yüksek likidite - kolay alım-satım');
    if (Math.abs(riskData.correlationToMarket) < 0.3) strengths.push('Piyasadan bağımsız hareket - diversifikasyon faydası');

    // Determine suitable investor types
    const suitableFor: string[] = [];
    if (overallRisk === 'LOW') {
      suitableFor.push('Muhafazakar yatırımcılar');
      suitableFor.push('Emeklilik portföyleri');
      suitableFor.push('Risk almak istemeyen yatırımcılar');
    } else if (overallRisk === 'MEDIUM') {
      suitableFor.push('Orta risk toleransına sahip yatırımcılar');
      suitableFor.push('Dengeli portföyler');
      suitableFor.push('Uzun vadeli yatırımcılar');
    } else if (overallRisk === 'HIGH') {
      suitableFor.push('Yüksek risk toleransına sahip yatırımcılar');
      suitableFor.push('Agresif büyüme arayan yatırımcılar');
      suitableFor.push('Deneyimli yatırımcılar');
    } else {
      suitableFor.push('Çok deneyimli yatırımcılar');
      suitableFor.push('Spekülatif yatırımcılar');
      suitableFor.push('Yüksek kayıp toleransına sahip yatırımcılar');
    }

    // Generate recommendation
    let recommendation: string;
    if (overallRisk === 'LOW') {
      recommendation = 'Bu yatırım düşük riskli olarak değerlendirilmektedir. Muhafazakar yatırımcılar için uygun olabilir.';
    } else if (overallRisk === 'MEDIUM') {
      recommendation = 'Orta düzeyde risk içermektedir. Portföy diversifikasyonu ile birlikte değerlendirilmelidir.';
    } else if (overallRisk === 'HIGH') {
      recommendation = 'Yüksek risk içermektedir. Sadece risk toleransı yüksek yatırımcılar için uygundur.';
    } else {
      recommendation = 'Çok yüksek risk içermektedir. Sadece deneyimli ve yüksek kayıp toleransına sahip yatırımcılar için uygundur.';
    }

    return {
      overallRisk,
      riskScore,
      recommendation,
      warnings,
      strengths,
      suitableFor
    };
  }, [riskData]);

  return {
    riskData,
    assessment,
    isLoading,
    error,
    fetchRiskAnalysis,
    clearError,
    lastAnalyzedSymbol
  };
};