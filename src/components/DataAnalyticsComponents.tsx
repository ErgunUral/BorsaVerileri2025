import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Calendar,
  Search
} from 'lucide-react';

interface CacheStatsProps {
  totalKeys: number;
  cacheSize: string;
  hitRate: number;
  missRate: number;
  timestamp: string;
  keys: string[];
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

interface APIMetricsProps {
  endpoint: string;
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastAccessed: string;
  cacheHitRate: number;
}

interface DuplicateDataProps {
  key: string;
  count: number;
  dataSize: number;
  lastAccessed: string;
  pattern: string;
}

interface DataQualityProps {
  totalEndpoints: number;
  errorRate: number;
  cacheHitRate: number;
  duplicateDataCount: number;
  dataFreshness: number;
  completenessScore: number;
}

interface PerformanceMetricsProps {
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  throughput: number;
}

// Cache İstatistikleri Bileşeni
export const CacheStatsChart: React.FC<{ stats: CacheStatsProps }> = ({ stats }) => {
  const [selectedMetric, setSelectedMetric] = useState<'hitRate' | 'missRate' | 'both'>('both');
  
  const cacheData = useMemo(() => [
    { name: 'Hit Rate', value: stats.hitRate, color: '#10B981' },
    { name: 'Miss Rate', value: stats.missRate, color: '#EF4444' }
  ], [stats]);

  const filteredData = useMemo(() => {
    if (selectedMetric === 'hitRate') return [cacheData[0]];
    if (selectedMetric === 'missRate') return [cacheData[1]];
    return cacheData;
  }, [cacheData, selectedMetric]);

  const keyDistribution = useMemo(() => {
    const patterns = stats.keys.reduce((acc, key) => {
      const pattern = key.split('/')[1] || 'other';
      acc[pattern] = (acc[pattern] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(patterns).map(([name, value]) => ({ name, value }));
  }, [stats.keys]);

  return (
    <div className="space-y-6">
      {/* Cache Hit/Miss Oranları */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Cache Performansı</h4>
          <div className="flex items-center space-x-4">
            <select 
              value={stats.timeRange || '24h'} 
              onChange={(e) => stats.onTimeRangeChange?.(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="1h">Son 1 Saat</option>
              <option value="24h">Son 24 Saat</option>
              <option value="7d">Son 7 Gün</option>
              <option value="30d">Son 30 Gün</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setSelectedMetric('both')}
            className={`px-3 py-1 rounded-md text-sm ${
              selectedMetric === 'both' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setSelectedMetric('hitRate')}
            className={`px-3 py-1 rounded-md text-sm ${
              selectedMetric === 'hitRate' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Hit Rate
          </button>
          <button
            onClick={() => setSelectedMetric('missRate')}
            className={`px-3 py-1 rounded-md text-sm ${
              selectedMetric === 'missRate' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Miss Rate
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {filteredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Cache Hit Rate</p>
                  <p className="text-2xl font-bold text-green-600">{stats.hitRate}%</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-red-900">Cache Miss Rate</p>
                  <p className="text-2xl font-bold text-red-600">{stats.missRate}%</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Toplam Anahtar</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalKeys}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anahtar Dağılımı */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Cache Anahtar Dağılımı</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={keyDistribution}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// API Metrikleri Bileşeni
export const APIMetricsChart: React.FC<{ metrics: APIMetricsProps[] }> = ({ metrics }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'requests' | 'avgTime' | 'errors'>('requests');
  const responseTimeData = useMemo(() => {
    const data = metrics.map(metric => ({
      endpoint: metric.endpoint.split('/').pop() || metric.endpoint,
      responseTime: metric.averageResponseTime,
      errorRate: metric.errorRate,
      requestCount: metric.requestCount
    }));
    
    // Filtreleme
    const filtered = selectedEndpoint === 'all' ? data : data.filter(item => item.endpoint === selectedEndpoint);
    
    // Sıralama
    return filtered.sort((a, b) => {
      if (sortBy === 'requests') return b.requestCount - a.requestCount;
      if (sortBy === 'avgTime') return b.responseTime - a.responseTime;
      if (sortBy === 'errors') return b.errorRate - a.errorRate;
      return 0;
    });
  }, [metrics, selectedEndpoint, sortBy]);
  
  const endpointOptions = useMemo(() => {
    return ['all', ...metrics.map(m => m.endpoint.split('/').pop() || m.endpoint)];
  }, [metrics]);

  const performanceData = useMemo(() => 
    metrics.map(metric => ({
      endpoint: metric.endpoint.split('/').pop() || metric.endpoint,
      cacheHitRate: metric.cacheHitRate,
      errorRate: metric.errorRate
    })), [metrics]
  );

  return (
    <div className="space-y-6">
      {/* Yanıt Süresi Analizi */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">API Yanıt Süreleri</h4>
          <div className="flex items-center space-x-4">
            <select
              value={selectedEndpoint}
              onChange={(e) => setSelectedEndpoint(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tüm Endpoint'ler</option>
              {endpointOptions.slice(1).map(endpoint => (
                <option key={endpoint} value={endpoint}>{endpoint}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'requests' | 'avgTime' | 'errors')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="requests">İstek Sayısına Göre</option>
              <option value="avgTime">Ortalama Süreye Göre</option>
              <option value="errors">Hata Sayısına Göre</option>
            </select>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={responseTimeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="endpoint" />
            <YAxis />
            <Tooltip formatter={(value, name) => [
              name === 'responseTime' ? `${value}ms` : `${value}%`,
              name === 'responseTime' ? 'Yanıt Süresi' : 
              name === 'errorRate' ? 'Hata Oranı' : 'İstek Sayısı'
            ]} />
            <Legend />
            <Bar dataKey="responseTime" fill="#3B82F6" name="Yanıt Süresi (ms)" />
            <Bar dataKey="errorRate" fill="#EF4444" name="Hata Oranı (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Performans Karşılaştırması */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Cache Hit Rate vs Hata Oranı</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="endpoint" />
            <YAxis />
            <Tooltip formatter={(value) => `${value}%`} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="cacheHitRate" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Cache Hit Rate (%)"
            />
            <Line 
              type="monotone" 
              dataKey="errorRate" 
              stroke="#EF4444" 
              strokeWidth={2}
              name="Hata Oranı (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* API Endpoint Özeti */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">API Endpoint Özeti</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  İstek Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ortalama Yanıt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hata Oranı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cache Hit Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((metric, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metric.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.requestCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metric.averageResponseTime.toFixed(0)}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      metric.errorRate > 5 ? 'bg-red-100 text-red-800' :
                      metric.errorRate > 1 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {metric.errorRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      metric.cacheHitRate > 80 ? 'bg-green-100 text-green-800' :
                      metric.cacheHitRate > 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {metric.cacheHitRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Mükerrer Veri Analizi Bileşeni
export const DuplicateDataChart: React.FC<{ duplicates: DuplicateDataProps[] }> = ({ duplicates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'count' | 'size' | 'lastSeen'>('count');
  const duplicateData = useMemo(() => {
    let data = duplicates.map(dup => ({
      key: dup.key,
      count: dup.count,
      size: dup.dataSize,
      lastSeen: new Date(dup.lastAccessed).toLocaleDateString('tr-TR'),
      severity: dup.count > 10 ? 'high' : dup.count > 5 ? 'medium' : 'low',
      severityText: dup.count > 10 ? 'Yüksek' : dup.count > 5 ? 'Orta' : 'Düşük'
    }));
    
    // Arama filtresi
    if (searchTerm) {
      data = data.filter(item => 
        item.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Önem derecesi filtresi
    if (severityFilter !== 'all') {
      data = data.filter(item => item.severity === severityFilter);
    }
    
    // Sıralama
    data.sort((a, b) => {
      if (sortBy === 'count') return b.count - a.count;
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'lastSeen') return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      return 0;
    });
    
    return data;
  }, [duplicates, searchTerm, severityFilter, sortBy]);

  const severityData = useMemo(() => {
    const severity = duplicates.reduce((acc, item) => {
      const level = item.count > 5 ? 'Yüksek' : item.count > 2 ? 'Orta' : 'Düşük';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(severity).map(([name, value]) => ({ name, value }));
  }, [duplicates]);

  const patternData = useMemo(() => {
    const patterns = duplicates.reduce((acc, item) => {
      acc[item.pattern] = (acc[item.pattern] || 0) + item.count;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(patterns).map(([name, value]) => ({ name, value }));
  }, [duplicates]);

  const timelineData = useMemo(() => {
    const timeline = duplicates.reduce((acc, item) => {
      const date = new Date(item.lastAccessed).toLocaleDateString('tr-TR');
      acc[date] = (acc[date] || 0) + item.count;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(timeline)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [duplicates]);

  const totalWastedSpace = useMemo(() => 
    duplicates.reduce((total, item) => total + (item.dataSize * (item.count - 1)), 0),
    [duplicates]
  );

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Toplam Mükerrer</p>
              <p className="text-2xl font-bold text-gray-900">{duplicates.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">En Yüksek Tekrar</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.max(...duplicates.map(d => d.count), 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Boşa Giden Alan</p>
              <p className="text-2xl font-bold text-gray-900">
                {(totalWastedSpace / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Farklı Pattern</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(duplicates.map(d => d.pattern)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mükerrer Veri Listesi */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Mükerrer Veri Dağılımı</h4>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Anahtar ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">Tüm Önem Dereceleri</option>
              <option value="high">Yüksek</option>
              <option value="medium">Orta</option>
              <option value="low">Düşük</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'count' | 'size' | 'lastSeen')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="count">Sayıya Göre</option>
              <option value="size">Boyuta Göre</option>
              <option value="lastSeen">Son Görülme</option>
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={duplicateData.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="key" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#EF4444" name="Mükerrer Sayısı" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ciddiyet Dağılımı */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Mükerrer Veri Ciddiyet Dağılımı</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={[
                    '#EF4444', // Yüksek - Kırmızı
                    '#F59E0B', // Orta - Sarı
                    '#10B981'  // Düşük - Yeşil
                  ][index % 3]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3">
            {severityData.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    item.name === 'Yüksek' ? 'bg-red-500' :
                    item.name === 'Orta' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <span className="font-medium">{item.name} Seviye</span>
                </div>
                <span className="text-lg font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pattern Analizi */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Pattern Bazlı Mükerrer Veri Analizi</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={patternData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Zaman Bazlı Analiz */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Zaman Bazlı Mükerrer Veri Trendi</h4>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#F59E0B" 
              fill="#FEF3C7" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Veri Kalitesi Bileşeni
export const DataQualityChart: React.FC<{ quality: DataQualityProps }> = ({ quality }) => {
  const qualityMetrics = [
    { name: 'Hata Oranı', value: quality.errorRate, target: 5, color: '#EF4444' },
    { name: 'Cache Hit Rate', value: quality.cacheHitRate, target: 80, color: '#10B981' },
    { name: 'Veri Tazeliği', value: quality.dataFreshness, target: 90, color: '#3B82F6' },
    { name: 'Bütünlük Skoru', value: quality.completenessScore, target: 95, color: '#8B5CF6' }
  ];

  return (
    <div className="space-y-6">
      {/* Kalite Skorları */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Veri Kalitesi Metrikleri</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {qualityMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                <span className="text-sm text-gray-500">Hedef: {metric.target}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(metric.value, 100)}%`,
                    backgroundColor: metric.color
                  }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold" style={{ color: metric.color }}>
                  {metric.value.toFixed(1)}%
                </span>
                {metric.value >= metric.target ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kalite Özeti */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Genel Veri Kalitesi Durumu</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{quality.totalEndpoints}</p>
            <p className="text-sm text-blue-800">Toplam Endpoint</p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {(100 - quality.errorRate).toFixed(1)}%
            </p>
            <p className="text-sm text-green-800">Başarı Oranı</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{quality.cacheHitRate}%</p>
            <p className="text-sm text-purple-800">Cache Verimliliği</p>
          </div>
          
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{quality.duplicateDataCount}</p>
            <p className="text-sm text-yellow-800">Mükerrer Veri</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Performans Metrikleri Bileşeni
export const PerformanceMetricsChart: React.FC<{ metrics: PerformanceMetricsProps }> = ({ metrics }) => {
  const performanceData = [
    { name: 'CPU', value: metrics.cpuUsage, color: '#EF4444', unit: '%' },
    { name: 'Bellek', value: metrics.memoryUsage, color: '#F59E0B', unit: '%' },
    { name: 'Disk', value: metrics.diskUsage, color: '#10B981', unit: '%' }
  ];

  const networkData = [
    { name: 'Yanıt Süresi', value: metrics.responseTime, unit: 'ms' },
    { name: 'Ağ Gecikmesi', value: metrics.networkLatency, unit: 'ms' },
    { name: 'Throughput', value: metrics.throughput, unit: 'req/s' }
  ];

  return (
    <div className="space-y-6">
      {/* Sistem Kaynakları */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Sistem Kaynak Kullanımı</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {performanceData.map((item, index) => (
            <div key={index} className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={item.color}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - item.value / 100)}`}
                    className="transition-all duration-300"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold" style={{ color: item.color }}>
                    {item.value.toFixed(1)}{item.unit}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700">{item.name} Kullanımı</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ağ Performansı */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Ağ ve Performans Metrikleri</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {networkData.map((item, index) => (
            <div key={index} className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {index === 0 && <Clock className="w-8 h-8 text-blue-600" />}
                {index === 1 && <Activity className="w-8 h-8 text-green-600" />}
                {index === 2 && <TrendingUp className="w-8 h-8 text-purple-600" />}
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {item.value.toFixed(item.unit === 'ms' ? 0 : 1)}
                <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
              </p>
              <p className="text-sm text-gray-600">{item.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default {
  CacheStatsChart,
  APIMetricsChart,
  DuplicateDataChart,
  DataQualityChart,
  PerformanceMetricsChart
};