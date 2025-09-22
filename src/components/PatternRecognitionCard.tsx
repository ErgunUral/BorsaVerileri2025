import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Eye, TrendingUp, TrendingDown, AlertTriangle, Target, Zap } from 'lucide-react';

interface PatternData {
  id: string;
  name: string;
  type: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  description: string;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  detectedAt: string;
  status: 'ACTIVE' | 'COMPLETED' | 'INVALIDATED';
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface AdvancedPattern {
  id: string;
  name: string;
  type: 'CONTINUATION' | 'REVERSAL' | 'BREAKOUT';
  confidence: number;
  description: string;
  formation: {
    startDate: string;
    endDate: string;
    keyLevels: number[];
    volume: 'INCREASING' | 'DECREASING' | 'NORMAL';
  };
  prediction: {
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    targetPrice: number;
    probability: number;
    timeHorizon: string;
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface PatternRecognitionCardProps {
  patterns: PatternData[];
  advancedPatterns: AdvancedPattern[];
  isAnalyzing: boolean;
  error: string | null;
  onAnalyze: () => void;
  lastAnalysisTime: Date | null;
  symbol: string;
}

const PatternRecognitionCard: React.FC<PatternRecognitionCardProps> = memo(({
  patterns,
  advancedPatterns,
  isAnalyzing,
  error,
  onAnalyze,
  lastAnalysisTime,
  symbol
}) => {
  const getPatternTypeColor = (type: string) => {
    const colors = {
      'BULLISH': 'bg-green-100 text-green-800',
      'BEARISH': 'bg-red-100 text-red-800',
      'NEUTRAL': 'bg-yellow-100 text-yellow-800',
      'CONTINUATION': 'bg-blue-100 text-blue-800',
      'REVERSAL': 'bg-purple-100 text-purple-800',
      'BREAKOUT': 'bg-orange-100 text-orange-800'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getReliabilityColor = (reliability: string) => {
    const colors = {
      'HIGH': 'text-green-600',
      'MEDIUM': 'text-yellow-600',
      'LOW': 'text-red-600'
    };
    return colors[reliability as keyof typeof colors] || 'text-gray-600';
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-blue-100 text-blue-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'INVALIDATED': 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      'LOW': 'text-green-600',
      'MEDIUM': 'text-yellow-600',
      'HIGH': 'text-red-600'
    };
    return colors[risk as keyof typeof colors] || 'text-gray-600';
  };

  const getPatternIcon = (type: string) => {
    if (type === 'BULLISH' || type === 'CONTINUATION') {
      return <TrendingUp className="h-4 w-4" />;
    }
    if (type === 'BEARISH' || type === 'REVERSAL') {
      return <TrendingDown className="h-4 w-4" />;
    }
    if (type === 'BREAKOUT') {
      return <Zap className="h-4 w-4" />;
    }
    return <Target className="h-4 w-4" />;
  };

  if (error) {
    return (
      <Card className="bg-white shadow-lg border-red-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-700 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Formasyon Analizi - Hata</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={onAnalyze}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Tekrar Analiz Et
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
            <Eye className="h-5 w-5 text-indigo-600" />
            <span>AI Formasyon Analizi - {symbol}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isAnalyzing && (
              <div className="flex items-center space-x-2 text-sm text-indigo-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span>Analiz ediliyor...</span>
              </div>
            )}
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
            >
              Yeniden Analiz Et
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Temel Formasyonlar */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span>Tespit Edilen Formasyonlar</span>
          </h3>
          
          {patterns.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Henüz formasyon tespit edilmedi.</p>
              <p className="text-sm text-gray-400 mt-2">Analiz başlatmak için yukarıdaki butona tıklayın.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {patterns.map((pattern) => (
                <div key={pattern.id} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getPatternIcon(pattern.type)}
                      <h4 className="font-semibold text-gray-900">{pattern.name}</h4>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPatternTypeColor(pattern.type)}>
                        {pattern.type}
                      </Badge>
                      <Badge className={getStatusBadge(pattern.status)}>
                        {pattern.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Güven Seviyesi:</span>
                      <span className={`font-semibold ${getReliabilityColor(pattern.reliability)}`}>
                        {pattern.confidence.toFixed(0)}% ({pattern.reliability})
                      </span>
                    </div>
                    <Progress value={pattern.confidence} className="h-2" />
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                    {pattern.description}
                  </p>
                  
                  {(pattern.targetPrice || pattern.stopLoss) && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {pattern.targetPrice && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Hedef:</span>
                            <span className="font-semibold text-green-600">
                              ₺{pattern.targetPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {pattern.stopLoss && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Stop:</span>
                            <span className="font-semibold text-red-600">
                              ₺{pattern.stopLoss.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Zaman Dilimi: {pattern.timeframe}</span>
                    <span>Tespit: {new Date(pattern.detectedAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gelişmiş Formasyonlar */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>Gelişmiş Formasyon Analizi</span>
          </h3>
          
          {advancedPatterns.length === 0 ? (
            <div className="text-center py-6 bg-purple-50 rounded-lg">
              <Zap className="h-10 w-10 mx-auto mb-3 text-purple-300" />
              <p className="text-purple-600">Gelişmiş formasyon analizi bekleniyor.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {advancedPatterns.map((pattern) => (
                <div key={pattern.id} className="bg-gradient-to-r from-purple-50 to-indigo-50 p-5 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getPatternIcon(pattern.type)}
                      <div>
                        <h4 className="font-semibold text-gray-900">{pattern.name}</h4>
                        <p className="text-sm text-gray-600">{pattern.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPatternTypeColor(pattern.type)}>
                        {pattern.type}
                      </Badge>
                      <Badge className={`${getRiskColor(pattern.riskLevel)} bg-opacity-10`}>
                        {pattern.riskLevel} Risk
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Formasyon Detayları */}
                    <div className="bg-white p-3 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Formasyon Detayları</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Başlangıç:</span>
                          <span>{new Date(pattern.formation.startDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bitiş:</span>
                          <span>{new Date(pattern.formation.endDate).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hacim:</span>
                          <span className={`font-medium ${
                            pattern.formation.volume === 'INCREASING' ? 'text-green-600' :
                            pattern.formation.volume === 'DECREASING' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {pattern.formation.volume === 'INCREASING' ? 'Artıyor' :
                             pattern.formation.volume === 'DECREASING' ? 'Azalıyor' : 'Normal'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Tahmin */}
                    <div className="bg-white p-3 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">AI Tahmini</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Yön:</span>
                          <span className={`font-medium ${
                            pattern.prediction.direction === 'UP' ? 'text-green-600' :
                            pattern.prediction.direction === 'DOWN' ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {pattern.prediction.direction === 'UP' ? 'Yükseliş' :
                             pattern.prediction.direction === 'DOWN' ? 'Düşüş' : 'Yatay'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Hedef:</span>
                          <span className="font-semibold">₺{pattern.prediction.targetPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Olasılık:</span>
                          <span className="font-medium">{pattern.prediction.probability.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Güven ve Zaman */}
                    <div className="bg-white p-3 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Analiz Sonucu</h5>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">Güven:</span>
                            <span className="font-medium">{pattern.confidence.toFixed(0)}%</span>
                          </div>
                          <Progress value={pattern.confidence} className="h-2" />
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Zaman Ufku: </span>
                          <span className="font-medium">{pattern.prediction.timeHorizon}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {lastAnalysisTime && (
          <div className="text-center text-xs text-gray-500">
            Son analiz: {lastAnalysisTime.toLocaleString('tr-TR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

PatternRecognitionCard.displayName = 'PatternRecognitionCard';

export default PatternRecognitionCard;