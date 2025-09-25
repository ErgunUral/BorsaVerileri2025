import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Activity, Wifi, WifiOff, TrendingUp, TrendingDown } from 'lucide-react';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

interface MarketSummary {
  totalStocks: number;
  gainers: number;
  losers: number;
  unchanged: number;
  totalVolume: number;
  lastUpdate: string;
}

const RealTimeTestPage: React.FC = () => {
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [marketSummary, setMarketSummary] = useState<MarketSummary | null>(null);
  const [subscribedSymbols] = useState(['AKBNK', 'GARAN', 'ISCTR']);
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  const {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    getMarketSummary,
    lastMessage
  } = useWebSocket({
    url: 'ws://localhost:3001/ws/stocks',
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    onConnect: () => {
      console.log('WebSocket connected successfully');
      setConnectionAttempts(0);
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
      setConnectionAttempts(prev => prev + 1);
    }
  });

  useEffect(() => {
    if (isConnected) {
      // Subscribe to test symbols
      subscribedSymbols.forEach(symbol => {
        subscribe(symbol);
      });
      
      // Get initial market summary
      getMarketSummary();
    }
  }, [isConnected, subscribe, getMarketSummary]);

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        
        if (data.type === 'stock_update' && data.data) {
          setStockData(prev => ({
            ...prev,
            [data.data.symbol]: data.data
          }));
        } else if (data.type === 'market_summary' && data.data) {
          setMarketSummary(data.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleRefreshMarketSummary = () => {
    if (isConnected) {
      getMarketSummary();
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />;
    if (change < 0) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerçek Zamanlı Veri Test Sayfası</h1>
        <div className="flex items-center gap-4">
          <Badge 
            variant={isConnected ? 'default' : 'destructive'}
            className="flex items-center gap-2"
          >
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isConnected ? 'Bağlı' : 'Bağlantı Kesildi'}
          </Badge>
          {connectionAttempts > 0 && (
            <Badge variant="outline">
              Deneme: {connectionAttempts}
            </Badge>
          )}
        </div>
      </div>

      {/* Connection Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Bağlantı Kontrolü
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={handleConnect} 
              disabled={isConnected}
              variant={isConnected ? 'outline' : 'default'}
            >
              Bağlan
            </Button>
            <Button 
              onClick={handleDisconnect} 
              disabled={!isConnected}
              variant="outline"
            >
              Bağlantıyı Kes
            </Button>
            <Button 
              onClick={handleRefreshMarketSummary}
              disabled={!isConnected}
              variant="outline"
            >
              Piyasa Özetini Yenile
            </Button>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            WebSocket URL: ws://localhost:3001/ws/stocks
          </div>
        </CardContent>
      </Card>

      {/* Market Summary */}
      {marketSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Piyasa Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{marketSummary.totalStocks}</div>
                <div className="text-sm text-gray-600">Toplam Hisse</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{marketSummary.gainers}</div>
                <div className="text-sm text-gray-600">Yükselenler</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{marketSummary.losers}</div>
                <div className="text-sm text-gray-600">Düşenler</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{marketSummary.unchanged}</div>
                <div className="text-sm text-gray-600">Değişmeyenler</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{marketSummary.totalVolume.toLocaleString('tr-TR')}</div>
                <div className="text-sm text-gray-600">Toplam Hacim</div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="text-sm text-gray-600">
              Son Güncelleme: {new Date(marketSummary.lastUpdate).toLocaleString('tr-TR')}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Stock Data */}
      <Card>
        <CardHeader>
          <CardTitle>Gerçek Zamanlı Hisse Verileri</CardTitle>
        </CardHeader>
        <CardContent>
          {subscribedSymbols.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Takip edilen hisse senedi yok
            </div>
          ) : (
            <div className="space-y-4">
              {subscribedSymbols.map(symbol => {
                const data = stockData[symbol];
                return (
                  <div key={symbol} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{symbol}</h3>
                        {data ? (
                          <div className="text-sm text-gray-600">
                            Son Güncelleme: {new Date(data.timestamp).toLocaleString('tr-TR')}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">Veri bekleniyor...</div>
                        )}
                      </div>
                      {data && (
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            {formatPrice(data.price)}
                          </div>
                          <div className={`flex items-center gap-1 ${getChangeColor(data.change)}`}>
                            {getChangeIcon(data.change)}
                            <span>{formatPrice(data.change)}</span>
                            <span>({formatPercent(data.changePercent)})</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Hacim: {data.volume.toLocaleString('tr-TR')}
                          </div>
                        </div>
                      )}
                    </div>
                    {!data && isConnected && (
                      <div className="mt-2">
                        <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Bağlantı Durumu:</strong> {isConnected ? 'Bağlı' : 'Bağlı Değil'}</div>
            <div><strong>Takip Edilen Semboller:</strong> {subscribedSymbols.join(', ')}</div>
            <div><strong>Alınan Veri Sayısı:</strong> {Object.keys(stockData).length}</div>
            <div><strong>Son Mesaj:</strong> {lastMessage ? lastMessage.substring(0, 100) + '...' : 'Henüz mesaj alınmadı'}</div>
            <div><strong>Bağlantı Denemeleri:</strong> {connectionAttempts}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeTestPage;