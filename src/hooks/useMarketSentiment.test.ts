import { renderHook, act } from '@testing-library/react';
import { useMarketSentiment } from './useMarketSentiment';

describe('useMarketSentiment', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useMarketSentiment());

    expect(result.current.sentimentData).toBeNull();
    expect(result.current.analysis).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchedSymbol).toBeNull();
  });

  it('should fetch sentiment data successfully', async () => {
    const { result } = renderHook(() => useMarketSentiment());

    await act(async () => {
      await result.current.fetchSentiment('AAPL');
    });

    expect(result.current.sentimentData).toBeTruthy();
    expect(result.current.sentimentData?.overall).toBeDefined();
    expect(result.current.sentimentData?.bullish).toBeDefined();
    expect(result.current.sentimentData?.bearish).toBeDefined();
    expect(result.current.sentimentData?.neutral).toBeDefined();
    expect(result.current.analysis).toBeTruthy();
    expect(result.current.error).toBeNull();
    expect(result.current.lastFetchedSymbol).toBe('AAPL');
  });

  it('should not refetch if same symbol and no force refresh', async () => {
    const { result } = renderHook(() => useMarketSentiment());

    // First fetch
    await act(async () => {
      await result.current.fetchSentiment('AAPL');
    });

    const firstData = result.current.sentimentData;

    // Second fetch without force refresh
    await act(async () => {
      await result.current.fetchSentiment('AAPL');
    });

    // Data should be the same (no refetch)
    expect(result.current.sentimentData).toBe(firstData);
  });

  it('should refetch with force refresh', async () => {
    const { result } = renderHook(() => useMarketSentiment());

    // First fetch
    await act(async () => {
      await result.current.fetchSentiment('AAPL');
    });

    const firstData = result.current.sentimentData;

    // Second fetch with force refresh
    await act(async () => {
      await result.current.fetchSentiment('AAPL', true);
    });

    // Data should be different (refetched)
    expect(result.current.sentimentData).not.toBe(firstData);
  });

  it('should clear error', () => {
    const { result } = renderHook(() => useMarketSentiment());

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should generate proper analysis based on sentiment data', async () => {
    const { result } = renderHook(() => useMarketSentiment());

    await act(async () => {
      await result.current.fetchSentiment('AAPL');
    });

    const analysis = result.current.analysis;
    expect(analysis).toBeTruthy();
    expect(['IMPROVING', 'DECLINING', 'STABLE']).toContain(analysis?.trend);
    expect(['WEAK', 'MODERATE', 'STRONG']).toContain(analysis?.strength);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(analysis?.reliability);
    expect(['BUY', 'SELL', 'HOLD']).toContain(analysis?.recommendation);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(analysis?.riskLevel);
  });
});