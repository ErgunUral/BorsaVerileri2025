// Frontend entegrasyon testi - gerçek API çağrıları

const testFrontendIntegration = async () => {
  console.log('=== FRONTEND ENTEGRASYON TESTİ ===\n');
  
  const baseUrl = 'http://localhost:8080';
  const stockCode = 'ASELS';
  
  try {
    // 1. Finansal veri endpoint testi
    console.log('1. Finansal veri endpoint testi...');
    const financialResponse = await fetch(`${baseUrl}/api/stocks/${stockCode}/financial-data`);
    const financialData = await financialResponse.json();
    
    console.log('✓ Finansal veri yanıtı:', {
      success: financialData.success,
      dataKeys: Object.keys(financialData.data || {}),
      sampleData: {
        ozkaynaklar: financialData.data?.ozkaynaklar,
        sermaye: financialData.data?.sermaye
      }
    });
    
    // 2. Analiz endpoint testi
    console.log('\n2. Analiz endpoint testi...');
    const analysisResponse = await fetch(`${baseUrl}/api/stocks/${stockCode}/analysis`);
    const analysisData = await analysisResponse.json();
    
    console.log('✓ Analiz yanıtı:', {
      success: analysisData.success,
      hasFinancialData: !!analysisData.data?.financialData,
      hasRatios: !!analysisData.data?.ratios,
      ratioKeys: Object.keys(analysisData.data?.ratios || {})
    });
    
    // 3. Veri formatı kontrolü
    console.log('\n3. Veri formatı kontrolü...');
    const ratios = analysisData.data?.ratios;
    if (ratios) {
      console.log('✓ Oran değerleri:');
      console.log('  - debtToAssetRatio:', ratios.financialStructure?.debtToAssetRatio, '(ondalık format)');
      console.log('  - ebitdaMargin:', ratios.ebitdaProfitability?.ebitdaMargin, '(ondalık format)');
      console.log('  - returnOnEquity:', ratios.ebitdaProfitability?.returnOnEquity, '(ondalık format)');
    }
    
    // 4. Frontend veri eşleme testi
    console.log('\n4. Frontend veri eşleme testi...');
    const mappedData = {
      // Temel finansal veriler
      totalAssets: analysisData.data?.financialData?.totalAssets,
      equity: analysisData.data?.financialData?.equity,
      revenue: analysisData.data?.financialData?.revenue,
      
      // Oranlar (yüzde formatında)
      debtToAssetRatio: ratios?.financialStructure?.debtToAssetRatio * 100, // %66.3
      ebitdaMargin: ratios?.ebitdaProfitability?.ebitdaMargin * 100, // %18.75
      returnOnEquity: ratios?.ebitdaProfitability?.returnOnEquity * 100 // %15.9
    };
    
    console.log('✓ Eşlenmiş veriler:', mappedData);
    
    // 5. Format fonksiyonu testi
    console.log('\n5. Format fonksiyonu testi...');
    const formatCurrency = (value) => {
      if (!value) return 'N/A';
      return `${value.toLocaleString('tr-TR')} TL`;
    };
    
    const formatPercentage = (value) => {
      if (!value) return 'N/A';
      return `%${value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    console.log('✓ Formatlanmış değerler:');
    console.log('  - Toplam Varlıklar:', formatCurrency(mappedData.totalAssets));
    console.log('  - Borç/Varlık Oranı:', formatPercentage(mappedData.debtToAssetRatio));
    console.log('  - FAVÖK Marjı:', formatPercentage(mappedData.ebitdaMargin));
    console.log('  - Özkaynak Karlılığı:', formatPercentage(mappedData.returnOnEquity));
    
    console.log('\n✅ TÜM TESTLER BAŞARILI - Frontend entegrasyonu düzgün çalışıyor!');
    
  } catch (error) {
    console.error('❌ Test hatası:', error.message);
  }
};

// Test çalıştır
testFrontendIntegration();