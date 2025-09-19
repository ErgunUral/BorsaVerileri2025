import React from 'react';
import { Eye, EyeOff, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { FinancialDataField, getFieldByKey, categoryLabels } from '../config/financialFields';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/financialCalculations';

interface StockData {
  [key: string]: number | string | null;
}

interface FinancialDataDisplayProps {
  data: StockData;
  selectedFields: string[];
  onFieldToggle: (fieldKey: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

const FinancialDataDisplay: React.FC<FinancialDataDisplayProps> = ({
  data,
  selectedFields,
  onFieldToggle,
  onSelectAll,
  onDeselectAll
}) => {
  const formatValue = (value: number | string | null, field: FinancialDataField): string => {
    if (value === null || value === undefined || value === '') {
      return field.unit === 'TL' ? '0 TL' : field.unit === '%' ? '%0' : field.unit === 'kat' ? '0x' : '0';
    }
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) || !isFinite(numValue)) {
      return field.unit === 'TL' ? '0 TL' : field.unit === '%' ? '%0' : field.unit === 'kat' ? '0x' : '0';
    }
    
    switch (field.unit) {
      case 'TL':
        return formatCurrency(numValue);
      case '%':
        return formatPercentage(numValue / 100); // Convert to decimal for formatPercentage function
      case 'kat':
        return `${formatNumber(numValue)}x`;
      case 'adet':
        return formatNumber(numValue, 0);
      case 'gün':
        return `${formatNumber(numValue, 0)} gün`;
      default:
        return formatNumber(numValue);
    }
  };
  
  const getValueTrend = (value: number | string | null): 'up' | 'down' | 'neutral' => {
    if (value === null || value === undefined || value === '') {
      return 'neutral';
    }
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return 'neutral';
    }
    
    // Bu basit bir örnek - gerçek uygulamada önceki dönem verileriyle karşılaştırma yapılabilir
    if (numValue > 0) {
      return 'up';
    } else if (numValue < 0) {
      return 'down';
    }
    return 'neutral';
  };
  
  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };
  
  const getValueColor = (value: number | string | null, field: FinancialDataField): string => {
    if (value === null || value === undefined || value === '') {
      return 'text-gray-400';
    }
    
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return 'text-gray-400';
    }
    
    // Finansal metriklere göre renk belirleme
    if (field.key.includes('kar') || field.key.includes('hasılat')) {
      return numValue > 0 ? 'text-green-600' : 'text-red-600';
    }
    
    if (field.key.includes('borç')) {
      return 'text-orange-600';
    }
    
    if (field.key.includes('nakit') || field.key.includes('ozkaynaklar')) {
      return 'text-blue-600';
    }
    
    return 'text-gray-900';
  };
  
  // Kategorilere göre alanları grupla
  const groupedFields = selectedFields.reduce((acc, fieldKey) => {
    const field = getFieldByKey(fieldKey);
    if (field) {
      if (!acc[field.category]) {
        acc[field.category] = [];
      }
      acc[field.category].push(field);
    }
    return acc;
  }, {} as Record<string, FinancialDataField[]>);
  
  const hasData = data && Object.keys(data).length > 0;
  const hasSelectedFields = selectedFields.length > 0;
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          Finansal Veriler
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={onSelectAll}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
          >
            Tümünü Seç
          </button>
          <button
            onClick={onDeselectAll}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Tümünü Kaldır
          </button>
        </div>
      </div>
      
      {!hasData ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <TrendingUp className="h-16 w-16 mx-auto" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Veri Bekleniyor</h4>
          <p className="text-gray-500">Finansal veriler yüklendikten sonra burada görüntülenecek.</p>
        </div>
      ) : !hasSelectedFields ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Eye className="h-16 w-16 mx-auto" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">Alan Seçimi Gerekli</h4>
          <p className="text-gray-500 mb-4">Görüntülemek istediğiniz finansal alanları seçin.</p>
          <button
            onClick={onSelectAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Varsayılan Alanları Seç
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedFields).map(([category, fields]) => (
            <div key={category} className="">
              <h4 className="text-md font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fields.map((field) => {
                  const value = data[field.key];
                  const trend = getValueTrend(value);
                  const valueColor = getValueColor(value, field);
                  
                  return (
                    <div
                      key={field.key}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h5 className="font-medium text-gray-900 text-sm">
                            {field.label}
                          </h5>
                          {getTrendIcon(trend)}
                        </div>
                        <button
                          onClick={() => onFieldToggle(field.key)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                          title="Bu alanı gizle"
                        >
                          <EyeOff className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                      
                      <div className={`text-lg font-bold ${valueColor} mb-2`}>
                        {formatValue(value, field)}
                      </div>
                      
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {field.description}
                      </p>
                      
                      {field.isCalculated ? (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Hesaplanmış
                          </span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {hasData && hasSelectedFields ? (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Bilgi:</strong> Finansal veriler şirketin son raporlanan dönemine aittir. 
            Yatırım kararları vermeden önce en güncel verileri kontrol etmeniz önerilir.
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default FinancialDataDisplay;