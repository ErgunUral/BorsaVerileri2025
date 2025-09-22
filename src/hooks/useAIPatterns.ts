import { useState, useCallback, useMemo } from 'react';

interface AIPattern {
  id: string;
  type: 'BULLISH_FLAG' | 'BEARISH_FLAG' | 'HEAD_SHOULDERS' | 'INVERSE_HEAD_SHOULDERS' | 
        'TRIANGLE_ASCENDING' | 'TRIANGLE_DESCENDING' | 'TRIANGLE_SYMMETRICAL' | 
        'DOUBLE_TOP' | 'DOUBLE_BOTTOM' | 'CUP_HANDLE' | 'WEDGE_RISING' | 'WEDGE_FALLING';
  confidence: number;
  startDate: string;
  endDate: string;
  targetPrice?: number;
  stopLoss?: number;
  description: string;
  keyPoints: Array<{ x: number; y: number; label: string }>;
}

interface FormationTracking {
  currentFormations: Array<{
    id: string;
    type: string;
    stage: 'FORMING' | 'CONFIRMED' | 'COMPLETED' | 'FAILED';
    progress: number;
    estimatedCompletion: string;
    keyLevels: number[];
  }>;
  completedFormations: Array<{
    id: string;
    type: string;
    completedAt: string;
    accuracy: number;
    priceTarget: number;
    actualPrice: number;
  }>;
  statistics: {
    totalFormations: number;
    successRate: number;
    averageAccuracy: number;
    bestPerformingPattern: string;
  };
}

interface AISignals {
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: number;
  reasoning: string[];
  timeHorizon: '1D' | '1W' | '1M' | '3M';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  priceTargets: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  stopLoss: number;
  entryPrice: number;
}

interface ComprehensiveAnalysis {
  patterns: AIPattern[];
  formations: FormationTracking;
  signals: AISignals;
  comprehensiveScore: {
    patternStrength: number;
    formationCount: number;
    signalStrength: number;
    overallRating: number;
  };
  analysis: {
    recommendation: string;
    confidence: number;
    riskLevel: string;
    timeHorizon: string;
    keyFactors: string[];
  };
}

interface UseAIPatternsReturn {
  // Data states
  patterns: AIPattern[];
  formations: FormationTracking | null;
  signals: AISignals | null;
  comprehensiveAnalysis: ComprehensiveAnalysis | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingFormations: boolean;
  isLoadingSignals: boolean;
  isLoadingComprehensive: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  analyzePatterns: (symbol: string, timeframe?: string, forceRefresh?: boolean) => Promise<void>;
  trackFormations: (symbol: string, forceRefresh?: boolean) => Promise<void>;
  getSignals: (symbol: string) => Promise<void>;
  getComprehensiveAnalysis: (symbol: string, timeframe?: string) => Promise<void>;
  clearData: () => void;
  clearError: () => void;
  clearCache: () => Promise<void>;
  
  // Computed values
  activePatterns: AIPattern[];
  highConfidencePatterns: AIPattern[];
  currentFormations: FormationTracking['currentFormations'];
  tradingRecommendation: {
    action: string;
    confidence: number;
    reasoning: string[];
  } | null;
}

export const useAIPatterns = (): UseAIPatternsReturn => {
  // State management
  const [patterns, setPatterns] = useState<AIPattern[]>([]);
  const [formations, setFormations] = useState<FormationTracking | null>(null);
  const [signals, setSignals] = useState<AISignals | null>(null);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFormations, setIsLoadingFormations] = useState(false);
  const [isLoadingSignals, setIsLoadingSignals] = useState(false);
  const [isLoadingComprehensive, setIsLoadingComprehensive] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  // Cache management
  const [lastAnalyzedSymbol, setLastAnalyzedSymbol] = useState<string>('');
  const [lastTimeframe, setLastTimeframe] = useState<string>('');

  // API base URL
  const API_BASE = '/api/ai-patterns';

  // Analyze patterns
  const analyzePatterns = useCallback(async (
    symbol: string, 
    timeframe: string = '1D', 
    forceRefresh: boolean = false
  ) => {
    // Avoid unnecessary API calls
    if (!forceRefresh && 
        lastAnalyzedSymbol === symbol && 
        lastTimeframe === timeframe && 
        patterns.length > 0) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/${symbol}?timeframe=${timeframe}&forceRefresh=${forceRefresh}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPatterns(data.data.patterns || []);
        setLastAnalyzedSymbol(symbol);
        setLastTimeframe(timeframe);
      } else {
        throw new Error(data.message || 'Failed to analyze patterns');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Pattern analysis failed: ${errorMessage}`);
      console.error('AI Patterns analysis error:', err);
      
      // Set mock data in development
      if (process.env['NODE_ENV'] === 'development') {
        setPatterns([
          {
            id: '1',
            type: 'BULLISH_FLAG',
            confidence: 85,
            startDate: '2024-01-15',
            endDate: '2024-01-20',
            targetPrice: 125.50,
            stopLoss: 115.20,
            description: 'Strong bullish flag pattern with high volume confirmation',
            keyPoints: [
              { x: 1, y: 120, label: 'Breakout Point' },
              { x: 5, y: 118, label: 'Support Level' }
            ]
          }
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [lastAnalyzedSymbol, lastTimeframe, patterns.length]);

  // Track formations
  const trackFormations = useCallback(async (symbol: string, forceRefresh: boolean = false) => {
    setIsLoadingFormations(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/${symbol}/formations?forceRefresh=${forceRefresh}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setFormations(data.data.formations);
      } else {
        throw new Error(data.message || 'Failed to track formations');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Formation tracking failed: ${errorMessage}`);
      console.error('Formation tracking error:', err);
      
      // Set mock data in development
      if (process.env['NODE_ENV'] === 'development') {
        setFormations({
          currentFormations: [
            {
              id: '1',
              type: 'Head and Shoulders',
              stage: 'FORMING',
              progress: 75,
              estimatedCompletion: '2024-01-25',
              keyLevels: [118, 122, 120]
            }
          ],
          completedFormations: [],
          statistics: {
            totalFormations: 5,
            successRate: 80,
            averageAccuracy: 85,
            bestPerformingPattern: 'Bullish Flag'
          }
        });
      }
    } finally {
      setIsLoadingFormations(false);
    }
  }, []);

  // Get AI signals
  const getSignals = useCallback(async (symbol: string) => {
    setIsLoadingSignals(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${symbol}/signals`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSignals(data.data);
      } else {
        throw new Error(data.message || 'Failed to get AI signals');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`AI signals failed: ${errorMessage}`);
      console.error('AI signals error:', err);
      
      // Set mock data in development
      if (process.env['NODE_ENV'] === 'development') {
        setSignals({
          signal: 'BUY',
          strength: 78,
          reasoning: ['Strong bullish patterns detected', 'Volume confirmation present'],
          timeHorizon: '1W',
          riskLevel: 'MEDIUM',
          priceTargets: {
            conservative: 125,
            moderate: 130,
            aggressive: 135
          },
          stopLoss: 115,
          entryPrice: 120
        });
      }
    } finally {
      setIsLoadingSignals(false);
    }
  }, []);

  // Get comprehensive analysis
  const getComprehensiveAnalysis = useCallback(async (symbol: string, timeframe: string = '1D') => {
    setIsLoadingComprehensive(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/${symbol}/comprehensive?timeframe=${timeframe}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setComprehensiveAnalysis(data.data);
        // Also update individual states
        setPatterns(data.data.patterns || []);
        setFormations(data.data.formations);
        setSignals(data.data.signals);
      } else {
        throw new Error(data.message || 'Failed to get comprehensive analysis');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Comprehensive analysis failed: ${errorMessage}`);
      console.error('Comprehensive analysis error:', err);
    } finally {
      setIsLoadingComprehensive(false);
    }
  }, []);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/clear-cache`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Clear local state as well
      setPatterns([]);
      setFormations(null);
      setSignals(null);
      setComprehensiveAnalysis(null);
      setLastAnalyzedSymbol('');
      setLastTimeframe('');
    } catch (err) {
      console.error('Cache clear error:', err);
    }
  }, []);

  // Clear data
  const clearData = useCallback(() => {
    setPatterns([]);
    setFormations(null);
    setSignals(null);
    setComprehensiveAnalysis(null);
    setLastAnalyzedSymbol('');
    setLastTimeframe('');
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const activePatterns = useMemo(() => {
    return patterns.filter(pattern => pattern.confidence > 60);
  }, [patterns]);

  const highConfidencePatterns = useMemo(() => {
    return patterns.filter(pattern => pattern.confidence > 80);
  }, [patterns]);

  const currentFormations = useMemo(() => {
    return formations?.currentFormations || [];
  }, [formations]);

  const tradingRecommendation = useMemo(() => {
    if (!signals || !comprehensiveAnalysis) return null;

    return {
      action: signals.signal,
      confidence: comprehensiveAnalysis.analysis.confidence,
      reasoning: comprehensiveAnalysis.analysis.keyFactors
    };
  }, [signals, comprehensiveAnalysis]);

  return {
    // Data states
    patterns,
    formations,
    signals,
    comprehensiveAnalysis,
    
    // Loading states
    isLoading,
    isLoadingFormations,
    isLoadingSignals,
    isLoadingComprehensive,
    
    // Error state
    error,
    
    // Actions
    analyzePatterns,
    trackFormations,
    getSignals,
    getComprehensiveAnalysis,
    clearData,
    clearError,
    clearCache,
    
    // Computed values
    activePatterns,
    highConfidencePatterns,
    currentFormations,
    tradingRecommendation
  };
};

export default useAIPatterns;