import React, { useState, useMemo } from 'react';
import { 
  RatioAnalysis, 
  RatioCalculationService, 
  MockFinancialDataGenerator 
} from '../services/ratioCalculationService';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  Info, 
  Filter,
  ArrowUpDown
} from 'lucide-react';

interface RatioAnalysisTableProps {
  data?: RatioAnalysis[];
  showTrends?: boolean;
  exportEnabled?: boolean;
}

type SortField = 'period' | 'currentRatio' | 'roe' | 'roa' | 'debtToEquity';
type SortDirection = 'asc' | 'desc';

interface RatioCategory {
  name: string;
  ratios: Array<{
    key: string;
    label: string;
    unit: string;
    getValue: (analysis: RatioAnalysis) => number;
  }>;
}

const RatioAnalysisTable: React.FC<RatioAnalysisTableProps> = ({
  data,
  showTrends = true,
  exportEnabled = true
}) => {
  const [sortField, setSortField] = useState<SortField>('period');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showInterpretations, setShowInterpretations] = useState(false);

  // Mock veri kullan eğer data prop'u yoksa
  const analysisData = useMemo(() => {
    if (data && data.length > 0) {
      return data;
    }
    // Mock veri oluştur
    const mockData = MockFinancialDataGenerator.generateSampleData();
    return RatioCalculationService.analyzeMultiplePeriods(mockData);
  }, [data]);

  // Trend hesapla
  const trends = useMemo(() => {
    return RatioCalculationService.calculateTrends(analysisData);
  }, [analysisData]);

  // Oran kategorileri
  const ratioCategories: RatioCategory[] = [
    {
      name: 'Likidite Oranları',
      ratios: [
        {
          key: 'currentRatio',
          label: 'Cari Oran',
          unit: '',
          getValue: (analysis) => analysis.liquidityRatios.currentRatio
        },
        {
          key: 'quickRatio',
          label: 'Asit-Test Oranı',
          unit: '',
          getValue: (analysis) => analysis.liquidityRatios.quickRatio
        },
        {
          key: 'cashRatio',
          label: 'Nakit Oranı',
          unit: '',
          getValue: (analysis) => analysis.liquidityRatios.cashRatio
        }
      ]
    },
    {
      name: 'Karlılık Oranları',
      ratios: [
        {
          key: 'roe',
          label: 'Özkaynak Karlılığı (ROE)',
          unit: '%',
          getValue: (analysis) => analysis.profitabilityRatios.roe
        },
        {
          key: 'roa',
          label: 'Aktif Karlılığı (ROA)',
          unit: '%',
          getValue: (analysis) => analysis.profitabilityRatios.roa
        },
        {
          key: 'netProfitMargin',
          label: 'Net Kar Marjı',
          unit: '%',
          getValue: (analysis) => analysis.profitabilityRatios.netProfitMargin
        },
        {
          key: 'grossProfitMargin',
          label: 'Brüt Kar Marjı',
          unit: '%',
          getValue: (analysis) => analysis.profitabilityRatios.grossProfitMargin
        }
      ]
    },
    {
      name: 'Borç Oranları',
      ratios: [
        {
          key: 'debtToEquity',
          label: 'Borç/Özkaynak',
          unit: '',
          getValue: (analysis) => analysis.leverageRatios.debtToEquity
        },
        {
          key: 'debtToAssets',
          label: 'Borç/Toplam Aktif',
          unit: '',
          getValue: (analysis) => analysis.leverageRatios.debtToAssets
        },
        {
          key: 'equityRatio',
          label: 'Özkaynak Oranı',
          unit: '',
          getValue: (analysis) => analysis.leverageRatios.equityRatio
        }
      ]
    },
    {
      name: 'Faaliyet Oranları',
      ratios: [
        {
          key: 'assetTurnover',
          label: 'Aktif Devir Hızı',
          unit: '',
          getValue: (analysis) => analysis.activityRatios.assetTurnover
        },
        {
          key: 'receivablesTurnover',
          label: 'Alacak Devir Hızı',
          unit: '',
          getValue: (analysis) => analysis.activityRatios.receivablesTurnover
        },
        {
          key: 'inventoryTurnover',
          label: 'Stok Devir Hızı',
          unit: '',
          getValue: (analysis) => analysis.activityRatios.inventoryTurnover
        }
      ]
    },
    {
      name: 'Piyasa Oranları',
      ratios: [
        {
          key: 'priceToEarnings',
          label: 'F/K Oranı',
          unit: '',
          getValue: (analysis) => analysis.marketRatios.priceToEarnings
        },
        {
          key: 'priceToBook',
          label: 'PD/DD Oranı',
          unit: '',
          getValue: (analysis) => analysis.marketRatios.priceToBook
        },
        {
          key: 'earningsPerShare',
          label: 'Hisse Başına Kazanç',
          unit: 'TL',
          getValue: (analysis) => analysis.marketRatios.earningsPerShare
        }
      ]
    }
  ];

  // Filtrelenmiş kategoriler
  const filteredCategories = useMemo(() => {
    if (selectedCategory === 'all') {
      return ratioCategories;
    }
    return ratioCategories.filter(category => 
      category.name.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [selectedCategory, ratioCategories]);

  // Sıralama fonksiyonu
  const sortedData = useMemo(() => {
    return [...analysisData].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'period':
          aValue = a.period;
          bValue = b.period;
          break;
        case 'currentRatio':
          aValue = a.liquidityRatios.currentRatio;
          bValue = b.liquidityRatios.currentRatio;
          break;
        case 'roe':
          aValue = a.profitabilityRatios.roe;
          bValue = b.profitabilityRatios.roe;
          break;
        case 'roa':
          aValue = a.profitabilityRatios.roa;
          bValue = b.profitabilityRatios.roa;
          break;
        case 'debtToEquity':
          aValue = a.leverageRatios.debtToEquity;
          bValue = b.leverageRatios.debtToEquity;
          break;
        default:
          aValue = a.period;
          bValue = b.period;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [analysisData, sortField, sortDirection]);

  // Sıralama değiştir
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Trend ikonu
  const getTrendIcon = (trendKey: string) => {
    const trendValue = trends[trendKey];
    if (!trendValue || Math.abs(trendValue) < 0.1) {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }
    return trendValue > 0 
      ? <TrendingUp className="w-4 h-4 text-green-500" />
      : <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  // Değer rengi
  const getValueColor = (value: number, ratioKey: string) => {
    const interpretations = RatioCalculationService.getRatioInterpretations();
    const interpretation = interpretations[ratioKey];
    
    if (!interpretation) return 'text-gray-900';
    
    // Basit renk mantığı (gerçek uygulamada daha karmaşık olabilir)
    if (ratioKey === 'currentRatio' && value >= 1.5) return 'text-green-600';
    if (ratioKey === 'currentRatio' && value < 1.0) return 'text-red-600';
    if (ratioKey === 'roe' && value >= 15) return 'text-green-600';
    if (ratioKey === 'roe' && value < 5) return 'text-red-600';
    if (ratioKey === 'roa' && value >= 10) return 'text-green-600';
    if (ratioKey === 'roa' && value < 3) return 'text-red-600';
    
    return 'text-gray-900';
  };

  // Excel export
  const exportToCSV = () => {
    const headers = ['Dönem', ...filteredCategories.flatMap(cat => 
      cat.ratios.map(ratio => ratio.label)
    )];
    
    const rows = sortedData.map(analysis => [
      analysis.period,
      ...filteredCategories.flatMap(cat => 
        cat.ratios.map(ratio => ratio.getValue(analysis))
      )
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rasyo-analizi.csv';
    link.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Başlık ve Kontroller */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Finansal Rasyo Analizi
          </h2>
          <p className="text-gray-600">
            Şirketin finansal performansının çok dönemli analizi
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
          {/* Kategori Filtresi */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tüm Oranlar</option>
              <option value="likidite">Likidite</option>
              <option value="karlılık">Karlılık</option>
              <option value="borç">Borç</option>
              <option value="faaliyet">Faaliyet</option>
              <option value="piyasa">Piyasa</option>
            </select>
          </div>
          
          {/* Yorumları Göster */}
          <button
            onClick={() => setShowInterpretations(!showInterpretations)}
            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${
              showInterpretations 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Info className="w-4 h-4" />
            Yorumlar
          </button>
          
          {/* Export Butonu */}
          {exportEnabled && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              CSV İndir
            </button>
          )}
        </div>
      </div>

      {/* Ana Tablo */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th 
                className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('period')}
              >
                <div className="flex items-center gap-2">
                  Dönem
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              {filteredCategories.map(category => 
                category.ratios.map(ratio => (
                  <th 
                    key={ratio.key}
                    className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-900 min-w-[120px]"
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{ratio.label}</span>
                      {ratio.unit && (
                        <span className="text-xs text-gray-500">({ratio.unit})</span>
                      )}
                      {showTrends && trends[`${ratio.key}Trend`] !== undefined && (
                        <div className="flex items-center justify-center mt-1">
                          {getTrendIcon(`${ratio.key}Trend`)}
                          <span className="text-xs ml-1">
                            {trends[`${ratio.key}Trend`]?.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((analysis, index) => (
              <tr key={analysis.period} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">
                  {analysis.period}
                </td>
                {filteredCategories.map(category => 
                  category.ratios.map(ratio => {
                    const value = ratio.getValue(analysis);
                    return (
                      <td 
                        key={ratio.key}
                        className={`border border-gray-200 px-4 py-3 text-center font-medium ${
                          getValueColor(value, ratio.key)
                        }`}
                      >
                        {value.toFixed(2)}
                      </td>
                    );
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yorumlar Bölümü */}
      {showInterpretations && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Oran Yorumları
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(RatioCalculationService.getRatioInterpretations()).map(([key, interpretation]) => (
              <div key={key} className="bg-white p-3 rounded border">
                <h4 className="font-medium text-gray-900 mb-2">
                  {ratioCategories.flatMap(cat => cat.ratios).find(r => r.key === key)?.label || key}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {interpretation.description}
                </p>
                <div className="text-xs">
                  <div className="text-green-600 mb-1">
                    ✓ İyi: {interpretation.good}
                  </div>
                  <div className="text-red-600">
                    ✗ Kötü: {interpretation.bad}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Özet İstatistikler */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Analiz Edilen Dönem</h4>
          <p className="text-2xl font-bold">{analysisData.length}</p>
          <p className="text-sm opacity-90">Çeyrek dönem</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">En Son ROE</h4>
          <p className="text-2xl font-bold">
            {analysisData[analysisData.length - 1]?.profitabilityRatios.roe.toFixed(1)}%
          </p>
          <p className="text-sm opacity-90">Özkaynak karlılığı</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Cari Oran</h4>
          <p className="text-2xl font-bold">
            {analysisData[analysisData.length - 1]?.liquidityRatios.currentRatio.toFixed(2)}
          </p>
          <p className="text-sm opacity-90">Likidite durumu</p>
        </div>
      </div>
    </div>
  );
};

export default RatioAnalysisTable;