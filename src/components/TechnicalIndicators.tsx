import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { useTechnicalIndicators } from '../hooks/useTechnicalIndicators';

interface TechnicalIndicatorsProps {
  symbol: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const TechnicalIndicators: React.FC<TechnicalIndicatorsProps> = ({
  symbol,
  autoRefresh = false,
  refreshInterval = 30000
}) => {
  const {
    rsiData,
    macdData,
    bollingerData,
    combinedData,
    loading,
    error,
    fetchRSI,
    fetchMACD,
    fetchBollinger,
    fetchCombined,
    clearData
  } = useTechnicalIndicators();

  const [activeTab, setActiveTab] = useState<'rsi' | 'macd' | 'bollinger' | 'combined'>('combined');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (symbol) {
      fetchAllIndicators();
    } else {
      clearData();
    }
  }, [symbol]);

  useEffect(() => {
    if (autoRefresh && symbol) {
      const interval = setInterval(() => {
        fetchAllIndicators();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, symbol, refreshInterval]);

  const fetchAllIndicators = async () => {
    if (!symbol) return;
    
    try {
      await Promise.all([
        fetchRSI(symbol),
        fetchMACD(symbol),
        fetchBollinger(symbol),
        fetchCombined(symbol)
      ]);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching indicators:', err);
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY':
      case 'BUY':
        return 'text-green-600 bg-green-50';
      case 'STRONG_SELL':
      case 'SELL':
        return 'text-red-600 bg-red-50';
      case 'HOLD':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'STRONG_BUY':
      case 'BUY':
        return <TrendingUp className="w-4 h-4" />;
      case 'STRONG_SELL':
      case 'SELL':
        return <TrendingDown className="w-4 h-4" />;
      case 'HOLD':
        return <Minus className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const renderRSIPanel = () => {
    if (!rsiData) return <div className="text-gray-500">RSI verisi yükleniyor...</div>;
    
    const rsi = rsiData.result as any;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">RSI Değeri</h4>
            <div className="text-2xl font-bold text-blue-600">{rsi.value?.toFixed(2)}</div>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ${getSignalColor(rsi.signal)}`}>
              {getSignalIcon(rsi.signal)}
              {rsi.signal}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Trend</h4>
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(rsi.trend)}`}>
              {getSignalIcon(rsi.trend)}
              {rsi.trend}
            </div>
            <div className="mt-2 space-y-1">
              {rsi.overbought && (
                <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">Aşırı Alım</div>
              )}
              {rsi.oversold && (
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Aşırı Satım</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-xs text-gray-600 mb-1">RSI Seviyesi</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${rsi.value}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span className="text-red-500">30</span>
            <span>50</span>
            <span className="text-green-500">70</span>
            <span>100</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMACDPanel = () => {
    if (!macdData) return <div className="text-gray-500">MACD verisi yükleniyor...</div>;
    
    const macd = macdData.result as any;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">MACD</h4>
            <div className="text-lg font-bold text-blue-600">{macd.macd?.toFixed(4)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Signal</h4>
            <div className="text-lg font-bold text-purple-600">{macd.signal?.toFixed(4)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Histogram</h4>
            <div className={`text-lg font-bold ${macd.histogram >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {macd.histogram?.toFixed(4)}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Crossover</h4>
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(macd.crossover)}`}>
              {getSignalIcon(macd.crossover)}
              {macd.crossover}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Sinyal</h4>
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(macd.signalType)}`}>
              {getSignalIcon(macd.signalType)}
              {macd.signalType}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBollingerPanel = () => {
    if (!bollingerData) return <div className="text-gray-500">Bollinger Bands verisi yükleniyor...</div>;
    
    const bollinger = bollingerData.result as any;
    const currentPrice = bollingerData.currentPrice;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Üst Band</h4>
            <div className="text-lg font-bold text-red-600">₺{bollinger.upper?.toFixed(2)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Orta Band</h4>
            <div className="text-lg font-bold text-blue-600">₺{bollinger.middle?.toFixed(2)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="font-semibold text-gray-700 mb-2">Alt Band</h4>
            <div className="text-lg font-bold text-green-600">₺{bollinger.lower?.toFixed(2)}</div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold text-gray-700 mb-2">Mevcut Fiyat Pozisyonu</h4>
          <div className="relative">
            <div className="text-lg font-bold mb-2">₺{currentPrice?.toFixed(2)}</div>
            <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(bollinger.position)}`}>
              <Target className="w-4 h-4" />
              {bollinger.position}
            </div>
            {bollinger.squeeze && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                Bollinger Squeeze Aktif
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="font-semibold text-gray-700 mb-2">Sinyal</h4>
          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSignalColor(bollinger.signal)}`}>
            {getSignalIcon(bollinger.signal)}
            {bollinger.signal}
          </div>
        </div>
      </div>
    );
  };

  const renderCombinedPanel = () => {
    if (!combinedData) return <div className="text-gray-500">Birleşik analiz verisi yükleniyor...</div>;
    
    const combined = combinedData.result as any;
    
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
          <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Genel Değerlendirme
          </h4>
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold ${getSignalColor(combined.overallSignal)}`}>
              {getSignalIcon(combined.overallSignal)}
              {combined.overallSignal}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Güven Skoru: <span className="font-semibold">{(combined.confidence * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h5 className="font-semibold text-green-700 mb-2">Yükseliş Sinyalleri</h5>
            <div className="text-2xl font-bold text-green-600">{combined.signals?.bullish || 0}</div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h5 className="font-semibold text-red-700 mb-2">Düşüş Sinyalleri</h5>
            <div className="text-2xl font-bold text-red-600">{combined.signals?.bearish || 0}</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h5 className="font-semibold text-gray-700 mb-2">Nötr Sinyaller</h5>
            <div className="text-2xl font-bold text-gray-600">{combined.signals?.neutral || 0}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <h5 className="font-semibold text-gray-700 mb-2">RSI</h5>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(combined.rsi?.signal)}`}>
              {getSignalIcon(combined.rsi?.signal)}
              {combined.rsi?.signal}
            </div>
            <div className="text-sm text-gray-600 mt-1">{combined.rsi?.value?.toFixed(2)}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h5 className="font-semibold text-gray-700 mb-2">MACD</h5>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(combined.macd?.signalType)}`}>
              {getSignalIcon(combined.macd?.signalType)}
              {combined.macd?.signalType}
            </div>
            <div className="text-sm text-gray-600 mt-1">{combined.macd?.crossover}</div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border">
            <h5 className="font-semibold text-gray-700 mb-2">Bollinger</h5>
            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(combined.bollinger?.signal)}`}>
              {getSignalIcon(combined.bollinger?.signal)}
              {combined.bollinger?.signal}
            </div>
            <div className="text-sm text-gray-600 mt-1">{combined.bollinger?.position}</div>
          </div>
        </div>
      </div>
    );
  };

  if (!symbol) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Teknik analiz için bir hisse senedi seçin</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Teknik İndikatörler - {symbol}
          </h3>
          <div className="flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Son güncelleme: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchAllIndicators}
              disabled={loading}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Yükleniyor...' : 'Yenile'}
            </button>
          </div>
        </div>
        
        <div className="flex space-x-1 mt-4">
          {[
            { key: 'combined', label: 'Genel' },
            { key: 'rsi', label: 'RSI' },
            { key: 'macd', label: 'MACD' },
            { key: 'bollinger', label: 'Bollinger' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Hata:</span>
            </div>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Teknik indikatörler hesaplanıyor...</p>
          </div>
        )}
        
        {!loading && (
          <div>
            {activeTab === 'rsi' && renderRSIPanel()}
            {activeTab === 'macd' && renderMACDPanel()}
            {activeTab === 'bollinger' && renderBollingerPanel()}
            {activeTab === 'combined' && renderCombinedPanel()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalIndicators;