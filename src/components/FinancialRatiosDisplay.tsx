import React from 'react';
import { BarChart3, TrendingUp, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { CalculationResult, formatValue } from '../utils/financialCalculations';

interface FinancialRatiosDisplayProps {
  calculations: CalculationResult[];
  stockSymbol: string;
}

const FinancialRatiosDisplay: React.FC<FinancialRatiosDisplayProps> = ({ 
  calculations, 
  stockSymbol 
}) => {
  const getCategoryIcon = (category: CalculationResult['category']) => {
    switch (category) {
      case 'liquidity':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'leverage':
        return <BarChart3 className="h-5 w-5 text-orange-600" />;
      case 'profitability':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'efficiency':
        return <BarChart3 className="h-5 w-5 text-purple-600" />;
      case 'market':
        return <TrendingUp className="h-5 w-5 text-indigo-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };
  
  const getCategoryLabel = (category: CalculationResult['category']) => {
    switch (category) {
      case 'liquidity':
        return 'Likidite Oranları';
      case 'leverage':
        return 'Kaldıraç Oranları';
      case 'profitability':
        return 'Karlılık Oranları';
      case 'efficiency':
        return 'Verimlilik Oranları';
      case 'market':
        return 'Piyasa Oranları';
      default:
        return 'Diğer Oranlar';
    }
  };
  
  const getCategoryDescription = (category: CalculationResult['category']) => {
    switch (category) {
      case 'liquidity':
        return 'Şirketin kısa vadeli borçlarını ödeme kabiliyetini ölçer';
      case 'leverage':
        return 'Şirketin borç kullanım düzeyini ve finansal riskini gösterir';
      case 'profitability':
        return 'Şirketin kar elde etme kabiliyetini ve verimliliğini ölçer';
      case 'efficiency':
        return 'Şirketin varlıklarını ne kadar verimli kullandığını gösterir';
      case 'market':
        return 'Şirketin piyasa değerlemesi ve yatırımcı algısını yansıtır';
      default:
        return 'Çeşitli finansal göstergeler';
    }
  };
  
  const getResultIcon = (result: CalculationResult) => {
    if (result.value === null || result.value === undefined || isNaN(result.value)) {
      return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
    
    if (result.isGood === undefined) {
      return <Info className="h-4 w-4 text-blue-500" />;
    }
    
    return result.isGood ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <AlertCircle className="h-4 w-4 text-red-500" />
    );
  };
  
  const getResultColor = (result: CalculationResult) => {
    if (result.value === null || result.value === undefined || isNaN(result.value)) {
      return 'text-gray-400';
    }
    
    if (result.isGood === undefined) {
      return 'text-gray-900';
    }
    
    return result.isGood ? 'text-green-600' : 'text-red-600';
  };
  
  const getResultBgColor = (result: CalculationResult) => {
    if (result.value === null || result.value === undefined || isNaN(result.value)) {
      return 'bg-gray-50 border-gray-200';
    }
    
    if (result.isGood === undefined) {
      return 'bg-blue-50 border-blue-200';
    }
    
    return result.isGood ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };
  
  // Kategorilere göre hesaplamaları grupla
  const groupedCalculations = calculations.reduce((acc, calc) => {
    if (!acc[calc.category]) {
      acc[calc.category] = [];
    }
    acc[calc.category].push(calc);
    return acc;
  }, {} as Record<string, CalculationResult[]>);
  
  const categories = Object.keys(groupedCalculations) as CalculationResult['category'][];
  
  if (calculations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span>Finansal Oranlar</span>
        </h3>
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Hesaplama Bekleniyor</h4>
          <p className="text-gray-500">Finansal veriler yüklendikten sonra oranlar hesaplanacak.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <span>Finansal Oranlar</span>
        <span className="text-sm font-normal text-gray-500">({stockSymbol})</span>
      </h3>
      
      <div className="space-y-8">
        {categories.map(category => {
          const categoryCalculations = groupedCalculations[category];
          const validCalculations = categoryCalculations.filter(calc => 
            calc.value !== null && calc.value !== undefined && !isNaN(calc.value)
          );
          const goodCalculations = validCalculations.filter(calc => calc.isGood === true);
          const badCalculations = validCalculations.filter(calc => calc.isGood === false);
          
          return (
            <div key={category} className="">
              {/* Kategori Başlığı */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  {getCategoryIcon(category)}
                  <div>
                    <h4 className="text-md font-semibold text-gray-900">
                      {getCategoryLabel(category)}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {getCategoryDescription(category)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {validCalculations.length}/{categoryCalculations.length} hesaplandı
                  </div>
                  {validCalculations.length > 0 ? (
                    <div className="flex items-center space-x-2 mt-1">
                      {goodCalculations.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {goodCalculations.length} iyi
                        </span>
                      ) : null}
                      {badCalculations.length > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {badCalculations.length} dikkat
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              
              {/* Oranlar Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryCalculations.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      getResultBgColor(result)
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="font-medium text-gray-900 text-sm leading-tight">
                        {result.label}
                      </h5>
                      {getResultIcon(result)}
                    </div>
                    
                    <div className={`text-xl font-bold mb-2 ${getResultColor(result)}`}>
                      {formatValue(result)}
                    </div>
                    
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">
                      {result.description}
                    </p>
                    
                    {result.isGood !== undefined ? (
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          result.isGood ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <span className={`text-xs font-medium ${
                          result.isGood ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {result.isGood ? 'İyi seviyede' : 'Dikkat gerekli'}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Özet İstatistikler */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-900 mb-3">Özet</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{calculations.length}</div>
            <div className="text-xs text-gray-600">Toplam Oran</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {calculations.filter(c => c.isGood === true).length}
            </div>
            <div className="text-xs text-gray-600">İyi Seviyede</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {calculations.filter(c => c.isGood === false).length}
            </div>
            <div className="text-xs text-gray-600">Dikkat Gerekli</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-600">
              {calculations.filter(c => c.value === null || c.value === undefined || isNaN(c.value)).length}
            </div>
            <div className="text-xs text-gray-600">Hesaplanamayan</div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Not:</strong> Finansal oranlar şirketin performansını değerlendirmek için kullanılır. 
          Sektör ortalamaları ve geçmiş performansla karşılaştırma yapılması önerilir.
        </p>
      </div>
    </div>
  );
};

export default FinancialRatiosDisplay;