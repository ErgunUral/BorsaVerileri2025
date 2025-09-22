import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Shield, Clock, Zap } from 'lucide-react';
import usePatternRecognition, { ChartPattern, PatternAnalysisResult } from '../hooks/usePatternRecognition';

interface PatternRecognitionProps {
  symbol: string;
  onPatternDetected?: (patterns: ChartPattern[]) => void;
}

const PatternRecognition: React.FC<PatternRecognitionProps> = ({ 
  symbol, 
  onPatternDetected 
}) => {
  const {
    analysis,
    summary,
    supportedPatterns,
    loading,
    error,
    analyzePatterns,
    getPatternSummary,
    getSupportedPatterns,
    clearError,
    getConfidenceLevel,
    getRiskColor,
    getTrendColor,
    getRecommendationColor
  } = usePatternRecognition();

  const [analysisMode, setAnalysisMode] = useState<'summary' | 'detailed'>('summary');
  const [days, setDays] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Otomatik yenileme
  useEffect(() => {
    if (autoRefresh && symbol) {
      const interval = setInterval(() => {
        if (analysisMode === 'summary') {
          getPatternSummary(symbol);
        } else {
          analyzePatterns(symbol, days, true);
        }
      }, 5 * 60 * 1000); // 5 dakikada bir
      
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh, symbol, analysisMode, days, analyzePatterns, getPatternSummary]);

  // Pattern tespit edildiğinde callback çağır
  useEffect(() => {
    if (analysis?.patterns && onPatternDetected) {
      onPatternDetected(analysis.patterns);
    }
  }, [analysis?.patterns, onPatternDetected]);

  // Desteklenen pattern'ları yükle
  useEffect(() => {
    getSupportedPatterns();
  }, [getSupportedPatterns]);

  const handleAnalyze = async () => {
    if (!symbol) return;
    
    if (analysisMode === 'summary') {
      await getPatternSummary(symbol);
    } else {
      await analyzePatterns(symbol, days, true);
    }
  };

  const renderTrendIcon = (trend: string) => {
    switch (trend) {
      case 'BULLISH':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'BEARISH':
        return <TrendingDown className="w-5 h-5 text-red-600" />;
      default:
        return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const renderPatternCard = (pattern: ChartPattern, index: number) => (
    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          {renderTrendIcon(pattern.direction)}
          <h4 className="font-semibold text-gray-900">{pattern.name}</h4>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            pattern.confidence >= 0.7 ? 'bg-green-100 text-green-800' :
            pattern.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {Math.round(pattern.confidence * 100)}%
          </span>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 mb-3">{pattern.description}</p>
      
      {pattern.keyLevels && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          {pattern.keyLevels.support && (
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Destek:</span>
              <span className="font-medium">{pattern.keyLevels.support.toFixed(2)} ₺</span>
            </div>
          )}
          {pattern.keyLevels.resistance && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-gray-600">Direnç:</span>
              <span className="font-medium">{pattern.keyLevels.resistance.toFixed(2)} ₺</span>
            </div>
          )}
          {pattern.keyLevels.target && (
            <div className="flex items-center space-x-1">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Hedef:</span>
              <span className="font-medium">{pattern.keyLevels.target.toFixed(2)} ₺</span>
            </div>
          )}
          {pattern.keyLevels.stopLoss && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-gray-600">Stop:</span>
              <span className="font-medium">{pattern.keyLevels.stopLoss.toFixed(2)} ₺</span>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Zaman Dilimi: {pattern.timeframe}</span>
          {pattern.completionDate && (
            <span>Tamamlanma: {new Date(pattern.completionDate).toLocaleDateString('tr-TR')}</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderSummaryView = () => {
    if (!summary) return null;
    
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Hızlı Pattern Analizi</h3>
            <div className="flex items-center space-x-2">
              {renderTrendIcon(summary.quickAnalysis.trend)}
              <span className={`font-medium ${getTrendColor(summary.quickAnalysis.trend)}`}>
                {summary.quickAnalysis.trend === 'BULLISH' ? 'Yükseliş' :
                 summary.quickAnalysis.trend === 'BEARISH' ? 'Düşüş' : 'Nötr'}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {summary.currentPrice.toFixed(2)} ₺
              </div>
              <div className="text-sm text-gray-600">Güncel Fiyat</div>
            </div>
            
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                summary.quickAnalysis.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.quickAnalysis.priceChange >= 0 ? '+' : ''}
                {summary.quickAnalysis.priceChange.toFixed(2)}%
              </div>
              <div className="text-sm text-gray-600">Değişim</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-bold px-3 py-1 rounded-full ${
                getRecommendationColor(summary.quickAnalysis.recommendation)
              }`}>
                {summary.quickAnalysis.recommendation === 'BUY' ? 'AL' :
                 summary.quickAnalysis.recommendation === 'SELL' ? 'SAT' : 'BEKLE'}
              </div>
              <div className="text-sm text-gray-600 mt-1">Öneri</div>
            </div>
            
            <div className="text-center">
              <div className={`text-lg font-bold ${getRiskColor(summary.quickAnalysis.riskLevel)}`}>
                {summary.quickAnalysis.riskLevel === 'LOW' ? 'Düşük' :
                 summary.quickAnalysis.riskLevel === 'MEDIUM' ? 'Orta' : 'Yüksek'}
              </div>
              <div className="text-sm text-gray-600">Risk</div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Güven Seviyesi:</span>
              <span className="font-medium">
                {getConfidenceLevel(summary.quickAnalysis.confidence)} 
                ({Math.round(summary.quickAnalysis.confidence * 100)}%)
              </span>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-blue-100 rounded-lg">
            <p className="text-sm text-blue-800">{summary.note}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedView = () => {
    if (!analysis) return null;
    
    return (
      <div className="space-y-6">
        {/* Genel Analiz Özeti */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Pattern Analizi</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                {renderTrendIcon(analysis.overallTrend)}
                <span className={`font-semibold ${getTrendColor(analysis.overallTrend)}`}>
                  {analysis.overallTrend === 'BULLISH' ? 'Yükseliş Trendi' :
                   analysis.overallTrend === 'BEARISH' ? 'Düşüş Trendi' : 'Yatay Trend'}
                </span>
              </div>
              <div className="text-sm text-gray-600">Genel Trend</div>
            </div>
            
            <div className="text-center">
              <div className={`text-xl font-bold px-4 py-2 rounded-full ${
                getRecommendationColor(analysis.recommendation)
              }`}>
                {analysis.recommendation === 'BUY' ? 'ALIM ÖNERİSİ' :
                 analysis.recommendation === 'SELL' ? 'SATIM ÖNERİSİ' : 'BEKLE'}
              </div>
              <div className="text-sm text-gray-600 mt-1">AI Önerisi</div>
            </div>
            
            <div className="text-center">
              <div className={`text-xl font-bold ${getRiskColor(analysis.riskLevel)}`}>
                {analysis.riskLevel === 'LOW' ? 'DÜŞÜK RİSK' :
                 analysis.riskLevel === 'MEDIUM' ? 'ORTA RİSK' : 'YÜKSEK RİSK'}
              </div>
              <div className="text-sm text-gray-600">Risk Seviyesi</div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">AI Analiz Raporu:</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.analysis}</p>
          </div>
          
          {analysis.warnings.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">Uyarılar:</h4>
              </div>
              <ul className="list-disc list-inside space-y-1">
                {analysis.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Tespit Edilen Pattern'lar */}
        {analysis.patterns.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tespit Edilen Formasyonlar ({analysis.patterns.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.patterns.map((pattern, index) => renderPatternCard(pattern, index))}
            </div>
          </div>
        )}
        
        {/* Anahtar Seviyeler */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Anahtar Seviyeler</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-3 flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Destek Seviyeleri</span>
              </h4>
              <div className="space-y-2">
                {analysis.keyLevels.support.map((level, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm text-gray-600">Seviye {index + 1}:</span>
                    <span className="font-medium text-green-700">{level.toFixed(2)} ₺</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-red-700 mb-3 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span>Direnç Seviyeleri</span>
              </h4>
              <div className="space-y-2">
                {analysis.keyLevels.resistance.map((level, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <span className="text-sm text-gray-600">Seviye {index + 1}:</span>
                    <span className="font-medium text-red-700">{level.toFixed(2)} ₺</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {analysis.nextTargets && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-blue-700 mb-3 flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Sonraki Hedefler</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.nextTargets.bullish && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm text-gray-600">Yükseliş Hedefi:</div>
                    <div className="text-lg font-bold text-green-700">
                      {analysis.nextTargets.bullish.toFixed(2)} ₺
                    </div>
                  </div>
                )}
                {analysis.nextTargets.bearish && (
                  <div className="p-3 bg-red-50 rounded-lg">
                    <div className="text-sm text-gray-600">Düşüş Hedefi:</div>
                    <div className="text-lg font-bold text-red-700">
                      {analysis.nextTargets.bearish.toFixed(2)} ₺
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Kontrol Paneli */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">AI Pattern Recognition</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                autoRefresh 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Zap className={`w-4 h-4 ${autoRefresh ? 'text-green-600' : 'text-gray-600'}`} />
              <span>{autoRefresh ? 'Otomatik Açık' : 'Otomatik Kapalı'}</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Analiz Modu:</label>
            <select
              value={analysisMode}
              onChange={(e) => setAnalysisMode(e.target.value as 'summary' | 'detailed')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="summary">Hızlı Özet</option>
              <option value="detailed">Detaylı Analiz</option>
            </select>
          </div>
          
          {analysisMode === 'detailed' && (
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Gün Sayısı:</label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value={30}>30 Gün</option>
                <option value={50}>50 Gün</option>
                <option value={100}>100 Gün</option>
                <option value={200}>200 Gün</option>
              </select>
            </div>
          )}
          
          <button
            onClick={handleAnalyze}
            disabled={loading || !symbol}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Brain className="w-4 h-4" />
            <span>{loading ? 'Analiz Ediliyor...' : 'Analiz Et'}</span>
          </button>
        </div>
      </div>
      
      {/* Hata Mesajı */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">Hata:</span>
              <span className="text-red-700">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Loading */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 font-medium">
              {analysisMode === 'summary' ? 'Hızlı analiz yapılıyor...' : 'AI detaylı analiz yapıyor...'}
            </span>
          </div>
        </div>
      )}
      
      {/* Sonuçlar */}
      {analysisMode === 'summary' ? renderSummaryView() : renderDetailedView()}
      
      {/* Desteklenen Pattern'lar */}
      {supportedPatterns.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Desteklenen Formasyonlar ({supportedPatterns.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {supportedPatterns.map((pattern, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{pattern.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    pattern.direction === 'BULLISH' ? 'bg-green-100 text-green-800' :
                    pattern.direction === 'BEARISH' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {pattern.direction}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{pattern.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternRecognition;