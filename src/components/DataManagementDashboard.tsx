import React, { useState, useMemo } from 'react';
import {
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings,
  Download,
  Upload,
  Trash2,
  Search,
  Filter,
  Clock,
  Activity,
  Server,
  HardDrive,
  Cpu,
  MemoryStick
} from 'lucide-react';
import { useDataManagement } from '../hooks/useDataManagement';
import { useSystemMonitoring } from '../hooks/useSystemMonitoring';
import { toast } from 'sonner';
import RealTimeMonitoring from './RealTimeMonitoring';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

const DataManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'cache' | 'duplicates' | 'monitoring' | 'settings'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Hooks
  const {
    cacheStats,
    apiMetrics,
    duplicateData,
    dataQuality,
    loading: dataLoading,
    error: dataError,
    refreshAllData,
    clearCache,
    invalidateCache
  } = useDataManagement();

  const {
    systemHealth,
    performanceMetrics,
    alerts,
    systemStatus,
    activeAlerts,
    loading: systemLoading,
    monitorSystem,
    resolveAlert,
    clearAlerts
  } = useSystemMonitoring();

  // Tab konfigürasyonu
  const tabs: TabProps[] = [
    {
      id: 'overview',
      label: 'Genel Bakış',
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      id: 'cache',
      label: 'Cache Yönetimi',
      icon: <Database className="w-4 h-4" />,
      count: cacheStats?.totalKeys || 0
    },
    {
      id: 'duplicates',
      label: 'Mükerrer Veriler',
      icon: <AlertTriangle className="w-4 h-4" />,
      count: duplicateData.length
    },
    {
      id: 'monitoring',
      label: 'Sistem İzleme',
      icon: <Activity className="w-4 h-4" />,
      count: activeAlerts.length
    },
    {
      id: 'settings',
      label: 'Ayarlar',
      icon: <Settings className="w-4 h-4" />
    }
  ];

  // Filtrelenmiş mükerrer veriler
  const filteredDuplicates = useMemo(() => {
    return duplicateData.filter(item => {
      const matchesSearch = item.key.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'high' && item.count > 5) ||
        (filterType === 'medium' && item.count > 2 && item.count <= 5) ||
        (filterType === 'low' && item.count <= 2);
      return matchesSearch && matchesFilter;
    });
  }, [duplicateData, searchTerm, filterType]);

  // Sistem durumu rengi
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'degraded': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Cache temizleme işlemi
  const handleClearCache = async () => {
    try {
      await clearCache();
      toast.success('Cache başarıyla temizlendi');
    } catch (error) {
      toast.error('Cache temizlenirken hata oluştu');
    }
  };

  // Mükerrer veri temizleme
  const handleClearDuplicates = async (pattern: string) => {
    try {
      await invalidateCache(pattern);
      toast.success(`${pattern} pattern'i için mükerrer veriler temizlendi`);
    } catch (error) {
      toast.error('Mükerrer veriler temizlenirken hata oluştu');
    }
  };

  // Veri yenileme
  const handleRefresh = async () => {
    try {
      await Promise.all([refreshAllData(), monitorSystem()]);
      toast.success('Veriler başarıyla yenilendi');
    } catch (error) {
      toast.error('Veriler yenilenirken hata oluştu');
    }
  };

  // Genel Bakış Tab'ı
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Sistem Durumu Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sistem Durumu</p>
              <p className={`text-lg font-semibold px-2 py-1 rounded-full text-xs ${getStatusColor(systemStatus.status)}`}>
                {systemStatus.message}
              </p>
            </div>
            <Server className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cache Boyutu</p>
              <p className="text-2xl font-bold text-gray-900">{cacheStats?.totalKeys || 0}</p>
            </div>
            <Database className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mükerrer Veriler</p>
              <p className="text-2xl font-bold text-gray-900">{duplicateData.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aktif Uyarılar</p>
              <p className="text-2xl font-bold text-gray-900">{activeAlerts.length}</p>
            </div>
            <Activity className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Veri Kalitesi Metrikleri */}
      {dataQuality && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Veri Kalitesi Metrikleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{dataQuality.totalEndpoints}</p>
              <p className="text-sm text-gray-600">Toplam Endpoint</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{dataQuality.errorRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">Hata Oranı</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{dataQuality.cacheHitRate}%</p>
              <p className="text-sm text-gray-600">Cache Hit Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{dataQuality.duplicateDataCount}</p>
              <p className="text-sm text-gray-600">Mükerrer Veri</p>
            </div>
          </div>
        </div>
      )}

      {/* Performans Metrikleri */}
      {performanceMetrics && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performans Metrikleri</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-lg font-semibold">{performanceMetrics.responseTime.toFixed(0)}ms</p>
                <p className="text-sm text-gray-600">Ortalama Yanıt Süresi</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Cpu className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-lg font-semibold">{performanceMetrics.cpuUsage.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">CPU Kullanımı</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <MemoryStick className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-lg font-semibold">{performanceMetrics.memoryUsage.toFixed(1)}%</p>
                <p className="text-sm text-gray-600">Bellek Kullanımı</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Cache Yönetimi Tab'ı
  const renderCacheTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Cache Yönetimi</h3>
        <button
          onClick={handleClearCache}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Tüm Cache'i Temizle</span>
        </button>
      </div>

      {cacheStats && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Cache İstatistikleri</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Toplam Anahtar</p>
              <p className="text-2xl font-bold text-blue-600">{cacheStats.totalKeys}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Cache Boyutu</p>
              <p className="text-2xl font-bold text-green-600">{cacheStats.cacheSize}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Son Güncelleme</p>
              <p className="text-sm text-gray-900">{new Date(cacheStats.timestamp).toLocaleString('tr-TR')}</p>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-900 mb-2">Cache Anahtarları</h5>
            <div className="max-h-64 overflow-y-auto">
              {cacheStats.keys.map((key, index) => (
                <div key={index} className="flex justify-between items-center py-2 px-3 border-b border-gray-100">
                  <span className="text-sm text-gray-700 font-mono">{key}</span>
                  <button
                    onClick={() => handleClearDuplicates(key.split('/')[2] || key)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Mükerrer Veriler Tab'ı
  const renderDuplicatesTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Mükerrer Veri Analizi</h3>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Anahtar ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Seviyeler</option>
            <option value="high">Yüksek (5+)</option>
            <option value="medium">Orta (2-5)</option>
            <option value="low">Düşük (1-2)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anahtar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tekrar Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tahmini Boyut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Son Erişim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDuplicates.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {item.key}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      item.count > 5 ? 'bg-red-100 text-red-800' :
                      item.count > 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(item.dataSize / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.lastAccessed).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleClearDuplicates(item.key)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Temizle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredDuplicates.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-sm text-gray-600">Mükerrer veri bulunamadı</p>
          </div>
        )}
      </div>
    </div>
  );

  // Sistem İzleme Tab'ı
  const renderMonitoringTab = () => (
    <RealTimeMonitoring />
  );

  // Ayarlar Tab'ı
  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Ayarlar</h3>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Veri Yönetimi Ayarları</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Otomatik Cache Temizleme</p>
              <p className="text-sm text-gray-600">Belirli aralıklarla cache'i otomatik temizle</p>
            </div>
            <input type="checkbox" className="toggle" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Mükerrer Veri Uyarıları</p>
              <p className="text-sm text-gray-600">Mükerrer veri tespit edildiğinde uyarı gönder</p>
            </div>
            <input type="checkbox" className="toggle" defaultChecked />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Real-time Monitoring</p>
              <p className="text-sm text-gray-600">Sistem durumunu gerçek zamanlı izle</p>
            </div>
            <input type="checkbox" className="toggle" defaultChecked />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Veri Export/Import</h4>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="w-4 h-4" />
            <span>Verileri Export Et</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Upload className="w-4 h-4" />
            <span>Verileri Import Et</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'cache': return renderCacheTab();
      case 'duplicates': return renderDuplicatesTab();
      case 'monitoring': return renderMonitoringTab();
      case 'settings': return renderSettingsTab();
      default: return renderOverviewTab();
    }
  };

  // Sadece gerçek hata durumunda error ekranını göster
  if (dataError && !dataLoading && !systemLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <p className="mt-2 text-lg font-semibold text-gray-900">Veri Yükleme Hatası</p>
          <p className="text-sm text-gray-600">{dataError}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Veri Yönetimi Dashboard</h1>
                <p className="text-sm text-gray-600">Sistem verilerini izleyin ve yönetin</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${getStatusColor(systemStatus.status)}`}>
                <div className="w-2 h-2 rounded-full bg-current"></div>
                <span>{systemStatus.message}</span>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={dataLoading || systemLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${(dataLoading || systemLoading) ? 'animate-spin' : ''}`} />
                <span>Yenile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DataManagementDashboard;