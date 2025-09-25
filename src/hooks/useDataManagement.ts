import { useState, useEffect, useCallback } from 'react';

interface CacheStats {
  cacheSize: number;
  totalKeys: number;
  keys: string[];
  timestamp: string;
}

interface ApiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastUpdated: string;
}

interface DuplicateDataEntry {
  key: string;
  count: number;
  lastAccessed: string;
  dataSize: number;
}

interface DataQualityMetrics {
  totalEndpoints: number;
  activeEndpoints: number;
  errorRate: number;
  duplicateDataCount: number;
  cacheHitRate: number;
}

export const useDataManagement = () => {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [apiMetrics, setApiMetrics] = useState<ApiMetrics | null>(null);
  const [duplicateData, setDuplicateData] = useState<DuplicateDataEntry[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQualityMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache istatistiklerini getir
  const fetchCacheStats = useCallback(async () => {
    try {
      const response = await fetch('/api/cache/stats');
      if (!response.ok) {
        throw new Error('Cache istatistikleri alınamadı');
      }
      const result = await response.json();
      setCacheStats(result.data);
      setError(null); // Başarılı olduğunda error'u temizle
    } catch (err) {
      console.error('Cache stats fetch error:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }, []);

  // API metriklerini getir
  const fetchApiMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/metrics');
      if (!response.ok) {
        throw new Error('API metrikleri alınamadı');
      }
      const result = await response.json();
      setApiMetrics(result.data);
      setError(null); // Başarılı olduğunda error'u temizle
    } catch (err) {
      console.error('API metrics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }, []);

  // Mükerrer veri analizi
  const analyzeDuplicateData = useCallback(async () => {
    try {
      if (!cacheStats) return;
      
      const duplicates: DuplicateDataEntry[] = [];
      const keyGroups: { [key: string]: string[] } = {};
      
      // Cache anahtarlarını grupla
      cacheStats.keys.forEach(key => {
        const baseKey = key.split('?')[0]; // Query parametrelerini kaldır
        if (!keyGroups[baseKey]) {
          keyGroups[baseKey] = [];
        }
        keyGroups[baseKey].push(key);
      });
      
      // Mükerrer verileri tespit et
      Object.entries(keyGroups).forEach(([baseKey, keys]) => {
        if (keys.length > 1) {
          duplicates.push({
            key: baseKey,
            count: keys.length,
            lastAccessed: new Date().toISOString(),
            dataSize: keys.length * 1024 // Tahmini boyut
          });
        }
      });
      
      setDuplicateData(duplicates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mükerrer veri analizi başarısız');
    }
  }, [cacheStats]);

  // Veri kalitesi metriklerini hesapla
  const calculateDataQuality = useCallback(() => {
    if (!cacheStats || !apiMetrics) return;
    
    const quality: DataQualityMetrics = {
      totalEndpoints: 8, // Bilinen endpoint sayısı
      activeEndpoints: cacheStats.totalKeys > 0 ? 8 : 0,
      errorRate: apiMetrics.totalRequests > 0 
        ? ((apiMetrics.totalRequests - apiMetrics.successfulRequests) / apiMetrics.totalRequests) * 100 
        : 0,
      duplicateDataCount: duplicateData.length,
      cacheHitRate: 75 // Tahmini cache hit rate
    };
    
    setDataQuality(quality);
  }, [cacheStats, apiMetrics, duplicateData]);

  // Cache temizleme
  const clearCache = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cache/clear', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Cache temizlenemedi');
      }
      
      await fetchCacheStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cache temizleme başarısız');
    } finally {
      setLoading(false);
    }
  }, [fetchCacheStats]);

  // Belirli pattern'e göre cache invalidation
  const invalidateCache = useCallback(async (pattern: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cache/invalidate/${pattern}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Cache invalidation başarısız');
      }
      
      await fetchCacheStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cache invalidation başarısız');
    } finally {
      setLoading(false);
    }
  }, [fetchCacheStats]);

  // Tüm verileri yenile
  const refreshAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // API çağrılarını sırayla yap, birinde hata olsa diğeri devam etsin
      const results = await Promise.allSettled([
        fetchCacheStats(),
        fetchApiMetrics()
      ]);
      
      // Tüm çağrılar başarısızsa error set et
      const allFailed = results.every(result => result.status === 'rejected');
      if (allFailed) {
        setError('Tüm API çağrıları başarısız oldu');
      }
    } catch (err) {
      console.error('Refresh all data error:', err);
      setError(err instanceof Error ? err.message : 'Veri yenileme başarısız');
    } finally {
      setLoading(false);
    }
  }, [fetchCacheStats, fetchApiMetrics]);

  // Component mount olduğunda verileri getir
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Cache stats değiştiğinde mükerrer veri analizi yap
  useEffect(() => {
    if (cacheStats) {
      analyzeDuplicateData();
    }
  }, [cacheStats, analyzeDuplicateData]);

  // Veri kalitesi metriklerini güncelle
  useEffect(() => {
    calculateDataQuality();
  }, [calculateDataQuality]);

  // Auto-refresh her 30 saniyede bir
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshAllData]);

  return {
    // Data
    cacheStats,
    apiMetrics,
    duplicateData,
    dataQuality,
    
    // States
    loading,
    error,
    
    // Actions
    refreshAllData,
    clearCache,
    invalidateCache,
    fetchCacheStats,
    fetchApiMetrics,
    analyzeDuplicateData
  };
};

export default useDataManagement;