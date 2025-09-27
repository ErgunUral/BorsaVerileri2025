import React, { useState, useEffect } from 'react';
import { ChevronRight, TrendingUp, TrendingDown, Calendar, BarChart3, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface StockDetailProps {
  stockData: {
    stockCode: string;
    companyName: string;
    price?: {
      price: number;
      changePercent: number;
      volume: number;
      lastUpdated: string;
    };
    analysis?: {
      stockCode: string;
      companyName: string;
      financialData: any;
      ratios: any;
      recommendations: string[];
      riskLevel: 'Düşük' | 'Orta' | 'Yüksek';
      investmentScore: number;
    };
  };
}

const StockDetail: React.FC<StockDetailProps> = ({ stockData }) => {
  const [selectedPeriod, setSelectedPeriod] = useState({ start: '2025-09-15', end: '2025-09-22' });
  const [showCompareDropdown, setShowCompareDropdown] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState('G');
  const [realTimePrice, setRealTimePrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { stockCode, companyName, price, analysis } = stockData;

  // Fetch real-time price data from API
  useEffect(() => {
    let isMounted = true;
    let currentController: AbortController | null = null;
    let retryTimeoutId: NodeJS.Timeout | null = null;
    let intervalId: NodeJS.Timeout | null = null;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 2000;
    
    const fetchRealTimePrice = async () => {
      if (!isMounted) return;
      
      // Cancel any existing request
      if (currentController) {
        currentController.abort();
      }
      
      // Create new controller for this request
      currentController = new AbortController();
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/stocks/data/${stockCode}`, {
          signal: currentController.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!isMounted || currentController.signal.aborted) return;
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Hisse senedi bulunamadı: ${stockCode}`);
          } else if (response.status === 429) {
            throw new Error('Çok fazla istek gönderildi. Lütfen bekleyin.');
          } else if (response.status >= 500) {
            throw new Error('Sunucu hatası. Lütfen daha sonra tekrar deneyin.');
          } else {
            throw new Error(`HTTP hatası! Durum: ${response.status}`);
          }
        }
        
        const data = await response.json();
        
        if (!isMounted || currentController.signal.aborted) return;
        
        if (data.success && data.data) {
          const priceData = {
            price: data.data.price,
            current: data.data.price,
            changePercent: data.data.changePercent || 0,
            volume: data.data.volume || 0
          };
          
          setRealTimePrice(priceData);
          setError(null);
          retryCount = 0; // Reset retry count on success
        } else {
          throw new Error(data.error || 'Veri formatı hatalı');
        }
      } catch (err) {
        if (!isMounted || currentController?.signal.aborted) return;
        
        console.error('Error fetching real-time price:', err);
        
        let errorMessage = 'Bilinmeyen hata';
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Don't show error for aborted requests
            return;
          } else if (err.message.includes('Failed to fetch')) {
            errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
        
        // Retry logic
        if (retryCount < maxRetries && err?.name !== 'AbortError' && isMounted) {
          retryCount++;
          console.log(`Retrying... Attempt ${retryCount}/${maxRetries}`);
          retryTimeoutId = setTimeout(() => {
            if (isMounted) {
              fetchRealTimePrice();
            }
          }, retryDelay * retryCount);
          return;
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
        currentController = null;
      }
    };

    if (stockCode) {
      fetchRealTimePrice();
      
      // Set up interval for real-time updates
      intervalId = setInterval(() => {
        if (!loading && isMounted) {
          fetchRealTimePrice();
        }
      }, 30000); // 30 seconds
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      
      // Cancel any ongoing request
      if (currentController) {
        currentController.abort();
        currentController = null;
      }
      
      // Clear timeouts and intervals
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
      
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [stockCode]); // Removed loading dependency to prevent infinite loops

  // Use real-time price if available, otherwise fallback to prop data
  const currentPrice = realTimePrice || price;

  // Breadcrumb navigation
  const breadcrumbs = [
    { label: 'Ana Sayfa', href: '/' },
    { label: 'Analiz', href: '/analiz' },
    { label: 'Hisse Senetleri', href: '/hisse-senetleri' },
    { label: 'Şirket Kartı', href: '#', active: true }
  ];

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000000) {
      return `${(volume / 1000000000).toFixed(3)} Milyar TL`;
    } else if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(3)} Milyon TL`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(3)} Bin TL`;
    }
    return `${volume.toFixed(2)} TL`;
  };

  const timeframeButtons = [
    { key: 'G', label: 'G', tooltip: 'Günlük' },
    { key: 'H', label: 'H', tooltip: 'Haftalık' },
    { key: 'A', label: 'A', tooltip: 'Aylık' },
    { key: 'Y', label: 'Y', tooltip: 'Yıllık' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                <a
                  href={item.href}
                  className={`${
                    item.active
                      ? 'text-gray-900 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  } transition-colors`}
                >
                  {item.label}
                </a>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stock Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {companyName} | {stockCode}
          </h1>
        </div>

        {/* Stock Info Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {companyName || `${stockCode} Hisse Senedi`}
              </h1>
              <p className="text-lg text-gray-600 flex items-center">
                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                {stockCode}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${
                loading ? 'text-gray-400' : 
                currentPrice && currentPrice.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {loading ? 'Yükleniyor...' : 
                 currentPrice ? `${formatPrice(currentPrice.price)} TL` : '0,00 TL'}
              </div>
              <div className="flex items-center justify-end space-x-2 mt-1">
                <span className={`text-lg font-medium ${
                  loading ? 'text-gray-400' :
                  currentPrice && currentPrice.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {loading ? '...' :
                   currentPrice ? `${currentPrice.changePercent > 0 ? '+' : ''}${currentPrice.changePercent.toFixed(2)}%` : '0,00%'}
                </span>
                {error && (
                  <span className="text-xs text-red-500 ml-2">({typeof error === 'string' ? error : 'Veri alınamadı'})</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Additional Stock Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-sm text-gray-500">Değişim</p>
              <p className={`text-lg font-semibold ${
                loading ? 'text-gray-400' :
                currentPrice && currentPrice.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {loading ? '...' :
                 currentPrice ? `${currentPrice.changePercent > 0 ? '+' : ''}${currentPrice.changePercent.toFixed(2)}%` : '0,00%'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fark</p>
              <p className="text-lg font-semibold text-gray-900">
                {loading ? '...' :
                 currentPrice ? formatPrice(currentPrice.price * (currentPrice.changePercent / 100)) : '0,00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Toplam İşlem Hacmi</p>
              <p className="text-lg font-semibold text-gray-900">
                {loading ? '...' :
                 currentPrice ? formatVolume(currentPrice.volume) : '0 TL'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Adet</p>
              <p className="text-lg font-semibold text-gray-900">11.20</p>
            </div>
          </div>
          
          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 mt-6">
            {/* Timeframe Buttons */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 mr-2">Görünüm:</span>
              {timeframeButtons.map((button) => (
                <Button
                  key={button.key}
                  variant={activeTimeframe === button.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTimeframe(button.key)}
                  className="w-10 h-10 p-0"
                  title={button.tooltip}
                >
                  {button.label}
                </Button>
              ))}
            </div>

            {/* Date Range Picker and Compare */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="date"
                    value={selectedPeriod.start}
                    onChange={(e) => setSelectedPeriod(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                <span className="text-gray-500">-</span>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedPeriod.end}
                    onChange={(e) => setSelectedPeriod(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              {/* Compare Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCompareDropdown(!showCompareDropdown)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <span>Karşılaştır</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {showCompareDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="p-2">
                      <div className="text-xs text-gray-500 mb-2">Karşılaştırılacak hisse seçin</div>
                      <div className="space-y-1">
                        {['THYAO', 'AKBNK', 'GARAN', 'ISCTR'].map((stock) => (
                          <button
                            key={stock}
                            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                          >
                            {stock}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="ozet" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="ozet" className="text-sm font-medium">Özet</TabsTrigger>
            <TabsTrigger value="tahminler" className="text-sm font-medium">Tahminler</TabsTrigger>
            <TabsTrigger value="sermaye" className="text-sm font-medium">Sermaye Artırımları</TabsTrigger>
            <TabsTrigger value="mali" className="text-sm font-medium">Mali Tablolar</TabsTrigger>
            <TabsTrigger value="finansal" className="text-sm font-medium">Finansal Oranlar</TabsTrigger>
          </TabsList>

          <TabsContent value="ozet" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Hisse Özeti</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Temel Bilgiler */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Temel Bilgiler</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hisse Kodu:</span>
                        <span className="font-medium">{stockCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Şirket:</span>
                        <span className="font-medium">{companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sektör:</span>
                        <span className="font-medium">Savunma</span>
                      </div>
                    </div>
                  </div>

                  {/* Performans Metrikleri */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Performans</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Risk Seviyesi:</span>
                        <span className={`font-medium ${
                          analysis?.riskLevel === 'Düşük' ? 'text-green-600' :
                          analysis?.riskLevel === 'Orta' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {analysis?.riskLevel || 'Orta'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Yatırım Skoru:</span>
                        <span className="font-medium">{analysis?.investmentScore || 75}/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Öneriler */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900">Öneriler</h3>
                    <div className="space-y-2">
                      {analysis?.recommendations?.slice(0, 3).map((rec, index) => (
                        <div key={index} className="text-sm text-gray-600">
                          • {rec}
                        </div>
                      )) || (
                        <div className="text-sm text-gray-600">
                          • Uzun vadeli yatırım için uygun
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tahminler">
            <Card>
              <CardHeader>
                <CardTitle>Tahminler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Analist Tahminleri</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dönem</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hedef Fiyat</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tavsiye</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Analist Sayısı</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2025 Q1</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">230 TL</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              AL
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">8</td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2025 Q2</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">245 TL</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              AL
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">12</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sermaye">
            <Card>
              <CardHeader>
                <CardTitle>Sermaye Artırımları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Sermaye Artırımları</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">Son Sermaye Artırımı</h4>
                        <p className="text-sm text-blue-700 mt-1">2024 yılında %20 oranında sermaye artırımı gerçekleştirilmiştir.</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">2024 Sermaye Artırımı</h4>
                          <p className="text-sm text-gray-600 mt-1">Bedelsiz sermaye artırımı</p>
                        </div>
                        <span className="text-sm font-medium text-green-600">%20</span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">2023 Sermaye Artırımı</h4>
                          <p className="text-sm text-gray-600 mt-1">Bedelsiz sermaye artırımı</p>
                        </div>
                        <span className="text-sm font-medium text-green-600">%15</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mali">
            <Card>
              <CardHeader>
                <CardTitle>Mali Tablolar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Mali Tablolar</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Gelir Tablosu (Milyon TL)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Net Satışlar</span>
                          <span className="font-medium">{formatVolume(15000000000)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Brüt Kar</span>
                          <span className="font-medium">{formatVolume(4500000000)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Net Kar</span>
                          <span className="font-medium">{formatVolume(2100000000)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Bilanço (Milyon TL)</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Toplam Aktifler</span>
                          <span className="font-medium">{formatVolume(25000000000)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Özsermaye</span>
                          <span className="font-medium">{formatVolume(18000000000)}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Toplam Borçlar</span>
                          <span className="font-medium">{formatVolume(7000000000)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finansal">
            <Card>
              <CardHeader>
                <CardTitle>Finansal Oranlar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Finansal Oranlar</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-700 mb-2">Karlılık Oranları</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-blue-600">ROE</span>
                          <span className="text-sm font-semibold text-blue-900">12.5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-blue-600">ROA</span>
                          <span className="text-sm font-semibold text-blue-900">8.4%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-blue-600">Net Kar Marjı</span>
                          <span className="text-sm font-semibold text-blue-900">14.0%</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-green-700 mb-2">Likidite Oranları</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-green-600">Cari Oran</span>
                          <span className="text-sm font-semibold text-green-900">2.1</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-green-600">Asit Test</span>
                          <span className="text-sm font-semibold text-green-900">1.8</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-green-600">Nakit Oranı</span>
                          <span className="text-sm font-semibold text-green-900">0.9</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-purple-700 mb-2">Değerleme Oranları</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-purple-600">F/K Oranı</span>
                          <span className="text-sm font-semibold text-purple-900">12.5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-purple-600">PD/DD Oranı</span>
                          <span className="text-sm font-semibold text-purple-900">1.8</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-purple-600">EV/EBITDA</span>
                          <span className="text-sm font-semibold text-purple-900">8.2</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StockDetail;