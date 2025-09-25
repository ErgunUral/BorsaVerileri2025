import { useState, useEffect, useCallback } from 'react';

interface SystemHealth {
  uptime: number;
  message: string;
  timestamp: number;
  environment: string;
  version: string;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeConnections: number;
  cpuUsage: number;
  memoryUsage: number;
}

interface AlertConfig {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  lastTriggered?: string;
}

interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export const useSystemMonitoring = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<AlertConfig[]>([
    {
      id: '1',
      name: 'Yüksek Hata Oranı',
      condition: 'errorRate > threshold',
      threshold: 5,
      enabled: true
    },
    {
      id: '2',
      name: 'Yavaş Yanıt Süresi',
      condition: 'responseTime > threshold',
      threshold: 2000,
      enabled: true
    },
    {
      id: '3',
      name: 'Yüksek Bellek Kullanımı',
      condition: 'memoryUsage > threshold',
      threshold: 80,
      enabled: true
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sistem sağlığını kontrol et
  const checkSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error('Sistem sağlık kontrolü başarısız');
      }
      const health = await response.json();
      setSystemHealth(health);
      return health;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sistem sağlık kontrolü hatası');
      return null;
    }
  }, []);

  // Performans metriklerini getir
  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/metrics');
      if (!response.ok) {
        throw new Error('Performans metrikleri alınamadı');
      }
      const metrics = await response.json();
      
      // Simulated performance data (gerçek implementasyonda backend'den gelecek)
      const performanceData: PerformanceMetrics = {
        responseTime: Math.random() * 1000 + 200,
        throughput: Math.random() * 100 + 50,
        errorRate: Math.random() * 10,
        activeConnections: Math.floor(Math.random() * 50) + 10,
        cpuUsage: Math.random() * 100,
        memoryUsage: systemHealth ? 
          (systemHealth.memory.heapUsed / systemHealth.memory.heapTotal) * 100 : 
          Math.random() * 100
      };
      
      setPerformanceMetrics(performanceData);
      return performanceData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Performans metrikleri hatası');
      return null;
    }
  }, [systemHealth]);

  // Alert kontrolü
  const checkAlerts = useCallback((metrics: PerformanceMetrics) => {
    const newAlerts: SystemAlert[] = [];
    
    alertConfigs.forEach(config => {
      if (!config.enabled) return;
      
      let shouldAlert = false;
      let alertMessage = '';
      
      switch (config.condition) {
        case 'errorRate > threshold':
          if (metrics.errorRate > config.threshold) {
            shouldAlert = true;
            alertMessage = `Hata oranı %${metrics.errorRate.toFixed(1)} (Eşik: %${config.threshold})`;
          }
          break;
        case 'responseTime > threshold':
          if (metrics.responseTime > config.threshold) {
            shouldAlert = true;
            alertMessage = `Yanıt süresi ${metrics.responseTime.toFixed(0)}ms (Eşik: ${config.threshold}ms)`;
          }
          break;
        case 'memoryUsage > threshold':
          if (metrics.memoryUsage > config.threshold) {
            shouldAlert = true;
            alertMessage = `Bellek kullanımı %${metrics.memoryUsage.toFixed(1)} (Eşik: %${config.threshold})`;
          }
          break;
      }
      
      if (shouldAlert) {
        newAlerts.push({
          id: `${config.id}-${Date.now()}`,
          type: metrics.errorRate > 10 ? 'error' : 'warning',
          message: `${config.name}: ${alertMessage}`,
          timestamp: new Date().toISOString(),
          resolved: false
        });
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Son 50 alert'i tut
    }
  }, [alertConfigs]);

  // Alert'i çözümlenmiş olarak işaretle
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true }
          : alert
      )
    );
  }, []);

  // Tüm alert'leri temizle
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Alert konfigürasyonunu güncelle
  const updateAlertConfig = useCallback((configId: string, updates: Partial<AlertConfig>) => {
    setAlertConfigs(prev => 
      prev.map(config => 
        config.id === configId 
          ? { ...config, ...updates }
          : config
      )
    );
  }, []);

  // Sistem durumunu kontrol et ve alert'leri değerlendir
  const monitorSystem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [health, metrics] = await Promise.all([
        checkSystemHealth(),
        fetchPerformanceMetrics()
      ]);
      
      if (metrics) {
        checkAlerts(metrics);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sistem monitoring hatası');
    } finally {
      setLoading(false);
    }
  }, [checkSystemHealth, fetchPerformanceMetrics, checkAlerts]);

  // Sistem durumu özeti
  const getSystemStatus = useCallback(() => {
    if (!systemHealth || !performanceMetrics) {
      return { status: 'unknown', message: 'Veri yükleniyor...' };
    }
    
    const activeAlerts = alerts.filter(alert => !alert.resolved);
    const criticalAlerts = activeAlerts.filter(alert => alert.type === 'error');
    
    if (criticalAlerts.length > 0) {
      return { status: 'critical', message: `${criticalAlerts.length} kritik uyarı` };
    }
    
    if (activeAlerts.length > 0) {
      return { status: 'warning', message: `${activeAlerts.length} uyarı` };
    }
    
    if (performanceMetrics.errorRate < 1 && performanceMetrics.responseTime < 1000) {
      return { status: 'healthy', message: 'Sistem normal çalışıyor' };
    }
    
    return { status: 'degraded', message: 'Sistem yavaş çalışıyor' };
  }, [systemHealth, performanceMetrics, alerts]);

  // Component mount olduğunda monitoring başlat
  useEffect(() => {
    monitorSystem();
  }, [monitorSystem]);

  // Auto-refresh her 15 saniyede bir
  useEffect(() => {
    const interval = setInterval(() => {
      monitorSystem();
    }, 15000);

    return () => clearInterval(interval);
  }, [monitorSystem]);

  return {
    // Data
    systemHealth,
    performanceMetrics,
    alerts: alerts.slice(0, 20), // Son 20 alert
    alertConfigs,
    
    // States
    loading,
    error,
    
    // Computed
    systemStatus: getSystemStatus(),
    activeAlerts: alerts.filter(alert => !alert.resolved),
    
    // Actions
    monitorSystem,
    resolveAlert,
    clearAlerts,
    updateAlertConfig,
    checkSystemHealth,
    fetchPerformanceMetrics
  };
};

export default useSystemMonitoring;