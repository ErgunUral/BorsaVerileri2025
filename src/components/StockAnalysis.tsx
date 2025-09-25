import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, BarChart3, RefreshCw, PieChart, Calculator, Settings, DollarSign } from 'lucide-react';
import RealTimePriceDisplay from './RealTimePriceDisplay';
import TradingSignals from './TradingSignals';
import FinancialRatiosCard from './FinancialRatiosCard';
import TechnicalIndicatorsCard from './TechnicalIndicatorsCard';
import StockDataCard from './StockDataCard';
import PatternRecognitionCard from './PatternRecognitionCard';
import AIPatternAnalysis from './AIPatternAnalysis';
import MarketSentimentCard from './MarketSentimentCard';
import RiskAnalysisCard from './RiskAnalysisCard';
import FinancialCalculator from './FinancialCalculator';
import AnalysisRecommendations from './AnalysisRecommendations';
import { useTechnicalIndicators } from '../hooks/useTechnicalIndicators';
import { usePatternRecognition } from '../hooks/usePatternRecognition';
// useAdvancedPatterns import removed as not used
import { useMarketSentiment } from '../hooks/useMarketSentiment';
// useRiskAnalysis import removed as not used

interface StockData {
  stockCode: string;
  price?: {
    price: number;
    changePercent: number;
    volume: number;
    lastUpdated: string;
  };
  analysis?: {
    stockCode: string;
    companyName: string;
    financialData: {
      stockCode: string;
      companyName: string;
      period: string;
      currentAssets: number;
      shortTermLiabilities: number;
      longTermLiabilities: number;
      cashAndEquivalents: number;
      financialInvestments: number;
      financialDebts: number;
      totalAssets: number;
      totalLiabilities: number;
      ebitda: number;
      netProfit: number;
      equity: number;
      paidCapital: number;
      lastUpdated: string;
    };
    ratios: {
      netWorkingCapital: number;
      cashPosition: number;
      financialStructure: {
        debtToAssetRatio: number;
        equityRatio: number;
        currentRatio: number;
      };
      ebitdaProfitability: {
        ebitdaMargin: number;
        returnOnAssets: number;
        returnOnEquity: number;
      };
      bonusPotential: {
        retainedEarningsRatio: number;
        payoutRatio: number;
        bonusScore: number;
      };
    };
    recommendations: string[];
    riskLevel: 'Düşük' | 'Orta' | 'Yüksek';
    investmentScore: number;
  };
  timestamp: string;
}

interface FinancialDataField {
  key: string;
  label: string;
  description: string;
  category: 'assets' | 'liabilities' | 'equity' | 'performance';
}

interface CalculationResult {
  name: string;
  value: number;
  formula: string;
  interpretation: string;
  category: string;
}

// Calculator interfaces removed - now handled by FinancialCalculator component

interface StockAnalysisProps {
  stockData: StockData;
}

const StockAnalysis: React.FC<StockAnalysisProps> = React.memo(({ stockData }: { stockData: any }) => {
  const { analysis, price } = stockData;
  
  // State for tabs
  const [activeTab, setActiveTab] = useState('ozet');
  const [selectedTimeframe, setSelectedTimeframe] = useState('G');
  const [dateRange, setDateRange] = useState({
    start: '2025-09-15',
    end: '2025-09-22'
  });
  
  // Hook'lar
  const {
    loading: indicatorsLoading,
    error: indicatorsError,
    fetchIndicators
  } = useTechnicalIndicators();
  
  const {
    loading: patternsLoading,
    error: patternsError,
    analyzePatterns
  } = usePatternRecognition();
  
  const {
    sentimentData,
    isLoading: sentimentLoading,
    error: sentimentError,
    fetchSentiment
  } = useMarketSentiment();
  
  // Güvenlik kontrolü: analysis verisi yoksa hata mesajı göster
  if (!analysis) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analiz Verisi Bulunamadı</h2>
          <p className="text-gray-600">Bu hisse için analiz verisi henüz hazır değil.</p>
        </div>
      </div>
    );
  }
  
  // Finansal veri alanları tanımı (Backend'den gelen İngilizce key'lerle uyumlu)
  const financialDataFields: FinancialDataField[] = [
    { key: 'currentAssets', label: 'Dönen Varlıklar', description: 'Bir yıl içinde nakde çevrilebilir varlıklar', category: 'assets' },
    { key: 'shortTermLiabilities', label: 'Kısa Vadeli Yükümlülükler', description: 'Bir yıl içinde ödenecek borçlar', category: 'liabilities' },
    { key: 'longTermLiabilities', label: 'Uzun Vadeli Yükümlülükler', description: 'Bir yıldan uzun vadeli borç ve yükümlülükler', category: 'liabilities' },
    { key: 'cashAndEquivalents', label: 'Nakit ve Nakit Benzerleri', description: 'Eldeki nakit ve hemen nakde çevrilebilir varlıklar', category: 'assets' },
    { key: 'financialInvestments', label: 'Finansal Yatırımlar', description: 'Menkul kıymet ve diğer finansal yatırımlar', category: 'assets' },
    { key: 'financialDebts', label: 'Finansal Borçlar', description: 'Banka kredileri ve finansal yükümlülükler', category: 'liabilities' },
    { key: 'totalAssets', label: 'Toplam Varlıklar', description: 'Şirketin sahip olduğu tüm varlıklar', category: 'assets' },
    { key: 'totalLiabilities', label: 'Toplam Yükümlülükler', description: 'Şirketin tüm borç ve yükümlülükleri', category: 'liabilities' },
    { key: 'ebitda', label: 'FAVÖK', description: 'Faiz, vergi, amortisman öncesi kar', category: 'performance' },
    { key: 'netProfit', label: 'Net Dönem Karı/Zararı', description: 'Dönem sonunda kalan net kar veya zarar', category: 'performance' },
    { key: 'equity', label: 'Özkaynaklar', description: 'Şirket sahiplerinin net varlığı', category: 'equity' },
    { key: 'paidCapital', label: 'Ödenmiş Sermaye', description: 'Şirkete ödenmiş sermaye tutarı', category: 'equity' }
  ];
  
  // State tanımları
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculationType, setCalculationType] = useState<'ratios' | 'custom'>('ratios');
  const [lastCalculationTime, setLastCalculationTime] = useState<Date | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  
  // Hesap makinesi state'leri
  // Calculator state removed - now handled by FinancialCalculator component
  
  // Gerçek zamanlı hesaplama güncellemesi
  useEffect(() => {
    if (selectedFields.length > 0 || calculationType === 'ratios') {
      setIsCalculating(true);
      const timer = setTimeout(() => {
        setLastCalculationTime(new Date());
        setIsCalculating(false);
      }, 500);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [selectedFields, calculationType, analysis?.financialData]);
  
  // Otomatik hesaplama fonksiyonları
  const calculateFinancialRatios = useMemo((): CalculationResult[] => {
    if (!analysis) return [];
    
    const { financialData } = analysis;
    const results: CalculationResult[] = [];
    
    // Likidite Oranları - Backend'den gelen İngilizce key'lerle uyumlu
    if (financialData.currentAssets && financialData.shortTermLiabilities) {
      const currentRatio = financialData.currentAssets / financialData.shortTermLiabilities;
      results.push({
        name: 'Cari Oran',
        value: currentRatio,
        formula: 'Dönen Varlıklar / Kısa Vadeli Yükümlülükler',
        interpretation: currentRatio > 1.5 ? 'İyi likidite durumu' : currentRatio > 1 ? 'Orta likidite' : 'Zayıf likidite',
        category: 'Likidite'
      });
    }
    
    if (financialData.cashAndEquivalents && financialData.shortTermLiabilities) {
      const acidTestRatio = (financialData.cashAndEquivalents + (financialData.financialInvestments || 0)) / financialData.shortTermLiabilities;
      results.push({
        name: 'Asit Test Oranı',
        value: acidTestRatio,
        formula: '(Nakit + Finansal Yatırımlar) / Kısa Vadeli Yükümlülükler',
        interpretation: acidTestRatio > 1 ? 'Güçlü nakit pozisyonu' : 'Nakit pozisyonu zayıf',
        category: 'Likidite'
      });
    }
    
    // Kaldıraç Oranları
    if (financialData.totalLiabilities && financialData.totalAssets) {
      const debtRatio = financialData.totalLiabilities / financialData.totalAssets;
      results.push({
        name: 'Borç Oranı',
        value: debtRatio,
        formula: 'Toplam Yükümlülükler / Toplam Varlıklar',
        interpretation: debtRatio < 0.3 ? 'Düşük borç seviyesi' : debtRatio < 0.6 ? 'Orta borç seviyesi' : 'Yüksek borç seviyesi',
        category: 'Kaldıraç'
      });
    }
    
    if (financialData.totalLiabilities && financialData.equity) {
      const debtToEquity = financialData.totalLiabilities / financialData.equity;
      results.push({
        name: 'Borç/Özkaynak Oranı',
        value: debtToEquity,
        formula: 'Toplam Yükümlülükler / Özkaynaklar',
        interpretation: debtToEquity < 0.5 ? 'Güçlü özkaynak yapısı' : debtToEquity < 1 ? 'Dengeli yapı' : 'Yüksek kaldıraç',
        category: 'Kaldıraç'
      });
    }
    
    // Uzun Vadeli Borç Oranları
    if (financialData.longTermLiabilities && financialData.totalAssets) {
      const longTermDebtRatio = financialData.longTermLiabilities / financialData.totalAssets;
      results.push({
        name: 'Uzun Vadeli Borç Oranı',
        value: longTermDebtRatio,
        formula: 'Uzun Vadeli Yükümlülükler / Toplam Varlıklar',
        interpretation: longTermDebtRatio < 0.2 ? 'Düşük uzun vadeli borç' : longTermDebtRatio < 0.4 ? 'Orta seviye' : 'Yüksek uzun vadeli borç',
        category: 'Kaldıraç'
      });
    }
    
    if (financialData.longTermLiabilities && financialData.equity) {
      const longTermDebtToEquity = financialData.longTermLiabilities / financialData.equity;
      results.push({
        name: 'Uzun Vadeli Borç/Özkaynak',
        value: longTermDebtToEquity,
        formula: 'Uzun Vadeli Yükümlülükler / Özkaynaklar',
        interpretation: longTermDebtToEquity < 0.3 ? 'Güvenli uzun vadeli borç seviyesi' : longTermDebtToEquity < 0.6 ? 'Orta risk' : 'Yüksek uzun vadeli borç riski',
        category: 'Kaldıraç'
      });
    }
    
    // Toplam Borç Yapısı Analizi
    if (financialData.shortTermLiabilities && financialData.longTermLiabilities) {
      const totalDebt = financialData.shortTermLiabilities + financialData.longTermLiabilities;
      const debtStructureRatio = financialData.longTermLiabilities / totalDebt;
      results.push({
        name: 'Borç Yapısı Oranı',
        value: debtStructureRatio,
        formula: 'Uzun Vadeli Yükümlülükler / (Kısa + Uzun Vadeli Yükümlülükler)',
        interpretation: debtStructureRatio > 0.6 ? 'Uzun vadeli borç ağırlıklı (iyi)' : debtStructureRatio > 0.4 ? 'Dengeli borç yapısı' : 'Kısa vadeli borç ağırlıklı (riskli)',
        category: 'Kaldıraç'
      });
    }
    
    // Karlılık Oranları
    if (financialData.netProfit && financialData.totalAssets) {
      const roa = (financialData.netProfit / financialData.totalAssets) * 100;
      results.push({
        name: 'Aktif Karlılığı (ROA)',
        value: roa,
        formula: '(Net Kar / Toplam Varlıklar) × 100',
        interpretation: roa > 10 ? 'Yüksek karlılık' : roa > 5 ? 'Orta karlılık' : 'Düşük karlılık',
        category: 'Karlılık'
      });
    }
    
    if (financialData.netProfit && financialData.equity) {
      const roe = (financialData.netProfit / financialData.equity) * 100;
      results.push({
        name: 'Özkaynak Karlılığı (ROE)',
        value: roe,
        formula: '(Net Kar / Özkaynaklar) × 100',
        interpretation: roe > 15 ? 'Yüksek karlılık' : roe > 10 ? 'Orta karlılık' : 'Düşük karlılık',
        category: 'Karlılık'
      });
    }
    
    if (financialData.ebitda && financialData.totalAssets) {
      const ebitdaMargin = (financialData.ebitda / financialData.totalAssets) * 100;
      results.push({
        name: 'FAVÖK Marjı',
        value: ebitdaMargin,
        formula: '(FAVÖK / Toplam Varlıklar) × 100',
        interpretation: ebitdaMargin > 15 ? 'Yüksek operasyonel karlılık' : ebitdaMargin > 8 ? 'Orta karlılık' : 'Düşük karlılık',
        category: 'Karlılık'
      });
    }
    
    return results;
  }, [analysis]);
  
  // Yardımcı fonksiyonlar
  const formatNumber = (num: number | undefined | null, decimals: number = 0): string => {
    // Güvenli kontroller ve fallback değerler
    if (num === null || num === undefined) {
      console.debug('formatNumber: Değer null veya undefined, fallback kullanılıyor');
      return 'N/A';
    }
    
    if (isNaN(num) || !isFinite(num)) {
      console.debug('formatNumber: Geçersiz sayı değeri, fallback kullanılıyor:', num);
      return 'Geçersiz';
    }
    
    if (num === 0) return '0';
    
    const absNum = Math.abs(num);
    if (absNum >= 1e9) {
      return (num / 1e9).toFixed(decimals) + 'B';
    }
    if (absNum >= 1e6) {
      return (num / 1e6).toFixed(decimals) + 'M';
    }
    if (absNum >= 1e3) {
      return (num / 1e3).toFixed(decimals) + 'K';
    }
    return (num || 0).toFixed(decimals);
  };

  const formatCurrency = (num: number | undefined | null): string => {
    // Güvenli kontroller ve fallback değerler
    if (num === null || num === undefined) {
      console.debug('formatCurrency: Değer null veya undefined, fallback kullanılıyor');
      return 'Veri yok';
    }
    
    if (isNaN(num) || !isFinite(num)) {
      console.debug('formatCurrency: Geçersiz sayı değeri, fallback kullanılıyor:', num);
      return 'Geçersiz veri';
    }
    
    if (num === 0) {
      return '0 TL';
    }
    
    return formatNumber(num, 1) + ' TL';
  };

  // Calculator functions removed - now handled by FinancialCalculator component

  // Veri seçimi için yardımcı fonksiyonlar
  const getFieldValue = (fieldKey: string): number | null => {
    if (!analysis?.financialData) return null;
    const value = analysis.financialData[fieldKey as keyof typeof analysis.financialData] as number;
    return value || null;
  };

  const toggleFieldSelection = (fieldKey: string) => {
    setSelectedFields(prev => {
      const isSelected = prev.includes(fieldKey);
      return isSelected
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey];
    });
  };

  // Özel hesaplama fonksiyonu
  const performCustomCalculation = () => {
    if (selectedFields.length < 2) {
      console.warn('En az 2 alan seçilmeli');
      return;
    }

    console.log('Özel hesaplama gerçekleştiriliyor:', selectedFields);

    const values = selectedFields.map(field => {
      const value = getFieldValue(field);
      console.log(`${field} değeri:`, value);
      return value;
    }).filter(val => val !== null && val !== undefined && !isNaN(val as number));

    if (values.length < 2) {
      alert('Geçerli değer bulunamadı');
      return;
    }

    // Basit toplama işlemi yapıyoruz
    const result = values.reduce((sum: number, value) => sum + (value as number), 0);
    
    console.log('Hesaplama sonucu:', result);
    
    // Sonucu göstermek için bir alert kullanabiliriz
    alert(`Hesaplama sonucu: ${formatCurrency(result)}`);
  };

  // Seçilen alanlara göre özel hesaplamalar
  const calculateCustomMetrics = useMemo((): CalculationResult[] => {
    if (!analysis || selectedFields.length < 2) return [];
    
    const { financialData } = analysis;
    const results: CalculationResult[] = [];
    
    // Seçilen alanlar arasında oran hesaplamaları
    for (let i = 0; i < selectedFields.length; i++) {
      for (let j = i + 1; j < selectedFields.length; j++) {
        const field1 = selectedFields[i] as keyof typeof financialData;
        const field2 = selectedFields[j] as keyof typeof financialData;
        
        const value1 = financialData[field1] as number;
        const value2 = financialData[field2] as number;
        
        if (value1 && value2 && value2 !== 0) {
          const field1Label = financialDataFields.find(f => f.key === field1)?.label || field1;
          const field2Label = financialDataFields.find(f => f.key === field2)?.label || field2;
          
          const ratio = value1 / value2;
          results.push({
            name: `${String(field1Label)} / ${String(field2Label)}`,
            value: ratio,
            formula: `${formatCurrency(value1)} ÷ ${formatCurrency(value2)}`,
            interpretation: ratio > 1 
              ? `${String(field1Label)} ${String(field2Label)}'den ${(ratio || 0).toFixed(2)} kat büyük`
              : `${String(field1Label)} ${String(field2Label)}'nin ${((ratio || 0) * 100).toFixed(1)}%'si kadar`,
            category: 'Oran Analizi'
          });
        }
      }
    }
    
    // Büyüme ve performans hesaplamaları
     if (selectedFields.includes('currentAssets') && selectedFields.includes('shortTermLiabilities')) {
       const currentRatio = (financialData.currentAssets as number) / (financialData.shortTermLiabilities as number);
       results.push({
         name: 'Cari Oran',
         value: currentRatio,
         formula: 'Dönen Varlıklar ÷ Kısa Vadeli Yükümlülükler',
         interpretation: currentRatio >= 2 ? 'Çok güçlü likidite' : 
                        currentRatio >= 1.5 ? 'Güçlü likidite' :
                        currentRatio >= 1 ? 'Yeterli likidite' : 'Zayıf likidite',
         category: 'Likidite Analizi'
       });
     }
     
     if (selectedFields.includes('totalAssets') && selectedFields.includes('shortTermLiabilities')) {
       const assetCoverage = (financialData.totalAssets as number) / (financialData.shortTermLiabilities as number);
       results.push({
         name: 'Varlık Karşılama Oranı',
         value: assetCoverage,
         formula: 'Toplam Varlıklar ÷ Kısa Vadeli Yükümlülükler',
         interpretation: assetCoverage >= 5 ? 'Çok güçlü varlık tabanı' :
                        assetCoverage >= 3 ? 'Güçlü varlık tabanı' :
                        assetCoverage >= 2 ? 'Yeterli varlık tabanı' : 'Zayıf varlık tabanı',
         category: 'Varlık Analizi'
       });
     }
     
     if (selectedFields.includes('netProfit') && selectedFields.includes('totalAssets')) {
       const roa = ((financialData.netProfit as number) / (financialData.totalAssets as number)) * 100;
       results.push({
         name: 'Varlık Karlılığı (ROA)',
         value: roa,
         formula: '(Net Kar/Zarar ÷ Toplam Varlıklar) × 100',
         interpretation: roa >= 15 ? 'Çok yüksek karlılık' :
                        roa >= 10 ? 'Yüksek karlılık' :
                        roa >= 5 ? 'Orta karlılık' :
                        roa > 0 ? 'Düşük karlılık' : 'Zarar durumu',
         category: 'Karlılık Analizi'
       });
     }
     
     // Finansal güç endeksi
     if (selectedFields.includes('currentAssets') && selectedFields.includes('totalAssets') && 
         selectedFields.includes('shortTermLiabilities') && selectedFields.includes('netProfit')) {
       const liquidityScore = Math.min(((financialData.currentAssets as number) / (financialData.shortTermLiabilities as number)) * 25, 100);
       const profitabilityScore = Math.max(0, Math.min(((financialData.netProfit as number) / (financialData.totalAssets as number)) * 500, 100));
       const financialStrength = (liquidityScore + profitabilityScore) / 2;
       
       results.push({
         name: 'Finansal Güç Endeksi',
         value: financialStrength,
         formula: '(Likidite Skoru + Karlılık Skoru) ÷ 2',
         interpretation: financialStrength >= 80 ? 'Çok güçlü finansal durum' :
                        financialStrength >= 60 ? 'Güçlü finansal durum' :
                        financialStrength >= 40 ? 'Orta finansal durum' :
                        financialStrength >= 20 ? 'Zayıf finansal durum' : 'Çok zayıf finansal durum',
         category: 'Genel Değerlendirme'
       });
     }
    
    return results;
  }, [analysis, selectedFields, financialDataFields]);
  
  if (!analysis) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Analiz verisi bulunamadı</p>
        </div>
      </div>
    );
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Düşük': return 'text-green-600 bg-green-50 border-green-200';
      case 'Orta': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Yüksek': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4" />;
  };

  // Calculator functions removed - now handled by FinancialCalculator component

  // Format fonksiyonları



  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'ozet':
        return (
          <div className="space-y-6">
            {/* Anlık Fiyat Gösterimi */}
            <RealTimePriceDisplay 
              stockCode={stockData.stockCode}
              className="mb-6"
            />
            
            {/* Hisse Senedi Veri Kartı */}
            <StockDataCard 
              stockData={stockData}
              symbol={stockData.stockCode}
              isLoading={false}
              error={null}
              onRefresh={() => {}}
            />
            
            {/* Teknik İndikatörler Kartı */}
            <TechnicalIndicatorsCard 
              rsiData={null}
              macdData={null}
              bollingerData={null}
              lastUpdateTime={null}
              isLoading={indicatorsLoading}
              error={indicatorsError}
              onRefresh={() => fetchIndicators(stockData.stockCode)}
            />
            
            {/* Finansal Oranlar Kartı */}
            <FinancialRatiosCard
                ratios={calculateFinancialRatios}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                isCalculating={isCalculating}
                lastCalculationTime={lastCalculationTime}
              />
          </div>
        );
      case 'tahminler':
        return (
          <div className="space-y-6">
            {/* AI Pattern Analysis */}
            <AIPatternAnalysis
              symbol={stockData.stockCode}
              timeframe="1D"
            />
            
            {/* Formasyon Tanıma Kartı */}
            <PatternRecognitionCard 
              patterns={[]}
              advancedPatterns={[]}
              isAnalyzing={patternsLoading}
              error={patternsError}
              onAnalyze={() => {
                analyzePatterns(stockData.stockCode);
              }}
              lastAnalysisTime={null}
              symbol={stockData.stockCode}
            />
            
            {/* AI Trading Sinyalleri */}
            <TradingSignals
              symbols={[stockData.stockCode]}
              marketData={{
                [stockData.stockCode]: {
                  symbol: stockData.stockCode,
                  currentPrice: price?.price || 0,
                  volume: price?.volume || 0,
                  change: price?.changePercent || 0,
                  changePercent: price?.changePercent || 0,
                  marketCap: analysis?.financialData?.totalAssets || 0,
                  pe: analysis?.ratios?.ebitdaProfitability?.returnOnAssets ? 
                    (price?.price || 0) / analysis.ratios.ebitdaProfitability.returnOnAssets : 0,
                  technicalIndicators: {
                    rsi: 45,
                    macd: {
                      macd: 0.5,
                      signal: 0.3,
                      histogram: 0.2
                    },
                    bollinger: {
                      upper: (price?.price || 0) * 1.02,
                      middle: price?.price || 0,
                      lower: (price?.price || 0) * 0.98
                    },
                    sma20: price?.price || 0,
                    sma50: price?.price || 0
                  },
                }
              }}
              portfolioContext={{
                totalValue: (price?.price || 0) * 100,
                positions: [{
                  symbol: stockData.stockCode,
                  quantity: 100,
                  avgPrice: price?.price || 0,
                  currentValue: (price?.price || 0) * 100,
                }],
                availableCash: analysis?.financialData?.cashAndEquivalents || 0,
                riskTolerance: analysis?.riskLevel === 'Düşük' ? 'CONSERVATIVE' : 
                              analysis?.riskLevel === 'Orta' ? 'MODERATE' : 'AGGRESSIVE',
                investmentGoal: 'GROWTH'
              }}
              autoRefresh={true}
              refreshInterval={15}
            />
          </div>
        );
      case 'sermaye':
        return (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Sermaye Artırımları</h3>
            <div className="text-center py-8 text-gray-500">
              <p>Sermaye artırımı bilgisi bulunmamaktadır.</p>
            </div>
          </div>
        );
      case 'mali':
        return (
          <div className="space-y-6">
            {/* Mali Tablo Özeti */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <span>Mali Tablo Özeti</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Dönen Varlıklar */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 font-medium">Dönen Varlıklar</div>
                  <div className="text-lg font-bold text-blue-700">
                    {formatCurrency(analysis.financialData?.currentAssets)}
                  </div>
                </div>
                
                {/* Kısa Vadeli Yükümlülükler */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-sm text-orange-600 font-medium">Kısa Vadeli Yükümlülükler</div>
                  <div className="text-lg font-bold text-orange-700">
                    {formatCurrency(analysis.financialData?.shortTermLiabilities)}
                  </div>
                </div>
                
                {/* Uzun Vadeli Yükümlülükler */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="text-sm text-amber-600 font-medium">Uzun Vadeli Yükümlülükler</div>
                  <div className="text-lg font-bold text-amber-700">
                    {formatCurrency(analysis.financialData?.longTermLiabilities)}
                  </div>
                </div>
                
                {/* Nakit ve Nakit Benzerleri */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-green-600 font-medium">Nakit ve Nakit Benzerleri</div>
                  <div className="text-lg font-bold text-green-700">
                    {formatCurrency(analysis.financialData?.cashAndEquivalents)}
                  </div>
                </div>
                
                {/* FAVÖK */}
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <div className="text-sm text-teal-600 font-medium">FAVÖK</div>
                  <div className={`text-lg font-bold ${
                    (analysis.financialData?.ebitda ?? 0) >= 0 ? 'text-teal-700' : 'text-red-600'
                  }`}>
                    {formatCurrency(analysis.financialData?.ebitda)}
                  </div>
                </div>
                
                {/* Net Dönem Karı/Zararı */}
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="text-sm text-emerald-600 font-medium">Net Dönem Karı/Zararı</div>
                  <div className={`text-lg font-bold ${
                    (analysis.financialData?.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {formatCurrency(analysis.financialData?.netProfit)}
                  </div>
                </div>
                
                {/* Özkaynaklar */}
                <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                  <div className="text-sm text-cyan-600 font-medium">Özkaynaklar</div>
                  <div className="text-lg font-bold text-cyan-700">
                    {formatCurrency(analysis.financialData?.equity)}
                  </div>
                </div>
                
                {/* Toplam Varlıklar */}
                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="text-sm text-indigo-600 font-medium">Toplam Varlıklar</div>
                  <div className="text-lg font-bold text-indigo-700">
                    {formatCurrency(analysis.financialData?.totalAssets)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'oranlar':
        return (
          <div className="space-y-6">
            {/* Finansal Oranlar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Finansal Yapı */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Finansal Yapı</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Borç/Varlık Oranı</span>
                    <span className="font-bold text-gray-900">
                      %{analysis.ratios?.financialStructure?.debtToAssetRatio ?? 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Cari Oran</span>
                    <span className="font-bold text-gray-900">
                      {analysis.ratios?.financialStructure?.currentRatio != null ? analysis.ratios.financialStructure.currentRatio.toFixed(2) : '0.00'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Özkaynak Oranı</span>
                    <span className="font-bold text-gray-900">
                      %{analysis.ratios?.financialStructure?.equityRatio ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Karlılık Oranları */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Karlılık Oranları</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Özkaynak Karlılığı</span>
                    <span className={`font-bold ${
                      (analysis.ratios?.ebitdaProfitability?.returnOnEquity ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      %{analysis.ratios?.ebitdaProfitability?.returnOnEquity ?? 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Aktif Karlılığı</span>
                    <span className={`font-bold ${
                      (analysis.ratios?.ebitdaProfitability?.returnOnAssets ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      %{analysis.ratios?.ebitdaProfitability?.returnOnAssets ?? 0}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">FAVÖK Marjı</span>
                    <span className={`font-bold ${
                      (analysis.ratios?.ebitdaProfitability?.ebitdaMargin ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      %{analysis.ratios?.ebitdaProfitability?.ebitdaMargin ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Finansal Hesap Makinesi */}
            <div className="mt-8">
              <FinancialCalculator
                financialData={analysis?.financialData}
                onCalculationComplete={(results: any) => {
                  console.log('Finansal hesaplama sonuçları:', results);
                }}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const timeframeButtons = [
    { key: 'G', label: 'G' },
    { key: 'H', label: 'H' },
    { key: 'A', label: 'A' },
    { key: 'Y', label: 'Y' }
  ];

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || price === null) return '0,00';
    return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatVolume = (volume: number | undefined): string => {
    if (volume === undefined || volume === null) return '0';
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(0) + 'K';
    }
    return volume.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <a href="#" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600">
                Ana Sayfa
              </a>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <a href="#" className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2">
                  Analiz
                </a>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <a href="#" className="ml-1 text-sm font-medium text-gray-700 hover:text-blue-600 md:ml-2">
                  Hisse Senetleri
                </a>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">&gt;</span>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Şirket Kartı</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Stock Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{analysis.stockCode} - {analysis.companyName}</h1>
            </div>
          </div>
        </div>

        {/* Stock Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Price Section */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  <span className="font-bold text-lg">{analysis.stockCode}</span>
                </div>
              </div>
              
              <div className="mt-4 flex items-baseline space-x-4">
                <span className={`text-3xl font-bold ${
                  (price?.changePercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPrice(price?.price)}TL
                </span>
                <span className={`text-lg font-medium ${
                  (price?.changePercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(price?.changePercent ?? 0) >= 0 ? '+' : ''}{(price?.changePercent ?? 0).toFixed(2)}%
                </span>
              </div>
            </div>
            
            {/* Additional Info */}
            <div>
              <div className="text-sm text-gray-600 mb-1">Fark</div>
              <div className={`font-bold ${
                (price?.changePercent ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(price?.changePercent ?? 0) >= 0 ? '+' : ''}{((price?.price ?? 0) * (price?.changePercent ?? 0) / 100).toFixed(2)}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Toplam İşlem Hacmi</div>
              <div className="font-bold text-gray-900">
                {formatVolume(price?.volume)}
              </div>
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Timeframe Buttons */}
            <div className="flex space-x-2">
              {timeframeButtons.map((button) => (
                <button
                  key={button.key}
                  onClick={() => setSelectedTimeframe(button.key)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedTimeframe === button.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {button.label}
                </button>
              ))}
            </div>
            
            {/* Date Range Picker */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Compare Dropdown */}
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Karşılaştır</option>
                <option>BIST 100</option>
                <option>Sektör Ortalaması</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'ozet', label: 'Özet' },
                { key: 'tahminler', label: 'Tahminler' },
                { key: 'sermaye', label: 'Sermaye Artırımları' },
                { key: 'mali', label: 'Mali Tablolar' },
                { key: 'oranlar', label: 'Finansal Oranlar' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      
      {/* Başlık ve Genel Bilgiler */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{analysis.stockCode}</h1>
            <p className="text-gray-600">{analysis.companyName}</p>
          </div>
          <div className="text-right">
            {price && (
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(price.price)}
                </div>
                <div className={`flex items-center justify-end space-x-1 ${
                  price.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getChangeIcon(price.changePercent)}
                  <span className="font-medium">
                    {price.changePercent >= 0 ? '+' : ''}{(price.changePercent != null ? price.changePercent.toFixed(2) : '0.00')}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border ${getRiskColor(analysis.riskLevel)}`}>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Risk Seviyesi</span>
            </div>
            <div className="text-lg font-bold mt-1">{analysis.riskLevel}</div>
          </div>
          
          <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
            <div className="flex items-center space-x-2 text-blue-600">
              <Target className="h-5 w-5" />
              <span className="font-medium">Yatırım Skoru</span>
            </div>
            <div className={`text-lg font-bold mt-1 ${getScoreColor(analysis.investmentScore)}`}>
              {analysis.investmentScore}/100
            </div>
          </div>
          
          <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
            <div className="flex items-center space-x-2 text-purple-600">
              <PieChart className="h-5 w-5" />
              <span className="font-medium">Bedelsiz Potansiyel</span>
            </div>
            <div className="text-lg font-bold mt-1 text-purple-600">
              {analysis.ratios?.bonusPotential?.bonusScore ?? 0}/100
            </div>
          </div>
        </div>
      </div>

      {/* Mali Tablo Özeti */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <span>Mali Tablo Özeti</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Dönen Varlıklar */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Dönen Varlıklar</div>
            <div className="text-lg font-bold text-blue-700">
              {formatCurrency(analysis.financialData?.currentAssets)}
            </div>
          </div>
          
          {/* Kısa Vadeli Yükümlülükler */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-600 font-medium">Kısa Vadeli Yükümlülükler</div>
            <div className="text-lg font-bold text-orange-700">
              {formatCurrency(analysis.financialData?.shortTermLiabilities)}
            </div>
          </div>
          
          {/* Uzun Vadeli Yükümlülükler */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-sm text-amber-600 font-medium">Uzun Vadeli Yükümlülükler</div>
            <div className="text-lg font-bold text-amber-700">
              {formatCurrency(analysis.financialData?.longTermLiabilities)}
            </div>
          </div>
          
          {/* Nakit ve Nakit Benzerleri */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm text-green-600 font-medium">Nakit ve Nakit Benzerleri</div>
            <div className="text-lg font-bold text-green-700">
              {formatCurrency(analysis.financialData?.cashAndEquivalents)}
            </div>
          </div>
          
          {/* Finansal Yatırımlar */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-600 font-medium">Finansal Yatırımlar</div>
            <div className="text-lg font-bold text-purple-700">
              {formatCurrency(analysis.financialData?.financialInvestments)}
            </div>
          </div>
          
          {/* Finansal Borçlar */}
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="text-sm text-red-600 font-medium">Finansal Borçlar</div>
            <div className="text-lg font-bold text-red-700">
              {formatCurrency(analysis.financialData?.financialDebts)}
            </div>
          </div>
          
          {/* Toplam Varlıklar */}
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <div className="text-sm text-indigo-600 font-medium">Toplam Varlıklar</div>
            <div className="text-lg font-bold text-indigo-700">
              {formatCurrency(analysis.financialData?.totalAssets)}
            </div>
          </div>
          
          {/* Toplam Yükümlülükler */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm text-yellow-600 font-medium">Toplam Yükümlülükler</div>
            <div className="text-lg font-bold text-yellow-700">
              {formatCurrency(analysis.financialData?.totalLiabilities)}
            </div>
          </div>
          
          {/* FAVÖK */}
          <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
            <div className="text-sm text-teal-600 font-medium">FAVÖK</div>
            <div className={`text-lg font-bold ${
              (analysis.financialData?.ebitda ?? 0) >= 0 ? 'text-teal-700' : 'text-red-600'
            }`}>
              {formatCurrency(analysis.financialData?.ebitda)}
            </div>
          </div>
          
          {/* Net Dönem Karı/Zararı */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-sm text-emerald-600 font-medium">Net Dönem Karı/Zararı</div>
            <div className={`text-lg font-bold ${
              (analysis.financialData?.netProfit ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {formatCurrency(analysis.financialData?.netProfit)}
            </div>
          </div>
          
          {/* Özkaynaklar */}
          <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
            <div className="text-sm text-cyan-600 font-medium">Özkaynaklar</div>
            <div className="text-lg font-bold text-cyan-700">
              {formatCurrency(analysis.financialData?.equity)}
            </div>
          </div>
          
          {/* Ödenmiş Sermaye */}
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
            <div className="text-sm text-rose-600 font-medium">Ödenmiş Sermaye</div>
            <div className="text-lg font-bold text-rose-700">
              {formatCurrency(analysis.financialData?.paidCapital)}
            </div>
          </div>
        </div>
      </div>

      {/* İnteraktif Finansal Analiz Aracı */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center space-x-2">
            <Calculator className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            <span>İnteraktif Finansal Analiz</span>
          </h2>
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Settings className="h-4 w-4" />
            <span>{showCalculator ? 'Gizle' : 'Hesaplama Aracını Aç'}</span>
          </button>
        </div>
        
        {showCalculator && (
          <div className="space-y-4 sm:space-y-6">
            {/* Hesaplama Türü Seçici */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 border-b border-gray-200 pb-4">
              <button
                onClick={() => setCalculationType('ratios')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                  calculationType === 'ratios'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Finansal Oranlar
              </button>
              <button
                onClick={() => setCalculationType('custom')}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                  calculationType === 'custom'
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Özel Hesaplamalar
              </button>
            </div>
            
            {/* Finansal Veri Seçici */}
            {calculationType === 'custom' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Hesaplama için Veri Seçin</h3>
                
                {/* Hesaplama Türü Seçici */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Hesaplama Türünü Seçin</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { type: '+', label: 'Toplama', icon: '+', color: 'bg-green-100 text-green-700 border-green-300' },
                      { type: '-', label: 'Çıkarma', icon: '−', color: 'bg-red-100 text-red-700 border-red-300' },
                      { type: '×', label: 'Çarpma', icon: '×', color: 'bg-blue-100 text-blue-700 border-blue-300' },
                      { type: '/', label: 'Bölme', icon: '÷', color: 'bg-purple-100 text-purple-700 border-purple-300' }
                    ].map((op) => (
                      <button
                        key={op.type}
                        onClick={() => {}}
                        className={`p-3 rounded-lg border-2 transition-all text-center ${
                          false
                            ? `${op.color} border-opacity-100 shadow-md`
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-xl font-bold mb-1">{op.icon}</div>
                        <div className="text-sm font-medium">{op.label}</div>
                      </button>
                    ))}
                  </div>

                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {financialDataFields.map((field) => {
                    const isSelected = selectedFields.includes(field.key);
                    const categoryColors = {
                      assets: 'border-blue-300 bg-blue-50 text-blue-700',
                      liabilities: 'border-red-300 bg-red-50 text-red-700',
                      equity: 'border-green-300 bg-green-50 text-green-700',
                      performance: 'border-purple-300 bg-purple-50 text-purple-700'
                    };
                    
                    return (
                      <div
                        key={String(field.key)}
                        onClick={() => toggleFieldSelection(field.key)}
                        className={`p-2 sm:p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? `${categoryColors[field.category]} border-opacity-100 shadow-md`
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-gray-300 mt-1 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-xs sm:text-sm break-words">{field.label}</div>
                            <div className="text-xs text-gray-500 mt-1 break-words">{field.description}</div>
                            <div className="text-xs font-medium mt-1">
                              {formatCurrency(Number(analysis.financialData[field.key as keyof typeof analysis.financialData]) || 0)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {selectedFields.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-700">
                        <strong>Seçilen Veriler:</strong> {selectedFields.length} adet
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {selectedFields.map(field => {
                          const fieldData = financialDataFields.find(f => f.key === field);
                          return fieldData?.label;
                        }).join(', ')}
                      </div>
                    </div>
                    
                    {/* Hesaplama Butonu */}
                    {selectedFields.length >= 2 && (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={() => performCustomCalculation()}
                          className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-md flex items-center justify-center space-x-2"
                        >
                          <Calculator className="h-5 w-5" />
                          <span>Hesapla</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFields([]);
                          }}
                          className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                        >
                          Temizle
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Hesaplama Sonuçları */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <h3 className="text-lg font-semibold text-gray-900">Hesaplama Sonuçları</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  {isCalculating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                      <span className="text-blue-500">Hesaplanıyor...</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span>Son güncelleme: {lastCalculationTime?.toLocaleTimeString('tr-TR') || 'Bilinmiyor'}</span>
                    </>
                  )}
                </div>
              </div>
              
              {calculationType === 'ratios' && (
                 <div className="space-y-4">
                   {/* Kategori Filtreleri */}
                   <div className="flex flex-wrap gap-1 sm:gap-2 mb-4">
                     {['Tümü', 'Likidite', 'Kaldıraç', 'Karlılık'].map((category) => (
                       <button
                         key={category}
                         onClick={() => setSelectedCategory(category)}
                         className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border transition-colors ${
                           selectedCategory === category
                             ? 'bg-blue-500 text-white border-blue-500'
                             : 'border-gray-300 hover:bg-gray-100'
                         }`}
                       >
                         {category}
                       </button>
                     ))}
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                     {calculateFinancialRatios
                       .filter(result => selectedCategory === 'Tümü' || result.category === selectedCategory)
                       .map((result, index) => {
                         // Değer bazlı renk kodlaması
                         const getValueColor = (value: number, category: string) => {
                           if (category === 'Likidite') {
                             return value >= 2 ? 'text-green-600' : value >= 1 ? 'text-yellow-600' : 'text-red-600';
                           }
                           if (category === 'Karlılık') {
                             return value > 0 ? 'text-green-600' : 'text-red-600';
                           }
                           return 'text-blue-600';
                         };
                         
                         const getBackgroundColor = (category: string) => {
                           switch (category) {
                             case 'Likidite': return 'from-green-50 to-blue-50 border-green-200';
                             case 'Kaldıraç': return 'from-orange-50 to-yellow-50 border-orange-200';
                             case 'Karlılık': return 'from-purple-50 to-pink-50 border-purple-200';
                             default: return 'from-blue-50 to-purple-50 border-blue-200';
                           }
                         };
                         
                         return (
                           <div key={index} className={`p-3 sm:p-4 bg-gradient-to-r ${getBackgroundColor(result.category)} rounded-lg border transition-all hover:shadow-md`}>
                             <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                               <div className="font-semibold text-gray-900 text-sm sm:text-base break-words">{result.name}</div>
                               <div className="text-xs sm:text-sm px-2 py-1 bg-white bg-opacity-70 text-gray-700 rounded flex-shrink-0">
                                 {result.category}
                               </div>
                             </div>
                             <div className={`text-xl sm:text-2xl font-bold mb-2 ${getValueColor(result.value, result.category)}`}>
                               {typeof result.value === 'number' && result.name.includes('%') 
                                 ? `${(result.value != null ? result.value.toFixed(2) : '0.00')}%`
                                 : (result.value != null ? result.value.toFixed(3) : '0.000')
                               }
                             </div>
                             <div className="text-xs text-gray-600 mb-2">
                               <strong>Formül:</strong> <span className="break-words">{result.formula}</span>
                             </div>
                             <div className="text-xs sm:text-sm text-gray-700">
                               <strong>Yorum:</strong> <span className="break-words">{result.interpretation}</span>
                             </div>
                           </div>
                         );
                       })}
                   </div>
                 </div>
               )}
              
              {calculationType === 'custom' && (
                <div className="space-y-4">
                  {selectedFields.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Hesaplama yapmak için finansal verileri seçin</p>
                      <p className="text-sm mt-2">En az 2 veri seçtiğinizde hesaplama alanı aktif olacaktır</p>
                    </div>
                  ) : selectedFields.length === 1 ? (
                    <div className="space-y-4">
                      {/* Tek Veri Seçildiğinde */}
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                          <Calculator className="h-4 w-4 mr-2" />
                          Hesaplama Alanı - Aktif Değil
                        </h4>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {selectedFields.map((fieldKey) => {
                            const field = financialDataFields.find(f => f.key === fieldKey);
                            const rawValue = analysis?.financialData?.[fieldKey as keyof typeof analysis.financialData];
                            const value = typeof rawValue === 'number' ? rawValue : null;
                            
                            // Debug: Seçilen veri değerlerini logla
                            console.debug(`Seçilen alan: ${field?.label}, Key: ${fieldKey}, Ham değer: ${rawValue}, İşlenmiş değer: ${value}, Tip: ${typeof rawValue}`);
                            
                            return (
                              <div key={String(fieldKey)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm">
                                <div className="font-medium">{field?.label || 'Bilinmeyen Alan'}</div>
                                <div className="text-xs">{formatCurrency(value)}</div>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-blue-700 text-sm">Hesaplama yapmak için bir veri daha seçin</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* İnteraktif Hesaplama Alanı */}
                      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                        <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                          <Calculator className="h-5 w-5 mr-2 text-green-600" />
                          İnteraktif Hesaplama Alanı - Aktif
                        </h4>
                        
                        {/* Seçilen Veriler */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                          {selectedFields.map((fieldKey) => {
                            const field = financialDataFields.find(f => f.key === fieldKey);
                            const rawValue = analysis?.financialData?.[fieldKey as keyof typeof analysis.financialData];
                            const value = typeof rawValue === 'number' ? rawValue : null;
                            
                            // Debug: Hesaplama alanındaki veri değerlerini logla
                            console.debug(`Hesaplama alanı - Alan: ${field?.label}, Key: ${fieldKey}, Ham değer: ${rawValue}, İşlenmiş değer: ${value}, Formatlanmış: ${formatCurrency(value)}`);
                            
                            return (
                              <div key={String(fieldKey)} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                <div className="text-sm font-medium text-gray-900">{field?.label || 'Bilinmeyen Alan'}</div>
                                <div className="text-lg font-bold text-blue-600">
                                  {formatCurrency(value)}
                                </div>
                                <div className="text-xs text-gray-500">{field?.description || 'Açıklama yok'}</div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Otomatik Hesaplama Sonuçları */}
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <h5 className="font-semibold text-gray-900 mb-3">Otomatik Hesaplama Sonuçları</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedFields.length >= 2 && (() => {
                              const results = [];
                              for (let i = 0; i < selectedFields.length; i++) {
                                for (let j = i + 1; j < selectedFields.length; j++) {
                                  const field1 = financialDataFields.find(f => f.key === selectedFields[i]);
                                  const field2 = financialDataFields.find(f => f.key === selectedFields[j]);
                                  const value1 = stockData ? Number(stockData[selectedFields[i] as keyof typeof stockData]) || 0 : 0;
                                  const value2 = stockData ? Number(stockData[selectedFields[j] as keyof typeof stockData]) || 0 : 0;
                                  
                                  if (typeof value1 === 'number' && typeof value2 === 'number' && value2 !== 0) {
                                    const ratio = value1 / value2;
                                    const percentage = (ratio * 100);
                                    
                                    results.push(
                                      <div key={`${i}-${j}`} className="p-3 bg-gray-50 rounded-lg border">
                                        <div className="text-sm font-medium text-gray-900 mb-1">
                                          {field1?.label} / {field2?.label}
                                        </div>
                                        <div className="text-lg font-bold text-purple-600 mb-1">
                          {ratio != null ? ratio.toFixed(3) : '0.000'}
                        </div>
                        <div className="text-sm text-green-600 mb-2">
                          %{percentage != null ? percentage.toFixed(2) : '0.00'}
                        </div>
                                        <div className="text-xs text-gray-500">
                                          {value1.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 2})} ÷ {value2.toLocaleString('tr-TR', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
                                        </div>
                                      </div>
                                    );
                                  }
                                }
                              }
                              return results;
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Seçilen Alanlar Özeti */}
                      <div className="bg-gray-50 p-4 rounded-lg border">
                        <h4 className="font-semibold text-gray-900 mb-2">Seçilen Finansal Veriler:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedFields.map((fieldKey) => {
                            const field = financialDataFields.find(f => f.key === fieldKey);
                            return (
                              <span key={String(fieldKey)} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                                {field?.label}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Hesaplama Sonuçları */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {calculateCustomMetrics.map((result, index) => {
                          // Değer bazlı performans göstergesi
                          const getPerformanceIndicator = (value: number, name: string) => {
                            if (name.includes('Oran') || name.includes('Ratio')) {
                              if (value >= 2) return { color: 'text-green-600', bg: 'bg-green-100', label: 'İyi' };
                              if (value >= 1) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Orta' };
                              return { color: 'text-red-600', bg: 'bg-red-100', label: 'Düşük' };
                            }
                            if (name.includes('ROA') || name.includes('Getiri')) {
                              if (value > 0.1) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Yüksek' };
                              if (value > 0) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pozitif' };
                              return { color: 'text-red-600', bg: 'bg-red-100', label: 'Negatif' };
                            }
                            return { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Hesaplandı' };
                          };
                          
                          const indicator = getPerformanceIndicator(result.value, result.name);
                          
                          return (
                            <div key={index} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                              <div className="flex justify-between items-start mb-3">
                                <div className="font-semibold text-gray-900 text-sm">{result.name}</div>
                                <div className={`text-xs px-2 py-1 rounded ${indicator.bg} ${indicator.color}`}>
                                  {indicator.label}
                                </div>
                              </div>
                              
                              <div className={`text-xl font-bold mb-2 ${indicator.color}`}>
                                {result.name.includes('%') 
                                  ? `${((result.value || 0) * 100).toFixed(2)}%`
                                  : (result.value || 0).toFixed(3)
                                }
                              </div>
                              
                              <div className="text-xs text-gray-500 mb-2 font-mono bg-gray-50 p-2 rounded">
                                {result.formula}
                              </div>
                              
                              <div className="text-sm text-gray-700 leading-relaxed">
                                {result.interpretation}
                              </div>
                              
                              {/* Kategori etiketi */}
                              <div className="mt-3 pt-2 border-t border-gray-100">
                                <span className="text-xs text-gray-500">
                                  Kategori: <span className="font-medium">{result.category}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Özet İstatistikler */}
                      {calculateCustomMetrics.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-2">Hesaplama Özeti</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-blue-600">{calculateCustomMetrics.length}</div>
                              <div className="text-sm text-gray-600">Toplam Hesaplama</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">
                                {calculateCustomMetrics.filter(r => r.value > 0).length}
                              </div>
                              <div className="text-sm text-gray-600">Pozitif Sonuç</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-600">{selectedFields.length}</div>
                              <div className="text-sm text-gray-600">Seçilen Alan</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-600">
                                {new Set(calculateCustomMetrics.map(r => r.category)).size}
                              </div>
                              <div className="text-sm text-gray-600">Farklı Kategori</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Finansal Oranlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Finansal Yapı */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Finansal Yapı</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Borç/Varlık Oranı</span>
              <span className="font-bold text-gray-900">
                %{analysis.ratios?.financialStructure?.debtToAssetRatio ?? 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Cari Oran</span>
              <span className="font-bold text-gray-900">
                {analysis.ratios?.financialStructure?.currentRatio != null ? analysis.ratios.financialStructure.currentRatio.toFixed(2) : '0.00'}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Özkaynak Oranı</span>
              <span className="font-bold text-gray-900">
                %{analysis.ratios?.financialStructure?.equityRatio ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Karlılık Oranları */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Karlılık Oranları</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Özkaynak Karlılığı</span>
              <span className={`font-bold ${
                (analysis.ratios?.ebitdaProfitability?.returnOnEquity ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                %{analysis.ratios?.ebitdaProfitability?.returnOnEquity ?? 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Aktif Karlılığı</span>
              <span className={`font-bold ${
                (analysis.ratios?.ebitdaProfitability?.returnOnAssets ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                %{analysis.ratios?.ebitdaProfitability?.returnOnAssets ?? 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">FAVÖK Marjı</span>
              <span className={`font-bold ${
                (analysis.ratios?.ebitdaProfitability?.ebitdaMargin ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                %{analysis.ratios?.ebitdaProfitability?.ebitdaMargin ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nakit Pozisyonu ve İşletme Sermayesi */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          <span>Nakit Pozisyonu ve İşletme Sermayesi</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-600 mb-2">Net İşletme Sermayesi</div>
            <div className={`text-2xl font-bold ${
              (analysis.ratios?.netWorkingCapital ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(analysis.ratios?.netWorkingCapital)}
            </div>
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-2">Nakit Pozisyonu</div>
            <div className={`text-2xl font-bold ${
              (analysis.ratios?.cashPosition ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(analysis.ratios?.cashPosition)}
            </div>
          </div>
        </div>
      </div>

      {/* Bedelsiz Hisse Potansiyeli */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Bedelsiz Hisse Potansiyeli</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">Dağıtılmamış Karlar</div>
            <div className="text-xl font-bold text-purple-700">
              %{analysis.ratios?.bonusPotential?.retainedEarningsRatio ?? 0}
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">Kar Dağıtım Oranı</div>
            <div className="text-xl font-bold text-purple-700">
              %{analysis.ratios?.bonusPotential?.payoutRatio ?? 0}
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-100 rounded-lg">
            <div className="text-sm text-purple-600 mb-1">Bedelsiz Skoru</div>
            <div className="text-xl font-bold text-purple-800">
              {analysis.ratios?.bonusPotential?.bonusScore ?? 0}/100
            </div>
          </div>
        </div>
      </div>

      {/* Son güncelleme */}
      <div className="text-center text-sm text-gray-500 mt-8">
        Son güncelleme: {new Date(stockData.timestamp).toLocaleString('tr-TR')}
      </div>
      </div>
    </div>
  );
});

export default StockAnalysis;