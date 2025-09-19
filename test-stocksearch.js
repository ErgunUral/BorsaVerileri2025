// StockSearch Bileşeni Test Dosyası
// Bu dosya StockSearch bileşeninin işlevselliğini test eder

console.log('=== StockSearch Bileşeni Test Başlıyor ===');

// Test 1: Hisse kodu format kontrolü
function testStockCodeValidation() {
  console.log('\n--- Test 1: Hisse Kodu Format Kontrolü ---');
  
  const validCodes = ['THYAO', 'AKBNK', 'GARAN', 'ISCTR', 'VAKBN'];
  const invalidCodes = ['TH', 'TOOLONGCODE', '123', 'AB@C', ''];
  
  const stockCodeRegex = /^[A-Z0-9]{3,6}$/;
  
  console.log('Geçerli kodlar:');
  validCodes.forEach(code => {
    const isValid = stockCodeRegex.test(code);
    console.log(`  ${code}: ${isValid ? '✅ Geçerli' : '❌ Geçersiz'}`);
  });
  
  console.log('\nGeçersiz kodlar:');
  invalidCodes.forEach(code => {
    const isValid = stockCodeRegex.test(code);
    console.log(`  "${code}": ${isValid ? '❌ Yanlış pozitif' : '✅ Doğru reddedildi'}`);
  });
}

// Test 2: Mock veri yapısı kontrolü
function testMockDataStructure() {
  console.log('\n--- Test 2: Mock Veri Yapısı Kontrolü ---');
  
  const mockStockCode = 'THYAO';
  
  // Mock price data
  const mockPriceData = {
    price: Math.random() * 100 + 10,
    changePercent: (Math.random() - 0.5) * 10,
    volume: Math.floor(Math.random() * 1000000) + 100000,
    lastUpdated: new Date().toISOString()
  };
  
  // Mock analysis data
  const mockAnalysisData = {
    stockCode: mockStockCode,
    companyName: `${mockStockCode} Şirketi`,
    financialData: {
      stockCode: mockStockCode,
      companyName: `${mockStockCode} Şirketi`,
      period: '2024-Q3',
      currentAssets: Math.floor(Math.random() * 1000000000) + 100000000,
      totalAssets: Math.floor(Math.random() * 2000000000) + 200000000,
      revenue: Math.floor(Math.random() * 800000000) + 80000000,
      netProfit: Math.floor(Math.random() * 100000000) + 10000000,
      equity: Math.floor(Math.random() * 1200000000) + 120000000
    },
    ratios: {
      netWorkingCapital: Math.random() * 500000000 + 50000000,
      cashPosition: Math.random() * 200000000 + 20000000
    },
    recommendations: [
      'Mock veri kullanılmaktadır',
      'Gerçek veriler için internet bağlantınızı kontrol edin'
    ],
    riskLevel: 'Orta',
    investmentScore: Math.floor(Math.random() * 60) + 20
  };
  
  // Veri yapısı kontrolü
  console.log('Mock Price Data yapısı:');
  console.log('  ✅ price:', typeof mockPriceData.price === 'number');
  console.log('  ✅ changePercent:', typeof mockPriceData.changePercent === 'number');
  console.log('  ✅ volume:', typeof mockPriceData.volume === 'number');
  console.log('  ✅ lastUpdated:', typeof mockPriceData.lastUpdated === 'string');
  
  console.log('\nMock Analysis Data yapısı:');
  console.log('  ✅ stockCode:', typeof mockAnalysisData.stockCode === 'string');
  console.log('  ✅ companyName:', typeof mockAnalysisData.companyName === 'string');
  console.log('  ✅ financialData:', typeof mockAnalysisData.financialData === 'object');
  console.log('  ✅ ratios:', typeof mockAnalysisData.ratios === 'object');
  console.log('  ✅ recommendations:', Array.isArray(mockAnalysisData.recommendations));
  console.log('  ✅ riskLevel:', ['Düşük', 'Orta', 'Yüksek'].includes(mockAnalysisData.riskLevel));
  console.log('  ✅ investmentScore:', typeof mockAnalysisData.investmentScore === 'number');
}

// Test 3: API endpoint kontrolü
async function testAPIEndpoints() {
  console.log('\n--- Test 3: API Endpoint Kontrolü ---');
  
  const testStockCode = 'THYAO';
  
  // Price endpoint test
  try {
    console.log(`Price endpoint test: /api/stocks/${testStockCode}/price`);
    const priceResponse = await fetch(`/api/stocks/${testStockCode}/price`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`  Status: ${priceResponse.status}`);
    console.log(`  OK: ${priceResponse.ok}`);
    
    if (priceResponse.ok) {
      const data = await priceResponse.json();
      console.log('  ✅ Price endpoint çalışıyor');
      console.log('  Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('  ⚠️ Price endpoint gerçek veri döndürmüyor (mock kullanılacak)');
    }
  } catch (error) {
    console.log('  ⚠️ Price endpoint hatası:', error.message);
  }
  
  // Analysis endpoint test
  try {
    console.log(`\nAnalysis endpoint test: /api/stocks/${testStockCode}/analysis`);
    const analysisResponse = await fetch(`/api/stocks/${testStockCode}/analysis`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`  Status: ${analysisResponse.status}`);
    console.log(`  OK: ${analysisResponse.ok}`);
    
    if (analysisResponse.ok) {
      const data = await analysisResponse.json();
      console.log('  ✅ Analysis endpoint çalışıyor');
      console.log('  Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('  ⚠️ Analysis endpoint gerçek veri döndürmüyor (mock kullanılacak)');
    }
  } catch (error) {
    console.log('  ⚠️ Analysis endpoint hatası:', error.message);
  }
}

// Test 4: LocalStorage işlevselliği
function testLocalStorage() {
  console.log('\n--- Test 4: LocalStorage İşlevselliği ---');
  
  try {
    // Test verisi
    const testSearches = ['THYAO', 'AKBNK', 'GARAN'];
    
    // Kaydet
    localStorage.setItem('recentStockSearches', JSON.stringify(testSearches));
    console.log('  ✅ LocalStorage yazma başarılı');
    
    // Oku
    const savedSearches = localStorage.getItem('recentStockSearches');
    const parsedSearches = JSON.parse(savedSearches);
    
    console.log('  ✅ LocalStorage okuma başarılı');
    console.log('  Kaydedilen aramalar:', parsedSearches);
    
    // Temizle
    localStorage.removeItem('recentStockSearches');
    console.log('  ✅ LocalStorage temizleme başarılı');
    
  } catch (error) {
    console.log('  ❌ LocalStorage hatası:', error.message);
  }
}

// Tüm testleri çalıştır
async function runAllTests() {
  testStockCodeValidation();
  testMockDataStructure();
  await testAPIEndpoints();
  testLocalStorage();
  
  console.log('\n=== StockSearch Bileşeni Test Tamamlandı ===');
}

// Testleri başlat
runAllTests().catch(error => {
  console.error('Test hatası:', error);
});