import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  DollarSign,
  Shield,
  Zap,
  Target
} from 'lucide-react';
import { CalculationResult } from '../utils/financialCalculations';

interface AnalysisRecommendationsProps {
  calculations: CalculationResult[];
  stockSymbol: string;
}

interface Recommendation {
  type: 'positive' | 'negative' | 'warning' | 'info';
  title: string;
  description: string;
  icon: React.ReactNode;
  priority: 'high' | 'medium' | 'low';
}

const AnalysisRecommendations: React.FC<AnalysisRecommendationsProps> = ({ 
  calculations, 
  stockSymbol 
}) => {
  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = [];
    
    // Likidite analizi
    const currentRatio = calculations.find(c => c.label === 'Cari Oran');
    if (currentRatio && currentRatio.value !== null) {
      if (currentRatio.value >= 2.0) {
        recommendations.push({
          type: 'positive',
          title: 'Güçlü Likidite Pozisyonu',
          description: `${stockSymbol} şirketi ${currentRatio.value.toFixed(2)} cari oran ile güçlü bir likidite pozisyonuna sahip. Kısa vadeli borçlarını rahatlıkla karşılayabilir.`,
          icon: <CheckCircle className="h-5 w-5" />,
          priority: 'medium'
        });
      } else if (currentRatio.value < 1.0) {
        recommendations.push({
          type: 'negative',
          title: 'Likidite Riski',
          description: `${stockSymbol} şirketinin cari oranı ${currentRatio.value.toFixed(2)} ile 1'in altında. Kısa vadeli borç ödeme konusunda dikkatli olunmalı.`,
          icon: <AlertTriangle className="h-5 w-5" />,
          priority: 'high'
        });
      }
    }
    
    // Kaldıraç analizi
    const debtToEquity = calculations.find(c => c.label === 'Borç/Özkaynak Oranı');
    if (debtToEquity && debtToEquity.value !== null) {
      if (debtToEquity.value > 2.0) {
        recommendations.push({
          type: 'warning',
          title: 'Yüksek Borçluluk',
          description: `${stockSymbol} şirketinin borç/özkaynak oranı ${debtToEquity.value.toFixed(2)} ile yüksek. Finansal risk artabilir.`,
          icon: <TrendingDown className="h-5 w-5" />,
          priority: 'high'
        });
      } else if (debtToEquity.value < 0.5) {
        recommendations.push({
          type: 'info',
          title: 'Düşük Kaldıraç Kullanımı',
          description: `${stockSymbol} şirketi ${debtToEquity.value.toFixed(2)} borç/özkaynak oranı ile konservatif bir finansman yapısına sahip.`,
          icon: <Shield className="h-5 w-5" />,
          priority: 'low'
        });
      }
    }
    
    // Karlılık analizi
    const roe = calculations.find(c => c.label === 'ROE (Özkaynak Karlılığı)');
    if (roe && roe.value !== null) {
      if (roe.value >= 0.20) {
        recommendations.push({
          type: 'positive',
          title: 'Yüksek Özkaynak Karlılığı',
          description: `${stockSymbol} şirketi %${(roe.value * 100).toFixed(1)} ROE ile özkaynağını çok verimli kullanıyor.`,
          icon: <TrendingUp className="h-5 w-5" />,
          priority: 'high'
        });
      } else if (roe.value < 0.05) {
        recommendations.push({
          type: 'negative',
          title: 'Düşük Özkaynak Karlılığı',
          description: `${stockSymbol} şirketinin ROE'si %${(roe.value * 100).toFixed(1)} ile düşük. Karlılık artırma stratejileri değerlendirilebilir.`,
          icon: <TrendingDown className="h-5 w-5" />,
          priority: 'medium'
        });
      }
    }
    
    const roa = calculations.find(c => c.label === 'ROA (Aktif Karlılığı)');
    if (roa && roa.value !== null) {
      if (roa.value >= 0.10) {
        recommendations.push({
          type: 'positive',
          title: 'Verimli Varlık Kullanımı',
          description: `${stockSymbol} şirketi %${(roa.value * 100).toFixed(1)} ROA ile varlıklarını çok verimli kullanıyor.`,
          icon: <Zap className="h-5 w-5" />,
          priority: 'medium'
        });
      }
    }
    
    // Net kar marjı analizi
    const netMargin = calculations.find(c => c.label === 'Net Kar Marjı');
    if (netMargin && netMargin.value !== null) {
      if (netMargin.value >= 0.15) {
        recommendations.push({
          type: 'positive',
          title: 'Yüksek Kar Marjı',
          description: `${stockSymbol} şirketi %${(netMargin.value * 100).toFixed(1)} net kar marjı ile güçlü bir karlılık gösteriyor.`,
          icon: <DollarSign className="h-5 w-5" />,
          priority: 'medium'
        });
      } else if (netMargin.value < 0.05) {
        recommendations.push({
          type: 'warning',
          title: 'Düşük Kar Marjı',
          description: `${stockSymbol} şirketinin net kar marjı %${(netMargin.value * 100).toFixed(1)} ile düşük. Maliyet optimizasyonu gerekebilir.`,
          icon: <Target className="h-5 w-5" />,
          priority: 'medium'
        });
      }
    }
    
    // Genel değerlendirme
    const positiveCount = recommendations.filter(r => r.type === 'positive').length;
    const negativeCount = recommendations.filter(r => r.type === 'negative').length;
    
    if (positiveCount > negativeCount) {
      recommendations.push({
        type: 'positive',
        title: 'Genel Değerlendirme: Olumlu',
        description: `${stockSymbol} şirketi genel olarak sağlıklı finansal göstergeler sergiliyor. Yatırım için değerlendirilebilir.`,
        icon: <CheckCircle className="h-5 w-5" />,
        priority: 'high'
      });
    } else if (negativeCount > positiveCount) {
      recommendations.push({
        type: 'warning',
        title: 'Genel Değerlendirme: Dikkatli',
        description: `${stockSymbol} şirketinde bazı finansal riskler mevcut. Detaylı analiz yapılması önerilir.`,
        icon: <AlertTriangle className="h-5 w-5" />,
        priority: 'high'
      });
    }
    
    // Öncelik sırasına göre sırala
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };
  
  const recommendations = generateRecommendations();
  
  const getRecommendationStyle = (type: Recommendation['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'negative':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };
  
  const getIconColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const getPriorityBadge = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };
  
  const getPriorityLabel = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'Yüksek';
      case 'medium':
        return 'Orta';
      case 'low':
        return 'Düşük';
    }
  };
  
  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <Info className="h-5 w-5 text-blue-600" />
          <span>Analiz Önerileri</span>
        </h3>
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Henüz yeterli veri bulunmuyor.</p>
          <p className="text-sm text-gray-400 mt-2">Finansal veriler yüklendikten sonra öneriler görüntülenecek.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
        <Info className="h-5 w-5 text-blue-600" />
        <span>Analiz Önerileri</span>
        <span className="text-sm font-normal text-gray-500">({recommendations.length} öneri)</span>
      </h3>
      
      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 ${getRecommendationStyle(recommendation.type)}`}
          >
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 ${getIconColor(recommendation.type)}`}>
                {recommendation.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">
                    {recommendation.title}
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityBadge(recommendation.priority)}`}>
                    {getPriorityLabel(recommendation.priority)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">
                  {recommendation.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 leading-relaxed">
          <strong>Uyarı:</strong> Bu öneriler sadece finansal verilere dayalı otomatik analizlerdir. 
          Yatırım kararları vermeden önce detaylı araştırma yapmanız ve profesyonel danışmanlık almanız önerilir.
        </p>
      </div>
    </div>
  );
};

export default AnalysisRecommendations;