import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Shield, Clock, BarChart3, Activity, Zap, Eye, TestTube, Settings } from 'lucide-react';
import { useAdvancedPatterns, FormationPattern, BreakoutSignal, PatternAlert } from '../hooks/useAdvancedPatterns';

interface AdvancedPatternAnalysisProps {
  symbol: string;
  onPatternSelect?: (pattern: FormationPattern) => void;
}

const AdvancedPatternAnalysis: React.FC<AdvancedPatternAnalysisProps> = ({ 
  symbol, 
  onPatternSelect 
}) => {
  const {
    formationAnalysis,
    realTimeData,
    backtestResults,
    supportedPatterns,
    loading,
    error,
    analyzeFormations,
    startRealTimeMonitoring,
    runBacktest,
    getSupportedPatterns,
    clearError,
    formatPattern,
    formatBacktestResults,
    getReliabilityColor,
    getDirectionIcon,
    getRiskColor,
    getAlertColor,
    getCategoryColor,
    getBreakoutStrengthColor
  } = useAdvancedPatterns();

  const [activeTab, setActiveTab] = useState<'formations' | 'realtime' | 'backtest' | 'patterns'>('formations');
  const [analysisOptions, setAnalysisOptions] = useState({
    period: '6M' as '1M' | '3M' | '6M' | '1Y' | '2Y',
    minConfidence: 0.6,
    selectedTypes: [] as string[],
    alertLevel: 'medium' as 'low' | 'medium' | 'high'
  });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // İlk yükleme
  useEffect(() => {
    if (symbol) {
      getSupportedPatterns();
      handleAnalyzeFormations();
    }
  }, [symbol]);

  // Otomatik yenileme
  useEffect(() => {
    if (autoRefresh && activeTab === 'realtime' && symbol) {
      const interval = setInterval(() => {
        startRealTimeMonitoring(symbol, analysisOptions.alertLevel);
      }, 30000); // 30 saniyede bir
      
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
  }, [autoRefresh, activeTab, symbol, analysisOptions.alertLevel]);

  const handleAnalyzeFormations = async () => {
    if (!symbol) return;
    
    await analyzeFormations(symbol, {
      period: analysisOptions.period,
      types: analysisOptions.selectedTypes.length > 0 ? analysisOptions.selectedTypes : undefined,
      minConfidence: analysisOptions.minConfidence
    });
  };

  const handleStartRealTime = async () => {
    if (!symbol) return;
    
    await startRealTimeMonitoring(symbol, analysisOptions.alertLevel);
    setAutoRefresh(true);
  };

  const handleRunBacktest = async () => {
    if (!symbol) return;
    
    await runBacktest(symbol, {
      period: analysisOptions.period
    });
  };

  const renderPatternCard = (pattern: FormationPattern) => {
    const formattedPattern = formatPattern(pattern);
    
    return (
      <div 
        key={`${pattern.type}-${pattern.keyPoints[0]?.index || 0}`}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onPatternSelect?.(pattern)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{formattedPattern.directionIcon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{pattern.name}</h3>
              <p className="text-sm text-gray-500">{pattern.type}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${formattedPattern.reliabilityColor}`}>
              {formattedPattern.confidencePercent}% Güven
            </div>
            {pattern.risk_level && (
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${formattedPattern.riskColor}`}>
                {pattern.risk_level} Risk
              </span>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Yön:</span>
            <span className={`font-medium ${
              pattern.direction === 'BULLISH' ? 'text-green-600' : 
              pattern.direction === 'BEARISH' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {pattern.direction === 'BULLISH' ? 'Yükseliş' : 
               pattern.direction === 'BEARISH' ? 'Düşüş' : 'Nötr'}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Zaman Dilimi:</span>
            <span className="text-gray-900">{formattedPattern.formattedTimeframe}</span>
          </div>
          
          {pattern.trading_suggestion && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Öneri:</span>
              <span className="text-blue-600 font-medium">{pattern.trading_suggestion}</span>
            </div>
          )}
          
          {formattedPattern.hasKeyLevels && (
            <div className="mt-3 p-2 bg-gray-50 rounded">
              <div className="text-xs font-medium text-gray-700 mb-1">Önemli Seviyeler</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {pattern.entryPoint && (
                  <div>
                    <span className="text-gray-500">Giriş:</span>
                    <div className="font-medium">{pattern.entryPoint.toFixed(2)}</div>
                  </div>
                )}
                {pattern.targetPrice && (
                  <div>
                    <span className="text-gray-500">Hedef:</span>
                    <div className="font-medium text-green-600">{pattern.targetPrice.toFixed(2)}</div>
                  </div>
                )}
                {pattern.stopLoss && (
                  <div>
                    <span className="text-gray-500">Stop:</span>
                    <div className="font-medium text-red-600">{pattern.stopLoss.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {pattern.volume_confirmation && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Hacim Onayı
                </span>
              )}
              {pattern.breakout_confirmed && (
                <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  <Zap className="w-3 h-3 mr-1" />
                  Kırılım
                </span>
              )}
            </div>
            <div className={`px-2 py-1 rounded-full ${
              pattern.formation_complete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {pattern.formation_complete ? 'Tamamlandı' : 'Gelişiyor'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBreakoutSignal = (signal: BreakoutSignal, index: number) => (
    <div key={index} className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Zap className={`w-4 h-4 ${
            signal.signal_type === 'BREAKOUT_UP' ? 'text-green-600' : 'text-red-600'
          }`} />
          <span className="font-medium text-gray-900">
            {signal.signal_type === 'BREAKOUT_UP' ? 'Yukarı Kırılım' : 'Aşağı Kırılım'}
          </span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBreakoutStrengthColor(signal.strength)}`}>
          {signal.strength}
        </span>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Pattern:</span>
          <span className="text-gray-900">{signal.pattern_type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Fiyat:</span>
          <span className="text-gray-900 font-medium">{signal.price.toFixed(2)}</span>
        </div>
        {signal.target && (
          <div className="flex justify-between">
            <span className="text-gray-600">Hedef:</span>
            <span className="text-green-600 font-medium">{signal.target.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderAlert = (alert: PatternAlert, index: number) => (
    <div key={index} className={`rounded-lg border p-3 ${getAlertColor(alert.level)}`}>
      <div className="flex items-start space-x-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium">{alert.message}</div>
          {alert.confidence && (
            <div className="text-sm mt-1">Güven: {Math.round(alert.confidence * 100)}%</div>
          )}
        </div>
        <span className="text-xs font-medium">{alert.level}</span>
      </div>
    </div>
  );

  const renderFormationsTab = () => (
    <div className="space-y-6">
      {/* Analiz Seçenekleri */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Analiz Ayarları
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Periyot</label>
            <select 
              value={analysisOptions.period}
              onChange={(e) => setAnalysisOptions(prev => ({ 
                ...prev, 
                period: e.target.value as any 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1M">1 Ay</option>
              <option value="3M">3 Ay</option>
              <option value="6M">6 Ay</option>
              <option value="1Y">1 Yıl</option>
              <option value="2Y">2 Yıl</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min. Güven (%)</label>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.1"
              value={analysisOptions.minConfidence}
              onChange={(e) => setAnalysisOptions(prev => ({ 
                ...prev, 
                minConfidence: parseFloat(e.target.value) 
              }))}
              className="w-full"
            />
            <div className="text-sm text-gray-600 mt-1">
              {Math.round(analysisOptions.minConfidence * 100)}%
            </div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleAnalyzeFormations}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analiz Et
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Pazar Bağlamı */}
      {formationAnalysis?.market_context && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Pazar Bağlamı</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formationAnalysis.market_context.current_price.toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Güncel Fiyat</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formationAnalysis.market_context.trend}
              </div>
              <div className="text-sm text-gray-600">Trend</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {(formationAnalysis.market_context.volatility * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Volatilite</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {formationAnalysis.market_context.volume_trend}
              </div>
              <div className="text-sm text-gray-600">Hacim Trendi</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Pattern'lar */}
      {formationAnalysis && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">
              Tespit Edilen Formasyonlar ({formationAnalysis.patterns_detected})
            </h3>
            <div className="text-sm text-gray-600">
              {formationAnalysis.data_points} veri noktası analiz edildi
            </div>
          </div>
          
          {formationAnalysis.patterns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formationAnalysis.patterns.map(renderPatternCard)}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Belirtilen kriterlere uygun formasyon bulunamadı</p>
              <p className="text-sm mt-1">Güven seviyesini düşürmeyi deneyin</p>
            </div>
          )}
        </div>
      )}
      
      {/* Öneriler */}
      {formationAnalysis?.recommendations && formationAnalysis.recommendations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Analiz Önerileri
          </h3>
          <div className="space-y-2">
            {formationAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-gray-700">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRealTimeTab = () => (
    <div className="space-y-6">
      {/* Kontrol Paneli */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Gerçek Zamanlı Takip
          </h3>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Otomatik Yenileme</span>
            </label>
            <button
              onClick={handleStartRealTime}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              Takibi Başlat
            </button>
          </div>
        </div>
        
        {realTimeData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-lg font-semibold ${
                realTimeData.monitoring_status === 'active' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {realTimeData.monitoring_status === 'active' ? 'Aktif' : 'Pasif'}
              </div>
              <div className="text-sm text-gray-600">Durum</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {realTimeData.active_patterns}
              </div>
              <div className="text-sm text-gray-600">Aktif Pattern</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {realTimeData.breakout_signals.length}
              </div>
              <div className="text-sm text-gray-600">Kırılım Sinyali</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {realTimeData.alerts.length}
              </div>
              <div className="text-sm text-gray-600">Uyarı</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Uyarılar */}
      {realTimeData?.alerts && realTimeData.alerts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Aktif Uyarılar
          </h3>
          <div className="space-y-3">
            {realTimeData.alerts.map(renderAlert)}
          </div>
        </div>
      )}
      
      {/* Kırılım Sinyalleri */}
      {realTimeData?.breakout_signals && realTimeData.breakout_signals.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Kırılım Sinyalleri
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {realTimeData.breakout_signals.map(renderBreakoutSignal)}
          </div>
        </div>
      )}
      
      {/* Aktif Pattern'lar */}
      {realTimeData?.patterns && realTimeData.patterns.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Aktif Formasyonlar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realTimeData.patterns.map(renderPatternCard)}
          </div>
        </div>
      )}
    </div>
  );

  const renderBacktestTab = () => {
    const formattedResults = formatBacktestResults(backtestResults);
    
    return (
      <div className="space-y-6">
        {/* Backtest Kontrolü */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <TestTube className="w-5 h-5 mr-2" />
              Geçmiş Performans Analizi
            </h3>
            <button
              onClick={handleRunBacktest}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Backtest Çalıştır
            </button>
          </div>
        </div>
        
        {/* Backtest Sonuçları */}
        {formattedResults && (
          <>
            {/* Özet Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formattedResults.formattedSuccessRate}
                </div>
                <div className="text-sm text-gray-600">Başarı Oranı</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formattedResults.formattedReturn}
                </div>
                <div className="text-sm text-gray-600">Ortalama Getiri</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formattedResults.results.total_trades}
                </div>
                <div className="text-sm text-gray-600">Toplam İşlem</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formattedResults.profitFactor}
                </div>
                <div className="text-sm text-gray-600">Kar Faktörü</div>
              </div>
            </div>
            
            {/* Detaylı Sonuçlar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Detaylı Analiz</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">İşlem İstatistikleri</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kazanan İşlemler:</span>
                      <span className="text-green-600 font-medium">
                        {backtestResults.results.winning_trades}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kaybeden İşlemler:</span>
                      <span className="text-red-600 font-medium">
                        {backtestResults.results.losing_trades}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Kazanma Oranı:</span>
                      <span className="text-blue-600 font-medium">
                        {formattedResults.winRate}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">En İyi/Kötü Pattern'lar</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">En İyi:</span>
                      <span className="text-green-600 font-medium">
                        {backtestResults.results.best_performing_pattern}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">En Kötü:</span>
                      <span className="text-red-600 font-medium">
                        {backtestResults.results.worst_performing_pattern}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Öneriler */}
            {backtestResults.recommendations && backtestResults.recommendations.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Backtest Önerileri</h3>
                <div className="space-y-2">
                  {backtestResults.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-gray-700">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderPatternsTab = () => (
    <div className="space-y-6">
      {supportedPatterns && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">
            Desteklenen Formasyonlar ({supportedPatterns.total_patterns})
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {supportedPatterns.patterns.map((pattern, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{pattern.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(pattern.category)}`}>
                    {pattern.category}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yön:</span>
                    <span className={`font-medium ${
                      pattern.direction === 'Bullish' ? 'text-green-600' : 
                      pattern.direction === 'Bearish' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {pattern.direction}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Güvenilirlik:</span>
                    <span className={`font-medium ${
                      pattern.reliability === 'High' ? 'text-green-600' : 
                      pattern.reliability === 'Medium-High' ? 'text-blue-600' :
                      pattern.reliability === 'Medium' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {pattern.reliability}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-3">{pattern.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Hata</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'formations', label: 'Formasyonlar', icon: BarChart3 },
            { id: 'realtime', label: 'Gerçek Zamanlı', icon: Activity },
            { id: 'backtest', label: 'Backtest', icon: TestTube },
            { id: 'patterns', label: 'Pattern Türleri', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'formations' && renderFormationsTab()}
      {activeTab === 'realtime' && renderRealTimeTab()}
      {activeTab === 'backtest' && renderBacktestTab()}
      {activeTab === 'patterns' && renderPatternsTab()}
    </div>
  );
};

export default AdvancedPatternAnalysis;