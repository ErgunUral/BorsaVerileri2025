import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Activity, 
  Target,
  BarChart3,
  RefreshCw,
  Zap
} from 'lucide-react';

interface RiskMetrics {
  volatility: number; // percentage
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number; // percentage
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  correlationToMarket: number;
  liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  creditRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
}

interface RiskAnalysisCardProps {
  riskData: RiskMetrics | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  symbol: string;
}

const RiskAnalysisCard: React.FC<RiskAnalysisCardProps> = memo(({
  riskData,
  isLoading,
  error,
  onRefresh,
  symbol
}) => {
  const getVolatilityLevel = (volatility: number) => {
    if (volatility >= 30) return { level: 'Yüksek', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (volatility >= 15) return { level: 'Orta', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Düşük', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  const getBetaInterpretation = (beta: number) => {
    if (beta > 1.2) return { text: 'Yüksek Risk', color: 'text-red-600' };
    if (beta > 0.8) return { text: 'Orta Risk', color: 'text-yellow-600' };
    return { text: 'Düşük Risk', color: 'text-green-600' };
  };

  const getSharpeRating = (sharpe: number) => {
    if (sharpe >= 2) return { rating: 'Mükemmel', color: 'text-green-600' };
    if (sharpe >= 1) return { rating: 'İyi', color: 'text-blue-600' };
    if (sharpe >= 0) return { rating: 'Kabul Edilebilir', color: 'text-yellow-600' };
    return { rating: 'Zayıf', color: 'text-red-600' };
  };

  const getRiskLevelBadge = (level: string) => {
    const colors = {
      'LOW': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-red-100 text-red-800'
    };
    const texts = {
      'LOW': 'Düşük',
      'MEDIUM': 'Orta',
      'HIGH': 'Yüksek'
    };
    return {
      color: colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800',
      text: texts[level as keyof typeof texts] || 'Bilinmiyor'
    };
  };

  const getOverallRiskScore = (data: RiskMetrics) => {
    let score = 0;
    
    // Volatility (0-40 points)
    if (data.volatility >= 30) score += 40;
    else if (data.volatility >= 15) score += 25;
    else score += 10;
    
    // Beta (0-30 points)
    if (data.beta > 1.2) score += 30;
    else if (data.beta > 0.8) score += 20;
    else score += 10;
    
    // Sharpe Ratio (0-20 points, inverse)
    if (data.sharpeRatio < 0) score += 20;
    else if (data.sharpeRatio < 1) score += 15;
    else if (data.sharpeRatio < 2) score += 5;
    
    // Liquidity Risk (0-10 points)
    if (data.liquidityRisk === 'HIGH') score += 10;
    else if (data.liquidityRisk === 'MEDIUM') score += 5;
    
    return Math.min(score, 100);
  };

  const getOverallRiskLevel = (score: number) => {
    if (score >= 70) return { level: 'Yüksek Risk', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (score >= 40) return { level: 'Orta Risk', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Düşük Risk', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  if (error) {
    return (
      <Card className="bg-white shadow-lg border-red-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-red-700 flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Risk Analizi - Hata</span>
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
            <Shield className="h-5 w-5 text-orange-600" />
            <span>Risk Analizi - {symbol}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {isLoading && (
              <div className="flex items-center space-x-2 text-sm text-orange-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                <span>Güncelleniyor...</span>
              </div>
            )}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors text-sm"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {riskData ? (
          <div className="space-y-6">
            {/* Genel Risk Skoru */}
            {(() => {
              const riskScore = getOverallRiskScore(riskData);
              const riskLevel = getOverallRiskLevel(riskScore);
              return (
                <div className={`bg-gradient-to-br from-orange-50 to-white p-4 rounded-xl border border-orange-200`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 flex items-center space-x-2">
                      <Target className="h-4 w-4 text-orange-600" />
                      <span>Genel Risk Skoru</span>
                    </h4>
                    <Badge className={riskLevel.bgColor + ' ' + riskLevel.color}>
                      {riskLevel.level}
                    </Badge>
                  </div>
                  
                  <div className={`text-3xl font-bold mb-3 ${riskLevel.color}`}>
                    {riskScore}/100
                  </div>
                  
                  <Progress value={riskScore} className="h-3 mb-2" />
                  
                  <div className="text-sm text-gray-600">
                    Risk skoru volatilite, beta, Sharpe oranı ve likidite riskine dayalıdır
                  </div>
                </div>
              );
            })()}

            {/* Risk Metrikleri */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Volatilite */}
              <div className="bg-gradient-to-br from-red-50 to-white p-4 rounded-xl border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-red-600" />
                    <span>Volatilite</span>
                  </h5>
                  <Badge className={getVolatilityLevel(riskData.volatility).bgColor + ' ' + getVolatilityLevel(riskData.volatility).color}>
                    {getVolatilityLevel(riskData.volatility).level}
                  </Badge>
                </div>
                <div className={`text-2xl font-bold mb-2 ${getVolatilityLevel(riskData.volatility).color}`}>
                  %{riskData.volatility.toFixed(1)}
                </div>
                <Progress value={Math.min(riskData.volatility * 2, 100)} className="h-2" />
              </div>

              {/* Beta */}
              <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span>Beta</span>
                  </h5>
                  <Badge className={getBetaInterpretation(riskData.beta).color + ' bg-opacity-10'}>
                    {getBetaInterpretation(riskData.beta).text}
                  </Badge>
                </div>
                <div className={`text-2xl font-bold mb-2 ${getBetaInterpretation(riskData.beta).color}`}>
                  {riskData.beta.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  Piyasa ile korelasyon
                </div>
              </div>

              {/* Sharpe Ratio */}
              <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-xl border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    <span>Sharpe Oranı</span>
                  </h5>
                  <Badge className={getSharpeRating(riskData.sharpeRatio).color + ' bg-opacity-10'}>
                    {getSharpeRating(riskData.sharpeRatio).rating}
                  </Badge>
                </div>
                <div className={`text-2xl font-bold mb-2 ${getSharpeRating(riskData.sharpeRatio).color}`}>
                  {riskData.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  Risk-ayarlı getiri
                </div>
              </div>
            </div>

            {/* Value at Risk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl border border-purple-200">
                <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-purple-600" />
                  <span>Value at Risk</span>
                </h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">VaR 95%:</span>
                    <span className="font-semibold text-purple-600">
                      %{riskData.var95.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">VaR 99%:</span>
                    <span className="font-semibold text-purple-700">
                      %{riskData.var99.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Max Drawdown:</span>
                    <span className="font-semibold text-red-600">
                      %{riskData.maxDrawdown.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-200">
                <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span>Risk Kategorileri</span>
                </h5>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Likidite Riski:</span>
                    <Badge className={getRiskLevelBadge(riskData.liquidityRisk).color}>
                      {getRiskLevelBadge(riskData.liquidityRisk).text}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Kredi Riski:</span>
                    <Badge className={getRiskLevelBadge(riskData.creditRisk).color}>
                      {getRiskLevelBadge(riskData.creditRisk).text}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Piyasa Korelasyonu:</span>
                    <span className="font-semibold text-indigo-600">
                      {riskData.correlationToMarket.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-gray-500">
              Son güncelleme: {new Date(riskData.timestamp).toLocaleString('tr-TR')}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">Risk analizi verisi yükleniyor...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

RiskAnalysisCard.displayName = 'RiskAnalysisCard';

export default RiskAnalysisCard;