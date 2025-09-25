import { Request } from 'express';
import logger from '../utils/logger.js';
import { MemoryCache } from '../middleware/cache.js';

interface DuplicateAnalysisResult {
  stockCode: string;
  duplicateCount: number;
  lastAccessed: Date;
  timeSpan: string;
  dataConsistency: boolean;
}

interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  memoryUsage: string;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

interface QualityMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  duplicateRate: number;
  cacheEfficiency: number;
}

class DuplicateDataAnalyzer {
  private requestLog: Map<string, { count: number; timestamps: Date[]; responses: any[] }> = new Map();
  private performanceMetrics: { requestTime: number; success: boolean; endpoint: string }[] = [];

  // İstek logunu kaydet
  logRequest(stockCode: string, endpoint: string, response: any, responseTime: number, success: boolean): void {
    const key = `${stockCode}-${endpoint}`;
    const now = new Date();

    if (!this.requestLog.has(key)) {
      this.requestLog.set(key, { count: 0, timestamps: [], responses: [] });
    }

    const log = this.requestLog.get(key)!;
    log.count++;
    log.timestamps.push(now);
    log.responses.push(response);

    // Son 100 kaydı tut
    if (log.timestamps.length > 100) {
      log.timestamps.shift();
      log.responses.shift();
    }

    // Performance metriklerini kaydet
    this.performanceMetrics.push({ requestTime: responseTime, success, endpoint });
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift();
    }
  }

  // Mükerrer veri analizi
  analyzeDuplicates(timeWindowMinutes: number = 60): DuplicateAnalysisResult[] {
    const results: DuplicateAnalysisResult[] = [];
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);

    for (const [key, log] of this.requestLog.entries()) {
      const [stockCode] = key.split('-');
      const recentRequests = log.timestamps.filter(timestamp => timestamp > cutoffTime);
      
      if (recentRequests.length > 1) {
        // Veri tutarlılığını kontrol et
        const recentResponses = log.responses.slice(-recentRequests.length);
        const dataConsistency = this.checkDataConsistency(recentResponses);

        results.push({
          stockCode,
          duplicateCount: recentRequests.length,
          lastAccessed: log.timestamps[log.timestamps.length - 1],
          timeSpan: `${timeWindowMinutes} dakika`,
          dataConsistency
        });
      }
    }

    return results.sort((a, b) => b.duplicateCount - a.duplicateCount);
  }

  // Veri tutarlılığını kontrol et
  private checkDataConsistency(responses: any[]): boolean {
    if (responses.length < 2) return true;

    const firstResponse = JSON.stringify(responses[0]);
    return responses.every(response => JSON.stringify(response) === firstResponse);
  }

  // Cache istatistikleri
  getCacheStats(cache: any): CacheStats {
    const stats = cache.getStats();
    const entries = cache.getAllKeys();
    
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;

    if (entries.length > 0) {
      // Basit timestamp hesaplama
      oldestEntry = new Date(Date.now() - 60 * 60 * 1000); // 1 saat önce
      newestEntry = new Date();
    }

    return {
      totalEntries: stats.size,
      hitRate: stats.hits + stats.misses > 0 ? (stats.hits / (stats.hits + stats.misses) * 100) : 0,
      missRate: stats.hits + stats.misses > 0 ? (stats.misses / (stats.hits + stats.misses) * 100) : 0,
      memoryUsage: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      oldestEntry,
      newestEntry
    };
  }

  // Kalite metrikleri
  getQualityMetrics(): QualityMetrics {
    const totalRequests = this.performanceMetrics.length;
    const successfulRequests = this.performanceMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    
    const averageResponseTime = totalRequests > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.requestTime, 0) / totalRequests
      : 0;

    const duplicateCount = this.analyzeDuplicates(60).reduce((sum, d) => sum + d.duplicateCount, 0);
    const duplicateRate = totalRequests > 0 ? (duplicateCount / totalRequests) * 100 : 0;

    // Cache efficiency hesapla (başarılı isteklerin oranı)
    const cacheEfficiency = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      duplicateRate: Math.round(duplicateRate * 100) / 100,
      cacheEfficiency: Math.round(cacheEfficiency * 100) / 100
    };
  }

  // Veri optimizasyonu önerileri
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const duplicates = this.analyzeDuplicates(60);
    const metrics = this.getQualityMetrics();

    if (duplicates.length > 10) {
      suggestions.push('Yüksek mükerrer veri tespit edildi. Cache sürelerini artırın.');
    }

    if (metrics.averageResponseTime > 2000) {
      suggestions.push('Yavaş yanıt süreleri tespit edildi. API optimizasyonu gerekli.');
    }

    if (metrics.failedRequests > metrics.totalRequests * 0.1) {
      suggestions.push('Yüksek hata oranı tespit edildi. Hata yönetimini gözden geçirin.');
    }

    if (metrics.cacheEfficiency < 80) {
      suggestions.push('Cache verimliliği düşük. Cache stratejisini gözden geçirin.');
    }

    return suggestions;
  }

  // Temizlik işlemleri
  cleanup(olderThanHours: number = 24): { removedEntries: number; freedMemory: string } {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let removedEntries = 0;
    const initialMemory = process.memoryUsage().heapUsed;

    // Eski request loglarını temizle
    for (const [key, log] of this.requestLog.entries()) {
      log.timestamps = log.timestamps.filter(timestamp => timestamp > cutoffTime);
      log.responses = log.responses.slice(-log.timestamps.length);
      
      if (log.timestamps.length === 0) {
        this.requestLog.delete(key);
        removedEntries++;
      }
    }

    // Eski performance metriklerini temizle
    const oldMetricsCount = this.performanceMetrics.length;
    this.performanceMetrics = this.performanceMetrics.slice(-500); // Son 500 kaydı tut
    removedEntries += oldMetricsCount - this.performanceMetrics.length;

    const finalMemory = process.memoryUsage().heapUsed;
    const freedMemory = `${((initialMemory - finalMemory) / 1024 / 1024).toFixed(2)} MB`;

    return { removedEntries, freedMemory };
  }
}

// Singleton instance
export const duplicateAnalyzer = new DuplicateDataAnalyzer();
export { DuplicateDataAnalyzer, DuplicateAnalysisResult, CacheStats, QualityMetrics };