export interface CalculationResult {
  value: number | null;
  label: string;
  description: string;
  category: 'liquidity' | 'leverage' | 'profitability' | 'efficiency' | 'market';
  isGood?: boolean;
  unit?: string;
}

export interface StockData {
  [key: string]: number | string | null;
}

// Likidite Oranları
export const calculateLiquidityRatios = (data: StockData): CalculationResult[] => {
  const results: CalculationResult[] = [];

  // Cari Oran
  const currentAssets = Number(data['currentAssets']) || 0;
  const currentLiabilities = Number(data['shortTermLiabilities']) || 0;
  if (currentLiabilities > 0) {
    const currentRatio = currentAssets / currentLiabilities;
    results.push({
      value: currentRatio,
      label: 'Cari Oran',
      description: 'Kısa vadeli borçları karşılama kabiliyeti',
      category: 'liquidity',
      isGood: currentRatio >= 1.5,
      unit: 'kat'
    });
  }

  // Asit-Test Oranı
  const inventory = Number(data['inventory']) || 0;
  const quickAssets = currentAssets - inventory;
  if (currentLiabilities > 0) {
    const acidTestRatio = quickAssets / currentLiabilities;
    results.push({
      value: acidTestRatio,
      label: 'Asit-Test Oranı',
      description: 'Stoklar hariç kısa vadeli borç ödeme kabiliyeti',
      category: 'liquidity',
      isGood: acidTestRatio >= 1.0,
      unit: 'kat'
    });
  }

  // Nakit Oranı
  const cash = Number(data['cashAndEquivalents']) || 0;
  if (currentLiabilities > 0) {
    const cashRatio = cash / currentLiabilities;
    results.push({
      value: cashRatio,
      label: 'Nakit Oranı',
      description: 'Sadece nakit ile borç ödeme kabiliyeti',
      category: 'liquidity',
      isGood: cashRatio >= 0.2,
      unit: 'kat'
    });
  }

  return results;
};

// Kaldıraç Oranları
export const calculateLeverageRatios = (data: StockData): CalculationResult[] => {
  const results: CalculationResult[] = [];
  
  const totalAssets = Number(data['totalAssets']) || 0;
  const totalLiabilities = Number(data['totalLiabilities']) || 0;
  const equity = Number(data['equity']) || 0;
  const longTermDebt = Number(data['longTermLiabilities']) || 0;

  // Borç/Varlık Oranı
  if (totalAssets > 0) {
    const debtToAssets = totalLiabilities / totalAssets;
    results.push({
      value: debtToAssets,
      label: 'Borç/Varlık Oranı',
      description: 'Toplam varlıkların ne kadarının borçla finanse edildiği',
      category: 'leverage',
      isGood: debtToAssets <= 0.6,
      unit: '%'
    });
  }

  // Borç/Özkaynak Oranı
  if (equity > 0) {
    const debtToEquity = totalLiabilities / equity;
    results.push({
      value: debtToEquity,
      label: 'Borç/Özkaynak Oranı',
      description: 'Özkaynağın kaç katı borç kullanıldığı',
      category: 'leverage',
      isGood: debtToEquity <= 1.0,
      unit: 'kat'
    });
  }

  // Uzun Vadeli Borç Oranı
  if (totalAssets > 0) {
    const longTermDebtRatio = longTermDebt / totalAssets;
    results.push({
      value: longTermDebtRatio,
      label: 'Uzun Vadeli Borç Oranı',
      description: 'Toplam varlıkların ne kadarının uzun vadeli borçla finanse edildiği',
      category: 'leverage',
      isGood: longTermDebtRatio <= 0.4,
      unit: '%'
    });
  }

  // Özkaynak Çarpanı
  if (equity > 0) {
    const equityMultiplier = totalAssets / equity;
    results.push({
      value: equityMultiplier,
      label: 'Özkaynak Çarpanı',
      description: 'Özkaynağın kaç katı varlık kullanıldığı',
      category: 'leverage',
      isGood: equityMultiplier <= 2.5,
      unit: 'kat'
    });
  }

  // Borç Yapısı Oranı
  if (totalLiabilities > 0) {
    const debtStructureRatio = longTermDebt / totalLiabilities;
    results.push({
      value: debtStructureRatio,
      label: 'Borç Yapısı Oranı',
      description: 'Toplam borçların ne kadarının uzun vadeli olduğu',
      category: 'leverage',
      isGood: debtStructureRatio >= 0.4,
      unit: '%'
    });
  }

  return results;
};

// Karlılık Oranları
export const calculateProfitabilityRatios = (data: StockData): CalculationResult[] => {
  const results: CalculationResult[] = [];
  
  const totalAssets = Number(data['totalAssets']) || 0;
  const equity = Number(data['equity']) || 0;
  const revenue = Number(data['revenue']) || 0;
  const netIncome = Number(data['netProfit']) || 0;
  const ebitda = Number(data['ebitda']) || 0;
  const grossProfit = Number(data['grossProfit']) || 0;

  // ROA (Aktif Karlılığı)
  if (totalAssets > 0) {
    const roa = netIncome / totalAssets;
    results.push({
      value: roa,
      label: 'ROA (Aktif Karlılığı)',
      description: 'Varlıkların ne kadar verimli kullanıldığı',
      category: 'profitability',
      isGood: roa >= 0.05,
      unit: '%'
    });
  }

  // ROE (Özkaynak Karlılığı)
  if (equity > 0) {
    const roe = netIncome / equity;
    results.push({
      value: roe,
      label: 'ROE (Özkaynak Karlılığı)',
      description: 'Özkaynağın ne kadar verimli kullanıldığı',
      category: 'profitability',
      isGood: roe >= 0.15,
      unit: '%'
    });
  }

  // Net Kar Marjı
  if (revenue > 0) {
    const netProfitMargin = netIncome / revenue;
    results.push({
      value: netProfitMargin,
      label: 'Net Kar Marjı',
      description: 'Satışlardan elde edilen net kar oranı',
      category: 'profitability',
      isGood: netProfitMargin >= 0.1,
      unit: '%'
    });
  }

  // Brüt Kar Marjı
  if (revenue > 0) {
    const grossProfitMargin = grossProfit / revenue;
    results.push({
      value: grossProfitMargin,
      label: 'Brüt Kar Marjı',
      description: 'Satışlardan elde edilen brüt kar oranı',
      category: 'profitability',
      isGood: grossProfitMargin >= 0.3,
      unit: '%'
    });
  }

  // FAVÖK Marjı
  if (revenue > 0) {
    const ebitdaMargin = ebitda / revenue;
    results.push({
      value: ebitdaMargin,
      label: 'FAVÖK Marjı',
      description: 'Faiz, vergi, amortisman öncesi kar marjı',
      category: 'profitability',
      isGood: ebitdaMargin >= 0.15,
      unit: '%'
    });
  }

  return results;
};

// Tüm finansal oranları hesapla
export const calculateFinancialRatios = (data: StockData): CalculationResult[] => {
  return [
    ...calculateLiquidityRatios(data),
    ...calculateLeverageRatios(data),
    ...calculateProfitabilityRatios(data)
  ];
};

// Yardımcı fonksiyonlar
export const formatNumber = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0';
  }
  const numValue = Number(value);
  if (!isFinite(numValue)) {
    return '0';
  }
  return numValue.toLocaleString('tr-TR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
};

export const formatCurrency = (value: number | null | undefined, currency: string = 'TL'): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return `0 ${currency}`;
  }
  const numValue = Number(value);
  if (!isFinite(numValue)) {
    return `0 ${currency}`;
  }
  return `${numValue.toLocaleString('tr-TR')} ${currency}`;
};

export const formatPercentage = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '%0';
  }
  const numValue = Number(value);
  if (!isFinite(numValue)) {
    return '%0';
  }
  return `%${(numValue * 100).toLocaleString('tr-TR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}`;
};

export const formatRatio = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0x';
  }
  const numValue = Number(value);
  if (!isFinite(numValue)) {
    return '0x';
  }
  return `${numValue.toLocaleString('tr-TR', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}x`;
};

// Değer formatlama fonksiyonu
export const formatValue = (result: CalculationResult): string => {
  if (!result || result.value === null || result.value === undefined || isNaN(Number(result.value))) {
    return result?.unit === 'TL' ? '0 TL' : result?.unit === '%' ? '%0' : result?.unit === 'x' ? '0x' : '0';
  }

  const numValue = Number(result.value);
  if (!isFinite(numValue)) {
    return result.unit === 'TL' ? '0 TL' : result.unit === '%' ? '%0' : result.unit === 'x' ? '0x' : '0';
  }

  switch (result.unit) {
    case 'TL':
      return formatCurrency(numValue);
    case '%':
      return formatPercentage(numValue / 100);
    case 'x':
      return formatRatio(numValue);
    default:
      return formatNumber(numValue);
  }
};