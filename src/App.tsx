import { useState, useEffect, lazy, Suspense } from 'react';
import { io, Socket } from 'socket.io-client';
import { TrendingUp, AlertCircle, Loader2, Database, BarChart3, Calculator, Figma, Activity, Monitor, Zap } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';

// Lazy load components
const StockSearch = lazy(() => import('./components/StockSearch'));
const StockAnalysis = lazy(() => import('./components/StockAnalysis'));
const StockDetail = lazy(() => import('./components/StockDetail'));
const DataManagementDashboard = lazy(() => import('./components/DataManagementDashboard'));
const RatioAnalysisTable = lazy(() => import('./components/RatioAnalysisTable'));
const RealTimeDashboard = lazy(() => import('./components/RealTimeDashboard'));
const Home = lazy(() => import('./pages/Home'));
const FigmaConnect = lazy(() => import('./pages/FigmaConnect'));
const SystemMonitoring = lazy(() => import('./pages/SystemMonitoring'));
const RealTimeStockDashboard = lazy(() => import('./pages/RealTimeStockDashboard'));
const RealTimeTestPage = lazy(() => import('./pages/RealTimeTestPage'));

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
  const [currentView, setCurrentView] = useState<'analysis' | 'dashboard' | 'ratios' | 'figma' | 'detail' | 'realtime' | 'monitoring' | 'real-time-dashboard' | 'realtime-test'>('analysis');
  const { toasts, removeToast, success, error: showError, handleNetworkStatus } = useToast();

  useEffect(() => {
    // Socket.io bağlantısını kur
    const newSocket = io('http://localhost:9876', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Socket.io bağlantısı kuruldu');
      setConnectionStatus('connected');
      success('WebSocket bağlantısı kuruldu');
    });

    newSocket.on('disconnect', () => {
      console.log('Socket.io bağlantısı kesildi');
      setConnectionStatus('disconnected');
      showError('WebSocket bağlantısı kesildi');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.io bağlantı hatası:', error);
      setConnectionStatus('disconnected');
      showError('WebSocket bağlantı hatası: ' + error.message);
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
    console.log('App - Price objesi:', stockData.price);
    console.log('App - Finansal veriler:', stockData.analysis?.financialData);
    
    setStockData(stockData);
    setError('');
    setLoading(false);
    setCurrentView('detail');
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

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => handleNetworkStatus(true);
    const handleOffline = () => handleNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleNetworkStatus]);

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
            
            <div className="flex items-center space-x-4">
              {/* Navigation Menu */}
              <nav className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentView('analysis')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'analysis'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Hisse Analizi</span>
                </button>
                <button
                  onClick={() => setCurrentView('ratios')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'ratios'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Rasyo Analizi</span>
                </button>
                <button
                  onClick={() => setCurrentView('realtime')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'realtime'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>Gerçek Zamanlı</span>
                </button>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Veri Yönetimi</span>
                </button>
                <button
                  onClick={() => setCurrentView('figma')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'figma'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Figma className="w-4 h-4" />
                  <span>Figma</span>
                </button>
                <button
                  onClick={() => setCurrentView('real-time-dashboard')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'real-time-dashboard'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Canlı Takip</span>
                </button>
                <button
                  onClick={() => setCurrentView('monitoring')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'monitoring'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Monitor className="w-4 h-4" />
                  <span>Sistem İzleme</span>
                </button>
                <button
                  onClick={() => setCurrentView('realtime-test')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentView === 'realtime-test'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>WebSocket Test</span>
                </button>
              </nav>
              
              {/* Connection Status */}
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
        {currentView === 'detail' && stockData ? (
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Hisse detayları yükleniyor...</p>
              </div>
            }>
              <StockDetail 
                stockData={stockData} 
              />
            </Suspense>
          </ErrorBoundary>
        ) : currentView === 'analysis' ? (
          <>
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
              <Suspense fallback={
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              }>
                <Home 
                  onNavigateToDataManagement={() => setCurrentView('dashboard')}
                  onNavigateToAnalysis={() => setCurrentView('analysis')}
                  onNavigateToRatios={() => setCurrentView('ratios')}
                  onNavigateToDashboard={() => setCurrentView('dashboard')}
                />
              </Suspense>
            )}
          </>
        ) : currentView === 'ratios' ? (
          /* Ratio Analysis */
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Rasyo analizi yükleniyor...</p>
              </div>
            }>
              <RatioAnalysisTable showTrends={true} exportEnabled={true} />
            </Suspense>
          </ErrorBoundary>
        ) : currentView === 'realtime' ? (
          /* Real-time Dashboard */
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Gerçek zamanlı dashboard yükleniyor...</p>
              </div>
            }>
              <RealTimeDashboard />
            </Suspense>
          </ErrorBoundary>
        ) : currentView === 'figma' ? (
          /* Figma Integration */
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Figma entegrasyonu yükleniyor...</p>
              </div>
            }>
              <FigmaConnect />
            </Suspense>
          </ErrorBoundary>
        ) : currentView === 'real-time-dashboard' ? (
          /* Real-time Stock Dashboard */
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Canlı takip dashboard'u yükleniyor...</p>
              </div>
            }>
              <RealTimeStockDashboard />
            </Suspense>
          </ErrorBoundary>
        ) : currentView === 'monitoring' ? (
          /* System Monitoring */
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Sistem izleme yükleniyor...</p>
              </div>
            }>
              <SystemMonitoring />
            </Suspense>
          </ErrorBoundary>
        ) : currentView === 'realtime-test' ? (
          /* Real-time Test Page */
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">WebSocket test sayfası yükleniyor...</p>
              </div>
            }>
              <RealTimeTestPage />
            </Suspense>
          </ErrorBoundary>
        ) : (
          /* Data Management Dashboard */
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Veri yönetimi dashboard'u yükleniyor...</p>
              </div>
            }>
              <DataManagementDashboard />
            </Suspense>
          </ErrorBoundary>
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
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}

export default App;