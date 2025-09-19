import React, { useState } from 'react';
import { Plus, Minus, X, Divide, Calculator as CalculatorIcon } from 'lucide-react';

type Operation = '+' | '-' | '*' | '/';

interface CalculatorState {
  firstNumber: string;
  secondNumber: string;
  operation: Operation;
  result: number | null;
  error: string;
}

const Calculator: React.FC = () => {
  const [state, setState] = useState<CalculatorState>({
    firstNumber: '',
    secondNumber: '',
    operation: '+',
    result: null,
    error: ''
  });

  const operations = [
    { value: '+' as Operation, label: 'Toplama', icon: Plus },
    { value: '-' as Operation, label: 'Çıkarma', icon: Minus },
    { value: '*' as Operation, label: 'Çarpma', icon: X },
    { value: '/' as Operation, label: 'Bölme', icon: Divide }
  ];

  const validateInput = (value: string): boolean => {
    if (value === '') return false;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  };

  const calculate = (): void => {
    setState(prev => ({ ...prev, error: '', result: null }));

    if (!validateInput(state.firstNumber)) {
      setState(prev => ({ ...prev, error: 'Lütfen geçerli bir ilk sayı girin.' }));
      return;
    }

    if (!validateInput(state.secondNumber)) {
      setState(prev => ({ ...prev, error: 'Lütfen geçerli bir ikinci sayı girin.' }));
      return;
    }

    const num1 = parseFloat(state.firstNumber);
    const num2 = parseFloat(state.secondNumber);

    if (state.operation === '/' && num2 === 0) {
      setState(prev => ({ ...prev, error: 'Sıfıra bölme hatası! İkinci sayı sıfır olamaz.' }));
      return;
    }

    let result: number;
    switch (state.operation) {
      case '+':
        result = num1 + num2;
        break;
      case '-':
        result = num1 - num2;
        break;
      case '*':
        result = num1 * num2;
        break;
      case '/':
        result = num1 / num2;
        break;
      default:
        setState(prev => ({ ...prev, error: 'Geçersiz işlem türü.' }));
        return;
    }

    setState(prev => ({ ...prev, result, error: '' }));
  };

  const handleInputChange = (field: 'firstNumber' | 'secondNumber', value: string): void => {
    setState(prev => ({ ...prev, [field]: value, result: null, error: '' }));
  };

  const handleOperationChange = (operation: Operation): void => {
    setState(prev => ({ ...prev, operation, result: null, error: '' }));
  };

  const clearAll = (): void => {
    setState({
      firstNumber: '',
      secondNumber: '',
      operation: '+',
      result: null,
      error: ''
    });
  };

  const formatResult = (num: number): string => {
    if (Number.isInteger(num)) {
      return num.toString();
    }
    return num.toFixed(6).replace(/\.?0+$/, '');
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <CalculatorIcon className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Hesap Makinesi</h2>
      </div>

      {/* İlk Sayı */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İlk Sayı
        </label>
        <input
          type="number"
          value={state.firstNumber}
          onChange={(e) => handleInputChange('firstNumber', e.target.value)}
          placeholder="Bir sayı girin"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* İşlem Seçimi */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İşlem Türü
        </label>
        <div className="grid grid-cols-4 gap-2">
          {operations.map((op) => {
            const IconComponent = op.icon;
            return (
              <button
                key={op.value}
                onClick={() => handleOperationChange(op.value)}
                className={`flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all duration-200 ${
                  state.operation === op.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                }`}
                title={op.label}
              >
                <IconComponent className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium">{op.value}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* İkinci Sayı */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          İkinci Sayı
        </label>
        <input
          type="number"
          value={state.secondNumber}
          onChange={(e) => handleInputChange('secondNumber', e.target.value)}
          placeholder="Bir sayı girin"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Hesapla ve Temizle Butonları */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={calculate}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
        >
          Hesapla
        </button>
        <button
          onClick={clearAll}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
        >
          Temizle
        </button>
      </div>

      {/* Sonuç Alanı */}
      {(state.result !== null || state.error) && (
        <div className="border-t pt-4">
          {state.error ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    Hata
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {state.error}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="text-center">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Sonuç
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {formatResult(state.result!)}
                </p>
                <p className="text-sm text-green-700 mt-2">
                  {state.firstNumber} {state.operation} {state.secondNumber} = {formatResult(state.result!)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Calculator;