import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { throttledApiCall } from '../utils/apiRetry';

interface StockPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: string;
}

interface RealTimePriceDisplayProps {
  stockCode: string;
  className?: string;
}

const RealTimePriceDisplay: React.FC<RealTimePriceDisplayProps> = ({ 
  stockCode, 
  className = '' 
}) => {
  const [stockData, setStockData] = useState<StockPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);

  const fetchStockPrice = async () => {
    if (!stockCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stocks/data/${stockCode}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        
        setStockData({
          symbol: result.data.symbol || stockCode,
          name: result.data.name || stockCode,
          price: parseFloat(result.data.price) || 0,
          change: parseFloat(result.data.change) || 0,
          changePercent: parseFloat(result.data.changePercent) || 0,
          lastUpdate: result.data.lastUpdate || new Date().toISOString()
        });
        setLastRefresh(new Date());
      } else {
        throw new Error(response.error || 'Veri alınamadı');
      }
    } catch (error) {
      console.error('Fiyat verisi alınırken hata:', error);
      if (error instanceof Error && (error.message.includes('429') || error.message.includes('Too many requests'))) {
        setError('⚠️ Çok fazla istek gönderildi! Sunucu yoğunluğu nedeniyle geçici olarak erişim kısıtlandı. Lütfen 1-2 dakika bekleyip manuel olarak yenileyin. Otomatik yenileme geçici olarak durduruldu.');
        // Auto-refresh'i geçici olarak durdur
        setAutoRefreshPaused(true);
        setTimeout(() => setAutoRefreshPaused(false), 120000); // 2 dakika sonra tekrar başlat
      } else {
        setError(error instanceof Error ? error.message : 'Bilinmeyen hata');
      }
    } finally {
      setLoading(false);
    }
  };

  // İlk yükleme - 3 saniye gecikme ile
  useEffect(() => {
    if (stockCode) {
      const timer = setTimeout(() => {
        fetchStockPrice();
      }, 3000); // 3 saniye gecikme
      
      return () => clearTimeout(timer);
    }
  }, [stockCode]);

  // Auto-refresh her 60 saniyede bir (rate limit durumunda durdurulabilir)
  useEffect(() => {
    if (!stockCode || autoRefreshPaused) return;
    
    const interval = setInterval(() => {
      if (!autoRefreshPaused) {
        fetchStockPrice();
      }
    }, 60000); // 60 saniye

    return () => clearInterval(interval);
  }, [stockCode, autoRefreshPaused]);

  const handleManualRefresh = () => {
    setLoading(true);
    setRetryCount(0);
    setError(null); // Önceki hataları temizle
    setAutoRefreshPaused(false); // Manuel refresh ile auto-refresh'i tekrar aktifleştir
    fetchStockPrice();
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatChange = (change: number): string => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}`;
  };

  const formatChangePercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number): string => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeBgColor = (change: number): string => {
    if (change > 0) return 'bg-green-50 border-green-200';
    if (change < 0) return 'bg-red-50 border-red-200';
    return 'bg-gray-50 border-gray-200';
  };

  if (loading && !stockData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="h-6 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          {retrying && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center text-blue-600">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                <span className="text-sm">Yeniden deneniyor... ({retryCount}/3)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && !stockData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <TrendingDown className="w-12 h-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Veri Yüklenemedi</p>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
          <button
            onClick={handleManualRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p>Hisse kodu seçiniz</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header - Hisse Adı ve Sembol */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {stockData.name}
          </h2>
          <p className="text-lg text-gray-600 font-medium">
            {stockData.symbol}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {retrying && (
            <div className="text-xs text-blue-600 flex items-center">
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Yeniden deneniyor...
            </div>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={loading || retrying}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Yenile"
          >
            <RefreshCw className={`w-5 h-5 ${(loading || retrying) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Fiyat Bilgileri */}
      <div className="mb-4">
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {formatPrice(stockData.price)}
        </div>
        
        <div className={`inline-flex items-center px-3 py-1 rounded-lg border ${getChangeBgColor(stockData.change)}`}>
          {stockData.change >= 0 ? (
            <TrendingUp className={`w-4 h-4 mr-1 ${getChangeColor(stockData.change)}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 mr-1 ${getChangeColor(stockData.change)}`} />
          )}
          <span className={`font-semibold ${getChangeColor(stockData.change)}`}>
            {formatChange(stockData.change)} ({formatChangePercent(stockData.changePercent)})
          </span>
        </div>
      </div>

      {/* Son Güncelleme */}
      <div className="flex items-center text-sm text-gray-500">
        <Clock className="w-4 h-4 mr-1" />
        <span>
          Son güncelleme: {lastRefresh.toLocaleTimeString('tr-TR')}
        </span>
      </div>
    </div>
  );
};

export default RealTimePriceDisplay;