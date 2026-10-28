import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import StockSearch from './components/StockSearch';
import StockAnalysis from './components/StockAnalysis';
import { TrendingUp, Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react';

interface StockData {
  stockCode: string;
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
  timestamp: string;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket.io bağlantısı kuruldu');
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.io bağlantısı kesildi');
      setConnectionStatus('disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.io bağlantı hatası:', error);
      setConnectionStatus('disconnected');
    });

    newSocket.on('stock-update', (data: StockData) => {
      if (data.stockCode === selectedStock) {
        setStockData(data);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [selectedStock]);

  const handleStockSelect = (stockData: StockData) => {
    if (!stockData) return;
    
    setSelectedStock(stockData.stockCode);
    setStockData(stockData);
    setError('');
    setLoading(false);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'disconnected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Bağlı';
      case 'connecting': return 'Bağlanıyor...';
      case 'disconnected': return 'Bağlantı Kesildi';
      default: return 'Bilinmiyor';
    }
  };

  return (
    <div>
      {/* Search Section */}
      <div className="mb-8">
        <StockSearch
          onStockSelect={handleStockSelect}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Hisse verileri yükleniyor...</p>
            <p className="text-sm text-gray-500 mt-1">{selectedStock} analiz ediliyor</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Hata Oluştu</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button
                onClick={() => {
                  if (selectedStock && socket) {
                    setLoading(true);
                    setError('');
                    socket.emit('subscribe-stock', selectedStock);
                  }
                }}
                className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
              >
                Tekrar dene
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Analysis */}
      {stockData && !loading && (
        <StockAnalysis stockData={stockData} />
      )}

      {/* Welcome Message */}
      {!selectedStock && !loading && !error && (
        <div className="text-center py-16">
          <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Hoş Geldiniz</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            Türk hisse senetleri için kapsamlı finansal analiz sistemi.
            Yukarıdaki arama kutusuna hisse kodunu girerek başlayın.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-blue-600 text-2xl font-bold mb-2">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">Gerçek Zamanlı Veriler</h3>
              <p className="text-gray-600 text-sm">İş Yatırım&apos;dan anlık hisse fiyatları ve mali tablo verileri</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-green-600 text-2xl font-bold mb-2">💰</div>
              <h3 className="font-semibold text-gray-900 mb-2">Finansal Analiz</h3>
              <p className="text-gray-600 text-sm">Kapsamlı oran analizi ve yatırım önerileri</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-purple-600 text-2xl font-bold mb-2">🎁</div>
              <h3 className="font-semibold text-gray-900 mb-2">Bedelsiz Potansiyel</h3>
              <p className="text-gray-600 text-sm">Bedelsiz hisse dağıtım potansiyeli analizi</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;