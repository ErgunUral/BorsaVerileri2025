import React, { useState, useEffect } from 'react';
import { Calculator, RefreshCw, AlertTriangle, Plus, Minus, X, Divide } from 'lucide-react';
import { financialDataFields, getFieldByKey } from '../config/financialFields';

type OperationType = 'add' | 'subtract' | 'multiply' | 'divide';

interface SelectedField {
  key: string;
  value: number;
  label: string;
}

interface CalculationResult {
  operation: OperationType;
  fields: SelectedField[];
  result: number;
  expression: string;
  timestamp: Date;
  id: string;
}

interface FinancialCalculatorProps {
  showCalculator: boolean;
  onToggle: () => void;
  financialData?: Record<string, number>;
}

const FinancialCalculator: React.FC<FinancialCalculatorProps> = ({ 
  showCalculator, 
  onToggle, 
  financialData = {} 
}) => {
  const [selectedFields, setSelectedFields] = useState<SelectedField[]>([]);
  const [operation, setOperation] = useState<OperationType>('add');
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);



  // Finansal alan ekleme
  const addField = (fieldKey: string) => {
    const field = getFieldByKey(fieldKey);
    if (!field) return;
    
    const value = financialData[fieldKey] || 0;
    const newField: SelectedField = {
      key: fieldKey,
      value,
      label: field.label
    };
    
    setSelectedFields(prev => {
      if (prev.find(f => f.key === fieldKey)) return prev;
      return [...prev, newField];
    });
  };
  
  // Finansal alan kaldırma
  const removeField = (fieldKey: string) => {
    setSelectedFields(prev => prev.filter(f => f.key !== fieldKey));
  };
  
  // Alan değeri güncelleme
  const updateFieldValue = (fieldKey: string, value: number) => {
    setSelectedFields(prev => 
      prev.map(f => f.key === fieldKey ? { ...f, value } : f)
    );
  };
  
  // Hesaplama işlemi
  const performCalculation = (): { result: number; error: string | null } => {
    if (selectedFields.length === 0) {
      return { result: 0, error: 'En az bir finansal alan seçmelisiniz!' };
    }
    
    try {
      let result: number;
      const values = selectedFields.map(f => f.value);
      
      switch (operation) {
        case 'add':
          result = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'subtract':
          result = values.reduce((diff, val, index) => index === 0 ? val : diff - val);
          break;
        case 'multiply':
          result = values.reduce((product, val) => product * val, 1);
          break;
        case 'divide':
          if (values.some((val, index) => index > 0 && val === 0)) {
            return { result: 0, error: 'Sıfıra bölme hatası!' };
          }
          result = values.reduce((quotient, val, index) => index === 0 ? val : quotient / val);
          break;
        default:
          return { result: 0, error: 'Geçersiz işlem!' };
      }
      
      if (!isFinite(result)) {
        return { result: 0, error: 'Sonuç çok büyük veya geçersiz!' };
      }
      
      return { result, error: null };
    } catch {
      return { result: 0, error: 'Hesaplama hatası!' };
    }
  };

  // Hesaplama işlemini gerçekleştir
  const calculateResult = () => {
    const calculation = performCalculation();
    
    if (calculation.error) {
      setError(calculation.error);
      setResult(null);
      return;
    }
    
    setResult(calculation.result);
    setError(null);
    
    // Geçmişe ekle
    const operationSymbols = {
      add: '+',
      subtract: '-',
      multiply: '×',
      divide: '÷'
    };
    
    const expression = selectedFields
      .map(f => `${f.label}(${f.value})`)
      .join(` ${operationSymbols[operation]} `);
    
    const historyItem: CalculationResult = {
      id: Date.now().toString(),
      operation,
      fields: [...selectedFields],
      result: calculation.result,
      expression,
      timestamp: new Date()
    };
    
    setHistory(prev => [historyItem, ...prev.slice(0, 9)]);
  };
  
  // Temizle
  const clearCalculation = () => {
    setSelectedFields([]);
    setResult(null);
    setError(null);
  };
  
  // Real-time hesaplama
  useEffect(() => {
    if (selectedFields.length > 0) {
      const calculation = performCalculation();
      if (!calculation.error) {
        setResult(calculation.result);
        setError(null);
      } else {
        setError(calculation.error);
        setResult(null);
      }
    } else {
      setResult(null);
      setError(null);
    }
  }, [selectedFields, operation]);
  
  // İşlem türü ikonları
  const getOperationIcon = (op: OperationType) => {
    switch (op) {
      case 'add': return <Plus className="w-4 h-4" />;
      case 'subtract': return <Minus className="w-4 h-4" />;
      case 'multiply': return <X className="w-4 h-4" />;
      case 'divide': return <Divide className="w-4 h-4" />;
    }
  };
  
  // İşlem türü etiketleri
  const getOperationLabel = (op: OperationType) => {
    switch (op) {
      case 'add': return 'Toplama';
      case 'subtract': return 'Çıkarma';
      case 'multiply': return 'Çarpma';
      case 'divide': return 'Bölme';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div 
        className="flex items-center justify-between p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center space-x-3">
          <Calculator className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Finansal Hesap Makinesi</h3>
        </div>
        <div className="text-gray-400">
          {showCalculator ? '−' : '+'}
        </div>
      </div>

      {showCalculator && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sol Panel - Hesaplama */}
            <div className="space-y-4">
              {/* İşlem Türü Seçimi */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">İşlem Türü</h4>
                <div className="grid grid-cols-2 gap-2">
                  {(['add', 'subtract', 'multiply', 'divide'] as OperationType[]).map((op) => (
                    <button
                      key={op}
                      onClick={() => setOperation(op)}
                      className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        operation === op
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {getOperationIcon(op)}
                      <span>{getOperationLabel(op)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Finansal Alan Seçimi */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">Finansal Alanlar</h4>
                  <button
                    onClick={() => setShowFieldSelector(!showFieldSelector)}
                    className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {showFieldSelector ? 'Gizle' : 'Alan Seç'}
                  </button>
                </div>
                
                {showFieldSelector && (
                  <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    <div className="p-3 space-y-2">
                      {financialDataFields.map((field) => (
                        <button
                          key={field.key}
                          onClick={() => addField(field.key)}
                          disabled={selectedFields.some(f => f.key === field.key)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedFields.some(f => f.key === field.key)
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-white hover:bg-blue-50 border border-gray-200'
                          }`}
                        >
                          <div className="font-medium">{field.label}</div>
                          <div className="text-xs text-gray-500">{field.category}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Seçili Alanlar */}
                {selectedFields.length > 0 && (
                  <div className="space-y-2">
                    {selectedFields.map((field) => (
                      <div key={field.key} className="flex items-center space-x-2 bg-white p-3 rounded-md border border-gray-200">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">{field.label}</div>
                          <input
                            type="number"
                            value={field.value}
                            onChange={(e) => updateFieldValue(field.key, parseFloat(e.target.value) || 0)}
                            className="w-full mt-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            step="any"
                          />
                        </div>
                        <button
                          onClick={() => removeField(field.key)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedFields.length === 0 && (
                  <div className="text-gray-500 text-center py-4 text-sm">
                    Hesaplama için finansal alan seçin
                  </div>
                )}
              </div>

              {/* Kontrol Butonları */}
              <div className="flex space-x-2">
                <button
                  onClick={calculateResult}
                  disabled={selectedFields.length === 0}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Geçmişe Ekle
                </button>
                <button
                  onClick={clearCalculation}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sağ Panel - Sonuç ve Geçmiş */}
            <div className="space-y-4">
              {/* Sonuç Gösterimi */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Anlık Sonuç</h4>
                
                {error && (
                  <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md mb-3">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                
                {result !== null && !error && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="text-2xl font-bold text-green-800">
                      {result.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                      })}
                    </div>
                    <div className="text-sm text-green-600 mt-1">
                      {getOperationLabel(operation)} işlemi
                    </div>
                  </div>
                )}
                
                {result === null && !error && (
                  <div className="text-gray-500 text-center py-8">
                    Hesaplama sonucu burada görünecek
                  </div>
                )}
              </div>

              {/* İşlem Geçmişi */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">İşlem Geçmişi</h4>
                  {history.length > 0 && (
                    <button
                      onClick={() => setHistory([])}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Temizle
                    </button>
                  )}
                </div>
                
                {history.length === 0 ? (
                  <div className="text-gray-500 text-center py-8 text-sm">
                    Henüz işlem geçmişi yok
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {history.map((item) => (
                      <div key={item.id} className="bg-white rounded-md p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-800">
                            {getOperationLabel(item.operation)}
                          </div>
                          <div className="text-sm font-bold text-blue-600">
                            {item.result.toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 6
                            })}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {item.expression}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.timestamp.toLocaleString('tr-TR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialCalculator;