import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface CalculationResult {
  name: string;
  value: number;
  formula: string;
  interpretation: string;
  category: string;
}

interface FinancialRatiosCardProps {
  ratios: CalculationResult[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  isCalculating: boolean;
  lastCalculationTime: Date | null;
}

const FinancialRatiosCard: React.FC<FinancialRatiosCardProps> = memo(({
  ratios,
  selectedCategory,
  onCategoryChange,
  isCalculating,
  lastCalculationTime
}) => {
  const categories = ['Tümü', ...Array.from(new Set(ratios.map(r => r.category)))];
  
  const filteredRatios = selectedCategory === 'Tümü' 
    ? ratios 
    : ratios.filter(ratio => ratio.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Likidite': 'bg-blue-100 text-blue-800',
      'Kaldıraç': 'bg-purple-100 text-purple-800',
      'Karlılık': 'bg-green-100 text-green-800',
      'Verimlilik': 'bg-yellow-100 text-yellow-800',
      'Piyasa': 'bg-red-100 text-red-800',
      'Büyüme': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getValueColor = (value: number, category: string) => {
    // Kategori bazında değer renklendirmesi
    if (category === 'Likidite') {
      return value > 1.5 ? 'text-green-600' : value > 1 ? 'text-yellow-600' : 'text-red-600';
    }
    if (category === 'Karlılık') {
      return value > 0.15 ? 'text-green-600' : value > 0.05 ? 'text-yellow-600' : 'text-red-600';
    }
    if (category === 'Kaldıraç') {
      return value < 0.5 ? 'text-green-600' : value < 0.7 ? 'text-yellow-600' : 'text-red-600';
    }
    return 'text-gray-700';
  };

  const getInterpretationIcon = (interpretation: string) => {
    if (interpretation.includes('İyi') || interpretation.includes('Güçlü') || interpretation.includes('Yüksek')) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (interpretation.includes('Zayıf') || interpretation.includes('Düşük') || interpretation.includes('Risk')) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <DollarSign className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <span>Finansal Oranlar</span>
          </CardTitle>
          {isCalculating && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Hesaplanıyor...</span>
            </div>
          )}
        </div>
        
        {/* Kategori Filtreleri */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {filteredRatios.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Bu kategori için hesaplanmış oran bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRatios.map((ratio, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{ratio.name}</h4>
                  <Badge className={getCategoryColor(ratio.category)}>
                    {ratio.category}
                  </Badge>
                </div>
                
                <div className="mb-3">
                  <div className={`text-2xl font-bold ${getValueColor(ratio.value, ratio.category)}`}>
                    {ratio.value.toLocaleString('tr-TR', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 4 
                    })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {ratio.formula}
                  </div>
                </div>
                
                <div className="flex items-start space-x-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    {getInterpretationIcon(ratio.interpretation)}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {ratio.interpretation}
                  </p>
                </div>
                
                {/* Görsel Progress Bar (sadece belirli oranlar için) */}
                {(ratio.category === 'Likidite' || ratio.category === 'Karlılık') && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Zayıf</span>
                      <span>İyi</span>
                      <span>Mükemmel</span>
                    </div>
                    <Progress 
                      value={Math.min(ratio.value * (ratio.category === 'Likidite' ? 50 : 100), 100)} 
                      className="h-2" 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {lastCalculationTime && (
          <div className="mt-6 text-center text-xs text-gray-500">
            Son hesaplama: {lastCalculationTime.toLocaleTimeString('tr-TR')}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

FinancialRatiosCard.displayName = 'FinancialRatiosCard';

export default FinancialRatiosCard;