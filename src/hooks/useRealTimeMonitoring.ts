import { useState, useEffect, useCallback, useRef } from 'react';

interface AlertRule {
  id: string;
  name: string;
  type: 'cache_hit_rate' | 'api_response_time' | 'error_rate' | 'duplicate_data' | 'memory_usage';
  threshold: number;
  operator: 'greater_than' | 'less_than' | 'equals';
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  value: number;
  threshold: number;
}

interface SystemMetrics {
  cacheHitRate: number;
  apiResponseTime: number;
  errorRate: number;
  duplicateDataCount: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerMinute: number;
  lastUpdated: Date;
}

interface MonitoringConfig {
  updateInterval: number; // milliseconds
  maxAlerts: number;
  autoAcknowledgeAfter: number; // minutes
  enableNotifications: boolean;
  enableSounds: boolean;
}

export const useRealTimeMonitoring = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'Düşük Cache Hit Rate',
      type: 'cache_hit_rate',
      threshold: 80,
      operator: 'less_than',
      enabled: true,
      severity: 'medium',
      description: 'Cache hit rate %80\'in altına düştüğünde uyarı ver'
    },
    {
      id: '2',
      name: 'Yüksek API Yanıt Süresi',
      type: 'api_response_time',
      threshold: 2000,
      operator: 'greater_than',
      enabled: true,
      severity: 'high',
      description: 'API yanıt süresi 2 saniyeyi geçtiğinde uyarı ver'
    },
    {
      id: '3',
      name: 'Yüksek Hata Oranı',
      type: 'error_rate',
      threshold: 5,
      operator: 'greater_than',
      enabled: true,
      severity: 'critical',
      description: 'Hata oranı %5\'i geçtiğinde uyarı ver'
    },
    {
      id: '4',
      name: 'Çok Fazla Mükerrer Veri',
      type: 'duplicate_data',
      threshold: 100,
      operator: 'greater_than',
      enabled: true,
      severity: 'medium',
      description: 'Mükerrer veri sayısı 100\'ü geçtiğinde uyarı ver'
    },
    {
      id: '5',
      name: 'Yüksek Bellek Kullanımı',
      type: 'memory_usage',
      threshold: 85,
      operator: 'greater_than',
      enabled: true,
      severity: 'high',
      description: 'Bellek kullanımı %85\'i geçtiğinde uyarı ver'
    }
  ]);
  
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cacheHitRate: 85,
    apiResponseTime: 1200,
    errorRate: 2.5,
    duplicateDataCount: 45,
    memoryUsage: 72,
    activeConnections: 150,
    requestsPerMinute: 320,
    lastUpdated: new Date()
  });
  
  const [config, setConfig] = useState<MonitoringConfig>({
    updateInterval: 30000, // 30 seconds
    maxAlerts: 100,
    autoAcknowledgeAfter: 60, // 60 minutes
    enableNotifications: true,
    enableSounds: true
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Sistem metriklerini simüle et
  const generateMockMetrics = useCallback((): SystemMetrics => {
    const baseMetrics = systemMetrics;
    return {
      cacheHitRate: Math.max(0, Math.min(100, baseMetrics.cacheHitRate + (Math.random() - 0.5) * 10)),
      apiResponseTime: Math.max(100, baseMetrics.apiResponseTime + (Math.random() - 0.5) * 500),
      errorRate: Math.max(0, Math.min(100, baseMetrics.errorRate + (Math.random() - 0.5) * 2)),
      duplicateDataCount: Math.max(0, baseMetrics.duplicateDataCount + Math.floor((Math.random() - 0.5) * 20)),
      memoryUsage: Math.max(0, Math.min(100, baseMetrics.memoryUsage + (Math.random() - 0.5) * 5)),
      activeConnections: Math.max(0, baseMetrics.activeConnections + Math.floor((Math.random() - 0.5) * 50)),
      requestsPerMinute: Math.max(0, baseMetrics.requestsPerMinute + Math.floor((Math.random() - 0.5) * 100)),
      lastUpdated: new Date()
    };
  }, [systemMetrics]);
  
  // Alert kurallarını kontrol et
  const checkAlertRules = useCallback((metrics: SystemMetrics) => {
    const newAlerts: Alert[] = [];
    
    alertRules.forEach(rule => {
      if (!rule.enabled) return;
      
      let value: number;
      switch (rule.type) {
        case 'cache_hit_rate':
          value = metrics.cacheHitRate;
          break;
        case 'api_response_time':
          value = metrics.apiResponseTime;
          break;
        case 'error_rate':
          value = metrics.errorRate;
          break;
        case 'duplicate_data':
          value = metrics.duplicateDataCount;
          break;
        case 'memory_usage':
          value = metrics.memoryUsage;
          break;
        default:
          return;
      }
      
      let shouldAlert = false;
      switch (rule.operator) {
        case 'greater_than':
          shouldAlert = value > rule.threshold;
          break;
        case 'less_than':
          shouldAlert = value < rule.threshold;
          break;
        case 'equals':
          shouldAlert = value === rule.threshold;
          break;
      }
      
      if (shouldAlert) {
        // Aynı kural için son 5 dakikada alert oluşturulmuş mu kontrol et
        const recentAlert = alerts.find(alert => 
          alert.ruleId === rule.id && 
          Date.now() - alert.timestamp.getTime() < 5 * 60 * 1000
        );
        
        if (!recentAlert) {
          const alert: Alert = {
            id: `alert_${Date.now()}_${rule.id}`,
            ruleId: rule.id,
            ruleName: rule.name,
            message: `${rule.name}: ${value.toFixed(1)} (Eşik: ${rule.threshold})`,
            severity: rule.severity,
            timestamp: new Date(),
            acknowledged: false,
            value,
            threshold: rule.threshold
          };
          
          newAlerts.push(alert);
        }
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => {
        const updated = [...newAlerts, ...prev].slice(0, config.maxAlerts);
        
        // Ses uyarısı çal
        if (config.enableSounds && alertSoundRef.current) {
          alertSoundRef.current.play().catch(() => {});
        }
        
        // Browser notification
        if (config.enableNotifications && 'Notification' in window && Notification.permission === 'granted') {
          newAlerts.forEach(alert => {
            new Notification(`Sistem Uyarısı: ${alert.ruleName}`, {
              body: alert.message,
              icon: '/favicon.ico'
            });
          });
        }
        
        return updated;
      });
    }
  }, [alertRules, alerts, config]);
  
  // Monitoring başlat/durdur
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    
    setIsMonitoring(true);
    intervalRef.current = setInterval(() => {
      const newMetrics = generateMockMetrics();
      setSystemMetrics(newMetrics);
      checkAlertRules(newMetrics);
    }, config.updateInterval);
  }, [generateMockMetrics, checkAlertRules, config.updateInterval]);
  
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
  }, []);
  
  // Alert işlemleri
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  }, []);
  
  const acknowledgeAllAlerts = useCallback(() => {
    setAlerts(prev => prev.map(alert => ({ ...alert, acknowledged: true })));
  }, []);
  
  const clearAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);
  
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);
  
  // Alert kuralı işlemleri
  const addAlertRule = useCallback((rule: Omit<AlertRule, 'id'>) => {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}`
    };
    setAlertRules(prev => [...prev, newRule]);
  }, []);
  
  const updateAlertRule = useCallback((ruleId: string, updates: Partial<AlertRule>) => {
    setAlertRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  }, []);
  
  const deleteAlertRule = useCallback((ruleId: string) => {
    setAlertRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);
  
  // Konfigürasyon güncelleme
  const updateConfig = useCallback((updates: Partial<MonitoringConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    
    // Interval değişirse monitoring'i yeniden başlat
    if (updates.updateInterval && isMonitoring) {
      stopMonitoring();
      setTimeout(startMonitoring, 100);
    }
  }, [isMonitoring, startMonitoring, stopMonitoring]);
  
  // Notification izni iste
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);
  
  // Otomatik acknowledge
  useEffect(() => {
    const autoAcknowledgeInterval = setInterval(() => {
      const cutoffTime = Date.now() - config.autoAcknowledgeAfter * 60 * 1000;
      setAlerts(prev => prev.map(alert => 
        !alert.acknowledged && alert.timestamp.getTime() < cutoffTime
          ? { ...alert, acknowledged: true }
          : alert
      ));
    }, 60000); // Her dakika kontrol et
    
    return () => clearInterval(autoAcknowledgeInterval);
  }, [config.autoAcknowledgeAfter]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  // Alert ses dosyası oluştur
  useEffect(() => {
    // Basit bir beep sesi oluştur
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    // Audio element oluştur (gerçek uygulamada ses dosyası kullanılabilir)
    alertSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
  }, []);
  
  // İstatistikler
  const alertStats = {
    total: alerts.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length
  };
  
  return {
    // State
    alerts,
    alertRules,
    systemMetrics,
    config,
    isMonitoring,
    alertStats,
    
    // Actions
    startMonitoring,
    stopMonitoring,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    clearAlert,
    clearAllAlerts,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    updateConfig,
    requestNotificationPermission
  };
};

export type { Alert, AlertRule, SystemMetrics, MonitoringConfig };