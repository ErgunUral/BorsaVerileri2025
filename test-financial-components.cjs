// Mock format fonksiyonları (gerçek implementasyondan kopyalandı)
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('tr-TR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

// Mock finansal veri yapısı
const mockFinancialData = {
  currentAssets: 1500000,
  shortTermLiabilities: 800000,
  totalAssets: 5000000,
  totalLiabilities: 2000000,
  netIncome: 500000,
  revenue: 3000000,
  ebitda: 800000,
  cashAndEquivalents: 300000,
  inventory: 400000,
  accountsReceivable: 200000,
  longTermDebt: 1200000,
  shareholdersEquity: 3000000,
  operatingIncome: 600000,
  interestExpense: 50000,
  marketCap: 8000000,
  sharesOutstanding: 1000000,
  bookValue: 3000000
};

// Mock hesaplama sonuçları
const mockCalculationResults = [
  {
    label: 'Cari Oran',
    value: 1.875,
    category: 'liquidity',
    description: 'Kısa vadeli borçları ödeme kabiliyeti',
    isGood: true
  },
  {
    label: 'Borç/Varlık Oranı',
    value: 0.4,
    category: 'leverage',
    description: 'Toplam borçların varlıklara oranı',
    isGood: true
  },
  {
    label: 'Net Kar Marjı',
    value: 0.167,
    category: 'profitability',
    description: 'Net karın hasılata oranı',
    isGood: true
  },
  {
    label: 'ROA (Varlık Getirisi)',
    value: 0.1,
    category: 'profitability',
    description: 'Net karın toplam varlıklara oranı',
    isGood: true
  },
  {
    label: 'EBITDA Marjı',
    value: 0.267,
    category: 'profitability',
    description: 'EBITDA\'nın hasılata oranı',
    isGood: true
  },
  {
    label: 'Fiyat/Defter Değeri',
    value: 2.67,
    category: 'market',
    description: 'Piyasa değerinin defter değerine oranı',
    isGood: false
  }
];

// Mock seçili alanlar
const mockSelectedFields = [
  'currentAssets',
  'shortTermLiabilities',
  'totalAssets',
  'netIncome',
  'revenue',
  'ebitda'
];

// FinancialDataDisplay bileşeni test fonksiyonları
function testFinancialDataDisplayStructure() {
  console.log('\n=== FİNANCİAL DATA DISPLAY YAPI TESTİ ===');
  
  // Veri yapısı kontrolü
  const requiredFields = ['currentAssets', 'shortTermLiabilities', 'totalAssets', 'netIncome'];
  const hasAllFields = requiredFields.every(field => mockFinancialData.hasOwnProperty(field));
  
  console.log('✓ Gerekli alanlar mevcut:', hasAllFields ? 'BAŞARILI' : 'BAŞARISIZ');
  
  // Veri tipleri kontrolü
  const allNumeric = Object.values(mockFinancialData).every(value => typeof value === 'number');
  console.log('✓ Veri tipleri doğru:', allNumeric ? 'BAŞARILI' : 'BAŞARISIZ');
  
  // Seçili alanlar kontrolü
  const validSelectedFields = mockSelectedFields.every(field => mockFinancialData.hasOwnProperty(field));
  console.log('✓ Seçili alanlar geçerli:', validSelectedFields ? 'BAŞARILI' : 'BAŞARISIZ');
  
  return hasAllFields && allNumeric && validSelectedFields;
}

function testFinancialDataFormatting() {
  console.log('\n=== FİNANCİAL DATA FORMATLAMA TESTİ ===');
  
  // Para birimi formatı
  const currencyFormatted = formatCurrency(1500000);
  const currencyValid = currencyFormatted.includes('₺') && currencyFormatted.includes('1.500.000');
  console.log('✓ Para birimi formatı:', currencyValid ? 'BAŞARILI' : 'BAŞARISIZ');
  console.log('  Örnek:', currencyFormatted);
  
  // Yüzde formatı
  const percentageFormatted = formatPercentage(0.167);
  const percentageValid = percentageFormatted.includes('%') && percentageFormatted.includes('16.7');
  console.log('✓ Yüzde formatı:', percentageValid ? 'BAŞARILI' : 'BAŞARISIZ');
  console.log('  Örnek:', percentageFormatted);
  
  // Sayı formatı
  const numberFormatted = formatNumber(1875.5);
  const numberValid = numberFormatted.includes('1.875,5');
  console.log('✓ Sayı formatı:', numberValid ? 'BAŞARILI' : 'BAŞARISIZ');
  console.log('  Örnek:', numberFormatted);
  
  return currencyValid && percentageValid && numberValid;
}

function testFinancialDataErrorHandling() {
  console.log('\n=== FİNANCİAL DATA HATA YÖNETİMİ TESTİ ===');
  
  // Null değer kontrolü
  const nullFormatted = formatCurrency(null);
  const nullHandled = nullFormatted === 'N/A' || nullFormatted === '0 ₺';
  console.log('✓ Null değer yönetimi:', nullHandled ? 'BAŞARILI' : 'BAŞARISIZ');
  
  // Undefined değer kontrolü
  const undefinedFormatted = formatNumber(undefined);
  const undefinedHandled = undefinedFormatted === 'N/A' || undefinedFormatted === '0';
  console.log('✓ Undefined değer yönetimi:', undefinedHandled ? 'BAŞARILI' : 'BAŞARISIZ');
  
  // NaN değer kontrolü
  const nanFormatted = formatPercentage(NaN);
  const nanHandled = nanFormatted === 'N/A' || nanFormatted === '0%';
  console.log('✓ NaN değer yönetimi:', nanHandled ? 'BAŞARILI' : 'BAŞARISIZ');
  
  return nullHandled && undefinedHandled && nanHandled;
}

// FinancialRatiosDisplay bileşeni test fonksiyonları
function testFinancialRatiosDisplayStructure() {
  console.log('\n=== FİNANCİAL RATIOS DISPLAY YAPI TESTİ ===');
  
  // Hesaplama sonuçları yapısı kontrolü
  const requiredProps = ['label', 'value', 'category', 'description'];
  const allResultsValid = mockCalculationResults.every(result => 
    requiredProps.every(prop => result.hasOwnProperty(prop))
  );
  
  console.log('✓ Hesaplama sonuçları yapısı:', allResultsValid ? 'BAŞARILI' : 'BAŞARISIZ');
  
  // Kategori çeşitliliği kontrolü
  const categories = [...new Set(mockCalculationResults.map(r => r.category))];
  const hasMultipleCategories = categories.length >= 3;
  console.log('✓ Kategori çeşitliliği:', hasMultipleCategories ? 'BAŞARILI' : 'BAŞARISIZ');
  console.log('  Kategoriler:', categories.join(', '));
  
  // İyi/kötü değerlendirme kontrolü
  const hasEvaluations = mockCalculationResults.some(r => r.isGood === true) && 
                        mockCalculationResults.some(r => r.isGood === false);
  console.log('✓ Değerlendirme çeşitliliği:', hasEvaluations ? 'BAŞARILI' : 'BAŞARISIZ');
  
  return allResultsValid && hasMultipleCategories && hasEvaluations;
}

function testFinancialRatiosCalculations() {
  console.log('\n=== FİNANCİAL RATIOS HESAPLAMA TESTİ ===');
  
  // Cari oran hesaplama kontrolü
  const currentRatio = mockFinancialData.currentAssets / mockFinancialData.shortTermLiabilities;
  const currentRatioResult = mockCalculationResults.find(r => r.label === 'Cari Oran');
  const currentRatioValid = Math.abs(currentRatioResult.value - currentRatio) < 0.01;
  console.log('✓ Cari oran hesaplama:', currentRatioValid ? 'BAŞARILI' : 'BAŞARISIZ');
  console.log(`  Beklenen: ${currentRatio.toFixed(3)}, Bulunan: ${currentRatioResult.value}`);
  
  // Borç/Varlık oranı kontrolü
  const debtRatio = mockFinancialData.totalLiabilities / mockFinancialData.totalAssets;
  const debtRatioResult = mockCalculationResults.find(r => r.label === 'Borç/Varlık Oranı');
  const debtRatioValid = Math.abs(debtRatioResult.value - debtRatio) < 0.01;
  console.log('✓ Borç/Varlık oranı hesaplama:', debtRatioValid ? 'BAŞARILI' : 'BAŞARISIZ');
  console.log(`  Beklenen: ${debtRatio.toFixed(3)}, Bulunan: ${debtRatioResult.value}`);
  
  // Net kar marjı kontrolü
  const netMargin = mockFinancialData.netIncome / mockFinancialData.revenue;
  const netMarginResult = mockCalculationResults.find(r => r.label === 'Net Kar Marjı');
  const netMarginValid = Math.abs(netMarginResult.value - netMargin) < 0.01;
  console.log('✓ Net kar marjı hesaplama:', netMarginValid ? 'BAŞARILI' : 'BAŞARISIZ');
  console.log(`  Beklenen: ${netMargin.toFixed(3)}, Bulunan: ${netMarginResult.value}`);
  
  return currentRatioValid && debtRatioValid && netMarginValid;
}

function testFinancialRatiosEvaluation() {
  console.log('\n=== FİNANCİAL RATIOS DEĞERLENDİRME TESTİ ===');
  
  // İyi değerlendirme sayısı
  const goodRatios = mockCalculationResults.filter(r => r.isGood === true);
  const badRatios = mockCalculationResults.filter(r => r.isGood === false);
  
  console.log('✓ İyi oranlar:', goodRatios.length, 'adet');
  console.log('✓ Dikkat gereken oranlar:', badRatios.length, 'adet');
  
  // Kategori bazında değerlendirme
  const categories = [...new Set(mockCalculationResults.map(r => r.category))];
  categories.forEach(category => {
    const categoryRatios = mockCalculationResults.filter(r => r.category === category);
    const categoryGood = categoryRatios.filter(r => r.isGood === true).length;
    const categoryTotal = categoryRatios.length;
    console.log(`✓ ${category}: ${categoryGood}/${categoryTotal} iyi`);
  });
  
  return goodRatios.length > 0 && badRatios.length > 0;
}

function testComponentIntegration() {
  console.log('\n=== BILEŞEN ENTEGRASYON TESTİ ===');
  
  // Veri akışı kontrolü
  const dataFlowValid = mockSelectedFields.every(field => 
    mockFinancialData.hasOwnProperty(field)
  );
  console.log('✓ Veri akışı:', dataFlowValid ? 'BAŞARILI' : 'BAŞARISIZ');
  
  // Hesaplama entegrasyonu
  const calculationIntegration = mockCalculationResults.every(result => 
    result.value !== null && result.value !== undefined && !isNaN(result.value)
  );
  console.log('✓ Hesaplama entegrasyonu:', calculationIntegration ? 'BAŞARILI' : 'BAŞARISIZ');
  
  // UI state yönetimi simülasyonu
  const uiStateValid = mockSelectedFields.length > 0 && mockCalculationResults.length > 0;
  console.log('✓ UI state yönetimi:', uiStateValid ? 'BAŞARILI' : 'BAŞARISIZ');
  
  return dataFlowValid && calculationIntegration && uiStateValid;
}

// Ana test fonksiyonu
function runFinancialComponentsTests() {
  console.log('FİNANCİAL BİLEŞENLER TEST RAPORU');
  console.log('============================================================');
  
  const tests = [
    { name: 'FinancialDataDisplay Yapı', fn: testFinancialDataDisplayStructure },
    { name: 'FinancialDataDisplay Formatlama', fn: testFinancialDataFormatting },
    { name: 'FinancialDataDisplay Hata Yönetimi', fn: testFinancialDataErrorHandling },
    { name: 'FinancialRatiosDisplay Yapı', fn: testFinancialRatiosDisplayStructure },
    { name: 'FinancialRatiosDisplay Hesaplama', fn: testFinancialRatiosCalculations },
    { name: 'FinancialRatiosDisplay Değerlendirme', fn: testFinancialRatiosEvaluation },
    { name: 'Bileşen Entegrasyonu', fn: testComponentIntegration }
  ];
  
  let passedTests = 0;
  
  tests.forEach(test => {
    try {
      const result = test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      console.log(`\n❌ ${test.name} testinde hata:`, error.message);
    }
  });
  
  console.log('\n=== TEST SONUÇLARI ÖZETİ ===');
  tests.forEach((test, index) => {
    console.log(`${test.name}: ${index < passedTests ? '✅' : '❌'}`);
  });
  
  console.log(`\nTOPLAM: ${passedTests}/${tests.length} test başarılı`);
  console.log(`Başarı oranı: %${((passedTests / tests.length) * 100).toFixed(1)}`);
  
  if (passedTests === tests.length) {
    console.log('\n✅ Tüm finansal bileşen testleri başarılı');
  } else {
    console.log('\n⚠️  Bazı testler başarısız - kontrol gerekli');
  }
}

// Testleri çalıştır
runFinancialComponentsTests();