import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Calendar,
  Database,
  FileText,
  Settings,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';

interface DuplicateItem {
  key: string;
  count: number;
  dataSize: number;
  lastAccessed: string;
  pattern: string;
  endpoint: string;
  estimatedSavings: number;
  priority: 'high' | 'medium' | 'low';
  autoCleanable: boolean;
}

interface DuplicateDataManagerProps {
  duplicates: DuplicateItem[];
  onClearDuplicate: (key: string) => Promise<void>;
  onBulkClear: (keys: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

interface FilterOptions {
  priority: string;
  pattern: string;
  dateRange: string;
  sizeRange: string;
  autoCleanable: boolean | null;
}

const DuplicateDataManager: React.FC<DuplicateDataManagerProps> = ({
  duplicates,
  onClearDuplicate,
  onBulkClear,
  onRefresh,
  loading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'count' | 'size' | 'lastAccessed' | 'priority'>('count');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [autoCleanEnabled, setAutoCleanEnabled] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    priority: 'all',
    pattern: 'all',
    dateRange: 'all',
    sizeRange: 'all',
    autoCleanable: null
  });

  // Filtrelenmiş ve sıralanmış veriler
  const filteredAndSortedData = useMemo(() => {
    let filtered = duplicates.filter(item => {
      const matchesSearch = item.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.endpoint.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = filters.priority === 'all' || item.priority === filters.priority;
      
      const matchesPattern = filters.pattern === 'all' || item.pattern === filters.pattern;
      
      const matchesAutoCleanable = filters.autoCleanable === null || 
                                  item.autoCleanable === filters.autoCleanable;
      
      // Tarih filtresi
      let matchesDate = true;
      if (filters.dateRange !== 'all') {
        const itemDate = new Date(item.lastAccessed);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filters.dateRange) {
          case 'today':
            matchesDate = daysDiff === 0;
            break;
          case 'week':
            matchesDate = daysDiff <= 7;
            break;
          case 'month':
            matchesDate = daysDiff <= 30;
            break;
        }
      }
      
      // Boyut filtresi
      let matchesSize = true;
      if (filters.sizeRange !== 'all') {
        const sizeKB = item.dataSize / 1024;
        switch (filters.sizeRange) {
          case 'small':
            matchesSize = sizeKB < 10;
            break;
          case 'medium':
            matchesSize = sizeKB >= 10 && sizeKB < 100;
            break;
          case 'large':
            matchesSize = sizeKB >= 100;
            break;
        }
      }
      
      return matchesSearch && matchesPriority && matchesPattern && 
             matchesDate && matchesSize && matchesAutoCleanable;
    });

    // Sıralama
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'count':
          comparison = a.count - b.count;
          break;
        case 'size':
          comparison = a.dataSize - b.dataSize;
          break;
        case 'lastAccessed':
          comparison = new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [duplicates, searchTerm, filters, sortBy, sortOrder]);

  // İstatistikler
  const stats = useMemo(() => {
    const total = filteredAndSortedData.length;
    const totalSize = filteredAndSortedData.reduce((sum, item) => sum + item.dataSize, 0);
    const totalSavings = filteredAndSortedData.reduce((sum, item) => sum + item.estimatedSavings, 0);
    const highPriority = filteredAndSortedData.filter(item => item.priority === 'high').length;
    const autoCleanable = filteredAndSortedData.filter(item => item.autoCleanable).length;
    
    return {
      total,
      totalSize: totalSize / 1024, // KB
      totalSavings: totalSavings / 1024, // KB
      highPriority,
      autoCleanable
    };
  }, [filteredAndSortedData]);

  // Benzersiz pattern'lar
  const uniquePatterns = useMemo(() => 
    Array.from(new Set(duplicates.map(item => item.pattern))),
    [duplicates]
  );

  // Seçim işlemleri
  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredAndSortedData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedData.map(item => item.key)));
    }
  }, [filteredAndSortedData, selectedItems.size]);

  const handleSelectItem = useCallback((key: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedItems(newSelected);
  }, [selectedItems]);

  // Temizleme işlemleri
  const handleClearSelected = useCallback(async () => {
    if (selectedItems.size === 0) {
      toast.warning('Lütfen temizlenecek öğeleri seçin');
      return;
    }

    try {
      await onBulkClear(Array.from(selectedItems));
      setSelectedItems(new Set());
      toast.success(`${selectedItems.size} öğe başarıyla temizlendi`);
    } catch (error) {
      toast.error('Temizleme işlemi sırasında hata oluştu');
    }
  }, [selectedItems, onBulkClear]);

  const handleAutoClean = useCallback(async () => {
    const autoCleanableItems = filteredAndSortedData
      .filter(item => item.autoCleanable && item.priority !== 'high')
      .map(item => item.key);

    if (autoCleanableItems.length === 0) {
      toast.info('Otomatik temizlenebilir öğe bulunamadı');
      return;
    }

    try {
      await onBulkClear(autoCleanableItems);
      toast.success(`${autoCleanableItems.length} öğe otomatik olarak temizlendi`);
    } catch (error) {
      toast.error('Otomatik temizleme sırasında hata oluştu');
    }
  }, [filteredAndSortedData, onBulkClear]);

  // Export işlemi
  const handleExport = useCallback(() => {
    const exportData = filteredAndSortedData.map(item => ({
      key: item.key,
      count: item.count,
      'size_kb': (item.dataSize / 1024).toFixed(2),
      last_accessed: item.lastAccessed,
      pattern: item.pattern,
      endpoint: item.endpoint,
      priority: item.priority,
      auto_cleanable: item.autoCleanable,
      'estimated_savings_kb': (item.estimatedSavings / 1024).toFixed(2)
    }));

    const csv = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duplicate-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Veriler başarıyla export edildi');
  }, [filteredAndSortedData]);

  // Öncelik rengi
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Toplam Mükerrer</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Toplam Boyut</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSize.toFixed(1)} KB</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Tasarruf Potansiyeli</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSavings.toFixed(1)} KB</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Yüksek Öncelik</p>
              <p className="text-2xl font-bold text-gray-900">{stats.highPriority}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Otomatik Temizlenebilir</p>
              <p className="text-2xl font-bold text-gray-900">{stats.autoCleanable}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Kontrol Paneli */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Arama ve Filtreler */}
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Anahtar, pattern veya endpoint ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-80"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filtreler</span>
              {showFilters ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Eylem Butonları */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
            
            <button
              onClick={handleAutoClean}
              disabled={loading || stats.autoCleanable === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {autoCleanEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>Otomatik Temizle</span>
            </button>
            
            <button
              onClick={handleClearSelected}
              disabled={loading || selectedItems.size === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Seçilenleri Sil ({selectedItems.size})</span>
            </button>
            
            <button
              onClick={handleExport}
              disabled={filteredAndSortedData.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Gelişmiş Filtreler */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="high">Yüksek</option>
                  <option value="medium">Orta</option>
                  <option value="low">Düşük</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pattern</label>
                <select
                  value={filters.pattern}
                  onChange={(e) => setFilters(prev => ({ ...prev, pattern: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  {uniquePatterns.map(pattern => (
                    <option key={pattern} value={pattern}>{pattern}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih Aralığı</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="today">Bugün</option>
                  <option value="week">Son 7 Gün</option>
                  <option value="month">Son 30 Gün</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Boyut</label>
                <select
                  value={filters.sizeRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, sizeRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="small">Küçük (&lt;10KB)</option>
                  <option value="medium">Orta (10-100KB)</option>
                  <option value="large">Büyük (&gt;100KB)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Otomatik Temizleme</label>
                <select
                  value={filters.autoCleanable === null ? 'all' : filters.autoCleanable.toString()}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    autoCleanable: e.target.value === 'all' ? null : e.target.value === 'true'
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Tümü</option>
                  <option value="true">Evet</option>
                  <option value="false">Hayır</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Veri Tablosu */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'count') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('count');
                        setSortOrder('desc');
                      }
                    }}>
                  Anahtar / Tekrar Sayısı
                  {sortBy === 'count' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pattern</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'size') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('size');
                        setSortOrder('desc');
                      }
                    }}>
                  Boyut
                  {sortBy === 'size' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'priority') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('priority');
                        setSortOrder('desc');
                      }
                    }}>
                  Öncelik
                  {sortBy === 'priority' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => {
                      if (sortBy === 'lastAccessed') {
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortBy('lastAccessed');
                        setSortOrder('desc');
                      }
                    }}>
                  Son Erişim
                  {sortBy === 'lastAccessed' && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedData.map((item) => (
                <tr key={item.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.key)}
                      onChange={() => handleSelectItem(item.key)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-mono text-gray-900 truncate max-w-xs" title={item.key}>
                        {item.key}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.count > 10 ? 'bg-red-100 text-red-800' :
                          item.count > 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.count} tekrar
                        </span>
                        {item.autoCleanable && (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            Otomatik
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {item.pattern}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{(item.dataSize / 1024).toFixed(1)} KB</div>
                      <div className="text-xs text-gray-500">
                        Tasarruf: {(item.estimatedSavings / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(item.priority)}`}>
                      {item.priority === 'high' ? 'Yüksek' : item.priority === 'medium' ? 'Orta' : 'Düşük'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(item.lastAccessed).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onClearDuplicate(item.key)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Temizle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedData.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-2 text-lg font-semibold text-gray-900">Mükerrer veri bulunamadı</p>
            <p className="text-sm text-gray-600">Filtreleri değiştirmeyi deneyin veya verileri yenileyin</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DuplicateDataManager;