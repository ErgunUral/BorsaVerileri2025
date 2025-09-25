import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert } from './ui/alert';
import { LoadingSpinner } from './LoadingSpinner';
import { Play, Pause, RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface StockData {
  stockCode: string;
  price: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
  cached?: boolean;
}

interface BulkDataResponse {
  successful: StockData[];
  failed: any[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    responseTime: number;
  };
  timestamp: string;
}

interface ServiceStatus {
  isRunning: boolean;
  autoUpdateEnabled: boolean;
  lastUpdate: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
}

const RealTimeDashboard: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [bist100Data, setBist100Data] = useState<StockData[]>([]);
  const [popularStocks, setPopularStocks] = useState<StockData[]>([]);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [sectorData, setSectorData] = useState<StockData[]>([]);

  const sectors = [
    'all', 'Bankacılık', 'Teknoloji', 'Enerji', 'Perakende', 
    'İnşaat', 'Otomotiv', 'Telekomünikasyon', 'Gıda'
  ];

  // Socket bağlantısı kurma
  useEffect(() => {
    const newSocket = io('http://localhost:9876');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      console.log('Socket bağlantısı kuruldu');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket bağlantısı koptu');
    });

    newSocket.on('bulk-service-status', (status: ServiceStatus) => {
      setServiceStatus(status);
    });

    newSocket.on('bist100-data', (data: BulkDataResponse) => {
      setBist100Data(data.successful);
      setLastUpdate(data.timestamp);
      setLoading(false);
    });

    newSocket.on('popular-stocks-data', (data: BulkDataResponse) => {
      setPopularStocks(data.successful);
      setLastUpdate(data.timestamp);
    });

    newSocket.on('sector-data', ({ sector, data }: { sector: string; data: BulkDataResponse }) => {
      if (sector === selectedSector) {
        setSectorData(data.successful);
      }
    });

    newSocket.on('bulk-data-update', (event: any) => {
      console.log('Bulk data güncellendi:', event);
      // Otomatik güncelleme geldiğinde verileri yenile
      if (autoUpdateEnabled) {
        fetchBist100Data();
        fetchPopularStocks();
      }
    });

    newSocket.on('auto-update-complete', (data: any) => {
      console.log('Otomatik güncelleme tamamlandı:', data);
      setLastUpdate(new Date().toISOString());
    });

    newSocket.on('auto-update-error', (error: any) => {
      console.error('Otomatik güncelleme hatası:', error);
      setError(error.error);
    });

    newSocket.on('bist100-error', (error: any) => {
      setError(error.error);
      setLoading(false);
    });

    newSocket.on('popular-stocks-error', (error: any) => {
      setError(error.error);
    });

    newSocket.on('sector-error', (error: any) => {
      setError(error.error);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchBist100Data = useCallback(() => {
    if (socket && isConnected) {
      setLoading(true);
      setError(null);
      socket.emit('get-bist100-data');
    }
  }, [socket, isConnected]);

  const fetchPopularStocks = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('get-popular-stocks');
    }
  }, [socket, isConnected]);

  const fetchSectorData = useCallback((sector: string) => {
    if (socket && isConnected && sector !== 'all') {
      socket.emit('get-sector-data', sector);
    }
  }, [socket, isConnected]);

  const toggleAutoUpdate = useCallback(() => {
    if (socket && isConnected) {
      if (autoUpdateEnabled) {
        socket.emit('stop-auto-updates');
      } else {
        socket.emit('start-auto-updates');
      }
      setAutoUpdateEnabled(!autoUpdateEnabled);
    }
  }, [socket, isConnected, autoUpdateEnabled]);

  const handleSectorChange = (sector: string) => {
    setSelectedSector(sector);
    if (sector !== 'all') {
      fetchSectorData(sector);
    } else {
      setSectorData([]);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
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

  const getChangeColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (changePercent: number) => {
    if (changePercent > 0) return <TrendingUp className="w-4 h-4" />;
    if (changePercent < 0) return <TrendingDown className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const renderStockCard = (stock: StockData) => (
    <Card key={stock.stockCode} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{stock.stockCode}</h3>
          <p className="text-2xl font-bold">{formatPrice(stock.price)}</p>
        </div>
        <div className="flex items-center space-x-2">
          {stock.cached && <Badge variant="secondary">Cache</Badge>}
          <div className={`flex items-center space-x-1 ${getChangeColor(stock.changePercent)}`}>
            {getChangeIcon(stock.changePercent)}
            <span className="font-medium">
              {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        <p>Hacim: {formatVolume(stock.volume)}</p>
        <p>Güncelleme: {new Date(stock.lastUpdated).toLocaleTimeString('tr-TR')}</p>
      </div>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerçek Zamanlı Borsa Dashboard</h1>
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Bağlı' : 'Bağlantı Yok'}
          </Badge>
          <Button
            onClick={toggleAutoUpdate}
            variant={autoUpdateEnabled ? 'destructive' : 'default'}
            className="flex items-center space-x-2"
          >
            {autoUpdateEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{autoUpdateEnabled ? 'Durdur' : 'Başlat'}</span>
          </Button>
          <Button onClick={fetchBist100Data} disabled={!isConnected || loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      )}

      {/* Service Status */}
      {serviceStatus && (
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Sistem Durumu</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Durum</p>
              <p className="font-semibold">{serviceStatus.isRunning ? 'Aktif' : 'Pasif'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Toplam İstek</p>
              <p className="font-semibold">{serviceStatus.totalRequests}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Başarılı</p>
              <p className="font-semibold text-green-600">{serviceStatus.successfulRequests}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Ortalama Süre</p>
              <p className="font-semibold">{serviceStatus.averageResponseTime}ms</p>
            </div>
          </div>
        </Card>
      )}

      {/* Sector Filter */}
      <Card className="p-4">
        <h2 className="text-xl font-semibold mb-4">Sektör Filtresi</h2>
        <div className="flex flex-wrap gap-2">
          {sectors.map((sector) => (
            <Button
              key={sector}
              variant={selectedSector === sector ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSectorChange(sector)}
            >
              {sector === 'all' ? 'Tümü' : sector}
            </Button>
          ))}
        </div>
      </Card>

      {/* Popular Stocks */}
      {popularStocks.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Popüler Hisseler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {popularStocks.map(renderStockCard)}
          </div>
        </div>
      )}

      {/* Sector Data */}
      {selectedSector !== 'all' && sectorData.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">{selectedSector} Sektörü</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sectorData.map(renderStockCard)}
          </div>
        </div>
      )}

      {/* BIST 100 Data */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">BIST 100 Hisseleri</h2>
          {lastUpdate && (
            <p className="text-sm text-gray-600">
              Son Güncelleme: {new Date(lastUpdate).toLocaleString('tr-TR')}
            </p>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : bist100Data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {bist100Data.map(renderStockCard)}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-600">Veri yüklemek için 'Yenile' butonuna tıklayın</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RealTimeDashboard;