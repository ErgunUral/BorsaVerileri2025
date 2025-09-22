import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  Users, 
  MessageSquare, 
  BarChart3,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface SentimentData {
  overall: number; // -100 to 100
  bullish: number; // percentage
  bearish: number; // percentage
  neutral: number; // percentage
  confidence: number; // 0 to 100
  volume: number;
  socialMentions: number;
  newsCount: number;
  timestamp: string;
}

interface MarketSentimentCardProps {
  sentimentData: SentimentData | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  symbol: string;
}

const MarketSentimentCard: React.FC<MarketSentimentCardProps> = memo(({
  sentimentData,
  isLoading,
  error,
  onRefresh,
  symbol
}) => {
  const getSentimentColor = (value: number) => {
    if (value >= 20) return 'text-green-600';
    if (value <= -20) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentBadge = (value: number) => {
    if (value >= 50) return { color: 'bg-green-100 text-green-800', text: 'Çok Pozitif' };
    if (value >= 20) return { color: 'bg-green-100 text-green-700', text: 'Pozitif' };
    if (value >= -20) return { color: 'bg-yellow-100 text-yellow-800', text: 'Nötr' };
    if (value >= -50) return { color: 'bg-red-100 text-red-700', text: 'Negatif' };
    return { color: 'bg-red-100 text-red-800', text: 'Çok Negatif' };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <Card className="bg-white shadow-lg border-red-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-700 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Market Sentiment - Hata</span>
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
            <Heart className="h-5 w-5 text-pink-600" />
            <span>Market Sentiment - {symbol}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-pink-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600"></div>
                <span>Güncelleniyor...</span>
              </div>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {sentimentData ? (
          <div className="space-y-6">
            {/* Genel Sentiment */}
            <div className="bg-gradient-to-br from-pink-50 to-white p-4 rounded-xl border border-pink-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-pink-600" />
                  <span>Genel Sentiment</span>
                </h4>
                <Badge className={getSentimentBadge(sentimentData.overall).color}>
                  {getSentimentBadge(sentimentData.overall).text}
                </Badge>
              </div>
              
              <div className={`text-3xl font-bold mb-3 ${getSentimentColor(sentimentData.overall)}`}>
                {sentimentData.overall > 0 ? '+' : ''}{sentimentData.overall.toFixed(1)}
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Çok Negatif (-100)</span>
                  <span>Nötr (0)</span>
                  <span>Çok Pozitif (+100)</span>
                </div>
                <Progress 
                  value={((sentimentData.overall + 100) / 2)} 
                  className="h-2" 
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Güven Seviyesi:</span>
                <span className={`font-semibold ${getConfidenceColor(sentimentData.confidence)}`}>
                  %{sentimentData.confidence.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Sentiment Dağılımı */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-xl border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Boğa</span>
                  </h5>
                </div>
                <div className="text-2xl font-bold text-green-600 mb-2">
                  %{sentimentData.bullish.toFixed(1)}
                </div>
                <Progress value={sentimentData.bullish} className="h-2" />
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-xl border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-yellow-600" />
                    <span>Nötr</span>
                  </h5>
                </div>
                <div className="text-2xl font-bold text-yellow-600 mb-2">
                  %{sentimentData.neutral.toFixed(1)}
                </div>
                <Progress value={sentimentData.neutral} className="h-2" />
              </div>

              <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-xl border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span>Ayı</span>
                  </h5>
                </div>
                <div className="text-2xl font-bold text-red-600 mb-2">
                  %{sentimentData.bearish.toFixed(1)}
                </div>
                <Progress value={sentimentData.bearish} className="h-2" />
              </div>
            </div>

            {/* Aktivite Metrikleri */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900">İşlem Hacmi</span>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {sentimentData.volume.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="font-medium text-gray-900">Sosyal Bahis</span>
                </div>
                <div className="text-xl font-bold text-purple-600">
                  {sentimentData.socialMentions.toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-200">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                  <span className="font-medium text-gray-900">Haber Sayısı</span>
                </div>
                <div className="text-xl font-bold text-indigo-600">
                  {sentimentData.newsCount.toLocaleString('tr-TR')}
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500">
              Son güncelleme: {new Date(sentimentData.timestamp).toLocaleString('tr-TR')}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Market sentiment verisi yükleniyor...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

MarketSentimentCard.displayName = 'MarketSentimentCard';

export default MarketSentimentCard;