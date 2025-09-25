import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  RefreshCw,
  Server,
  TrendingUp,
  Wifi,
  XCircle,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

interface SystemStatus {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  lastCheck: string;
  responseTime: number;
}

interface ServiceHealth {
  name: string;
  status: SystemStatus;
  endpoint: string;
  description: string;
}

interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  debugCount: number;
  lastLogTime: string;
  logsByHour: Record<string, number>;
  errorsByService: Record<string, number>;
  performanceMetrics: {
    avgResponseTime: number;
    slowQueries: number;
    failedRequests: number;
  };
}

interface CacheMetrics {
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
  memoryUsage: number;
}

interface PollingStatus {
  isRunning: boolean;
  targets: number;
  successRate: number;
  lastPoll: string;
  nextPoll: string;
  totalPolls: number;
  errors: number;
}

const SystemMonitoring: React.FC = () => {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [logMetrics, setLogMetrics] = useState<LogMetrics | null>(null);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [websocketStats, setWebsocketStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      
      if (data.success) {
        const healthData: ServiceHealth[] = [
          {
            name: 'API Server',
            status: {
              status: data.data.status === 'healthy' ? 'healthy' : 'error',
              uptime: data.data.uptime || 0,
              lastCheck: new Date().toISOString(),
              responseTime: data.data.responseTime || 0
            },
            endpoint: '/api/health',
            description: 'Main API server health'
          },
          {
            name: 'Database',
            status: {
              status: data.data.database?.connected ? 'healthy' : 'error',
              uptime: data.data.database?.uptime || 0,
              lastCheck: new Date().toISOString(),
              responseTime: data.data.database?.responseTime || 0
            },
            endpoint: '/api/health',
            description: 'Database connectivity'
          },
          {
            name: 'Cache System',
            status: {
              status: data.data.cache?.status === 'healthy' ? 'healthy' : 'warning',
              uptime: data.data.cache?.uptime || 0,
              lastCheck: new Date().toISOString(),
              responseTime: data.data.cache?.responseTime || 0
            },
            endpoint: '/api/cache/health',
            description: 'Cache system performance'
          }
        ];
        setServices(healthData);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  const fetchLogMetrics = async () => {
    try {
      const response = await fetch('/api/logging/metrics');
      const data = await response.json();
      
      if (data.success) {
        setLogMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch log metrics:', error);
    }
  };

  const fetchCacheMetrics = async () => {
    try {
      const response = await fetch('/api/cache/stats');
      const data = await response.json();
      
      if (data.success) {
        setCacheMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cache metrics:', error);
    }
  };

  const fetchPollingStatus = async () => {
    try {
      const response = await fetch('/api/polling/status');
      const data = await response.json();
      
      if (data.success) {
        setPollingStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch polling status:', error);
    }
  };

  const fetchWebSocketStats = async () => {
    try {
      const response = await fetch('/api/websocket/stats');
      const data = await response.json();
      if (data.success) {
        setWebsocketStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch WebSocket stats:', error);
    }
  };

  const refreshAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchSystemHealth(),
      fetchLogMetrics(),
      fetchCacheMetrics(),
      fetchPollingStatus(),
      fetchWebSocketStats()
    ]);
    setLastUpdate(new Date().toLocaleTimeString());
    setIsLoading(false);
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(refreshAllData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const prepareLogChartData = () => {
    if (!logMetrics?.logsByHour) return [];
    
    return Object.entries(logMetrics.logsByHour)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24) // Last 24 hours
      .map(([hour, count]) => ({
        time: new Date(hour + ':00:00').toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        logs: count
      }));
  };

  const prepareErrorsByServiceData = () => {
    if (!logMetrics?.errorsByService) return [];
    
    return Object.entries(logMetrics.errorsByService)
      .map(([service, errors]) => ({
        service,
        errors
      }))
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 10); // Top 10 services with errors
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistem İzleme</h1>
          <p className="text-gray-600 mt-1">
            Son güncelleme: {lastUpdate || 'Henüz güncellenmedi'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            <Wifi className="h-4 w-4" />
            {autoRefresh ? 'Otomatik Yenileme Açık' : 'Otomatik Yenileme Kapalı'}
          </Button>
          <Button
            onClick={refreshAllData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
                {getStatusIcon(service.status.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge 
                  variant={service.status.status === 'healthy' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {service.status.status.toUpperCase()}
                </Badge>
                <div className="text-xs text-gray-600">
                  <div>Uptime: {formatUptime(service.status.uptime)}</div>
                  <div>Response: {service.status.responseTime}ms</div>
                </div>
              </div>
              <div 
                className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(service.status.status)} rounded-l`}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="logs">Log Analizi</TabsTrigger>
          <TabsTrigger value="performance">Performans</TabsTrigger>
          <TabsTrigger value="polling">Polling Durumu</TabsTrigger>
          <TabsTrigger value="websocket">WebSocket</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Sistem Sağlığı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status.status)}
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-gray-600">{service.description}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div>{service.status.responseTime}ms</div>
                        <div className="text-gray-500">{formatUptime(service.status.uptime)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cache Performance */}
            {cacheMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Cache Performansı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Hit Rate</span>
                      <div className="flex items-center gap-2">
                        <Progress value={cacheMetrics.hitRate} className="w-20" />
                        <span className="text-sm font-medium">{cacheMetrics.hitRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Total Requests</div>
                        <div className="font-medium">{cacheMetrics.totalRequests.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Cache Size</div>
                        <div className="font-medium">{cacheMetrics.cacheSize.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Hits</div>
                        <div className="font-medium text-green-600">{cacheMetrics.totalHits.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Misses</div>
                        <div className="font-medium text-red-600">{cacheMetrics.totalMisses.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Log Metrics */}
            {logMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Log İstatistikleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{logMetrics.totalLogs.toLocaleString()}</div>
                      <div className="text-sm text-blue-800">Toplam Log</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{logMetrics.errorCount.toLocaleString()}</div>
                      <div className="text-sm text-red-800">Hata</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{logMetrics.warningCount.toLocaleString()}</div>
                      <div className="text-sm text-yellow-800">Uyarı</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{logMetrics.infoCount.toLocaleString()}</div>
                      <div className="text-sm text-green-800">Bilgi</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hourly Log Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Saatlik Log Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={prepareLogChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="logs" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Errors by Service */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Servislere Göre Hata Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareErrorsByServiceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="service" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="errors" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          {logMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Ortalama Yanıt Süresi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {logMetrics.performanceMetrics.avgResponseTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Sistem geneli ortalama
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Yavaş Sorgular
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {logMetrics.performanceMetrics.slowQueries}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    &gt;5 saniye süren
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Başarısız İstekler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {logMetrics.performanceMetrics.failedRequests}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    Toplam hata sayısı
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="polling" className="space-y-4">
          {pollingStatus && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Polling Durumu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Durum</span>
                      <Badge variant={pollingStatus.isRunning ? 'default' : 'destructive'}>
                        {pollingStatus.isRunning ? 'Aktif' : 'Durduruldu'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Hedef Sayısı</span>
                      <span className="font-medium">{pollingStatus.targets}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Başarı Oranı</span>
                      <div className="flex items-center gap-2">
                        <Progress value={pollingStatus.successRate} className="w-20" />
                        <span className="text-sm font-medium">{pollingStatus.successRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Toplam Poll</span>
                      <span className="font-medium">{pollingStatus.totalPolls.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Hatalar</span>
                      <span className="font-medium text-red-600">{pollingStatus.errors}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Zamanlama Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600">Son Poll</div>
                      <div className="font-medium">
                        {new Date(pollingStatus.lastPoll).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Sonraki Poll</div>
                      <div className="font-medium">
                        {new Date(pollingStatus.nextPoll).toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-800">
                        Otomatik polling sistemi 30 saniye aralıklarla çalışmaktadır.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="websocket" className="space-y-4">
          {websocketStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    WebSocket Durumu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Server Durumu</span>
                      <Badge variant={websocketStats.isRunning ? 'default' : 'destructive'}>
                        {websocketStats.isRunning ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Aktif Bağlantı</span>
                      <span className="font-medium">{websocketStats.totalClients || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Toplam Abonelik</span>
                      <span className="font-medium">
                        {websocketStats.clients?.reduce((total, client) => 
                          total + client.subscriptions.length, 0) || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Aktif İstemciler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {websocketStats.clients && websocketStats.clients.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {websocketStats.clients.map((client, index) => (
                        <div key={client.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="font-mono text-xs text-gray-600 mb-1">
                            {client.id}
                          </div>
                          <div className="text-sm">
                            <div>Abonelikler: {client.subscriptions.join(', ') || 'Yok'}</div>
                            <div className="text-gray-500 text-xs">
                              Son Ping: {new Date(client.lastPing).toLocaleTimeString('tr-TR')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Aktif istemci bulunmuyor
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemMonitoring;