import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, X, Divide, Calculator as CalculatorIcon, Copy, RotateCcw, Clock } from 'lucide-react';

type Operation = '+' | '-' | '*' | '/';

interface CalculationHistory {
  id: string;
  expression: string;
  result: number;
  timestamp: Date;
}

interface CalculatorState {
  display: string;
  result: number | null;
  error: string;
  history: CalculationHistory[];
  showHistory: boolean;
  autoCalculate: boolean;
}

const Calculator: React.FC = () => {
  const [state, setState] = useState<CalculatorState>({
    display: '',
    result: null,
    error: '',
    history: [],
    showHistory: false,
    autoCalculate: true
  });
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Klavye desteği için useEffect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        calculateExpression();
      } else if (e.key === 'Escape') {
        clearAll();
      } else if (/[0-9+\-*/().]/.test(e.key)) {
        // Sayı ve işlem tuşları için otomatik focus
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Otomatik hesaplama için useEffect
  useEffect(() => {
    if (state.autoCalculate && state.display && !state.error) {
      const timeoutId = setTimeout(() => {
        calculateExpression(false); // Geçmişe ekleme
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [state.display, state.autoCalculate]);

  const evaluateExpression = (expression: string): number => {
    try {
      // Güvenli hesaplama için sadece sayı ve temel işlemlere izin ver
      const sanitized = expression.replace(/[^0-9+\-*/.() ]/g, '');
      if (!sanitized) throw new Error('Geçersiz ifade');
      
      // eval yerine Function constructor kullan (daha güvenli)
      const result = Function('"use strict"; return (' + sanitized + ')')();
      
      if (!isFinite(result)) {
        throw new Error('Sonuç tanımsız');
      }
      
      return result;
    } catch (error) {
      throw new Error('Geçersiz matematiksel ifade');
    }
  };

  const calculateExpression = (addToHistory: boolean = true): void => {
    if (!state.display.trim()) return;

    try {
      const result = evaluateExpression(state.display);
      
      setState(prev => ({
        ...prev,
        result,
        error: '',
        history: addToHistory ? [
          {
            id: Date.now().toString(),
            expression: state.display,
            result,
            timestamp: new Date()
          },
          ...prev.history.slice(0, 4) // Son 5 işlemi tut
        ] : prev.history
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Hesaplama hatası',
        result: null
      }));
    }
  };

  const handleDisplayChange = (value: string): void => {
    setState(prev => ({ ...prev, display: value, error: '' }));
  };

  const appendToDisplay = (value: string): void => {
    setState(prev => ({ ...prev, display: prev.display + value, error: '' }));
  };

  const clearAll = (): void => {
    setState(prev => ({
      ...prev,
      display: '',
      result: null,
      error: ''
    }));
    inputRef.current?.focus();
  };

  const clearEntry = (): void => {
    setState(prev => ({ ...prev, display: prev.display.slice(0, -1), error: '' }));
  };

  const copyResult = async (): Promise<void> => {
    if (state.result !== null) {
      try {
        await navigator.clipboard.writeText(formatResult(state.result));
        // Kısa süre için başarı göstergesi
        setState(prev => ({ ...prev, error: 'Sonuç kopyalandı!' }));
        setTimeout(() => {
          setState(prev => ({ ...prev, error: '' }));
        }, 1500);
      } catch (err) {
        setState(prev => ({ ...prev, error: 'Kopyalama başarısız' }));
      }
    }
  };

  const loadFromHistory = (historyItem: CalculationHistory): void => {
    setState(prev => ({
      ...prev,
      display: historyItem.expression,
      result: historyItem.result,
      error: ''
    }));
    inputRef.current?.focus();
  };

  const toggleHistory = (): void => {
    setState(prev => ({ ...prev, showHistory: !prev.showHistory }));
  };

  const toggleAutoCalculate = (): void => {
    setState(prev => ({ ...prev, autoCalculate: !prev.autoCalculate }));
  };

  const formatResult = (num: number): string => {
    if (Number.isInteger(num)) {
      return num.toString();
    }
    return num.toFixed(6).replace(/\.?0+$/, '');
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Sayı butonları için grid
  const numberButtons = [
    ['7', '8', '9'],
    ['4', '5', '6'],
    ['1', '2', '3'],
    ['0', '.', '=']
  ];

  const operationButtons = [
    { symbol: '+', label: 'Toplama', color: 'bg-blue-500 hover:bg-blue-600' },
    { symbol: '-', label: 'Çıkarma', color: 'bg-blue-500 hover:bg-blue-600' },
    { symbol: '*', label: 'Çarpma', color: 'bg-blue-500 hover:bg-blue-600' },
    { symbol: '/', label: 'Bölme', color: 'bg-blue-500 hover:bg-blue-600' }
  ];

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CalculatorIcon className="w-8 h-8 text-blue-600" />
          <h2 className="text-3xl font-bold text-gray-800">Akıllı Hesap Makinesi</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleAutoCalculate}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              state.autoCalculate 
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border-gray-300'
            }`}
            title="Otomatik hesaplama"
          >
            {state.autoCalculate ? 'Otomatik Açık' : 'Otomatik Kapalı'}
          </button>
          <button
            onClick={toggleHistory}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Geçmişi göster/gizle"
          >
            <Clock className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ana Hesaplama Alanı */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tek Satır Hesaplama */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Matematiksel İfade (örn: 5 + 3 * 2)
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={state.display}
                onChange={(e) => handleDisplayChange(e.target.value)}
                placeholder="Hesaplama yazın... (Enter ile hesapla, Esc ile temizle)"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                autoFocus
              />
              {state.display && (
                <button
                  onClick={clearEntry}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Son karakteri sil"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sayı Butonları */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Hızlı Giriş</h3>
            <div className="grid grid-cols-4 gap-2">
              {/* Sayı butonları */}
              {numberButtons.flat().map((btn, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (btn === '=') {
                      calculateExpression();
                    } else {
                      appendToDisplay(btn);
                    }
                  }}
                  className={`h-12 rounded-lg font-semibold text-lg transition-all ${
                    btn === '=' 
                      ? 'bg-green-500 hover:bg-green-600 text-white col-span-1'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {btn}
                </button>
              ))}
              
              {/* İşlem butonları */}
              {operationButtons.map((op) => (
                <button
                  key={op.symbol}
                  onClick={() => appendToDisplay(op.symbol)}
                  className={`h-12 rounded-lg font-semibold text-lg text-white transition-all ${op.color}`}
                  title={op.label}
                >
                  {op.symbol}
                </button>
              ))}
              
              {/* Özel butonlar */}
              <button
                onClick={clearAll}
                className="h-12 rounded-lg font-semibold text-lg bg-red-500 hover:bg-red-600 text-white transition-all"
                title="Tümünü temizle"
              >
                C
              </button>
              
              <button
                onClick={() => appendToDisplay('(')}
                className="h-12 rounded-lg font-semibold text-lg bg-gray-300 hover:bg-gray-400 text-gray-800 transition-all"
              >
                (
              </button>
              
              <button
                onClick={() => appendToDisplay(')')}
                className="h-12 rounded-lg font-semibold text-lg bg-gray-300 hover:bg-gray-400 text-gray-800 transition-all"
              >
                )
              </button>
              
              <button
                onClick={calculateExpression}
                className="h-12 rounded-lg font-semibold text-lg bg-blue-500 hover:bg-blue-600 text-white transition-all"
                title="Hesapla"
              >
                =
              </button>
            </div>
          </div>

          {/* Sonuç Alanı */}
          {(state.result !== null || state.error) && (
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              {state.error ? (
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">Hata</p>
                    <p className="text-sm text-red-600">{state.error}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">Sonuç</h3>
                    <button
                      onClick={copyResult}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      title="Sonucu kopyala"
                    >
                      <Copy className="w-3 h-3" />
                      Kopyala
                    </button>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      {formatResult(state.result!)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {state.display} = {formatResult(state.result!)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Geçmiş Paneli */}
        {state.showHistory && (
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Geçmiş</h3>
              <button
                onClick={() => setState(prev => ({ ...prev, history: [] }))}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Temizle
              </button>
            </div>
            
            {state.history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Henüz hesaplama yapılmadı
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {state.history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => loadFromHistory(item)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-gray-500">
                        {formatTime(item.timestamp)}
                      </span>
                      <RotateCcw className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm font-mono text-gray-700 mb-1">
                      {item.expression}
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      = {formatResult(item.result)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Klavye Kısayolları Bilgisi */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>Klavye Kısayolları:</strong> Enter = Hesapla, Esc = Temizle, Sayı tuşları = Otomatik odaklanma
        </p>
      </div>
    </div>
  );
};

export default Calculator;