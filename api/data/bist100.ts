// BIST 100 Hisse Senetleri Listesi
export const BIST100_STOCKS = [
  // Bankacılık
  'AKBNK', 'GARAN', 'HALKB', 'ISCTR', 'SKBNK', 'TSKB', 'VAKBN', 'YKBNK',
  
  // Holding ve Yatırım
  'DOHOL', 'KCHOL', 'SAHOL', 'TAVHL', 'THYAO', 'TUPRS',
  
  // Teknoloji
  'ASELS', 'LOGO', 'NETAS', 'TTKOM', 'TTRAK',
  
  // Perakende
  'BIMAS', 'CARSI', 'MGROS', 'SOKM',
  
  // Enerji
  'AKSEN', 'ENKAI', 'PETKM', 'TUPRS', 'ZOREN',
  
  // İnşaat ve İnşaat Malzemeleri
  'AKSA', 'ANACM', 'ARCLK', 'CEMTS', 'EGEEN', 'EREGL', 'GOLTS', 'GUBRF', 'IHLAS', 'KRDMD', 'OYAKC', 'PRKME', 'SARKY', 'SISE', 'TOASO', 'TRKCM', 'ULKER', 'VESTL',
  
  // Otomotiv
  'ASUZU', 'DOAS', 'FROTO', 'OTKAR', 'TOASO', 'TTRAK',
  
  // Tekstil ve Deri
  'BRISA', 'DESA', 'KORDS', 'LUKSK', 'MAVI', 'SNKRN', 'YATAS',
  
  // Gıda ve İçecek
  'AEFES', 'BANVT', 'CCOLA', 'EKGYO', 'KNFRT', 'PETUN', 'PINSU', 'TATGD', 'TUKAS', 'ULKER',
  
  // Kimya, Petrol, Plastik
  'AKSA', 'ALKIM', 'BAGFS', 'BRISA', 'DEVA', 'DYOBY', 'EGEEN', 'EREGL', 'GOODY', 'GUBRF', 'HEKTS', 'IHEVA', 'KAPLM', 'KARTN', 'KOZAA', 'KOZAL', 'KRDMD', 'MRSHL', 'OTKAR', 'PETKM', 'PGSUS', 'PRKME', 'SARKY', 'SISE', 'SODA', 'TBORG', 'TCELL', 'THYAO', 'TOASO', 'TRKCM', 'TUPRS', 'ULKER', 'VESTL', 'YATAS', 'ZOREN'
];

// Popüler hisseler (yüksek işlem hacmi)
export const POPULAR_STOCKS = [
  'THYAO', 'AKBNK', 'GARAN', 'BIMAS', 'ASELS', 'HALKB', 'ISCTR', 'SAHOL',
  'VAKBN', 'YKBNK', 'TUPRS', 'EREGL', 'KCHOL', 'SISE', 'ARCLK', 'TCELL'
];

// Sektör grupları
export const SECTOR_GROUPS = {
  BANKING: ['AKBNK', 'GARAN', 'HALKB', 'ISCTR', 'SKBNK', 'TSKB', 'VAKBN', 'YKBNK'],
  TECHNOLOGY: ['ASELS', 'LOGO', 'NETAS', 'TTKOM', 'TTRAK'],
  RETAIL: ['BIMAS', 'CARSI', 'MGROS', 'SOKM'],
  ENERGY: ['AKSEN', 'ENKAI', 'PETKM', 'TUPRS', 'ZOREN'],
  CONSTRUCTION: ['AKSA', 'ANACM', 'ARCLK', 'CEMTS', 'EGEEN', 'EREGL'],
  AUTOMOTIVE: ['ASUZU', 'DOAS', 'FROTO', 'OTKAR', 'TOASO'],
  FOOD: ['AEFES', 'BANVT', 'CCOLA', 'KNFRT', 'PETUN', 'TATGD', 'ULKER']
};

// Hisse bilgileri
export interface StockInfo {
  code: string;
  name: string;
  sector: string;
  market: 'BIST' | 'YILDIZ';
  currency: 'TRY' | 'USD';
}

export const STOCK_INFO: Record<string, StockInfo> = {
  'THYAO': { code: 'THYAO', name: 'Türk Hava Yolları', sector: 'Ulaştırma', market: 'BIST', currency: 'TRY' },
  'AKBNK': { code: 'AKBNK', name: 'Akbank', sector: 'Bankacılık', market: 'BIST', currency: 'TRY' },
  'GARAN': { code: 'GARAN', name: 'Garanti BBVA', sector: 'Bankacılık', market: 'BIST', currency: 'TRY' },
  'BIMAS': { code: 'BIMAS', name: 'BİM Birleşik Mağazalar', sector: 'Perakende', market: 'BIST', currency: 'TRY' },
  'ASELS': { code: 'ASELS', name: 'Aselsan', sector: 'Teknoloji', market: 'BIST', currency: 'TRY' },
  'HALKB': { code: 'HALKB', name: 'Türkiye Halk Bankası', sector: 'Bankacılık', market: 'BIST', currency: 'TRY' },
  'ISCTR': { code: 'ISCTR', name: 'İş Bankası (C)', sector: 'Bankacılık', market: 'BIST', currency: 'TRY' },
  'SAHOL': { code: 'SAHOL', name: 'Sabancı Holding', sector: 'Holding', market: 'BIST', currency: 'TRY' },
  'VAKBN': { code: 'VAKBN', name: 'VakıfBank', sector: 'Bankacılık', market: 'BIST', currency: 'TRY' },
  'YKBNK': { code: 'YKBNK', name: 'Yapı Kredi Bankası', sector: 'Bankacılık', market: 'BIST', currency: 'TRY' },
  'TUPRS': { code: 'TUPRS', name: 'Tüpraş', sector: 'Enerji', market: 'BIST', currency: 'TRY' },
  'EREGL': { code: 'EREGL', name: 'Ereğli Demir Çelik', sector: 'Metal Ana', market: 'BIST', currency: 'TRY' },
  'KCHOL': { code: 'KCHOL', name: 'Koç Holding', sector: 'Holding', market: 'BIST', currency: 'TRY' },
  'SISE': { code: 'SISE', name: 'Şişe Cam', sector: 'Cam', market: 'BIST', currency: 'TRY' },
  'ARCLK': { code: 'ARCLK', name: 'Arçelik', sector: 'Dayanıklı Tüketim', market: 'BIST', currency: 'TRY' },
  'TCELL': { code: 'TCELL', name: 'Turkcell', sector: 'Telekomünikasyon', market: 'BIST', currency: 'TRY' }
};

// Watchlist kategorileri
export const WATCHLIST_CATEGORIES = {
  HIGH_VOLUME: 'Yüksek Hacim',
  TRENDING: 'Trend',
  GAINERS: 'Yükselenler',
  LOSERS: 'Düşenler',
  MOST_ACTIVE: 'En Aktif'
};

// Veri güncelleme aralıkları (milisaniye)
export const UPDATE_INTERVALS = {
  REAL_TIME: 5000,      // 5 saniye
  FREQUENT: 30000,      // 30 saniye
  NORMAL: 60000,        // 1 dakika
  SLOW: 300000          // 5 dakika
};