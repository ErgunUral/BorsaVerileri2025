export interface FinancialDataField {
  key: string;
  label: string;
  category: 'balance_sheet' | 'income_statement' | 'cash_flow' | 'ratios';
  unit: 'TL' | '%' | 'kat' | 'adet' | 'gün';
  description: string;
  isCalculated?: boolean;
}

export const financialDataFields: FinancialDataField[] = [
  // Bilanço Kalemleri
  {
    key: 'toplamVarliklar',
    label: 'Toplam Varlıklar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Şirketin sahip olduğu tüm varlıkların toplam değeri'
  },
  {
    key: 'donenVarliklar',
    label: 'Dönen Varlıklar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Bir yıl içinde nakde çevrilebilecek varlıklar'
  },
  {
    key: 'duranVarliklar',
    label: 'Duran Varlıklar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Uzun vadeli kullanım için elde tutulan varlıklar'
  },
  {
    key: 'nakitVeNakitBenzerleri',
    label: 'Nakit ve Nakit Benzerleri',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Eldeki nakit ve kısa vadeli yatırımlar'
  },
  {
    key: 'stoklar',
    label: 'Stoklar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Satış için elde tutulan mal ve malzemeler'
  },
  {
    key: 'ticariAlacaklar',
    label: 'Ticari Alacaklar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Müşterilerden olan alacaklar'
  },
  {
    key: 'toplamBorclar',
    label: 'Toplam Borçlar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Şirketin tüm borçlarının toplamı'
  },
  {
    key: 'kisaVadeliBorclar',
    label: 'Kısa Vadeli Borçlar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Bir yıl içinde ödenecek borçlar'
  },
  {
    key: 'kisaVadeliYukumlulukler',
    label: 'Kısa Vadeli Yükümlülükler(BORÇ)',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Bir yıl içinde ödenecek yükümlülükler ve borçlar'
  },
  {
    key: 'finansalYatirimlar',
    label: 'Finansal Yatırımlar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Kısa ve uzun vadeli finansal yatırımlar'
  },
  {
    key: 'finansalBorclar',
    label: 'Finansal Borçlar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Bankalardan ve finansal kuruluşlardan alınan borçlar'
  },
  {
    key: 'toplamYukumlulukler',
    label: 'Toplam Yükümlülükler (BORÇ)',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Şirketin tüm yükümlülüklerinin toplamı'
  },
  {
    key: 'odenmisSermaye',
    label: 'Ödenmiş Sermaye',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Şirketin ödenmiş sermaye tutarı'
  },
  {
    key: 'uzunVadeliBorclar',
    label: 'Uzun Vadeli Borçlar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Bir yıldan uzun vadeli borçlar'
  },
  {
    key: 'ozkaynaklar',
    label: 'Özkaynaklar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Şirket sahiplerinin şirketteki hakkı'
  },
  {
    key: 'sermaye',
    label: 'Sermaye',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Şirketin ödenmiş sermayesi'
  },
  {
    key: 'dagitilmamisKarlar',
    label: 'Dağıtılmamış Karlar',
    category: 'balance_sheet',
    unit: 'TL',
    description: 'Geçmiş yıllardan birikmiş karlar'
  },

  // Gelir Tablosu Kalemleri
  {
    key: 'hasılat',
    label: 'Hasılat',
    category: 'income_statement',
    unit: 'TL',
    description: 'Şirketin ana faaliyetlerinden elde ettiği gelir'
  },
  {
    key: 'brutKar',
    label: 'Brüt Kar',
    category: 'income_statement',
    unit: 'TL',
    description: 'Hasılattan satışların maliyeti düşüldükten sonra kalan kar'
  },
  {
    key: 'faaliyetKari',
    label: 'Faaliyet Karı',
    category: 'income_statement',
    unit: 'TL',
    description: 'Ana faaliyetlerden elde edilen kar'
  },
  {
    key: 'netKar',
    label: 'Net Kar',
    category: 'income_statement',
    unit: 'TL',
    description: 'Tüm gelir ve giderler sonrası kalan kar'
  },
  {
    key: 'netDonemKari',
    label: 'Net Dönem Karı/Zararı',
    category: 'income_statement',
    unit: 'TL',
    description: 'Dönem sonunda elde edilen net kar veya zarar'
  },
  {
    key: 'favok',
    label: 'FAVÖK',
    category: 'income_statement',
    unit: 'TL',
    description: 'Faiz, Amortisman, Vergi ve Kur Farkları Öncesi Kar'
  },
  {
    key: 'satislarinMaliyeti',
    label: 'Satışların Maliyeti',
    category: 'income_statement',
    unit: 'TL',
    description: 'Satılan ürünlerin direkt maliyeti'
  },
  {
    key: 'pazarlamaGiderleri',
    label: 'Pazarlama Giderleri',
    category: 'income_statement',
    unit: 'TL',
    description: 'Pazarlama ve satış faaliyetleri giderleri'
  },
  {
    key: 'genelYonetimGiderleri',
    label: 'Genel Yönetim Giderleri',
    category: 'income_statement',
    unit: 'TL',
    description: 'Genel yönetim ve idari giderler'
  },
  {
    key: 'finansmanGiderleri',
    label: 'Finansman Giderleri',
    category: 'income_statement',
    unit: 'TL',
    description: 'Borçlanma ve finansman maliyetleri'
  },

  // Nakit Akış Kalemleri
  {
    key: 'faaliyetlerdenNakitAkisi',
    label: 'Faaliyetlerden Nakit Akışı',
    category: 'cash_flow',
    unit: 'TL',
    description: 'Ana faaliyetlerden sağlanan nakit akışı'
  },
  {
    key: 'yatirimlarNakitAkisi',
    label: 'Yatırımlardan Nakit Akışı',
    category: 'cash_flow',
    unit: 'TL',
    description: 'Yatırım faaliyetlerinden nakit akışı'
  },
  {
    key: 'finansmanNakitAkisi',
    label: 'Finansmandan Nakit Akışı',
    category: 'cash_flow',
    unit: 'TL',
    description: 'Finansman faaliyetlerinden nakit akışı'
  },

  // Hisse Bilgileri
  {
    key: 'hisseSayisi',
    label: 'Hisse Sayısı',
    category: 'ratios',
    unit: 'adet',
    description: 'Toplam hisse senedi sayısı'
  },
  {
    key: 'hisseBasinaKar',
    label: 'Hisse Başına Kar',
    category: 'ratios',
    unit: 'TL',
    description: 'Net karın hisse sayısına bölünmesi'
  },
  {
    key: 'hisseBasinaDegerDefteri',
    label: 'Hisse Başına Defter Değeri',
    category: 'ratios',
    unit: 'TL',
    description: 'Özkaynağın hisse sayısına bölünmesi'
  },

  // Piyasa Değerleri
  {
    key: 'piyasaDegeri',
    label: 'Piyasa Değeri',
    category: 'ratios',
    unit: 'TL',
    description: 'Hisse fiyatı × Hisse sayısı'
  },
  {
    key: 'fkOrani',
    label: 'F/K Oranı',
    category: 'ratios',
    unit: 'kat',
    description: 'Hisse fiyatının hisse başına kara oranı'
  },
  {
    key: 'pdOrani',
    label: 'PD/DD Oranı',
    category: 'ratios',
    unit: 'kat',
    description: 'Piyasa değerinin defter değerine oranı'
  }
];

// Kategori bazında alanları getir
export const getFieldsByCategory = (category: FinancialDataField['category']): FinancialDataField[] => {
  return financialDataFields.filter(field => field.category === category);
};

// Alan anahtarına göre alan bilgisi getir
export const getFieldByKey = (key: string): FinancialDataField | undefined => {
  return financialDataFields.find(field => field.key === key);
};

// Tüm alan anahtarlarını getir
export const getAllFieldKeys = (): string[] => {
  return financialDataFields.map(field => field.key);
};

// Kategori isimleri
export const categoryLabels = {
  balance_sheet: 'Bilanço',
  income_statement: 'Gelir Tablosu',
  cash_flow: 'Nakit Akış',
  ratios: 'Oranlar'
} as const;

// Varsayılan seçili alanlar - Kullanıcının istediği 11 finansal veri alanı
export const defaultSelectedFields = [
  'donenVarliklar',              // Dönen Varlıklar
  'kisaVadeliYukumlulukler',     // Kısa Vadeli Yükümlülükler(BORÇ)
  'nakitVeNakitBenzerleri',      // Nakit ve Nakit Benzerleri
  'finansalYatirimlar',          // Finansal Yatırımlar
  'finansalBorclar',             // Finansal Borçlar
  'toplamVarliklar',             // Toplam Varlıklar
  'toplamYukumlulukler',         // Toplam Yükümlülükler (BORÇ)
  'favok',                       // Favök
  'netDonemKari',                // Net Dönem Karı/Zararı
  'ozkaynaklar',                 // Özkaynaklar
  'sermaye'                      // Ödenmiş Sermaye
];