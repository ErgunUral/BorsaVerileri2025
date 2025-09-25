import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Search,
  Star,
  StarOff,
  Activity,
  DollarSign,
  BarChart3,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useRealTimeData } from '../hooks/useRealTimeData';

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  marketCap?: number;
  lastUpdate: string;
  source: string;
  isWatchlisted: boolean;
}

interface PriceHistory {
  time: string;
  price: number;
  volume: number;
}

interface MarketSummary {
  totalStocks: number;
  gainers: number;
  losers: number;
  unchanged: number;
  totalVolume: number;
  marketCap: number;
  lastUpdate: string;
}

interface ConnectionStatus {
  isConnected: boolean;
  lastPing: string;
  reconnectAttempts: number;
  dataFreshness: number; // seconds since last update
}

const RealTimeStockDashboard: React.FC = () => {
  const [filteredStocks, setFilteredStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change' | 'volume'>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'all' | 'watchlist' | 'gainers' | 'losers'>('all');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>(['AKBNK', 'GARAN', 'ISCTR', 'THYAO', 'TUPRS']);
  const [refreshInterval, setRefreshInterval] = useState(30);

  // Real-time data hook
  const {
    data: stocksMap,
    loading: isLoading,
    error: wsError,
    lastUpdate,
    connectionStatus,
    subscribe: subscribeToRealTime,
    unsubscribe: unsubscribeFromRealTime,
    refreshData,
    addSymbol,
    removeSymbol,
    metrics,
    isSubscribed
  } = useRealTimeData({
    symbols: selectedSymbols,
    enableAutoRefresh: autoRefresh,
    refreshInterval: refreshInterval * 1000,
    maxRetries: 3
  });

  // Convert Map to Array for display
  const stocks = Array.from(stocksMap.values()).map(stock => ({
    symbol: stock.symbol,
    name: stock.name || stock.symbol,
    price: stock.price,
    change: stock.change,
    changePercent: stock.changePercent,
    volume: stock.volume,
    high: stock.high,
    low: stock.low,
    open: stock.open,
    marketCap: stock.marketCap,
    lastUpdate: stock.timestamp,
    source: stock.source || 'API',
    isWatchlisted: watchlist.includes(stock.symbol)
  }));

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  
  // Fetch market summary
  const fetchMarketSummary = async () => {
    try {
      const response = await fetch('/api/realtime/market/summary');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setMarketSummary(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch market summary:', error);
    }
  };

  const handleRefresh = () => {
    refreshData();
    fetchMarketSummary();
  };

  const handleAddSymbol = async (symbol: string) => {
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols([...selectedSymbols, symbol]);
      await addSymbol(symbol);
    }
  };

  const handleRemoveSymbol = async (symbol: string) => {
    setSelectedSymbols(selectedSymbols.filter(s => s !== symbol));
    await removeSymbol(symbol);
  };

  const fetchPriceHistory = async (symbol: string) => {
    try {
      const response = await fetch(`/api/stocks/${symbol}/history?period=1d`);
      const data = await response.json();
      
      if (data.success) {
        setPriceHistory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch price history:', error);
    }
  };

  const toggleWatchlist = (symbol: string) => {
    setWatchlist(prev => {
      const newWatchlist = prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol];
      
      // Update stock data
      setStocks(prevStocks => 
        prevStocks.map(stock => 
          stock.symbol === symbol 
            ? { ...stock, isWatchlisted: newWatchlist.includes(symbol) }
            : stock
        )
      );
      
      return newWatchlist;
    });
  };

  const handleStockSelect = (stock: StockData) => {
    setSelectedStock(stock);
    fetchPriceHistory(stock.symbol);
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortedAndFilteredStocks = () => {
    let filtered = stocks;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply view mode filter
    switch (viewMode) {
      case 'watchlist':
        filtered = filtered.filter(stock => stock.isWatchlisted);
        break;
      case 'gainers':
        filtered = filtered.filter(stock => stock.change > 0);
        break;
      case 'losers':
        filtered = filtered.filter(stock => stock.change < 0);
        break;
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;
      
      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = a.changePercent;
          bValue = b.changePercent;
          break;
        case 'volume':
          aValue = a.volume;
          bValue = b.volume;
          break;
        default:
          aValue = a.symbol;
          bValue = b.symbol;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    
    return filtered;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };



  // Initial market summary fetch
  useEffect(() => {
    fetchMarketSummary();
  }, []);

  // Auto refresh market summary
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchMarketSummary();
      }, refreshInterval * 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);



  useEffect(() => {
    setFilteredStocks(getSortedAndFilteredStocks());
  }, [stocks, searchTerm, viewMode, sortBy, sortOrder]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerçek Zamanlı Hisse Senedi Takibi</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-gray-600">
              Son güncelleme: {lastUpdate || 'Henüz güncellenmedi'}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-sm text-gray-600">
                  {connectionStatus === 'connected' ? 'Bağlı' : 
                   connectionStatus === 'connecting' ? 'Bağlanıyor...' : 'Bağlantı Yok'}
                </span>
                {isSubscribed && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Abone
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-2"
          >
            {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {autoRefresh ? 'Canlı Veri Açık' : 'Canlı Veri Kapalı'}
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Market Summary */}
      {marketSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-sm text-gray-600">Toplam Hisse</div>
                  <div className="text-xl font-bold">{marketSummary.totalStocks}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-sm text-gray-600">Yükselenler</div>
                  <div className="text-xl font-bold text-green-600">{marketSummary.gainers}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-sm text-gray-600">Düşenler</div>
                  <div className="text-xl font-bold text-red-600">{marketSummary.losers}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-500" />
                <div>
                  <div className="text-sm text-gray-600">Toplam Hacim</div>
                  <div className="text-xl font-bold">{formatVolume(marketSummary.totalVolume)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-sm text-gray-600">Piyasa Değeri</div>
                  <div className="text-xl font-bold">{formatPrice(marketSummary.marketCap)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'all' ? 'default' : 'outline'}
            onClick={() => setViewMode('all')}
            size="sm"
          >
            Tümü ({stocks.length})
          </Button>
          <Button
            variant={viewMode === 'watchlist' ? 'default' : 'outline'}
            onClick={() => setViewMode('watchlist')}
            size="sm"
          >
            İzleme Listesi ({watchlist.length})
          </Button>
          <Button
            variant={viewMode === 'gainers' ? 'default' : 'outline'}
            onClick={() => setViewMode('gainers')}
            size="sm"
            className="text-green-600"
          >
            Yükselenler
          </Button>
          <Button
            variant={viewMode === 'losers' ? 'default' : 'outline'}
            onClick={() => setViewMode('losers')}
            size="sm"
            className="text-red-600"
          >
            Düşenler
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Hisse ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-64"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Hisse Senetleri ({filteredStocks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {/* Table Header */}
                <div className="grid grid-cols-7 gap-4 p-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-600">
                  <button 
                    onClick={() => handleSort('symbol')}
                    className="text-left hover:text-gray-900 flex items-center gap-1"
                  >
                    Sembol
                    {sortBy === 'symbol' && (
                      sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('price')}
                    className="text-right hover:text-gray-900 flex items-center justify-end gap-1"
                  >
                    Fiyat
                    {sortBy === 'price' && (
                      sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('change')}
                    className="text-right hover:text-gray-900 flex items-center justify-end gap-1"
                  >
                    Değişim
                    {sortBy === 'change' && (
                      sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </button>
                  <div className="text-right">%</div>
                  <button 
                    onClick={() => handleSort('volume')}
                    className="text-right hover:text-gray-900 flex items-center justify-end gap-1"
                  >
                    Hacim
                    {sortBy === 'volume' && (
                      sortOrder === 'asc' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />
                    )}
                  </button>
                  <div className="text-center">Kaynak</div>
                  <div className="text-center">İşlem</div>
                </div>
                
                {/* Stock Rows */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredStocks.map((stock) => (
                    <div 
                      key={stock.symbol}
                      className={`grid grid-cols-7 gap-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedStock?.symbol === stock.symbol ? 'bg-blue-50 border border-blue-200' : ''
                      }`}
                      onClick={() => handleStockSelect(stock)}
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-xs text-gray-500 truncate">{stock.name}</div>
                        </div>
                      </div>
                      
                      <div className="text-right font-medium">
                        {formatPrice(stock.price)}
                      </div>
                      
                      <div className={`text-right font-medium ${getChangeColor(stock.change)}`}>
                        {stock.change > 0 ? '+' : ''}{formatPrice(stock.change)}
                      </div>
                      
                      <div className={`text-right font-medium flex items-center justify-end gap-1 ${getChangeColor(stock.changePercent)}`}>
                        {getChangeIcon(stock.changePercent)}
                        {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                      
                      <div className="text-right text-sm">
                        {formatVolume(stock.volume)}
                      </div>
                      
                      <div className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {stock.source}
                        </Badge>
                      </div>
                      
                      <div className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(stock.symbol);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          {stock.isWatchlisted ? (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          ) : (
                            <StarOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stock Detail */}
        <div>
          {selectedStock ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <div>{selectedStock.symbol}</div>
                    <div className="text-sm font-normal text-gray-600">{selectedStock.name}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleWatchlist(selectedStock.symbol)}
                  >
                    {selectedStock.isWatchlisted ? (
                      <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    ) : (
                      <StarOff className="h-5 w-5 text-gray-400" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Price Info */}
                <div className="text-center">
                  <div className="text-3xl font-bold">{formatPrice(selectedStock.price)}</div>
                  <div className={`text-lg flex items-center justify-center gap-2 ${getChangeColor(selectedStock.change)}`}>
                    {getChangeIcon(selectedStock.change)}
                    {selectedStock.change > 0 ? '+' : ''}{formatPrice(selectedStock.change)}
                    ({selectedStock.changePercent > 0 ? '+' : ''}{selectedStock.changePercent.toFixed(2)}%)
                  </div>
                </div>
                
                {/* Stock Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Açılış</div>
                    <div className="font-medium">{formatPrice(selectedStock.open)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Yüksek</div>
                    <div className="font-medium text-green-600">{formatPrice(selectedStock.high)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Düşük</div>
                    <div className="font-medium text-red-600">{formatPrice(selectedStock.low)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Hacim</div>
                    <div className="font-medium">{formatVolume(selectedStock.volume)}</div>
                  </div>
                </div>
                
                {/* Price Chart */}
                {priceHistory.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Fiyat Grafiği (Günlük)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 10 }}
                          tickFormatter={(time) => new Date(time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip 
                          labelFormatter={(time) => new Date(time).toLocaleString('tr-TR')}
                          formatter={(value: number) => [formatPrice(value), 'Fiyat']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke={selectedStock.change >= 0 ? '#10b981' : '#ef4444'}
                          fill={selectedStock.change >= 0 ? '#10b981' : '#ef4444'}
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                {/* Data Source & Freshness */}
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      Kaynak: {selectedStock.source}
                    </div>
                    <div>
                      {new Date(selectedStock.lastUpdate).toLocaleTimeString('tr-TR')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Toplam Güncelleme: {metrics.totalUpdates} | Başarılı: {metrics.successfulUpdates} | 
                    Ortalama Yanıt: {metrics.averageResponseTime}ms
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Detayları görmek için bir hisse seçin</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeStockDashboard;