import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAIPatterns } from '../useAIPatterns';

// Mock fetch
global.fetch = vi.fn();

const mockFetch = vi.mocked(fetch);

// Mock data
const mockPatternData = {
  patterns: [
    {
      id: '1',
      name: 'Head and Shoulders',
      type: 'reversal',
      confidence: 0.85,
      description: 'Bearish reversal pattern detected',
      timeframe: '1D',
      points: [
        { x: 1, y: 100 },
        { x: 2, y: 110 },
        { x: 3, y: 105 }
      ]
    }
  ],
  signals: [
    {
      id: '1',
      type: 'buy',
      strength: 'strong',
      confidence: 0.9,
      description: 'Strong bullish signal detected',
      timestamp: '2024-01-01T10:00:00Z'
    }
  ],
  analysis: {
    trend: 'bullish',
    momentum: 'strong',
    volatility: 'medium',
    support: 95,
    resistance: 115,
    recommendation: 'buy',
    confidence: 0.88,
    reasoning: 'Strong technical indicators suggest upward movement'
  }
};

const mockAnalysisData = {
  summary: 'Comprehensive market analysis shows positive outlook',
  technicalIndicators: {
    rsi: 65,
    macd: 'bullish',
    movingAverages: 'above'
  },
  marketSentiment: 'positive',
  riskLevel: 'medium',
  priceTarget: 120,
  stopLoss: 90,
  timeHorizon: '1-3 months'
};

describe('useAIPatterns Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAIPatterns());
    
    expect(result.current.patterns).toEqual([]);
    expect(result.current.signals).toEqual([]);
    expect(result.current.analysis).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch patterns successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPatternData
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    expect(mockFetch).toHaveBeenCalledWith('/api/ai/patterns/AAPL');
    expect(result.current.patterns).toEqual(mockPatternData.patterns);
    expect(result.current.signals).toEqual(mockPatternData.signals);
    expect(result.current.analysis).toEqual(mockPatternData.analysis);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch patterns error', async () => {
    const errorMessage = 'Failed to fetch patterns';
    mockFetch.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    expect(result.current.patterns).toEqual([]);
    expect(result.current.signals).toEqual([]);
    expect(result.current.analysis).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should set loading state during fetch', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    mockFetch.mockReturnValueOnce(promise as any);

    const { result } = renderHook(() => useAIPatterns());
    
    act(() => {
      result.current.fetchPatterns('AAPL');
    });
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      resolvePromise!({
        ok: true,
        json: async () => mockPatternData
      });
      await promise;
    });
    
    expect(result.current.loading).toBe(false);
  });

  it('should fetch comprehensive analysis successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAnalysisData
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.getComprehensiveAnalysis('AAPL', '1D');
    });
    
    expect(mockFetch).toHaveBeenCalledWith('/api/ai/analysis/AAPL?timeframe=1D');
    expect(result.current.comprehensiveAnalysis).toEqual(mockAnalysisData);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle comprehensive analysis error', async () => {
    const errorMessage = 'Analysis failed';
    mockFetch.mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.getComprehensiveAnalysis('AAPL');
    });
    
    expect(result.current.comprehensiveAnalysis).toBeNull();
    expect(result.current.error).toBe(errorMessage);
  });

  it('should cache patterns data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPatternData
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    // First fetch
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Second fetch within cache time (should use cache)
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, used cache
  });

  it('should refresh cache after expiry', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPatternData
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    // First fetch
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Fast forward past cache expiry (5 minutes)
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    });
    
    // Second fetch after cache expiry
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should handle different symbols separately in cache', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockPatternData
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    // Fetch for AAPL
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    // Fetch for GOOGL (different symbol)
    await act(async () => {
      await result.current.fetchPatterns('GOOGL');
    });
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/ai/patterns/AAPL');
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/ai/patterns/GOOGL');
  });

  it('should clear error when called', () => {
    const { result } = renderHook(() => useAIPatterns());
    
    // Set an error first
    act(() => {
      result.current.clearError();
    });
    
    expect(result.current.error).toBeNull();
  });

  it('should filter patterns by type', async () => {
    const multiplePatterns = {
      patterns: [
        { ...mockPatternData.patterns[0], type: 'reversal' },
        { ...mockPatternData.patterns[0], id: '2', type: 'continuation' },
        { ...mockPatternData.patterns[0], id: '3', type: 'reversal' }
      ],
      signals: [],
      analysis: null
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => multiplePatterns
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    const reversalPatterns = result.current.getPatternsByType('reversal');
    const continuationPatterns = result.current.getPatternsByType('continuation');
    
    expect(reversalPatterns).toHaveLength(2);
    expect(continuationPatterns).toHaveLength(1);
    expect(reversalPatterns.every(p => p.type === 'reversal')).toBe(true);
    expect(continuationPatterns.every(p => p.type === 'continuation')).toBe(true);
  });

  it('should filter signals by strength', async () => {
    const multipleSignals = {
      patterns: [],
      signals: [
        { ...mockPatternData.signals[0], strength: 'strong' },
        { ...mockPatternData.signals[0], id: '2', strength: 'weak' },
        { ...mockPatternData.signals[0], id: '3', strength: 'strong' }
      ],
      analysis: null
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => multipleSignals
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    const strongSignals = result.current.getSignalsByStrength('strong');
    const weakSignals = result.current.getSignalsByStrength('weak');
    
    expect(strongSignals).toHaveLength(2);
    expect(weakSignals).toHaveLength(1);
    expect(strongSignals.every(s => s.strength === 'strong')).toBe(true);
    expect(weakSignals.every(s => s.strength === 'weak')).toBe(true);
  });

  it('should get latest signals', async () => {
    const multipleSignals = {
      patterns: [],
      signals: [
        { ...mockPatternData.signals[0], timestamp: '2024-01-01T10:00:00Z' },
        { ...mockPatternData.signals[0], id: '2', timestamp: '2024-01-01T11:00:00Z' },
        { ...mockPatternData.signals[0], id: '3', timestamp: '2024-01-01T09:00:00Z' }
      ],
      analysis: null
    };
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => multipleSignals
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    const latestSignals = result.current.getLatestSignals(2);
    
    expect(latestSignals).toHaveLength(2);
    expect(latestSignals[0].timestamp).toBe('2024-01-01T11:00:00Z'); // Most recent
    expect(latestSignals[1].timestamp).toBe('2024-01-01T10:00:00Z'); // Second most recent
  });

  it('should handle HTTP error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('INVALID');
    });
    
    expect(result.current.error).toBe('HTTP error! status: 404');
    expect(result.current.patterns).toEqual([]);
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    expect(result.current.error).toBe('Network error');
  });

  it('should persist cache to localStorage', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPatternData
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    const cacheKey = 'ai_patterns_AAPL';
    const cachedData = localStorage.getItem(cacheKey);
    
    expect(cachedData).toBeTruthy();
    
    const parsed = JSON.parse(cachedData!);
    expect(parsed.data).toEqual(mockPatternData);
    expect(parsed.timestamp).toBeTruthy();
  });

  it('should load from localStorage cache on initialization', () => {
    const cacheKey = 'ai_patterns_AAPL';
    const cachedData = {
      data: mockPatternData,
      timestamp: Date.now()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    
    const { result } = renderHook(() => useAIPatterns());
    
    act(() => {
      result.current.fetchPatterns('AAPL');
    });
    
    // Should use cached data without making API call
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.patterns).toEqual(mockPatternData.patterns);
  });

  it('should ignore expired localStorage cache', async () => {
    const cacheKey = 'ai_patterns_AAPL';
    const expiredCachedData = {
      data: mockPatternData,
      timestamp: Date.now() - (6 * 60 * 1000) // 6 minutes ago (expired)
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(expiredCachedData));
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPatternData
    } as Response);

    const { result } = renderHook(() => useAIPatterns());
    
    await act(async () => {
      await result.current.fetchPatterns('AAPL');
    });
    
    // Should make API call since cache is expired
    expect(mockFetch).toHaveBeenCalled();
  });
});