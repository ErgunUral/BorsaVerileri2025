import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Target } from 'lucide-react';

interface CalculationResult {
  name: string;
  value: number;
  formula: string;
  interpretation: string;
  category: string;
}

interface Recommendation {
  id: string;
  type: 'buy' | 'sell' | 'hold' | 'warning' | 'info';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  confidence: number;
}

interface AnalysisRecommendationsProps {
  financialRatios: CalculationResult[];
  technicalIndicators?: any;
  marketSentiment?: any;
  riskMetrics?: any;
}

const AnalysisRecommendations: React.FC<AnalysisRecommendationsProps> = ({
  financialRatios,
  technicalIndicators,
  marketSentiment,
  riskMetrics
}) => {
  // Analiz önerilerini hesapla
  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = [];
    
    // Finansal oran analizleri
    financialRatios.forEach((ratio, index) => {
      const id = `ratio_${index}`;
      
      if (ratio.name === 'Cari Oran') {
        if (ratio.value > 2) {
          recs.push({
            id: `${id}_high`,
            type: 'warning',
            title: 'Yüksek Cari Oran',
            description: 'Cari oran çok yüksek. Nakit yönetimini gözden geçirin ve yatırım fırsatlarını değerlendirin.',
            priority: 'medium',
            category: 'Likidite',
            confidence: 85
          });
        } else if (ratio.value < 1) {
          recs.push({
            id: `${id}_low`,
            type: 'sell',
            title: 'Düşük Likidite Riski',
            description: 'Cari oran 1\'in altında. Kısa vadeli ödeme güçlüğü riski var.',
            priority: 'high',
            category: 'Likidite',
            confidence: 90
          });
        } else {
          recs.push({
            id: `${id}_good`,
            type: 'hold',
            title: 'Sağlıklı Likidite',
            description: 'Cari oran ideal seviyede. Likidite durumu sağlıklı.',
            priority: 'low',
            category: 'Likidite',
            confidence: 80
          });
        }
      }
      
      if (ratio.name === 'Özkaynak Karlılığı (ROE)') {
        if (ratio.value > 20) {
          recs.push({
            id: `${id}_excellent`,
            type: 'buy',
            title: 'Mükemmel Karlılık',
            description: 'ROE %20\'nin üzerinde. Güçlü karlılık performansı.',
            priority: 'high',
            category: 'Karlılık',
            confidence: 95
          });
        } else if (ratio.value < 5) {
          recs.push({
            id: `${id}_poor`,
            type: 'warning',
            title: 'Düşük Karlılık',
            description: 'ROE %5\'in altında. Karlılık performansını artırma stratejileri gerekli.',
            priority: 'medium',
            category: 'Karlılık',
            confidence: 85
          });
        }
      }
      
      if (ratio.name === 'Borç Oranı') {
        if (ratio.value > 0.7) {
          recs.push({
            id: `${id}_high_debt`,
            type: 'sell',
            title: 'Yüksek Borç Riski',
            description: 'Borç oranı %70\'in üzerinde. Finansal risk yüksek.',
            priority: 'high',
            category: 'Risk',
            confidence: 90
          });
        } else if (ratio.value < 0.3) {
          recs.push({
            id: `${id}_conservative`,
            type: 'info',
            title: 'Konservatif Borç Yapısı',
            description: 'Düşük borç oranı. Kaldıraç kullanarak büyüme fırsatları değerlendirilebilir.',
            priority: 'low',
            category: 'Strateji',
            confidence: 75
          });
        }
      }
    });
    
    // Teknik analiz önerileri
    if (technicalIndicators) {
      if (technicalIndicators.rsi && technicalIndicators.rsi.current) {
        const rsi = technicalIndicators.rsi.current;
        if (rsi > 70) {
          recs.push({
            id: 'rsi_overbought',
            type: 'sell',
            title: 'RSI Aşırı Alım',
            description: `RSI ${rsi.toFixed(1)} seviyesinde. Aşırı alım bölgesinde, satış sinyali.`,
            priority: 'high',
            category: 'Teknik',
            confidence: 85
          });
        } else if (rsi < 30) {
          recs.push({
            id: 'rsi_oversold',
            type: 'buy',
            title: 'RSI Aşırı Satım',
            description: `RSI ${rsi.toFixed(1)} seviyesinde. Aşırı satım bölgesinde, alım fırsatı.`,
            priority: 'high',
            category: 'Teknik',
            confidence: 85
          });
        }
      }
      
      if (technicalIndicators.macd) {
        const { signal } = technicalIndicators.macd;
        if (signal === 'bullish') {
          recs.push({
            id: 'macd_bullish',
            type: 'buy',
            title: 'MACD Yükseliş Sinyali',
            description: 'MACD çizgisi sinyal çizgisini yukarı kesti. Yükseliş trendi başlayabilir.',
            priority: 'medium',
            category: 'Teknik',
            confidence: 80
          });
        } else if (signal === 'bearish') {
          recs.push({
            id: 'macd_bearish',
            type: 'sell',
            title: 'MACD Düşüş Sinyali',
            description: 'MACD çizgisi sinyal çizgisini aşağı kesti. Düşüş trendi başlayabilir.',
            priority: 'medium',
            category: 'Teknik',
            confidence: 80
          });
        }
      }
    }
    
    // Market sentiment önerileri
    if (marketSentiment && marketSentiment.overall) {
      const sentiment = marketSentiment.overall;
      if (sentiment > 0.7) {
        recs.push({
          id: 'sentiment_positive',
          type: 'buy',
          title: 'Pozitif Market Duyarlılığı',
          description: 'Market duyarlılığı çok pozitif. Yatırım fırsatları değerlendirilebilir.',
          priority: 'medium',
          category: 'Sentiment',
          confidence: 75
        });
      } else if (sentiment < 0.3) {
        recs.push({
          id: 'sentiment_negative',
          type: 'warning',
          title: 'Negatif Market Duyarlılığı',
          description: 'Market duyarlılığı negatif. Dikkatli pozisyon alın.',
          priority: 'medium',
          category: 'Sentiment',
          confidence: 75
        });
      }
    }
    
    // Risk analizi önerileri
    if (riskMetrics) {
      if (riskMetrics.volatility > 0.3) {
        recs.push({
          id: 'high_volatility',
          type: 'warning',
          title: 'Yüksek Volatilite',
          description: 'Volatilite yüksek seviyede. Risk yönetimi stratejileri uygulayın.',
          priority: 'high',
          category: 'Risk',
          confidence: 90
        });
      }
      
      if (riskMetrics.sharpeRatio && riskMetrics.sharpeRatio < 0.5) {
        recs.push({
          id: 'low_sharpe',
          type: 'warning',
          title: 'Düşük Risk-Getiri Oranı',
          description: 'Sharpe oranı düşük. Risk-getiri dengesini gözden geçirin.',
          priority: 'medium',
          category: 'Risk',
          confidence: 80
        });
      }
    }
    
    // Öncelik ve güven skoruna göre sırala
    return recs.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }, [financialRatios, technicalIndicators, marketSentiment, riskMetrics]);
  
  // Öneri tipine göre ikon ve renk
  const getRecommendationStyle = (type: Recommendation['type']) => {
    switch (type) {
      case 'buy':
        return {
          icon: TrendingUp,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          badgeColor: 'bg-green-100 text-green-800'
        };
      case 'sell':
        return {
          icon: TrendingDown,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          iconColor: 'text-red-600',
          badgeColor: 'bg-red-100 text-red-800'
        };
      case 'hold':
        return {
          icon: Target,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          badgeColor: 'bg-blue-100 text-blue-800'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          iconColor: 'text-yellow-600',
          badgeColor: 'bg-yellow-100 text-yellow-800'
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          badgeColor: 'bg-gray-100 text-gray-800'
        };
      default:
        return {
          icon: CheckCircle,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          badgeColor: 'bg-gray-100 text-gray-800'
        };
    }
  };
  
  // Öncelik badge'i
  const getPriorityBadge = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Kategori istatistikleri
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; highPriority: number }> = {};
    
    recommendations.forEach(rec => {
      if (!stats[rec.category]) {
        stats[rec.category] = { count: 0, highPriority: 0 };
      }
      stats[rec.category].count++;
      if (rec.priority === 'high') {
        stats[rec.category].highPriority++;
      }
    });
    
    return stats;
  }, [recommendations]);

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span>Analiz Önerileri</span>
        </h3>
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Henüz analiz önerisi bulunmuyor.</p>
          <p className="text-sm text-gray-400 mt-2">Finansal veriler analiz edildikçe öneriler burada görünecek.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span>Analiz Önerileri</span>
        </h3>
        
        <div className="text-sm text-gray-600">
          {recommendations.length} öneri • {Object.values(categoryStats).reduce((sum, stat) => sum + stat.highPriority, 0)} yüksek öncelik
        </div>
      </div>
      
      {/* Kategori Özeti */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(categoryStats).map(([category, stats]) => (
          <div key={category} className="bg-gray-50 p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-gray-900">{stats.count}</div>
            <div className="text-xs text-gray-600">{category}</div>
            {stats.highPriority > 0 && (
              <div className="text-xs text-red-600 font-medium mt-1">
                {stats.highPriority} acil
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Öneriler Listesi */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {recommendations.map((recommendation) => {
          const style = getRecommendationStyle(recommendation.type);
          const IconComponent = style.icon;
          
          return (
            <div
              key={recommendation.id}
              className={`p-4 rounded-lg border ${style.bgColor} ${style.borderColor} transition-all hover:shadow-md`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${style.iconColor} bg-white`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {recommendation.title}
                    </h4>
                    
                    <div className="flex items-center space-x-2 ml-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(recommendation.priority)}`}>
                        {recommendation.priority === 'high' ? 'Yüksek' : 
                         recommendation.priority === 'medium' ? 'Orta' : 'Düşük'}
                      </span>
                      
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.badgeColor}`}>
                        {recommendation.category}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">
                    {recommendation.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Güven: %{recommendation.confidence}
                    </div>
                    
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${recommendation.confidence}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Genel Değerlendirme */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2 mb-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-blue-900">Genel Değerlendirme</span>
        </div>
        <p className="text-sm text-blue-800">
          {recommendations.filter(r => r.priority === 'high').length > 0
            ? 'Acil dikkat gerektiren durumlar tespit edildi. Yüksek öncelikli önerileri önce değerlendirin.'
            : recommendations.filter(r => r.type === 'buy').length > recommendations.filter(r => r.type === 'sell').length
            ? 'Genel olarak pozitif sinyaller ağırlıkta. Yatırım fırsatları değerlendirilebilir.'
            : 'Karışık sinyaller mevcut. Dikkatli analiz ve risk yönetimi önerilir.'}
        </p>
      </div>
    </div>
  );
};

export default React.memo(AnalysisRecommendations);