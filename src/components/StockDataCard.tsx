import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Clock, RefreshCw } from 'lucide-react';

interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  dividendYield: number;
  high52Week: number;
  low52Week: number;
  avgVolume: number;
  beta: number;
  eps: number;
  lastUpdate: string;
}

interface StockDataCardProps {
  stockData: StockData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  symbol: string;
}

const StockDataCard: React.FC<StockDataCardProps> = memo(({
  stockData,
  isLoading,
  error,
  onRefresh,
  symbol
}) => {
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(decimals) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(decimals) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(decimals) + 'K';
    }
    return num.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
  };

  const getPerformanceBadge = (current: number, high: number, low: number) => {
    const range = high - low;
    const position = (current - low) / range;
    
    if (position > 0.8) return { text: 'Yüksek Seviye', color: 'bg-red-100 text-red-800' };
    if (position > 0.6) return { text: 'Orta-Yüksek', color: 'bg-yellow-100 text-yellow-800' };
    if (position > 0.4) return { text: 'Orta Seviye', color: 'bg-blue-100 text-blue-800' };
    if (position > 0.2) return { text: 'Orta-Düşük', color: 'bg-green-100 text-green-800' };
    return { text: 'Düşük Seviye', color: 'bg-green-100 text-green-800' };
  };

  if (error) {
    return (
      <Card className="bg-white shadow-lg border-red-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-700 flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Hisse Verisi - {symbol}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={onRefresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stockData) {
    return (
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span>Hisse Verisi - {symbol}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Hisse verisi yükleniyor...</p>
              </>
            ) : (
              <>
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">Hisse verisi bulunamadı</p>
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Yeniden Yükle
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const performanceBadge = getPerformanceBadge(stockData.price, stockData.high52Week, stockData.low52Week);

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            <span>Hisse Verisi - {stockData.symbol}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={performanceBadge.color}>
              {performanceBadge.text}
            </Badge>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              title="Verileri Yenile"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Ana Fiyat Bilgisi */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {formatCurrency(stockData.price)}
              </div>
              <div className={`flex items-center space-x-2 ${getChangeColor(stockData.change)}`}>
                {getChangeIcon(stockData.change)}
                <span className="font-semibold">
                  {stockData.change > 0 ? '+' : ''}{formatCurrency(stockData.change)}
                </span>
                <span className="font-semibold">
                  ({stockData.changePercent > 0 ? '+' : ''}{stockData.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1 flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Son Güncelleme
              </div>
              <div className="text-sm font-medium text-gray-900">
                {new Date(stockData.lastUpdate).toLocaleString('tr-TR')}
              </div>
            </div>
          </div>
        </div>

        {/* Detaylı Bilgiler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hacim Bilgileri */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
              Hacim
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Günlük:</span>
                <span className="font-medium">{formatNumber(stockData.volume, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ortalama:</span>
                <span className="font-medium">{formatNumber(stockData.avgVolume, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Oran:</span>
                <span className={`font-medium ${
                  stockData.volume > stockData.avgVolume ? 'text-green-600' : 'text-red-600'
                }`}>
                  {((stockData.volume / stockData.avgVolume) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* 52 Hafta Performansı */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-green-600" />
              52 Hafta
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Yüksek:</span>
                <span className="font-medium text-red-600">{formatCurrency(stockData.high52Week)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Düşük:</span>
                <span className="font-medium text-green-600">{formatCurrency(stockData.low52Week)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pozisyon:</span>
                <span className="font-medium">
                  {(((stockData.price - stockData.low52Week) / (stockData.high52Week - stockData.low52Week)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Finansal Oranlar */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-purple-600" />
              Finansal
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">P/E:</span>
                <span className="font-medium">{stockData.peRatio.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">EPS:</span>
                <span className="font-medium">{formatCurrency(stockData.eps)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Temettü:</span>
                <span className="font-medium">{stockData.dividendYield.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Beta:</span>
                <span className={`font-medium ${
                  stockData.beta > 1 ? 'text-red-600' : stockData.beta < 1 ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {stockData.beta.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Piyasa Değeri */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Piyasa Değeri</h4>
              <div className="text-2xl font-bold text-purple-700">
                {formatNumber(stockData.marketCap, 2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Risk Seviyesi</div>
              <Badge className={stockData.beta > 1.5 ? 'bg-red-100 text-red-800' : 
                              stockData.beta > 1 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-green-100 text-green-800'}>
                {stockData.beta > 1.5 ? 'Yüksek Risk' : 
                 stockData.beta > 1 ? 'Orta Risk' : 'Düşük Risk'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StockDataCard.displayName = 'StockDataCard';

export default StockDataCard;