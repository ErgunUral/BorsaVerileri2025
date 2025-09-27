import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { useToast } from '../hooks/useToast';

// Throttling ve cache için utility fonksiyonlar
const throttle = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  return (...args: any[]) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Cache sistemi
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 900000) { // 15 dakika default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  clear() {
    this.cache.clear();
  }
}

const apiCache = new ApiCache();

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
  const { success, error: showError, handleApiError } = useToast();
  
  const socketRef = useRef<Socket | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Socket.IO bağlantısı
  useEffect(() => {
    socketRef.current = io('http://localhost:9876');
    
    socketRef.current.on('stock-data', (data: StockData) => {
      console.log('StockSearch - Socket\'ten gelen veri:', data);
      console.log('StockSearch - Price objesi:', data.price);
      console.log('StockSearch - Finansal veriler:', data.analysis?.financialData);
      
      setIsLoading(false);
      setError(null);
      success(`${data.stockCode} verisi başarıyla yüklendi`);
      onStockSelect(data);
      
      // Son aramaları güncelle
      const newRecentSearches = [data.stockCode, ...recentSearches.filter(s => s !== data.stockCode)].slice(0, 5);
      setRecentSearches(newRecentSearches);
      localStorage.setItem('recentStockSearches', JSON.stringify(newRecentSearches));
    });
    
    socketRef.current.on('stock-error', (error: { stockCode: string; error: string }) => {
      setIsLoading(false);
      const errorMessage = `${error.stockCode}: ${error.error}`;
      setError(errorMessage);
      showError(errorMessage);
    });
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onStockSelect, recentSearches]);

  // Popüler hisseleri yükle - Cache ve retry logic ile optimize edilmiş
  const fetchPopularStocksWithRetry = useCallback(async (retryCount = 0): Promise<void> => {
    const cacheKey = 'popular-stocks';
    const maxRetries = 2; // Retry sayısını azalt
    const baseDelay = 2000; // 2 saniye base delay
    
    // Önce cache'den kontrol et
    const cachedData = apiCache.get(cacheKey);
    if (cachedData) {
      setPopularStocks(cachedData);
      return;
    }
    
    try {
      // Rate limiting için delay ekle - İyileştirilmiş exponential backoff
      if (retryCount > 0) {
        const delay = baseDelay * Math.pow(3, retryCount - 1); // Daha agresif backoff (3x)
        console.log(`Rate limit retry ${retryCount}, waiting ${delay}ms`);
        await sleep(delay);
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout
      
      const response = await fetch('/api/bulk/popular', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        let stocksToSet: string[];
        
        // API'den gelen veri yapısına göre popüler hisseleri çıkar
        if (data.success && data.data) {
          const successfulStocks = Object.keys(data.data.successful || {});
          stocksToSet = successfulStocks.length > 0 ? successfulStocks : [
            'AKBNK', 'GARAN', 'ISCTR', 'THYAO', 'BIMAS', 'ASELS', 'KCHOL',
            'SAHOL', 'VAKBN', 'HALKB', 'EREGL', 'ARCLK', 'TUPRS', 'SISE'
          ];
        } else {
          stocksToSet = [
            'AKBNK', 'GARAN', 'ISCTR', 'THYAO', 'BIMAS', 'ASELS', 'KCHOL',
            'SAHOL', 'VAKBN', 'HALKB', 'EREGL', 'ARCLK', 'TUPRS', 'SISE'
          ];
        }
        
        setPopularStocks(stocksToSet);
        // Cache'e kaydet (15 dakika TTL)
        apiCache.set(cacheKey, stocksToSet, 900000);
        
      } else if (response.status === 429 && retryCount < maxRetries) {
        // Rate limiting durumunda retry - daha uzun bekleme
        console.warn(`Rate limited, retrying... (${retryCount + 1}/${maxRetries})`);
        await sleep(5000); // 5 saniye ekstra bekleme
        return fetchPopularStocksWithRetry(retryCount + 1);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('Popüler hisseler isteği zaman aşımına uğradı');
      } else if (error.message.includes('429') && retryCount < maxRetries) {
        console.warn(`Rate limited, retrying... (${retryCount + 1}/${maxRetries})`);
        await sleep(5000); // 5 saniye ekstra bekleme
        return fetchPopularStocksWithRetry(retryCount + 1);
      } else {
        console.error('Popüler hisseler yüklenemedi:', error);
      }
      
      // Hata durumunda fallback liste kullan
      const fallbackStocks = [
        'AKBNK', 'GARAN', 'ISCTR', 'THYAO', 'BIMAS', 'ASELS', 'KCHOL',
        'SAHOL', 'VAKBN', 'HALKB', 'EREGL', 'ARCLK', 'TUPRS', 'SISE'
      ];
      setPopularStocks(fallbackStocks);
      
      // Fallback'i de cache'e kaydet (daha kısa TTL)
      apiCache.set(cacheKey, fallbackStocks, 300000); // 5 dakika TTL
      
      // Rate limiting durumunda kullanıcıya bilgi ver
      if (error.message.includes('429')) {
        if (retryCount === 0) {
          setError('Çok fazla istek gönderildi. Lütfen birkaç saniye bekleyiniz...');
        }
      } else if (retryCount === 0) {
        // Sadece gerçek hatalarda toast göster
        handleApiError(error as Error);
      }
    }
  }, [handleApiError]);
  
  // Throttled version of fetchPopularStocks
  const throttledFetchPopularStocks = useCallback(
    throttle(fetchPopularStocksWithRetry, 5000), // 5 saniye throttle
    [fetchPopularStocksWithRetry]
  );

  // Component mount'ta sadece bir kez çalışacak şekilde optimize et
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    if (!isInitialized) {
      // Önce cache'den kontrol et, yoksa API'yi çağır
      const cachedStocks = apiCache.get('popular-stocks');
      if (cachedStocks) {
        setPopularStocks(cachedStocks);
      } else {
        // Cache yoksa throttled fetch çağır
        throttledFetchPopularStocks();
      }
      
      // Son aramaları yükle
      const savedSearches = localStorage.getItem('recentStockSearches');
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
      
      setIsInitialized(true);
    }
  }, [isInitialized, throttledFetchPopularStocks]);

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

  const handleSearchInternal = async (stockCode: string) => {
    if (!stockCode.trim()) {
      const errorMsg = 'Lütfen bir hisse kodu giriniz';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    const cleanStockCode = stockCode.trim().toUpperCase();
    
    // Hisse kodu formatını kontrol et
    if (!/^[A-Z0-9]{3,6}$/.test(cleanStockCode)) {
      const errorMsg = 'Geçersiz hisse kodu formatı (3-6 karakter, sadece harf ve sayı)';
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);
    
    // Socket.IO ile gerçek zamanlı veri iste
    if (socketRef.current) {
      socketRef.current.emit('subscribe-stock', cleanStockCode);
      
      // Timeout ekle
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          const timeoutMsg = `${cleanStockCode} için veri alınamadı (zaman aşımı)`;
          setError(timeoutMsg);
          showError(timeoutMsg);
        }
      }, 15000); // 15 saniye timeout
    } else {
      setIsLoading(false);
      const connectionMsg = 'WebSocket bağlantısı mevcut değil';
      setError(connectionMsg);
      showError(connectionMsg);
    }
  };
  
  // Throttled search function
  const handleSearch = useCallback(
    throttle(handleSearchInternal, 2000), // 2 saniye throttle
    [isLoading, showError]
  );

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