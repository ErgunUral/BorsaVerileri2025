import { useState, useEffect, lazy, Suspense } from 'react';
import { io, Socket } from 'socket.io-client';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load components
const StockSearch = lazy(() => import('./components/StockSearch'));
const StockAnalysis = lazy(() => import('./components/StockAnalysis'));

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
  const [, setSocket] = useState<Socket | null>(null);
  const [selectedStock] = useState<string>('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    // Socket.io bağlantısını kur
    const newSocket = io('http://localhost:9876', {
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

    // Gerçek zamanlı hisse verisi güncellemeleri
    newSocket.on('stock-data', (data: StockData) => {
      console.log('Hisse verisi alındı:', data.stockCode);
      console.log('Finansal veri detayları:', data.analysis?.financialData);
      console.log('Finansal veri key\'leri:', Object.keys(data.analysis?.financialData || {}));
      if (selectedStock === data.stockCode) {
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
    
    console.log('App - Seçilen hisse verisi:', stockData);
    console.log('App - Finansal veriler:', stockData.analysis?.financialData);
    
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Borsa Analiz Sistemi</h1>
                <p className="text-sm text-gray-600">Türk hisse senetleri için gerçek zamanlı analiz</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-1 text-sm ${getConnectionStatusColor()}`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span>{getConnectionStatusText()}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          }>
            <StockSearch 
              onStockSelect={handleStockSelect}
            />
          </Suspense>
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
                    if (selectedStock && stockData) {
                      handleStockSelect(stockData);
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
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Analiz yükleniyor...</span>
              </div>
            }>
              <StockAnalysis stockData={stockData} />
            </Suspense>
          </ErrorBoundary>
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
                <p className="text-gray-600 text-sm">İş Yatırım'dan anlık hisse fiyatları ve mali tablo verileri</p>
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
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="text-sm">
              © 2025 Borsa Analiz Sistemi. Tüm hakları saklıdır.
            </p>
            <p className="text-xs mt-2">
              Veriler İş Yatırım'dan alınmaktadır. Yatırım kararlarınızı verirken profesyonel danışmanlık alınız.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;