const puppeteer = require('puppeteer');
const fs = require('fs');

async function performanceTest() {
  console.log('🚀 Performans testi başlatılıyor...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Performance metrikleri için listener ekle
  await page.evaluateOnNewDocument(() => {
    window.performanceMetrics = {
      navigationStart: 0,
      domContentLoaded: 0,
      loadComplete: 0,
      firstPaint: 0,
      firstContentfulPaint: 0
    };
    
    // Navigation timing
    window.addEventListener('DOMContentLoaded', () => {
      const timing = performance.timing;
      window.performanceMetrics.navigationStart = timing.navigationStart;
      window.performanceMetrics.domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;
    });
    
    window.addEventListener('load', () => {
      const timing = performance.timing;
      window.performanceMetrics.loadComplete = timing.loadEventEnd - timing.navigationStart;
      
      // Paint timing
      if (performance.getEntriesByType) {
        const paintEntries = performance.getEntriesByType('paint');
        paintEntries.forEach(entry => {
          if (entry.name === 'first-paint') {
            window.performanceMetrics.firstPaint = entry.startTime;
          }
          if (entry.name === 'first-contentful-paint') {
            window.performanceMetrics.firstContentfulPaint = entry.startTime;
          }
        });
      }
    });
  });
  
  try {
    console.log('📊 Ana sayfaya gidiliyor...');
    const startTime = Date.now();
    
    await page.goto('http://localhost:5173', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️  Sayfa yükleme süresi: ${loadTime}ms`);
    
    // Performance metrikleri al
    await page.waitForTimeout(2000);
    
    const metrics = await page.evaluate(() => {
      return {
        ...window.performanceMetrics,
        memoryUsage: performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        } : null,
        resourceCount: performance.getEntriesByType('resource').length,
        navigationTiming: {
          domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
          loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
          domInteractive: performance.timing.domInteractive - performance.timing.navigationStart
        }
      };
    });
    
    // Hisse senedi listesi yükleme testi
    console.log('📈 Hisse senedi listesi kontrol ediliyor...');
    
    const stockElements = await page.$$('[data-testid="stock-card"], .stock-card, .stock-item');
    const stockCount = stockElements.length;
    
    console.log(`📊 Bulunan hisse senedi sayısı: ${stockCount}`);
    
    // API response süresi testi
    console.log('🔄 API response süresi test ediliyor...');
    
    const apiStartTime = Date.now();
    const response = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/stocks/bulk');
        return {
          status: response.status,
          ok: response.ok,
          responseTime: Date.now()
        };
      } catch (error) {
        return {
          error: error.message,
          responseTime: Date.now()
        };
      }
    });
    
    const apiResponseTime = response.responseTime - apiStartTime;
    console.log(`🌐 API Response süresi: ${apiResponseTime}ms`);
    
    // Performans skoru hesaplama
    let performanceScore = 100;
    
    // Sayfa yükleme süresi (0-3000ms = 100-70 puan)
    if (loadTime > 3000) performanceScore -= 30;
    else if (loadTime > 2000) performanceScore -= 20;
    else if (loadTime > 1000) performanceScore -= 10;
    
    // DOM Content Loaded (0-2000ms = 100-80 puan)
    if (metrics.navigationTiming.domContentLoaded > 2000) performanceScore -= 20;
    else if (metrics.navigationTiming.domContentLoaded > 1500) performanceScore -= 15;
    else if (metrics.navigationTiming.domContentLoaded > 1000) performanceScore -= 10;
    
    // API Response süresi (0-1000ms = 100-85 puan)
    if (apiResponseTime > 2000) performanceScore -= 15;
    else if (apiResponseTime > 1000) performanceScore -= 10;
    else if (apiResponseTime > 500) performanceScore -= 5;
    
    // First Contentful Paint
    if (metrics.firstContentfulPaint > 3000) performanceScore -= 10;
    else if (metrics.firstContentfulPaint > 2000) performanceScore -= 5;
    
    const report = {
      timestamp: new Date().toISOString(),
      performanceScore: Math.max(0, performanceScore),
      metrics: {
        pageLoadTime: loadTime,
        domContentLoaded: metrics.navigationTiming.domContentLoaded,
        loadComplete: metrics.navigationTiming.loadComplete,
        domInteractive: metrics.navigationTiming.domInteractive,
        firstContentfulPaint: metrics.firstContentfulPaint,
        apiResponseTime: apiResponseTime,
        stockCount: stockCount,
        resourceCount: metrics.resourceCount,
        memoryUsage: metrics.memoryUsage
      },
      thresholds: {
        pageLoadTime: { value: loadTime, threshold: 3000, status: loadTime <= 3000 ? 'PASS' : 'FAIL' },
        domContentLoaded: { value: metrics.navigationTiming.domContentLoaded, threshold: 2000, status: metrics.navigationTiming.domContentLoaded <= 2000 ? 'PASS' : 'FAIL' },
        apiResponseTime: { value: apiResponseTime, threshold: 1000, status: apiResponseTime <= 1000 ? 'PASS' : 'FAIL' },
        firstContentfulPaint: { value: metrics.firstContentfulPaint, threshold: 2000, status: metrics.firstContentfulPaint <= 2000 ? 'PASS' : 'FAIL' }
      }
    };
    
    console.log('\n🎯 PERFORMANS RAPORU');
    console.log('='.repeat(50));
    console.log(`📊 Genel Performans Skoru: ${report.performanceScore}/100`);
    console.log(`⏱️  Sayfa Yükleme: ${loadTime}ms (Hedef: <3000ms) - ${report.thresholds.pageLoadTime.status}`);
    console.log(`🏗️  DOM Content Loaded: ${metrics.navigationTiming.domContentLoaded}ms (Hedef: <2000ms) - ${report.thresholds.domContentLoaded.status}`);
    console.log(`🌐 API Response: ${apiResponseTime}ms (Hedef: <1000ms) - ${report.thresholds.apiResponseTime.status}`);
    console.log(`🎨 First Contentful Paint: ${metrics.firstContentfulPaint}ms (Hedef: <2000ms) - ${report.thresholds.firstContentfulPaint.status}`);
    console.log(`📈 Hisse Senedi Sayısı: ${stockCount}`);
    console.log(`📦 Kaynak Sayısı: ${metrics.resourceCount}`);
    
    if (metrics.memoryUsage) {
      console.log(`💾 Memory Kullanımı: ${(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Raporu dosyaya kaydet
    fs.writeFileSync('./performance-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Detaylı rapor performance-report.json dosyasına kaydedildi.');
    
  } catch (error) {
    console.error('❌ Performans testi hatası:', error.message);
  } finally {
    await browser.close();
  }
}

performanceTest().catch(console.error);