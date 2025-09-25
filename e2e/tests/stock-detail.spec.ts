import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { StockDetailPage } from '../pages/StockDetailPage';

test.describe('Hisse Senedi Detay Sayfası E2E Testleri', () => {
  let homePage: HomePage;
  let stockDetailPage: StockDetailPage;
  const testStock = 'AAPL';

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    stockDetailPage = new StockDetailPage(page);
    
    // Ana sayfadan hisse senedi detayına git
    await homePage.navigateToHome();
    await homePage.searchStock(testStock);
    await homePage.selectSearchResult(0);
    await stockDetailPage.expectStockDetailVisible();
  });

  test('Hisse senedi detay sayfası yüklenmeli ve temel bilgiler görünür olmalı', async () => {
    // Temel bileşenlerin görünürlüğünü kontrol et
    await stockDetailPage.expectStockDetailVisible();
    await stockDetailPage.expectStockSymbol(testStock);
    await stockDetailPage.expectStockNameVisible();
    await stockDetailPage.expectCurrentPriceVisible();
    await stockDetailPage.expectPriceChangeVisible();
    await stockDetailPage.expectMarketStatusVisible();
  });

  test('Hisse senedi fiyat bilgileri doğru formatta görünmeli', async () => {
    // Fiyat formatını kontrol et
    const currentPrice = await stockDetailPage.getCurrentPrice();
    expect(currentPrice).toMatch(/^\$[0-9,]+\.[0-9]{2}$/);
    
    // Değişim yüzdesini kontrol et
    const priceChange = await stockDetailPage.getPriceChange();
    expect(priceChange).toMatch(/^[+-][0-9,]+\.[0-9]{2}$/);
    
    // Değişim yüzdesini kontrol et
    const changePercentage = await stockDetailPage.getChangePercentage();
    expect(changePercentage).toMatch(/^[+-][0-9]+\.[0-9]{2}%$/);
  });

  test('Grafik bileşeni çalışmalı', async () => {
    // Grafiğin görünür olduğunu kontrol et
    await stockDetailPage.expectChartVisible();
    
    // Farklı zaman periyotlarını test et
    const periods = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y'];
    
    for (const period of periods) {
      await stockDetailPage.selectTimePeriod(period);
      await stockDetailPage.expectTimePeriodSelected(period);
      await stockDetailPage.expectChartDataUpdate();
    }
  });

  test('Grafik türü değişimi çalışmalı', async () => {
    // Farklı grafik türlerini test et
    const chartTypes = ['line', 'candlestick', 'area', 'bar'];
    
    for (const chartType of chartTypes) {
      await stockDetailPage.selectChartType(chartType);
      await stockDetailPage.expectChartTypeSelected(chartType);
      await stockDetailPage.expectChartVisible();
    }
  });

  test('Teknik göstergeler çalışmalı', async () => {
    // Teknik göstergeleri aç
    await stockDetailPage.openTechnicalIndicators();
    
    // Farklı göstergeleri test et
    const indicators = ['SMA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands'];
    
    for (const indicator of indicators) {
      await stockDetailPage.toggleIndicator(indicator);
      await stockDetailPage.expectIndicatorVisible(indicator);
      
      // Göstergeyi kapat
      await stockDetailPage.toggleIndicator(indicator);
      await stockDetailPage.expectIndicatorHidden(indicator);
    }
  });

  test('İzleme listesi işlevleri çalışmalı', async () => {
    // İzleme listesine ekle
    await stockDetailPage.addToWatchlist();
    await stockDetailPage.expectAddedToWatchlist();
    
    // İzleme listesinden çıkar
    await stockDetailPage.removeFromWatchlist();
    await stockDetailPage.expectRemovedFromWatchlist();
  });

  test('Sekme navigasyonu çalışmalı', async () => {
    // Farklı sekmeleri test et
    const tabs = ['overview', 'financials', 'news', 'analysis', 'options'];
    
    for (const tab of tabs) {
      await stockDetailPage.switchToTab(tab);
      await stockDetailPage.expectTabActive(tab);
      await stockDetailPage.expectTabContentVisible(tab);
    }
  });

  test('Genel bakış sekmesi bilgileri görünmeli', async () => {
    await stockDetailPage.switchToTab('overview');
    
    // Temel metriklerin görünür olduğunu kontrol et
    await stockDetailPage.expectOverviewMetricsVisible();
    
    // Piyasa değeri, P/E oranı, vb. bilgilerin varlığını kontrol et
    const marketCap = await stockDetailPage.getMarketCap();
    expect(marketCap).toBeTruthy();
    
    const peRatio = await stockDetailPage.getPERatio();
    expect(peRatio).toBeTruthy();
    
    const volume = await stockDetailPage.getVolume();
    expect(volume).toBeTruthy();
  });

  test('Finansal veriler sekmesi çalışmalı', async () => {
    await stockDetailPage.switchToTab('financials');
    
    // Finansal tabloların görünür olduğunu kontrol et
    await stockDetailPage.expectFinancialsVisible();
    
    // Gelir tablosu, bilanço, nakit akışı sekmelerini test et
    const financialTabs = ['income', 'balance', 'cashflow'];
    
    for (const tab of financialTabs) {
      await stockDetailPage.selectFinancialTab(tab);
      await stockDetailPage.expectFinancialDataVisible(tab);
    }
  });

  test('Haberler sekmesi çalışmalı', async () => {
    await stockDetailPage.switchToTab('news');
    
    // Haberlerin yüklendiğini kontrol et
    await stockDetailPage.expectNewsVisible();
    
    // Haber sayısını kontrol et
    const newsCount = await stockDetailPage.getNewsCount();
    expect(newsCount).toBeGreaterThan(0);
    
    // İlk haberi aç
    if (newsCount > 0) {
      await stockDetailPage.openNewsItem(0);
      await stockDetailPage.expectNewsDetailVisible();
    }
  });

  test('Analiz sekmesi çalışmalı', async () => {
    await stockDetailPage.switchToTab('analysis');
    
    // Analiz verilerinin görünür olduğunu kontrol et
    await stockDetailPage.expectAnalysisVisible();
    
    // Analist önerilerini kontrol et
    const recommendations = await stockDetailPage.getAnalystRecommendations();
    expect(recommendations).toBeTruthy();
    
    // Fiyat hedeflerini kontrol et
    const priceTargets = await stockDetailPage.getPriceTargets();
    expect(priceTargets).toBeTruthy();
  });

  test('Opsiyonlar sekmesi çalışmalı', async () => {
    await stockDetailPage.switchToTab('options');
    
    // Opsiyon verilerinin görünür olduğunu kontrol et
    await stockDetailPage.expectOptionsVisible();
    
    // Call ve Put opsiyonlarını test et
    await stockDetailPage.selectOptionType('calls');
    await stockDetailPage.expectCallOptionsVisible();
    
    await stockDetailPage.selectOptionType('puts');
    await stockDetailPage.expectPutOptionsVisible();
  });

  test('Uyarı oluşturma işlevi çalışmalı', async () => {
    // Fiyat uyarısı oluştur
    await stockDetailPage.createPriceAlert(150);
    await stockDetailPage.expectAlertCreated();
    
    // Yüzde uyarısı oluştur
    await stockDetailPage.createPercentageAlert(5);
    await stockDetailPage.expectAlertCreated();
  });

  test('Paylaşım işlevi çalışmalı', async () => {
    // Paylaşım modalını aç
    await stockDetailPage.openShareModal();
    await stockDetailPage.expectShareModalVisible();
    
    // Farklı paylaşım seçeneklerini test et
    const shareOptions = ['twitter', 'facebook', 'linkedin', 'email', 'copy-link'];
    
    for (const option of shareOptions) {
      await stockDetailPage.expectShareOptionVisible(option);
    }
    
    // Modalı kapat
    await stockDetailPage.closeShareModal();
    await stockDetailPage.expectShareModalHidden();
  });

  test('Gerçek zamanlı veri güncellemeleri çalışmalı', async () => {
    // İlk fiyatı al
    const initialPrice = await stockDetailPage.getCurrentPrice();
    
    // Gerçek zamanlı güncellemeyi bekle
    await stockDetailPage.waitForRealTimeUpdate();
    
    // Fiyatın güncellendiğini kontrol et (simülasyon)
    await stockDetailPage.expectRealTimeDataUpdate();
    
    // Bağlantı durumunun aktif olduğunu kontrol et
    await stockDetailPage.expectConnectionStatus('connected');
  });

  test('Hata durumları uygun şekilde işlenmeli', async ({ page }) => {
    // API hatası simüle et
    await page.route('**/api/stocks/**', route => route.abort());
    
    // Sayfayı yenile
    await page.reload();
    
    // Hata mesajının görünür olduğunu kontrol et
    await stockDetailPage.expectErrorState();
    await stockDetailPage.expectErrorMessage('Veri yüklenirken hata oluştu');
    
    // Yeniden deneme butonunun çalıştığını kontrol et
    await stockDetailPage.clickRetryButton();
  });

  test('Yükleme durumları uygun şekilde gösterilmeli', async ({ page }) => {
    // Yavaş ağ simüle et
    await page.route('**/api/stocks/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    // Sayfayı yenile
    await page.reload();
    
    // Yükleme durumunun görünür olduğunu kontrol et
    await stockDetailPage.expectLoadingState();
  });

  test('Responsive tasarım çalışmalı', async ({ page }) => {
    // Mobil görünümü test et
    await page.setViewportSize({ width: 375, height: 667 });
    await stockDetailPage.expectMobileLayoutVisible();
    
    // Tablet görünümü test et
    await page.setViewportSize({ width: 768, height: 1024 });
    await stockDetailPage.expectTabletLayoutVisible();
    
    // Desktop görünümü test et
    await page.setViewportSize({ width: 1920, height: 1080 });
    await stockDetailPage.expectDesktopLayoutVisible();
  });

  test('Klavye navigasyonu çalışmalı', async ({ page }) => {
    // Tab tuşu ile navigasyon
    await page.keyboard.press('Tab');
    
    // Ok tuşları ile grafik navigasyonu
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    
    // Escape tuşu ile modal kapatma
    await stockDetailPage.openShareModal();
    await page.keyboard.press('Escape');
    await stockDetailPage.expectShareModalHidden();
  });

  test('URL parametreleri doğru çalışmalı', async ({ page }) => {
    // Farklı hisse senedi sembolü ile direkt erişim
    await stockDetailPage.navigateToStock('TSLA');
    await stockDetailPage.expectStockSymbol('TSLA');
    
    // URL'nin doğru olduğunu kontrol et
    expect(page.url()).toContain('/stocks/TSLA');
  });

  test('Geçersiz hisse senedi sembolü için hata gösterilmeli', async () => {
    // Geçersiz sembol ile sayfaya git
    await stockDetailPage.navigateToStock('INVALID123');
    
    // Hata durumunun gösterildiğini kontrol et
    await stockDetailPage.expectErrorState();
    await stockDetailPage.expectErrorMessage('Hisse senedi bulunamadı');
  });

  test('Sayfa yenileme sonrası durum korunmalı', async ({ page }) => {
    // Zaman periyodu ve grafik türü seç
    await stockDetailPage.selectTimePeriod('1M');
    await stockDetailPage.selectChartType('candlestick');
    
    // Teknik gösterge ekle
    await stockDetailPage.openTechnicalIndicators();
    await stockDetailPage.toggleIndicator('SMA');
    
    // Sayfayı yenile
    await page.reload();
    
    // Durumun korunduğunu kontrol et
    await stockDetailPage.expectTimePeriodSelected('1M');
    await stockDetailPage.expectChartTypeSelected('candlestick');
    await stockDetailPage.expectIndicatorVisible('SMA');
  });

  test('Çoklu pencere desteği çalışmalı', async ({ context }) => {
    // Yeni pencere aç
    const newPage = await context.newPage();
    const newStockDetailPage = new StockDetailPage(newPage);
    
    // Farklı hisse senetleri aç
    await newStockDetailPage.navigateToStock('MSFT');
    
    // Her pencerenin kendi durumunu koruduğunu kontrol et
    await stockDetailPage.expectStockSymbol(testStock);
    await newStockDetailPage.expectStockSymbol('MSFT');
    
    await newPage.close();
  });

  test('Performans metrikleri kabul edilebilir seviyede olmalı', async ({ page }) => {
    // Sayfa yükleme süresini ölç
    const startTime = Date.now();
    await page.reload();
    await stockDetailPage.expectStockDetailVisible();
    const loadTime = Date.now() - startTime;
    
    // 3 saniyeden az yüklenmeli
    expect(loadTime).toBeLessThan(3000);
    
    // Grafik render süresini ölç
    const chartStartTime = Date.now();
    await stockDetailPage.selectTimePeriod('1Y');
    await stockDetailPage.expectChartDataUpdate();
    const chartRenderTime = Date.now() - chartStartTime;
    
    // 2 saniyeden az render edilmeli
    expect(chartRenderTime).toBeLessThan(2000);
  });
});