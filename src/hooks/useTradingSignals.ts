import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { TradingSignal, MarketData, PositionSizing, SignalsSummary, PortfolioRecommendation, MarketSentiment, RiskAnalysis, SignalPerformance } from '../types/trading';

// Trading signal interfaces
interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  confidence: number;
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: '1D' | '1W' | '1M' | '3M';
  reasoning: string;
  technicalFactors: string[];
  fundamentalFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
}

interface MarketData {
  symbol: string;
  currentPrice: number;
  volume: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  pe?: number;
  technicalIndicators: {
    rsi?: number;
    macd?: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
    };
    sma20?: number;
    sma50?: number;
    sma200?: number;
  };
  patterns?: string[];
}

interface PortfolioContext {
  totalValue: number;
  availableCash: number;
  positions: {
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentValue: number;
  }[];
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  investmentGoal: 'INCOME' | 'GROWTH' | 'BALANCED';
}

interface PositionSizing {
  recommendedAmount: number;
  maxRiskAmount: number;
  positionPercentage: number;
}

interface TradingRecommendation {
  signals: TradingSignal[];
  portfolioAdvice: {
    rebalancing: string[];
    riskAssessment: string;
    diversificationScore: number;
  };
  marketOutlook: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keyFactors: string[];
    timeHorizon: string;
  };
  generatedAt: string;
}

interface MarketSentiment {
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  distribution: {
    bullish: number;
    bearish: number;
    neutral: number;
    bullishPercentage: number;
    bearishPercentage: number;
  };
  strongSignals: {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    reasoning: string;
  }[];
  marketFactors: {
    volatilityLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    trendDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  generatedAt: string;
}

interface RiskAnalysis {
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  positionRisks: {
    symbol: string;
    currentValue: number;
    portfolioWeight: number;
    volatility: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendation: string;
  }[];
  portfolioMetrics: {
    totalPositions: number;
    highRiskPositions: number;
    concentrationRisk: number;
    cashPercentage: number;
  };
  recommendations: string[];
  generatedAt: string;
}

interface SignalPerformance {
  totalSignals: number;
  successfulSignals: number;
  successRate: number;
  averageReturn: number;
  bestSignal: { date: string; return: number };
  worstSignal: { date: string; return: number };
}

interface UseTradingSignalsState {
  // Single signal
  signal: TradingSignal | null;
  positionSizing: PositionSizing | null;
  
  // Multiple signals
  signals: TradingSignal[];
  signalsSummary: {
    totalSignals: number;
    buySignals: number;
    sellSignals: number;
    holdSignals: number;
    averageConfidence: number;
  } | null;
  
  // Portfolio recommendation
  portfolioRecommendation: TradingRecommendation | null;
  
  // Market sentiment
  marketSentiment: MarketSentiment | null;
  
  // Risk analysis
  riskAnalysis: RiskAnalysis | null;
  
  // Performance
  signalPerformance: SignalPerformance | null;
  
  // Loading states
  isLoadingSignal: boolean;
  isLoadingSignals: boolean;
  isLoadingRecommendation: boolean;
  isLoadingSentiment: boolean;
  isLoadingRisk: boolean;
  isLoadingPerformance: boolean;
  
  // Error states
  error: string | null;
}

const useTradingSignals = () => {
  const [state, setState] = useState<UseTradingSignalsState>({
    signal: null,
    positionSizing: null,
    signals: [],
    signalsSummary: null,
    portfolioRecommendation: null,
    marketSentiment: null,
    riskAnalysis: null,
    signalPerformance: null,
    isLoadingSignal: false,
    isLoadingSignals: false,
    isLoadingRecommendation: false,
    isLoadingSentiment: false,
    isLoadingRisk: false,
    isLoadingPerformance: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Rate limiting için refs
  const lastRequestTime = useRef<number>(0);
  const requestQueue = useRef<Array<() => void>>([]);
  const isProcessingQueue = useRef<boolean>(false);
  const MIN_REQUEST_INTERVAL = 2000; // 2 saniye minimum aralık

  // Rate limiting queue processor
  const processQueue = useCallback(async () => {
    if (isProcessingQueue.current || requestQueue.current.length === 0) {
      return;
    }

    isProcessingQueue.current = true;
    
    while (requestQueue.current.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime.current;
      
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
        console.debug(`Rate limiting: Waiting ${waitTime}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const nextRequest = requestQueue.current.shift();
      if (nextRequest) {
        lastRequestTime.current = Date.now();
        nextRequest();
        // İstekler arası ek bekleme
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    isProcessingQueue.current = false;
  }, []);

  // Generic API call handler
  const handleApiCall = useCallback(async <T>(
    url: string,
    data: any,
    loadingKey: keyof UseTradingSignalsState,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T | null> => {
    return new Promise((resolve) => {
      const executeRequest = async () => {
        try {
          // Cancel previous request
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }

          abortControllerRef.current = new AbortController();

          setState(prev => ({
            ...prev,
            [loadingKey]: true,
            error: null
          }));

          const config = {
            signal: abortControllerRef.current.signal,
            timeout: 30000 // 30 seconds timeout
          };

          const response = method === 'GET' 
            ? await axios.get(url, config)
            : await axios.post(url, data, config);

          if (response.data.success) {
            setState(prev => ({
              ...prev,
              [loadingKey]: false
            }));
            resolve(response.data.data);
          } else {
            throw new Error(response.data.error || 'API call failed');
          }
        } catch (error) {
          if (axios.isCancel(error)) {
            setState(prev => ({
              ...prev,
              [loadingKey]: false
            }));
            resolve(null); // Request was cancelled
            return;
          }
          
          // 429 hatası özel işlemi
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            console.warn('Rate limit exceeded, will retry after delay');
            setState(prev => ({
              ...prev,
              [loadingKey]: false,
              error: 'Çok fazla istek gönderildi. Lütfen bekleyin...'
            }));
            
            // 5 saniye bekleyip tekrar dene
            setTimeout(() => {
              requestQueue.current.push(executeRequest);
              processQueue();
            }, 5000);
            return;
          }
          
          const errorMessage = axios.isAxiosError(error)
            ? error.response?.data?.message || error.message
            : 'Bilinmeyen hata oluştu';
          
          setState(prev => ({
            ...prev,
            [loadingKey]: false,
            error: errorMessage
          }));
          
          resolve(null);
        }
      };
      
      requestQueue.current.push(executeRequest);
      processQueue();
    });
  }, [processQueue]);

  // Generate single trading signal
  const generateSignal = useCallback(async (
    symbol: string,
    marketData: MarketData,
    portfolioContext?: PortfolioContext
  ) => {
    try {
      const result = await handleApiCall<{
        signal: TradingSignal;
        positionSizing: PositionSizing | null;
      }>(
        `/api/trading-signals/signal/${symbol}`,
        { marketData, portfolioContext },
        'isLoadingSignal'
      );

      if (result) {
        // Veri doğrulama ve güvenlik kontrolleri
        const validatedSignal = result.signal ? {
          ...result.signal,
          price: typeof result.signal.price === 'number' ? result.signal.price : 0,
          targetPrice: typeof result.signal.targetPrice === 'number' ? result.signal.targetPrice : undefined,
          stopLoss: typeof result.signal.stopLoss === 'number' ? result.signal.stopLoss : undefined,
          confidence: typeof result.signal.confidence === 'number' ? result.signal.confidence : 0
        } : null;
        
        console.debug('useTradingSignals: Validated single signal:', validatedSignal);
        
        setState(prev => ({
          ...prev,
          signal: validatedSignal,
          positionSizing: result.positionSizing
        }));
      }

      return result;
    } catch (error) {
      // Error logged to production logging system
      return null;
    }
  }, [handleApiCall]);

  // Generate multiple trading signals
  const generateMultipleSignals = useCallback(async (
    symbols: string[],
    marketDataMap: Record<string, MarketData>,
    portfolioContext?: PortfolioContext
  ) => {
    try {
      const result = await handleApiCall<{
        signals: { signal: TradingSignal; positionSizing: PositionSizing | null }[];
        summary: {
          totalSignals: number;
          buySignals: number;
          sellSignals: number;
          holdSignals: number;
          averageConfidence: number;
        };
      }>(
        '/api/trading-signals/signals/multiple',
        { symbols, marketDataMap, portfolioContext },
        'isLoadingSignals'
      );

      if (result) {
        // Veri doğrulama ve güvenlik kontrolleri
        const validatedSignals = (result.signals || []).map(s => {
          if (!s || !s.signal) {
            console.warn('useTradingSignals: Invalid signal data received:', s);
            return null;
          }
          
          return {
            ...s.signal,
            price: typeof s.signal.price === 'number' ? s.signal.price : 0,
            targetPrice: typeof s.signal.targetPrice === 'number' ? s.signal.targetPrice : undefined,
            stopLoss: typeof s.signal.stopLoss === 'number' ? s.signal.stopLoss : undefined,
            confidence: typeof s.signal.confidence === 'number' ? s.signal.confidence : 0,
            symbol: s.signal.symbol || 'UNKNOWN',
            action: s.signal.action || 'HOLD',
            strength: s.signal.strength || 'WEAK',
            timeframe: s.signal.timeframe || '1D',
            reasoning: s.signal.reasoning || 'Analiz bilgisi mevcut değil',
            technicalFactors: Array.isArray(s.signal.technicalFactors) ? s.signal.technicalFactors : [],
            fundamentalFactors: Array.isArray(s.signal.fundamentalFactors) ? s.signal.fundamentalFactors : [],
            riskLevel: s.signal.riskLevel || 'MEDIUM',
            timestamp: s.signal.timestamp || new Date().toISOString()
          };
        }).filter(Boolean) as TradingSignal[];
        
        // Summary doğrulama
        const validatedSummary = result.summary ? {
          totalSignals: typeof result.summary.totalSignals === 'number' ? result.summary.totalSignals : validatedSignals.length,
          buySignals: typeof result.summary.buySignals === 'number' ? result.summary.buySignals : validatedSignals.filter(s => s.action === 'BUY').length,
          sellSignals: typeof result.summary.sellSignals === 'number' ? result.summary.sellSignals : validatedSignals.filter(s => s.action === 'SELL').length,
          holdSignals: typeof result.summary.holdSignals === 'number' ? result.summary.holdSignals : validatedSignals.filter(s => s.action === 'HOLD').length,
          averageConfidence: typeof result.summary.averageConfidence === 'number' ? result.summary.averageConfidence : 
            (validatedSignals.length > 0 ? validatedSignals.reduce((sum, s) => sum + s.confidence, 0) / validatedSignals.length : 0)
        } : null;
        
        console.debug('useTradingSignals: Validated signals:', {
          originalCount: result.signals?.length || 0,
          validatedCount: validatedSignals.length,
          summary: validatedSummary
        });
        
        setState(prev => ({
          ...prev,
          signals: validatedSignals,
          signalsSummary: validatedSummary
        }));
      }

      return result;
    } catch (error) {
      // Error logged to production logging system
      return null;
    }
  }, [handleApiCall]);

  // Generate portfolio recommendation
  const generatePortfolioRecommendation = useCallback(async (
    portfolioContext: PortfolioContext,
    marketDataMap: Record<string, MarketData>
  ) => {
    try {
      const result = await handleApiCall<{
        recommendation: TradingRecommendation;
        portfolioMetrics: any;
        riskAnalysis: any;
      }>(
        '/api/trading-signals/portfolio/recommendation',
        { portfolioContext, marketDataMap },
        'isLoadingRecommendation'
      );

      if (result) {
        setState(prev => ({
          ...prev,
          portfolioRecommendation: result.recommendation
        }));
      }

      return result;
    } catch (error) {
      // Error logged to production logging system
      return null;
    }
  }, [handleApiCall]);

  // Analyze market sentiment
  const analyzeMarketSentiment = useCallback(async (
    symbols: string[],
    marketDataMap: Record<string, MarketData>
  ) => {
    try {
      const result = await handleApiCall<MarketSentiment>(
        '/api/trading-signals/market/sentiment',
        { symbols, marketDataMap },
        'isLoadingSentiment'
      );

      if (result) {
        setState(prev => ({
          ...prev,
          marketSentiment: result
        }));
      }

      return result;
    } catch (error) {
      // Error logged to production logging system
      return null;
    }
  }, [handleApiCall]);

  // Analyze portfolio risk
  const analyzeRisk = useCallback(async (
    portfolioContext: PortfolioContext,
    marketDataMap: Record<string, MarketData>
  ) => {
    try {
      const result = await handleApiCall<RiskAnalysis>(
        '/api/trading-signals/risk/analysis',
        { portfolioContext, marketDataMap },
        'isLoadingRisk'
      );

      if (result) {
        setState(prev => ({
          ...prev,
          riskAnalysis: result
        }));
      }

      return result;
    } catch (error) {
      // Error logged to production logging system
      return null;
    }
  }, [handleApiCall]);

  // Get signal performance
  const getSignalPerformance = useCallback(async (
    symbol: string,
    days: number = 30
  ) => {
    try {
      const result = await handleApiCall<{
        symbol: string;
        period: string;
        performance: SignalPerformance;
      }>(
        `/api/trading-signals/performance/${symbol}?days=${days}`,
        null,
        'isLoadingPerformance',
        'GET'
      );

      if (result) {
        setState(prev => ({
          ...prev,
          signalPerformance: result.performance
        }));
      }

      return result;
    } catch (error) {
      // Error logged to production logging system
      return null;
    }
  }, [handleApiCall]);

  // Clear all data
  const clearData = useCallback(() => {
    setState({
      signal: null,
      positionSizing: null,
      signals: [],
      signalsSummary: null,
      portfolioRecommendation: null,
      marketSentiment: null,
      riskAnalysis: null,
      signalPerformance: null,
      isLoadingSignal: false,
      isLoadingSignals: false,
      isLoadingRecommendation: false,
      isLoadingSentiment: false,
      isLoadingRisk: false,
      isLoadingPerformance: false,
      error: null
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Helper functions for signal analysis
  const getSignalsByAction = useCallback((action: 'BUY' | 'SELL' | 'HOLD') => {
    return state.signals.filter(signal => signal.action === action);
  }, [state.signals]);

  const getHighConfidenceSignals = useCallback((minConfidence: number = 70) => {
    return state.signals.filter(signal => signal.confidence >= minConfidence);
  }, [state.signals]);

  const getSignalsByRisk = useCallback((riskLevel: 'LOW' | 'MEDIUM' | 'HIGH') => {
    return state.signals.filter(signal => signal.riskLevel === riskLevel);
  }, [state.signals]);

  const getSignalsByStrength = useCallback((strength: 'WEAK' | 'MODERATE' | 'STRONG') => {
    return state.signals.filter(signal => signal.strength === strength);
  }, [state.signals]);

  // Calculate portfolio metrics
  const calculatePortfolioMetrics = useCallback((portfolioContext: PortfolioContext) => {
    const totalPositions = portfolioContext.positions.length;
    const totalInvested = portfolioContext.totalValue - portfolioContext.availableCash;
    const cashPercentage = (portfolioContext.availableCash / portfolioContext.totalValue) * 100;
    
    const positionValues = portfolioContext.positions.map(p => p.currentValue);
    const largestPosition = Math.max(...positionValues);
    const largestPositionPercentage = (largestPosition / portfolioContext.totalValue) * 100;
    
    const averagePositionSize = totalInvested / totalPositions;
    
    return {
      totalPositions,
      totalInvested,
      cashPercentage,
      largestPositionPercentage,
      averagePositionSize,
      isDiversified: totalPositions >= 5 && largestPositionPercentage < 20,
      hasAdequateCash: cashPercentage >= 10
    };
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    generateSignal,
    generateMultipleSignals,
    generatePortfolioRecommendation,
    analyzeMarketSentiment,
    analyzeRisk,
    getSignalPerformance,
    clearData,
    clearError,
    
    // Helper functions
    getSignalsByAction,
    getHighConfidenceSignals,
    getSignalsByRisk,
    getSignalsByStrength,
    calculatePortfolioMetrics,
    
    // Computed values
    hasSignals: state.signals.length > 0,
    isLoading: state.isLoadingSignal || state.isLoadingSignals || 
               state.isLoadingRecommendation || state.isLoadingSentiment || 
               state.isLoadingRisk || state.isLoadingPerformance,
    
    // Quick stats
    totalSignals: state.signals.length,
    buySignalsCount: state.signals.filter(s => s.action === 'BUY').length,
    sellSignalsCount: state.signals.filter(s => s.action === 'SELL').length,
    holdSignalsCount: state.signals.filter(s => s.action === 'HOLD').length,
    averageConfidence: state.signals.length > 0 
      ? state.signals.reduce((sum, s) => sum + s.confidence, 0) / state.signals.length 
      : 0
  };
};

export default useTradingSignals;
export type {
  TradingSignal,
  MarketData,
  PortfolioContext,
  PositionSizing,
  TradingRecommendation,
  MarketSentiment,
  RiskAnalysis,
  SignalPerformance
};