import { mapFinancialData, getTurkishKey, getEnglishKey } from './src/utils/dataMapping.js';

// API'den gelen gerçek analysis verisi
const realAnalysisData = {
  "stockCode": "ASELS",
  "companyName": "ASELS Şirketi",
  "financialData": {
    "stockCode": "ASELS",
    "companyName": "ASELS Şirketi",
    "period": "2024-Q3",
    "currentAssets": 560000000,
    "shortTermLiabilities": 562500000,
    "longTermLiabilities": 180000000,
    "cashAndEquivalents": 85000000,
    "inventory": 120000000,
    "financialInvestments": 45000000,
    "financialDebts": 320000000,
    "totalAssets": 1120000000,
    "totalLiabilities": 742500000,
    "revenue": 800000000,
    "grossProfit": 240000000,
    "ebitda": 150000000,
    "netProfit": 60000000,
    "equity": 377500000,
    "paidCapital": 200000000,
    "lastUpdated": "2025-09-19T16:07:16.604Z"
  },
  "ratios": {
    "netWorkingCapital": -2500000,
    "cashPosition": 85000000,
    "financialStructure": {
      "debtToAssetRatio": 0.663,
      "equityRatio": 0.337,
      "currentRatio": 0.996
    },
    "ebitdaProfitability": {
      "ebitdaMargin": 0.1875,
      "returnOnAssets": 0.0536,
      "returnOnEquity": 0.159
    },
    "bonusPotential": {
      "retainedEarningsRatio": 0.529,
      "payoutRatio": 0.471,
      "bonusScore": 65
    }
  },
  "recommendations": ["API mock verisi kullanılmaktadır", "Teknik analiz: Pozitif trend", "Finansal durum: Stabil"],
  "riskLevel": "Yüksek",
  "investmentScore": 59
};

console.log('🧪 Frontend Veri İşleme Testi Başlıyor...');
console.log('=' .repeat(50));

// Test 1: Finansal veri eşleme
console.log('\n📊 Test 1: Finansal Veri Eşleme');
console.log('Orijinal finansal veri:', realAnalysisData.financialData);

const mappedFinancialData = mapFinancialData(realAnalysisData.financialData);
console.log('Eşlenmiş finansal veri:', mappedFinancialData);

// Test 2: Anahtar çeviri fonksiyonları
console.log('\n🔄 Test 2: Anahtar Çeviri Fonksiyonları');
const testKeys = ['currentAssets', 'totalAssets', 'revenue', 'netProfit', 'equity'];

testKeys.forEach(key => {
  const turkishKey = getTurkishKey(key);
  const backToEnglish = getEnglishKey(turkishKey);
  console.log(`${key} -> ${turkishKey} -> ${backToEnglish}`);
  
  if (backToEnglish !== key) {
    console.warn(`⚠️  Çeviri tutarsızlığı: ${key} != ${backToEnglish}`);
  }
});

// Test 3: Veri türü kontrolü
console.log('\n🔍 Test 3: Veri Türü Kontrolü');
Object.entries(mappedFinancialData).forEach(([key, value]) => {
  const type = typeof value;
  const isValidNumber = type === 'number' && !isNaN(value);
  const isValidString = type === 'string' && value.length > 0;
  const isValid = isValidNumber || isValidString;
  
  console.log(`${key}: ${value} (${type}) - ${isValid ? '✅' : '❌'}`);
  
  if (!isValid) {
    console.warn(`⚠️  Geçersiz veri: ${key} = ${value}`);
  }
});

// Test 4: Eksik alan kontrolü
console.log('\n📋 Test 4: Eksik Alan Kontrolü');
const expectedFields = [
  'donenVarliklar', 'toplamVarliklar', 'hasılat', 'netKar', 'ozkaynaklar',
  'nakitVeNakitBenzerleri', 'stoklar', 'finansalYatirimlar', 'finansalBorclar'
];

const missingFields = expectedFields.filter(field => !(field in mappedFinancialData));
if (missingFields.length > 0) {
  console.warn('⚠️  Eksik alanlar:', missingFields);
} else {
  console.log('✅ Tüm beklenen alanlar mevcut');
}

// Test 5: Değer aralığı kontrolü
console.log('\n📈 Test 5: Değer Aralığı Kontrolü');
const numericFields = Object.entries(mappedFinancialData)
  .filter(([key, value]) => typeof value === 'number')
  .filter(([key, value]) => !key.includes('Ratio') && !key.includes('Margin'));

numericFields.forEach(([key, value]) => {
  const isReasonable = value >= 0 && value <= 1e12; // 0 ile 1 trilyon arası
  console.log(`${key}: ${value.toLocaleString('tr-TR')} TL - ${isReasonable ? '✅' : '❌'}`);
  
  if (!isReasonable) {
    console.warn(`⚠️  Şüpheli değer: ${key} = ${value}`);
  }
});

console.log('\n' + '=' .repeat(50));
console.log('🎯 Frontend Veri İşleme Testi Tamamlandı');

// Sonuç özeti
const totalTests = 5;
const passedTests = [
  Object.keys(mappedFinancialData).length > 0,
  testKeys.every(key => getEnglishKey(getTurkishKey(key)) === key),
  Object.values(mappedFinancialData).every(value => typeof value === 'number' || typeof value === 'string'),
  missingFields.length === 0,
  numericFields.every(([key, value]) => value >= 0 && value <= 1e12)
].filter(Boolean).length;

console.log(`\n📊 Test Sonucu: ${passedTests}/${totalTests} test başarılı`);

if (passedTests === totalTests) {
  console.log('🎉 Tüm testler başarılı! Frontend veri işleme düzgün çalışıyor.');
} else {
  console.log('⚠️  Bazı testler başarısız. Veri işleme sorunları mevcut.');
}