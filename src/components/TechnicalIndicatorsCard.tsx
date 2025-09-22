import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { LineChart, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';

interface RSIData {
  value: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  timestamp: string;
}

interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp: string;
}

interface BollingerData {
  upper: number;
  middle: number;
  lower: number;
  position: 'ABOVE_UPPER' | 'BELOW_LOWER' | 'MIDDLE' | 'UNKNOWN';
  squeeze: boolean;
  timestamp: string;
}

interface TechnicalIndicatorsCardProps {
  rsiData: RSIData | null;
  macdData: MACDData | null;
  bollingerData: BollingerData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  lastUpdateTime: Date | null;
}

const TechnicalIndicatorsCard: React.FC<TechnicalIndicatorsCardProps> = memo(({
  rsiData,
  macdData,
  bollingerData,
  isLoading,
  error,
  onRefresh,
  lastUpdateTime
}) => {
  const getRSIColor = (value: number) => {
    if (value >= 70) return 'text-red-600';
    if (value <= 30) return 'text-green-600';
    return 'text-yellow-600';
  };

  const getRSISignalBadge = (signal: string) => {
    const colors = {
      'BUY': 'bg-green-100 text-green-800',
      'SELL': 'bg-red-100 text-red-800',
      'HOLD': 'bg-yellow-100 text-yellow-800'
    };
    return colors[signal as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getMACDTrendColor = (trend: string) => {
    const colors = {
      'BULLISH': 'text-green-600',
      'BEARISH': 'text-red-600',
      'NEUTRAL': 'text-yellow-600'
    };
    return colors[trend as keyof typeof colors] || 'text-gray-600';
  };

  const getBollingerPositionBadge = (position: string) => {
    const colors = {
      'ABOVE_UPPER': 'bg-red-100 text-red-800',
      'BELOW_LOWER': 'bg-green-100 text-green-800',
      'MIDDLE': 'bg-blue-100 text-blue-800',
      'UNKNOWN': 'bg-gray-100 text-gray-800'
    };
    return colors[position as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPositionText = (position: string) => {
    const texts = {
      'ABOVE_UPPER': 'Üst Bantta',
      'BELOW_LOWER': 'Alt Bantta',
      'MIDDLE': 'Orta Bantta',
      'UNKNOWN': 'Belirsiz'
    };
    return texts[position as keyof typeof texts] || 'Belirsiz';
  };

  if (error) {
    return (
      <Card className="bg-white shadow-lg border-red-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-700 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Teknik İndikatörler - Hata</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
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

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2">
            <LineChart className="h-5 w-5 text-purple-600" />
            <span>Teknik İndikatörler</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-purple-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span>Güncelleniyor...</span>
              </div>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
            >
              Yenile
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* RSI İndikatörü */}
          <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span>RSI</span>
              </h4>
              {rsiData && (
                <Badge className={getRSISignalBadge(rsiData.signal)}>
                  {rsiData.signal}
                </Badge>
              )}
            </div>
            
            {rsiData ? (
              <>
                <div className={`text-2xl font-bold mb-2 ${getRSIColor(rsiData.value)}`}>
                  {rsiData.value.toFixed(2)}
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Aşırı Satım (30)</span>
                    <span>Nötr (50)</span>
                    <span>Aşırı Alım (70)</span>
                  </div>
                  <Progress value={rsiData.value} className="h-2" />
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(rsiData.timestamp).toLocaleString('tr-TR')}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">RSI verisi yükleniyor...</p>
              </div>
            )}
          </div>

          {/* MACD İndikatörü */}
          <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-xl border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>MACD</span>
              </h4>
              {macdData && (
                <Badge className={`${getMACDTrendColor(macdData.trend)} bg-opacity-10`}>
                  {macdData.trend}
                </Badge>
              )}
            </div>
            
            {macdData ? (
              <>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">MACD:</span>
                    <span className={`font-semibold ${getMACDTrendColor(macdData.trend)}`}>
                      {macdData.macd.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Sinyal:</span>
                    <span className="font-semibold text-gray-700">
                      {macdData.signal.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Histogram:</span>
                    <span className={`font-semibold ${
                      macdData.histogram > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {macdData.histogram.toFixed(4)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(macdData.timestamp).toLocaleString('tr-TR')}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">MACD verisi yükleniyor...</p>
              </div>
            )}
          </div>

          {/* Bollinger Bands */}
          <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                <TrendingDown className="h-4 w-4 text-purple-600" />
                <span>Bollinger</span>
              </h4>
              {bollingerData && (
                <div className="flex items-center space-x-2">
                  <Badge className={getBollingerPositionBadge(bollingerData.position)}>
                    {getPositionText(bollingerData.position)}
                  </Badge>
                  {bollingerData.squeeze && (
                    <Badge className="bg-orange-100 text-orange-800">
                      Squeeze
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            {bollingerData ? (
              <>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Üst:</span>
                    <span className="font-semibold text-red-600">
                      {bollingerData.upper.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Orta:</span>
                    <span className="font-semibold text-blue-600">
                      {bollingerData.middle.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Alt:</span>
                    <span className="font-semibold text-green-600">
                      {bollingerData.lower.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(bollingerData.timestamp).toLocaleString('tr-TR')}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Bollinger verisi yükleniyor...</p>
              </div>
            )}
          </div>
        </div>
        
        {lastUpdateTime && (
          <div className="mt-6 text-center text-xs text-gray-500">
            Son güncelleme: {lastUpdateTime.toLocaleTimeString('tr-TR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TechnicalIndicatorsCard.displayName = 'TechnicalIndicatorsCard';

export default TechnicalIndicatorsCard;