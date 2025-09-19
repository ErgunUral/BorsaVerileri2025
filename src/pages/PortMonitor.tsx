import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface PortConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  timeout: number;
  retryCount: number;
  retryDelay: number;
  enabled: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface PortCheckResult {
  id: string;
  portConfigId: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'timeout' | 'error';
  responseTime?: number;
  error?: string;
  timestamp: string;
}

interface PortStatus {
  config: PortConfig;
  lastResult: PortCheckResult | null;
  isScheduled: boolean;
}

interface SystemStats {
  totalPorts: number;
  onlinePorts: number;
  offlinePorts: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  uptime: number;
}

const PortMonitor: React.FC = () => {
  const [ports, setPorts] = useState<PortStatus[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  // Modal and selection states removed for now

  // Port durumlarını yükle
  const loadPortStatuses = async () => {
    try {
      const response = await fetch('/api/port-monitor/status');
      const data = await response.json();
      
      if (data.success) {
        setPorts(data.data.ports);
        setSystemStats(data.data.systemStats);
      } else {
        toast.error('Port durumları yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading port statuses:', error);
      toast.error('Bağlantı hatası');
    }
  };

  // Scheduler durumunu yükle
  const loadSchedulerStatus = async () => {
    try {
      const response = await fetch('/api/port-monitor/scheduler/status');
      const data = await response.json();
      
      if (data.success) {
        setSchedulerRunning(data.data.isRunning);
      }
    } catch (error) {
      console.error('Error loading scheduler status:', error);
    }
  };

  // Manuel port kontrolü
  const checkPort = async (portId: string) => {
    try {
      const response = await fetch(`/api/port-monitor/check/${portId}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Port kontrolü tamamlandı');
        await loadPortStatuses();
      } else {
        toast.error('Port kontrolü başarısız');
      }
    } catch (error) {
      console.error('Error checking port:', error);
      toast.error('Kontrol hatası');
    }
  };

  // Scheduler başlat/durdur
  const toggleScheduler = async () => {
    try {
      const endpoint = schedulerRunning ? 'stop' : 'start';
      const response = await fetch(`/api/port-monitor/scheduler/${endpoint}`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        setSchedulerRunning(!schedulerRunning);
        toast.success(`Scheduler ${schedulerRunning ? 'durduruldu' : 'başlatıldı'}`);
      } else {
        toast.error('Scheduler işlemi başarısız');
      }
    } catch (error) {
      console.error('Error toggling scheduler:', error);
      toast.error('Scheduler hatası');
    }
  };

  // Port sil
  const deletePort = async (portId: string) => {
    if (!confirm('Bu port konfigürasyonunu silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/port-monitor/configs/${portId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success('Port konfigürasyonu silindi');
        await loadPortStatuses();
      } else {
        toast.error('Silme işlemi başarısız');
      }
    } catch (error) {
      console.error('Error deleting port:', error);
      toast.error('Silme hatası');
    }
  };

  // Durum rengini al
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'offline':
        return 'text-red-600 bg-red-100';
      case 'timeout':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Durum ikonu al
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4" />;
      case 'offline':
        return <XCircle className="w-4 h-4" />;
      case 'timeout':
        return <Clock className="w-4 h-4" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Response time formatla
  const formatResponseTime = (time?: number) => {
    if (!time) return 'N/A';
    return `${time.toFixed(0)}ms`;
  };

  // Uptime formatla
  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`;
  };

  // Zaman formatla
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('tr-TR');
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        loadPortStatuses(),
        loadSchedulerStatus()
      ]);
      setLoading(false);
    };

    initialize();

    // Otomatik yenileme
    const interval = setInterval(() => {
      loadPortStatuses();
      loadSchedulerStatus();
    }, 30000); // 30 saniyede bir

    // Auto refresh interval set

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Port Monitor</h1>
              <p className="text-gray-600 mt-1">Port durumlarını izleyin ve yönetin</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  loadPortStatuses();
                  loadSchedulerStatus();
                }}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </button>
              <button
                onClick={toggleScheduler}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  schedulerRunning
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {schedulerRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Scheduler Durdur
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Scheduler Başlat
                  </>
                )}
              </button>
              <button
                onClick={() => console.log('Port ekle modal açılacak')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Port Ekle
              </button>
            </div>
          </div>
        </div>

        {/* Sistem İstatistikleri */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Toplam Port</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalPorts}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Çevrimiçi</p>
                  <p className="text-2xl font-bold text-green-600">{systemStats.onlinePorts}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Çevrimdışı</p>
                  <p className="text-2xl font-bold text-red-600">{systemStats.offlinePorts}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Uptime</p>
                  <p className="text-2xl font-bold text-blue-600">{formatUptime(systemStats.uptime)}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>
        )}

        {/* Scheduler Durumu */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                schedulerRunning ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Scheduler {schedulerRunning ? 'Çalışıyor' : 'Durduruldu'}
                </h3>
                <p className="text-sm text-gray-600">
                  {schedulerRunning 
                    ? 'Otomatik port kontrolleri aktif' 
                    : 'Otomatik port kontrolleri pasif'
                  }
                </p>
              </div>
            </div>
            {systemStats && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Ortalama Yanıt Süresi</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatResponseTime(systemStats.averageResponseTime)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Port Listesi */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Port Durumları</h2>
          </div>
          
          {ports.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz port eklenmemiş</h3>
              <p className="text-gray-600 mb-6">İzlemek istediğiniz portları ekleyerek başlayın</p>
              <button
                onClick={() => console.log('İlk port ekle modal açılacak')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                İlk Portu Ekle
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Port
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Yanıt Süresi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Son Kontrol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Zamanlama
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {ports.map((portStatus) => (
                    <tr key={portStatus.config.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {portStatus.config.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {portStatus.config.host}:{portStatus.config.port}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {portStatus.lastResult ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusColor(portStatus.lastResult.status)
                          }`}>
                            {getStatusIcon(portStatus.lastResult.status)}
                            <span className="ml-1 capitalize">{portStatus.lastResult.status}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600 bg-gray-100">
                            <Activity className="w-4 h-4" />
                            <span className="ml-1">Bilinmiyor</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatResponseTime(portStatus.lastResult?.responseTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {portStatus.lastResult 
                          ? formatTime(portStatus.lastResult.timestamp)
                          : 'Henüz kontrol edilmedi'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          portStatus.isScheduled 
                            ? 'text-green-600 bg-green-100'
                            : 'text-gray-600 bg-gray-100'
                        }`}>
                          {portStatus.isScheduled ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => checkPort(portStatus.config.id)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="Manuel Kontrol"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => console.log('Port detayları:', portStatus.config.id)}
                            className="text-gray-600 hover:text-gray-900 p-1 rounded"
                            title="Detayları Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {/* TODO: Edit modal */}}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded"
                            title="Düzenle"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deletePort(portStatus.config.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortMonitor;