#!/usr/bin/env node

import axios from 'axios';

// Test edilecek BIST hisse senetleri
const testSymbols = [
  'ASELS', 'THYAO', 'BIMAS', 'AKBNK', 'GARAN', 'ISCTR', 'KCHOL', 'SAHOL',
  'SISE', 'TUPRS', 'YKBNK', 'ARCLK', 'KOZAL', 'PETKM', 'TCELL', 'TOASO',
  'VAKBN', 'HALKB', 'EKGYO', 'FROTO'
];

const baseUrl = 'http://localhost:3001';

async function testXPathScraper() {
  console.log('🚀 XPath Scraper Test Başlatılıyor...');
  console.log(`📊 Test edilecek hisse sayısı: ${testSymbols.length}`);
  console.log('=' .repeat(60));
  
  const results = {
    successful: [],
    failed: [],
    totalTime: 0
  };
  
  const startTime = Date.now();
  
  for (let i = 0; i < testSymbols.length; i++) {
    const symbol = testSymbols[i];
    const progress = `[${i + 1}/${testSymbols.length}]`;
    
    try {
      console.log(`${progress} Testing ${symbol}...`);
      
      const testStartTime = Date.now();
      const response = await axios.get(`${baseUrl}/api/stocks/test-xpath/${symbol}`, {
        timeout: 15000
      });
      const testEndTime = Date.now();
      const executionTime = testEndTime - testStartTime;
      
      if (response.data.success && response.data.data && response.data.data.price > 0) {
        const data = response.data.data;
        results.successful.push({
          symbol,
          price: data.price,
          source: data.source,
          executionTime: `${executionTime}ms`,
          method: response.data.method
        });
        
        console.log(`✅ ${symbol}: ${data.price} TL (${executionTime}ms) - ${data.source}`);
      } else {
        results.failed.push({
          symbol,
          reason: 'No price data or invalid response',
          response: response.data
        });
        console.log(`❌ ${symbol}: Veri çekilemedi`);
      }
      
    } catch (error) {
      results.failed.push({
        symbol,
        reason: error.message,
        error: error.response?.data || error.message
      });
      console.log(`❌ ${symbol}: Hata - ${error.message}`);
    }
    
    // Rate limiting - 1 saniye bekle
    if (i < testSymbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const endTime = Date.now();
  results.totalTime = endTime - startTime;
  
  // Sonuçları göster
  console.log('\n' + '=' .repeat(60));
  console.log('📈 TEST SONUÇLARI');
  console.log('=' .repeat(60));
  
  console.log(`✅ Başarılı: ${results.successful.length}/${testSymbols.length}`);
  console.log(`❌ Başarısız: ${results.failed.length}/${testSymbols.length}`);
  console.log(`⏱️  Toplam süre: ${results.totalTime}ms (${(results.totalTime/1000).toFixed(2)}s)`);
  
  if (results.successful.length > 0) {
    const avgTime = results.successful.reduce((sum, r) => sum + parseInt(r.executionTime), 0) / results.successful.length;
    console.log(`📊 Ortalama çekme süresi: ${avgTime.toFixed(0)}ms`);
  }
  
  console.log('\n🎯 BAŞARILI HİSSELER:');
  results.successful.forEach(r => {
    console.log(`  ${r.symbol}: ${r.price} TL (${r.executionTime}) - ${r.source}`);
  });
  
  if (results.failed.length > 0) {
    console.log('\n❌ BAŞARISIZ HİSSELER:');
    results.failed.forEach(r => {
      console.log(`  ${r.symbol}: ${r.reason}`);
    });
  }
  
  // Başarı oranı
  const successRate = (results.successful.length / testSymbols.length * 100).toFixed(1);
  console.log(`\n🏆 Başarı Oranı: %${successRate}`);
  
  if (successRate >= 80) {
    console.log('🎉 Mükemmel! XPath scraper başarıyla çalışıyor.');
  } else if (successRate >= 60) {
    console.log('⚠️  İyi, ancak bazı iyileştirmeler gerekebilir.');
  } else {
    console.log('🚨 Scraper\'da sorunlar var, inceleme gerekli.');
  }
}

// Test'i çalıştır
testXPathScraper().catch(console.error);