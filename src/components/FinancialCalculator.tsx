import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, RefreshCw, AlertTriangle, Settings } from 'lucide-react';

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

interface CalculatorState {
  firstNumber: string;
  secondNumber: string;
  operation: '+' | '-' | '×' | '/' | null;
  result: number | null;
  error: string | null;
  history: CalculatorHistoryItem[];
  selectedFields: string[];
  lastCalculation?: {
    fields: string[];
    operation: '+' | '-' | '×' | '/';
    result: number;
    timestamp: string;
  };
}

interface CalculatorHistoryItem {
  id: string;
  expression: string;
  result: number;
  timestamp: Date;
}

interface FinancialCalculatorProps {
  financialData: any;
  onCalculationComplete?: (results: CalculationResult[]) => void;
}

const FinancialCalculator: React.FC<FinancialCalculatorProps> = ({ 
  financialData, 
  onCalculationComplete 
}) => {
  // Finansal veri alanları tanımı
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
  const [calculatorState, setCalculatorState] = useState<CalculatorState>({
    firstNumber: '',
    secondNumber: '',
    operation: null,
    result: null,
    error: null,
    history: [],
    selectedFields: []
  });
  const [showCustomCalculator, setShowCustomCalculator] = useState(false);

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
  }, [selectedFields, calculationType, financialData]);

  // Otomatik hesaplama fonksiyonları
  const calculateFinancialRatios = useMemo((): CalculationResult[] => {
    if (!financialData) return [];
    
    const results: CalculationResult[] = [];
    
    // Likidite Oranları
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
    
    // Karlılık Oranları
    if (financialData.netProfit && financialData.totalAssets) {
      const roa = (financialData.netProfit / financialData.totalAssets) * 100;
      results.push({
        name: 'Aktif Karlılığı (ROA)',
        value: roa,
        formula: '(Net Kar / Toplam Varlıklar) × 100',
        interpretation: roa > 5 ? 'Yüksek karlılık' : roa > 2 ? 'Orta karlılık' : 'Düşük karlılık',
        category: 'Karlılık'
      });
    }
    
    if (financialData.netProfit && financialData.equity) {
      const roe = (financialData.netProfit / financialData.equity) * 100;
      results.push({
        name: 'Özkaynak Karlılığı (ROE)',
        value: roe,
        formula: '(Net Kar / Özkaynaklar) × 100',
        interpretation: roe > 15 ? 'Mükemmel karlılık' : roe > 10 ? 'İyi karlılık' : 'Zayıf karlılık',
        category: 'Karlılık'
      });
    }
    
    return results;
  }, [financialData]);

  // Hesap makinesi fonksiyonları
  const handleCalculatorInput = (field: 'firstNumber' | 'secondNumber', value: string) => {
    const numericValue = value.replace(/[^0-9.-]/g, '');
    setCalculatorState(prev => ({
      ...prev,
      [field]: numericValue,
      error: null
    }));
  };

  const handleOperationSelect = (operation: '+' | '-' | '×' | '/') => {
    setCalculatorState(prev => ({
      ...prev,
      operation,
      error: null
    }));
  };

  const calculateResult = () => {
    const { firstNumber, secondNumber, operation } = calculatorState;
    
    if (!firstNumber || !secondNumber || !operation) {
      setCalculatorState(prev => ({
        ...prev,
        error: 'Lütfen tüm alanları doldurun'
      }));
      return;
    }
    
    const num1 = parseFloat(firstNumber);
    const num2 = parseFloat(secondNumber);
    
    if (isNaN(num1) || isNaN(num2)) {
      setCalculatorState(prev => ({
        ...prev,
        error: 'Geçerli sayılar girin'
      }));
      return;
    }
    
    let result: number;
    let operationSymbol: string;
    
    switch (operation) {
      case '+':
        result = num1 + num2;
        operationSymbol = '+';
        break;
      case '-':
        result = num1 - num2;
        operationSymbol = '-';
        break;
      case '×':
        result = num1 * num2;
        operationSymbol = '×';
        break;
      case '/':
        if (num2 === 0) {
          setCalculatorState(prev => ({
            ...prev,
            error: 'Sıfıra bölme hatası'
          }));
          return;
        }
        result = num1 / num2;
        operationSymbol = '÷';
        break;
      default:
        return;
    }
    
    const historyItem: CalculatorHistoryItem = {
      id: Date.now().toString(),
      expression: `${num1} ${operationSymbol} ${num2}`,
      result,
      timestamp: new Date()
    };
    
    setCalculatorState(prev => ({
      ...prev,
      result,
      error: null,
      history: [historyItem, ...prev.history.slice(0, 9)] // Son 10 işlemi sakla
    }));
  };

  const clearCalculator = () => {
    setCalculatorState(prev => ({
      ...prev,
      firstNumber: '',
      secondNumber: '',
      operation: null,
      result: null,
      error: null
    }));
  };

  const clearCalculatorHistory = () => {
    setCalculatorState(prev => ({
      ...prev,
      history: []
    }));
  };

  // Callback for calculation completion
  useEffect(() => {
    if (onCalculationComplete && calculationType === 'ratios') {
      const results = calculateFinancialRatios;
      onCalculationComplete(results);
    }
  }, [calculateFinancialRatios, calculationType, onCalculationComplete]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          <span>Finansal Hesap Makinesi</span>
        </h3>
        
        <div className="flex items-center space-x-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCalculationType('ratios')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calculationType === 'ratios'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Otomatik Oranlar
            </button>
            <button
              onClick={() => setCalculationType('custom')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                calculationType === 'custom'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Özel Hesaplama
            </button>
          </div>
          
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {calculationType === 'ratios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {isCalculating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Hesaplanıyor...</span>
                </div>
              ) : (
                <span>
                  {calculateFinancialRatios.length} oran hesaplandı
                  {lastCalculationTime && (
                    <span className="ml-2 text-gray-400">
                      • {lastCalculationTime.toLocaleTimeString('tr-TR')}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {calculateFinancialRatios.map((result, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{result.name}</h4>
                  <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {result.category}
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {result.value.toLocaleString('tr-TR', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                  {result.name.includes('%') || result.name.includes('ROA') || result.name.includes('ROE') ? '%' : ''}
                </div>
                <div className="text-xs text-gray-500 mb-2">{result.formula}</div>
                <div className="text-sm text-gray-700">{result.interpretation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {calculationType === 'custom' && (
        <div className="space-y-6">
          {/* İşlem Seçimi */}
          <div className="flex justify-center space-x-2">
            {['+', '-', '×', '/'].map((op) => (
              <button
                key={op}
                onClick={() => handleOperationSelect(op as '+' | '-' | '×' | '/')}
                className={`w-12 h-12 rounded-lg font-bold text-lg transition-colors ${
                  calculatorState.operation === op
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {op}
              </button>
            ))}
          </div>
          
          {/* Sayı Girişleri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Birinci Sayı</label>
              <input
                type="text"
                value={calculatorState.firstNumber}
                onChange={(e) => handleCalculatorInput('firstNumber', e.target.value)}
                placeholder="Sayı girin..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">İkinci Sayı</label>
              <input
                type="text"
                value={calculatorState.secondNumber}
                onChange={(e) => handleCalculatorInput('secondNumber', e.target.value)}
                placeholder="Sayı girin..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
              />
            </div>
          </div>
          
          {/* İşlem Butonları */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={calculateResult}
              disabled={!calculatorState.firstNumber || !calculatorState.secondNumber || !calculatorState.operation}
              className="flex-1 py-3 px-6 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>Hesapla</span>
            </button>
            
            <button
              onClick={clearCalculator}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold flex items-center justify-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Temizle</span>
            </button>
          </div>
          
          {/* Sonuç Gösterimi */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            {calculatorState.error ? (
              <div className="text-center">
                <div className="text-red-600 font-semibold mb-2 flex items-center justify-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Hata</span>
                </div>
                <div className="text-red-500">{calculatorState.error}</div>
              </div>
            ) : calculatorState.result !== null ? (
              <div className="text-center">
                <div className="text-gray-600 mb-2 font-medium">Sonuç</div>
                <div className="text-3xl font-bold text-green-600 font-mono">
                  {calculatorState.result.toLocaleString('tr-TR', { maximumFractionDigits: 8 })}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {calculatorState.firstNumber} {calculatorState.operation} {calculatorState.secondNumber} = {calculatorState.result.toLocaleString('tr-TR', { maximumFractionDigits: 8 })}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <Calculator className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <div>Hesaplama yapmak için yukarıdaki alanları doldurun</div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* İşlem Geçmişi */}
      {calculatorState.history.length > 0 && (
        <div className="mt-6 bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">İşlem Geçmişi</h4>
            <button
              onClick={clearCalculatorHistory}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Geçmişi Temizle
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {calculatorState.history.map((item) => (
              <div key={item.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                <div className="font-mono text-sm">
                  <span className="text-gray-700">{item.expression}</span>
                  <span className="text-gray-500 mx-2">=</span>
                  <span className="text-green-600 font-semibold">
                    {item.result.toLocaleString('tr-TR', { maximumFractionDigits: 8 })}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {item.timestamp.toLocaleTimeString('tr-TR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FinancialCalculator);