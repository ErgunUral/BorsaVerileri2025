// API'den gelen İngilizce alan adlarını frontend'de kullanılan Türkçe alan adlarına eşleyen fonksiyon

export interface FinancialDataMapping {
  [key: string]: string;
}

// İngilizce -> Türkçe alan adı eşlemeleri
export const fieldMapping: FinancialDataMapping = {
  // Bilanço Kalemleri
  'totalAssets': 'toplamVarliklar',
  'currentAssets': 'donenVarliklar',
  'cashAndEquivalents': 'nakitVeNakitBenzerleri',
  'inventory': 'stoklar',
  'shortTermLiabilities': 'kisaVadeliBorclar',
  'longTermLiabilities': 'uzunVadeliBorclar',
  'totalLiabilities': 'toplamBorclar',
  'financialInvestments': 'finansalYatirimlar',
  'financialDebts': 'finansalBorclar',
  'equity': 'ozkaynaklar',
  'paidCapital': 'odenmisSermaye',
  
  // Gelir Tablosu Kalemleri
  'revenue': 'hasılat',
  'grossProfit': 'brutKar',
  'ebitda': 'favok',
  'netProfit': 'netKar',
  
  // Ters eşlemeler (Türkçe -> İngilizce)
  'toplamVarliklar': 'totalAssets',
  'donenVarliklar': 'currentAssets',
  'nakitVeNakitBenzerleri': 'cashAndEquivalents',
  'stoklar': 'inventory',
  'kisaVadeliBorclar': 'shortTermLiabilities',
  'uzunVadeliBorclar': 'longTermLiabilities',
  'toplamBorclar': 'totalLiabilities',
  'finansalYatirimlar': 'financialInvestments',
  'finansalBorclar': 'financialDebts',
  'ozkaynaklar': 'equity',
  'odenmisSermaye': 'paidCapital',
  'hasılat': 'revenue',
  'brutKar': 'grossProfit',
  'favok': 'ebitda',
  'netKar': 'netProfit'
};

/**
 * API'den gelen finansal veriyi frontend'de kullanılabilir formata dönüştürür
 * @param apiData API'den gelen ham finansal veri
 * @returns Frontend'de kullanılabilir formattaki veri
 */
export function mapFinancialData(apiData: any): any {
  if (!apiData || typeof apiData !== 'object') {
    return apiData;
  }

  const mappedData: any = { ...apiData };

  // İngilizce alan adlarını Türkçe karşılıklarına eşle
  Object.keys(fieldMapping).forEach(englishKey => {
    if (apiData[englishKey] !== undefined) {
      const turkishKey = fieldMapping[englishKey];
      // Eğer Türkçe alan adı yoksa, İngilizce veriden kopyala
      if (turkishKey && mappedData[turkishKey] === undefined) {
        mappedData[turkishKey] = apiData[englishKey];
      }
    }
  });

  return mappedData;
}

/**
 * Türkçe alan adını İngilizce karşılığına çevirir
 * @param turkishKey Türkçe alan adı
 * @returns İngilizce alan adı veya orijinal değer
 */
export function getTurkishKey(englishKey: string): string {
  return fieldMapping[englishKey] || englishKey;
}

/**
 * İngilizce alan adını Türkçe karşılığına çevirir
 * @param englishKey İngilizce alan adı
 * @returns Türkçe alan adı veya orijinal değer
 */
export function getEnglishKey(turkishKey: string): string {
  return fieldMapping[turkishKey] || turkishKey;
}