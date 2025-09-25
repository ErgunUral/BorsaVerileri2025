import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  Shield,
  AlertTriangle,
  BarChart3,
  Brain,
  RefreshCw,
  DollarSign,
  PieChart,
  Activity,
  Clock,
  Star,
  Info
} from 'lucide-react';
import useTradingSignals, {
  TradingSignal,
  MarketData,
  PortfolioContext,
  MarketSentiment,
  RiskAnalysis
} from '../hooks/useTradingSignals';

interface TradingSignalsProps {
  symbols?: string[];
  marketData?: Record<string, MarketData>;
  portfolioContext?: PortfolioContext;
  autoRefresh?: boolean;
  refreshInterval?: number; // minutes
}

const TradingSignals: React.FC<TradingSignalsProps> = ({
  symbols = [],
  marketData = {},
  portfolioContext,
  autoRefresh = false,
  refreshInterval = 15
}) => {
  const {
    signals,
    signalsSummary,
    portfolioRecommendation,
    marketSentiment,
    riskAnalysis,
    signalPerformance,
    isLoading,
    error,
    generateMultipleSignals,
    generatePortfolioRecommendation,
    analyzeMarketSentiment,
    analyzeRisk,
    getSignalPerformance,
    clearError,
    getSignalsByAction,
    getHighConfidenceSignals,
    calculatePortfolioMetrics
  } = useTradingSignals();

  const [activeTab, setActiveTab] = useState('signals');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleRefreshAll = useCallback(async () => {
    if (symbols.length === 0 || Object.keys(marketData).length === 0) {
      console.debug('TradingSignals: Skipping refresh - no symbols or market data');
      return;
    }

    // Rate limiting kontrolü
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefresh.getTime();
    const minInterval = 2 * 60 * 1000; // 2 dakika minimum
    
    if (timeSinceLastRefresh < minInterval) {
      console.debug('TradingSignals: Skipping refresh due to rate limiting. Time since last:', timeSinceLastRefresh, 'ms');
      return;
    }

    try {
      console.debug('TradingSignals: Starting data refresh for symbols:', symbols);
      
      // Sıralı API çağrıları (paralel değil) - rate limiting için
      console.debug('TradingSignals: Step 1 - Generating signals');
      await generateMultipleSignals(symbols, marketData, portfolioContext);
      
      // 1 saniye bekle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.debug('TradingSignals: Step 2 - Analyzing market sentiment');
      await analyzeMarketSentiment(symbols, marketData);
      
      // Portfolio analysis sadece gerektiğinde
      if (portfolioContext) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.debug('TradingSignals: Step 3 - Portfolio recommendation');
        await generatePortfolioRecommendation(portfolioContext, marketData);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.debug('TradingSignals: Step 4 - Risk analysis');
        await analyzeRisk(portfolioContext, marketData);
      }
      
      setLastRefresh(new Date());
      console.debug('TradingSignals: Data refresh completed successfully at:', new Date().toISOString());
    } catch (error) {
      console.error('TradingSignals: Error during data refresh:', error);
      
      // 429 hatası kontrolü
      if (error instanceof Error && error.message.includes('429')) {
        console.warn('TradingSignals: Rate limit hit, will wait before next refresh');
        // Bir sonraki refresh'i 5 dakika ertele
        setLastRefresh(new Date(Date.now() + 3 * 60 * 1000));
      }
      
      console.error('TradingSignals: Error details:', {
        symbols,
        marketDataKeys: Object.keys(marketData),
        portfolioContext,
        timestamp: new Date().toISOString(),
        timeSinceLastRefresh
      });
    }
  }, [symbols, marketData, portfolioContext, generateMultipleSignals, analyzeMarketSentiment, generatePortfolioRecommendation, analyzeRisk, lastRefresh]);

  // Auto refresh functionality with rate limiting
  useEffect(() => {
    if (!autoRefresh || symbols.length === 0) return;

    // Minimum 5 dakika aralık (rate limiting için)
    const safeInterval = Math.max(refreshInterval, 5);
    
    console.debug('TradingSignals: Setting up auto-refresh with interval:', safeInterval, 'minutes');
    
    const interval = setInterval(() => {
      console.debug('TradingSignals: Auto-refresh triggered');
      handleRefreshAll();
    }, safeInterval * 60 * 1000);

    return () => {
      console.debug('TradingSignals: Clearing auto-refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval, symbols, handleRefreshAll]);

  // Initial data load
  useEffect(() => {
    if (symbols.length > 0 && Object.keys(marketData).length > 0) {
      handleRefreshAll();
    }
  }, [symbols, marketData, handleRefreshAll]);

  const handleGetPerformance = useCallback(async (symbol: string) => {
    await getSignalPerformance(symbol, 30);
  }, [getSignalPerformance]);

  const getActionIcon = (action: 'BUY' | 'SELL' | 'HOLD') => {
    switch (action) {
      case 'BUY':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'SELL':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'HOLD':
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getActionColor = (action: 'BUY' | 'SELL' | 'HOLD') => {
    switch (action) {
      case 'BUY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'SELL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HOLD':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStrengthColor = (strength: 'WEAK' | 'MODERATE' | 'STRONG') => {
    switch (strength) {
      case 'STRONG':
        return 'bg-green-100 text-green-800';
      case 'MODERATE':
        return 'bg-yellow-100 text-yellow-800';
      case 'WEAK':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (risk: 'LOW' | 'MEDIUM' | 'HIGH') => {
    switch (risk) {
      case 'LOW':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HIGH':
        return 'bg-red-100 text-red-800';
    }
  };

  const getSentimentIcon = (sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL') => {
    switch (sentiment) {
      case 'BULLISH':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'BEARISH':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'NEUTRAL':
        return <Minus className="h-5 w-5 text-yellow-500" />;
    }
  };

  const renderSignalCard = (signal: TradingSignal) => {
    try {
      // Detaylı null kontrolleri ve logging
      if (!signal) {
        console.error('TradingSignals: Signal is null or undefined');
        return null;
      }
      
      if (!signal.symbol) {
        console.error('TradingSignals: Signal symbol is missing:', signal);
        return null;
      }
      
      // Sayısal değerleri kontrol et ve logla
      const safePrice = signal.price != null && typeof signal.price === 'number' && !isNaN(signal.price) ? signal.price : null;
      const safeTargetPrice = signal.targetPrice != null && typeof signal.targetPrice === 'number' && !isNaN(signal.targetPrice) ? signal.targetPrice : null;
      const safeStopLoss = signal.stopLoss != null && typeof signal.stopLoss === 'number' && !isNaN(signal.stopLoss) ? signal.stopLoss : null;
      const safeConfidence = signal.confidence != null && typeof signal.confidence === 'number' && !isNaN(signal.confidence) ? signal.confidence : 0;
      
      if (safePrice === null) {
        console.warn('TradingSignals: Invalid price for signal:', signal.symbol, 'price:', signal.price);
      }
      
      if (safeTargetPrice === null && signal.targetPrice !== undefined) {
        console.warn('TradingSignals: Invalid targetPrice for signal:', signal.symbol, 'targetPrice:', signal.targetPrice);
      }
      
      if (safeStopLoss === null && signal.stopLoss !== undefined) {
        console.warn('TradingSignals: Invalid stopLoss for signal:', signal.symbol, 'stopLoss:', signal.stopLoss);
      }
      
      return (
    <Card key={signal.symbol} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{signal.symbol}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getActionColor(signal.action)}>
              {getActionIcon(signal.action)}
              <span className="ml-1">{signal.action}</span>
            </Badge>
            <Badge className={getStrengthColor(signal.strength)}>
              {signal.strength}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Güncel Fiyat</p>
              <p className="font-semibold">
                {safePrice !== null ? `${safePrice.toFixed(2)} TL` : 'Fiyat bilgisi yok'}
              </p>
            </div>
          </div>
          
          {safeTargetPrice !== null && (
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Hedef Fiyat</p>
                <p className="font-semibold text-blue-600">
                  {safeTargetPrice.toFixed(2)} TL
                </p>
              </div>
            </div>
          )}
          
          {safeStopLoss !== null && (
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Stop Loss</p>
                <p className="font-semibold text-red-600">
                  {safeStopLoss.toFixed(2)} TL
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm text-gray-600">Güven Seviyesi</p>
              <div className="flex items-center space-x-2">
                <Progress value={safeConfidence} className="w-16" />
                <span className="text-sm font-semibold">{safeConfidence}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Analiz Açıklaması:</p>
          <p className="text-sm bg-gray-50 p-3 rounded-lg">{signal.reasoning}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {signal.technicalFactors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Teknik Faktörler:</p>
              <div className="space-y-1">
                {signal.technicalFactors.map((factor, index) => (
                  <Badge key={index} variant="outline" className="mr-1 mb-1">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {signal.fundamentalFactors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Fundamental Faktörler:</p>
              <div className="space-y-1">
                {signal.fundamentalFactors.map((factor, index) => (
                  <Badge key={index} variant="outline" className="mr-1 mb-1">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-4">
            <Badge className={getRiskColor(signal.riskLevel)}>
              {signal.riskLevel} RİSK
            </Badge>
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{signal.timeframe}</span>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleGetPerformance(signal.symbol)}
            className="text-xs"
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            Performans
          </Button>
        </div>
      </CardContent>
    </Card>
      );
    } catch (error) {
      console.error('TradingSignals: Error rendering signal card:', error, signal);
      return (
        <Card key={signal?.symbol || 'error'} className="mb-4 border-red-200">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 text-sm">Sinyal kartı yüklenirken hata oluştu</p>
            <p className="text-gray-500 text-xs mt-1">{signal?.symbol || 'Bilinmeyen sembol'}</p>
          </CardContent>
        </Card>
      );
    }
  };

  const renderMarketSentiment = () => {
    if (!marketSentiment) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Piyasa Sentiment Analizi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {getSentimentIcon(marketSentiment.overallSentiment)}
              </div>
              <h3 className="font-semibold text-lg">{marketSentiment.overallSentiment}</h3>
              <p className="text-sm text-gray-600">Genel Sentiment</p>
              <div className="mt-2">
                <Progress value={marketSentiment.confidence} className="w-full" />
                <p className="text-xs text-gray-500 mt-1">{marketSentiment.confidence}% güven</p>
              </div>
            </div>
            
            <div className="text-center">
              <PieChart className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <h3 className="font-semibold text-lg">{marketSentiment.distribution.totalSignals}</h3>
              <p className="text-sm text-gray-600">Toplam Sinyal</p>
              <div className="text-xs text-gray-500 mt-1">
                <span className="text-green-600">{marketSentiment.distribution.bullish} Alış</span> |
                <span className="text-red-600"> {marketSentiment.distribution.bearish} Satış</span> |
                <span className="text-yellow-600"> {marketSentiment.distribution.neutral} Bekle</span>
              </div>
            </div>
            
            <div className="text-center">
              <Activity className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <h3 className="font-semibold text-lg">{marketSentiment.marketFactors.volatilityLevel}</h3>
              <p className="text-sm text-gray-600">Volatilite Seviyesi</p>
              <Badge className={getRiskColor(marketSentiment.marketFactors.riskLevel)} variant="outline">
                {marketSentiment.marketFactors.riskLevel} Risk
              </Badge>
            </div>
          </div>
          
          {marketSentiment.strongSignals.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Güçlü Sinyaller</h4>
              <div className="space-y-2">
                {marketSentiment.strongSignals.map((signal, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge className={getActionColor(signal.action)}>
                        {getActionIcon(signal.action)}
                        <span className="ml-1">{signal.action}</span>
                      </Badge>
                      <span className="font-semibold">{signal.symbol}</span>
                      <span className="text-sm text-gray-600">{signal.confidence}% güven</span>
                    </div>
                    <p className="text-sm text-gray-600 max-w-xs truncate">{signal.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRiskAnalysis = () => {
    if (!riskAnalysis) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Risk Analizi</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{riskAnalysis.riskScore}</div>
              <p className="text-sm text-gray-600">Risk Skoru</p>
              <Badge className={getRiskColor(riskAnalysis.overallRiskLevel)}>
                {riskAnalysis.overallRiskLevel}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{riskAnalysis.portfolioMetrics.totalPositions}</div>
              <p className="text-sm text-gray-600">Toplam Pozisyon</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{riskAnalysis.portfolioMetrics.concentrationRisk}%</div>
              <p className="text-sm text-gray-600">Konsantrasyon Riski</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{riskAnalysis.portfolioMetrics.cashPercentage}%</div>
              <p className="text-sm text-gray-600">Nakit Oranı</p>
            </div>
          </div>
          
          {riskAnalysis.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Risk Azaltma Önerileri</h4>
              <div className="space-y-2">
                {riskAnalysis.recommendations.map((recommendation, index) => (
                  <Alert key={index}>
                    <Info className="h-4 w-4" />
                    <AlertDescription>{recommendation}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
          
          {riskAnalysis.positionRisks.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Pozisyon Risk Detayları</h4>
              <div className="space-y-2">
                {riskAnalysis.positionRisks.map((position, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="font-semibold">{position.symbol}</span>
                      <Badge className={getRiskColor(position.riskLevel)}>
                        {position.riskLevel}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {position.portfolioWeight != null && typeof position.portfolioWeight === 'number' ? `${position.portfolioWeight.toFixed(1)}% portföy` : 'Portföy ağırlığı bilgisi yok'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{position.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPortfolioRecommendation = () => {
    if (!portfolioRecommendation) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <PieChart className="h-5 w-5" />
            <span>Portföy Önerileri</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Rebalancing Önerileri</h4>
              <div className="space-y-2">
                {portfolioRecommendation.portfolioAdvice.rebalancing.map((advice, index) => (
                  <Alert key={index}>
                    <AlertDescription>{advice}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Piyasa Görünümü</h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  {getSentimentIcon(portfolioRecommendation.marketOutlook.sentiment)}
                  <span className="font-semibold">{portfolioRecommendation.marketOutlook.sentiment}</span>
                </div>
                <p className="text-sm text-gray-600">{portfolioRecommendation.marketOutlook.timeHorizon}</p>
                <div>
                  <p className="text-sm font-semibold mb-2">Anahtar Faktörler:</p>
                  <div className="space-y-1">
                    {portfolioRecommendation.marketOutlook.keyFactors.map((factor, index) => (
                      <Badge key={index} variant="outline" className="mr-1 mb-1">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2">Risk Değerlendirmesi</h4>
            <p className="text-sm text-gray-700">{portfolioRecommendation.portfolioAdvice.riskAssessment}</p>
            <div className="mt-2">
              <span className="text-sm text-gray-600">Çeşitlendirme Skoru: </span>
              <span className="font-semibold">{portfolioRecommendation.portfolioAdvice.diversificationScore}/100</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (symbols.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">AI Trading Sinyalleri</h3>
          <p className="text-gray-600">Analiz için hisse senedi sembolleri ekleyin</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Trading Sinyalleri</h2>
          <p className="text-gray-600">Yapay zeka destekli alım-satım önerileri</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Son güncelleme: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            onClick={handleRefreshAll}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Kapat
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {signalsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Toplam Sinyal</p>
                  <p className="text-2xl font-bold">{signalsSummary.totalSignals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Alış Sinyali</p>
                  <p className="text-2xl font-bold text-green-600">{signalsSummary.buySignals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm text-gray-600">Satış Sinyali</p>
                  <p className="text-2xl font-bold text-red-600">{signalsSummary.sellSignals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-600">Ort. Güven</p>
                  <p className="text-2xl font-bold">
                    {signalsSummary.averageConfidence != null && typeof signalsSummary.averageConfidence === 'number' ? `${signalsSummary.averageConfidence.toFixed(0)}%` : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="signals">Sinyaller</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
          <TabsTrigger value="risk">Risk Analizi</TabsTrigger>
          <TabsTrigger value="portfolio">Portföy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="signals" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">AI sinyalleri üretiliyor...</p>
            </div>
          ) : signals.length > 0 ? (
            <div className="space-y-4">
              {signals.map(renderSignalCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">Henüz sinyal üretilmedi</p>
                <Button onClick={handleRefreshAll} className="mt-4">
                  Sinyalleri Üret
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="sentiment">
          {renderMarketSentiment()}
        </TabsContent>
        
        <TabsContent value="risk">
          {renderRiskAnalysis()}
        </TabsContent>
        
        <TabsContent value="portfolio">
          {renderPortfolioRecommendation()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradingSignals;