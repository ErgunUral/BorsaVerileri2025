import React, { useState, useEffect, useRef } from 'react';
import { Search, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

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
    financialData: any;
    ratios: any;
    recommendations: string[];
    riskLevel: 'Düşük' | 'Orta' | 'Yüksek';
    investmentScore: number;
  };
  timestamp: string;
}

interface StockSearchProps {
  onStockSelect: (stockData: StockData) => void;
}

const StockSearch: React.FC<StockSearchProps> = ({ onStockSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularStocks, setPopularStocks] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Socket.IO bağlantısı
  useEffect(() => {
    socketRef.current = io('http://localhost:9876');
    
    socketRef.current.on('stock-data', (data: StockData) => {
      setIsLoading(false);
      setError(null);
      onStockSelect(data);
      
      // Son aramaları güncelle
      const newRecentSearches = [data.stockCode, ...recentSearches.filter(s => s !== data.stockCode)].slice(0, 5);
      setRecentSearches(newRecentSearches);
      localStorage.setItem('recentStockSearches', JSON.stringify(newRecentSearches));
    });
    
    socketRef.current.on('stock-error', (error: { stockCode: string; error: string }) => {
      setIsLoading(false);
      setError(`${error.stockCode}: ${error.error}`);
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onStockSelect, recentSearches]);

  // Popüler hisseleri yükle
  useEffect(() => {
    const fetchPopularStocks = async () => {
      try {
        const response = await fetch('/api/stocks/popular');
        if (response.ok) {
          const data = await response.json();
          setPopularStocks(data.stocks || []);
        }
      } catch (error) {
        console.error('Popüler hisseler yüklenemedi:', error);
      }
    };

    fetchPopularStocks();
    
    // Son aramaları yükle
    const savedSearches = localStorage.getItem('recentStockSearches');
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches));
    }
  }, []);

  // Arama önerileri
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const filtered = popularStocks.filter(stock => 
        stock.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, popularStocks]);

  // Dış tıklama ile önerileri kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (stockCode: string) => {
    if (!stockCode.trim()) {
      setError('Lütfen bir hisse kodu giriniz');
      return;
    }

    const cleanStockCode = stockCode.trim().toUpperCase();
    
    // Hisse kodu formatını kontrol et
    if (!/^[A-Z0-9]{3,6}$/.test(cleanStockCode)) {
      setError('Geçersiz hisse kodu formatı (3-6 karakter, sadece harf ve sayı)');
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);
    
    // Socket.IO ile gerçek zamanlı veri iste
    if (socketRef.current) {
      socketRef.current.emit('subscribe-stock', cleanStockCode);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchTerm);
  };

  const handleSuggestionClick = (stockCode: string) => {
    setSearchTerm(stockCode);
    handleSearch(stockCode);
  };

  const handleQuickSearch = (stockCode: string) => {
    setSearchTerm(stockCode);
    handleSearch(stockCode);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Ana Arama Formu */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
            placeholder="Hisse kodu giriniz (örn: THYAO, AKBNK)"
            className="block w-full pl-10 pr-12 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            disabled={isLoading}
            maxLength={6}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            ) : (
              <button
                type="submit"
                disabled={!searchTerm.trim() || isLoading}
                className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Arama Önerileri */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((stock) => (
              <button
                key={stock}
                type="button"
                onClick={() => handleSuggestionClick(stock)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{stock}</span>
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Hata Mesajı */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Popüler Hisseler */}
      <div className="mt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Popüler Hisseler</h3>
        <div className="flex flex-wrap gap-2">
          {popularStocks.slice(0, 10).map((stock) => (
            <button
              key={stock}
              onClick={() => handleQuickSearch(stock)}
              disabled={isLoading}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stock}
            </button>
          ))}
        </div>
      </div>

      {/* Son Aramalar */}
      {recentSearches.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Son Aramalar</h3>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((stock) => (
              <button
                key={stock}
                onClick={() => handleQuickSearch(stock)}
                disabled={isLoading}
                className="px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {stock}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Yükleme Durumu */}
      {isLoading && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Hisse verisi çekiliyor...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockSearch;