import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { StockDetailPage } from '../pages/StockDetailPage';

test.describe('Ana Sayfa E2E Testleri', () => {
  let homePage: HomePage;
  let stockDetailPage: StockDetailPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    stockDetailPage = new StockDetailPage(page);
    await homePage.navigateToHome();
  });

  test('Ana sayfa yüklenmeli ve temel bileşenler görünür olmalı', async () => {
    // Ana sayfa bileşenlerinin görünürlüğünü kontrol et
    await homePage.expectHomePageVisible();
    await homePage.expectNavigationVisible();
    await homePage.expectDashboardVisible();
    await homePage.expectMarketDataVisible();
    await homePage.expectStockListVisible();
    await homePage.expectWatchlistVisible();
    await homePage.expectNewsVisible();
  });

  test('Hisse senedi arama işlevi çalışmalı', async () => {
    const searchTerm = 'AAPL';
    
    // Hisse senedi ara
    await homePage.searchStock(searchTerm);
    
    // Arama sonuçlarının görünür olduğunu kontrol et
    await homePage.expectSearchResultsVisible();
    
    // Arama sonuçlarında AAPL'ın bulunduğunu kontrol et
    const searchResults = await homePage.getSearchResults();
    expect(searchResults.some(result => result.includes('AAPL'))).toBeTruthy();
  });

  test('Arama sonuçlarından hisse senedi seçimi çalışmalı', async () => {
    const searchTerm = 'TSLA';
    
    // Hisse senedi ara ve ilk sonucu seç
    await homePage.searchStock(searchTerm);
    await homePage.selectSearchResult(0);
    
    // Hisse senedi detay sayfasına yönlendirildiğini kontrol et
    await stockDetailPage.expectStockDetailVisible();
    await stockDetailPage.expectStockSymbol('TSLA');
  });

  test('Piyasa verileri gerçek zamanlı güncellenmelidir', async () => {
    // İlk piyasa verilerini al
    const initialMarketData = await homePage.getMarketIndices();
    
    // Verilerin yenilendiğini kontrol et
    await homePage.refreshData();
    
    // Yenilenen verilerin farklı olup olmadığını kontrol et (gerçek zamanlı güncelleme)
    await homePage.expectRealTimeDataUpdate();
    
    // Bağlantı durumunun aktif olduğunu kontrol et
    await homePage.expectConnectionStatus('connected');
  });

  test('İzleme listesine hisse senedi ekleme/çıkarma işlevi çalışmalı', async () => {
    const stockSymbol = 'MSFT';
    
    // Hisse senedini ara
    await homePage.searchStock(stockSymbol);
    
    // İzleme listesine ekle
    await homePage.addToWatchlist(stockSymbol);
    
    // İzleme listesinde görünür olduğunu kontrol et
    await homePage.expectStockInWatchlist(stockSymbol);
    
    // İzleme listesi sayısının arttığını kontrol et
    const watchlistCount = await homePage.getWatchlistCount();
    expect(watchlistCount).toBeGreaterThan(0);
    
    // İzleme listesinden çıkar
    await homePage.removeFromWatchlist(stockSymbol);
    
    // İzleme listesinden kaldırıldığını kontrol et
    await homePage.expectStockNotInWatchlist(stockSymbol);
  });

  test('Zaman periyodu seçimi çalışmalı', async () => {
    // Farklı zaman periyotlarını test et
    const periods = ['1D', '1W', '1M', '3M', '1Y'];
    
    for (const period of periods) {
      await homePage.selectTimePeriod(period);
      await homePage.expectTimePeriodSelected(period);
      
      // Grafik verilerinin güncellendiğini kontrol et
      await homePage.expectChartDataUpdate();
    }
  });

  test('Haberler bölümü çalışmalı', async () => {
    // Haberlerin yüklendiğini kontrol et
    await homePage.expectNewsVisible();
    
    // Haber sayısını kontrol et
    const newsCount = await homePage.getNewsCount();
    expect(newsCount).toBeGreaterThan(0);
    
    // Haber filtreleme işlevini test et
    await homePage.filterNewsByImpact('high');
    
    // Filtrelenmiş haberlerin görünür olduğunu kontrol et
    await homePage.expectFilteredNewsVisible('high');
  });

  test('Uyarılar sistemi çalışmalı', async () => {
    // Uyarıların görünür olduğunu kontrol et
    await homePage.expectAlertsVisible();
    
    // Uyarı sayısını al
    const alertCount = await homePage.getAlertCount();
    
    if (alertCount > 0) {
      // İlk uyarıyı okundu olarak işaretle
      await homePage.markAlertAsRead(0);
      
      // Uyarının okundu olarak işaretlendiğini kontrol et
      await homePage.expectAlertMarkedAsRead(0);
    }
  });

  test('Piyasa durumu göstergesi çalışmalı', async () => {
    // Piyasa durumunu kontrol et
    const marketStatus = await homePage.getMarketStatus();
    expect(['open', 'closed', 'pre-market', 'after-hours']).toContain(marketStatus);
    
    // Piyasa saatlerini kontrol et
    await homePage.expectMarketHoursVisible();
    
    if (marketStatus === 'open') {
      await homePage.expectMarketOpen();
    } else {
      await homePage.expectMarketClosed();
      
      // Piyasa kapanış zamanını kontrol et
      const closingTime = await homePage.getMarketClosingTime();
      expect(closingTime).toBeTruthy();
    }
  });

  test('Performans metrikleri görünür olmalı', async () => {
    // Piyasa duyarlılığını kontrol et
    const sentiment = await homePage.getMarketSentiment();
    expect(['bullish', 'bearish', 'neutral']).toContain(sentiment);
    
    // Hacim verilerini kontrol et
    const volume = await homePage.getMarketVolume();
    expect(volume).toBeTruthy();
    
    // Volatilite verilerini kontrol et
    const volatility = await homePage.getMarketVolatility();
    expect(volatility).toBeTruthy();
  });

  test('Son güncelleme zamanı görünür olmalı', async () => {
    // Son güncelleme zamanını kontrol et
    const lastUpdate = await homePage.getLastUpdateTime();
    expect(lastUpdate).toBeTruthy();
    
    // Güncelleme zamanının yakın zamanda olduğunu kontrol et
    const updateTime = new Date(lastUpdate);
    const now = new Date();
    const timeDiff = now.getTime() - updateTime.getTime();
    
    // Son 5 dakika içinde güncellenmiş olmalı
    expect(timeDiff).toBeLessThan(5 * 60 * 1000);
  });

  test('Responsive tasarım çalışmalı', async ({ page }) => {
    // Mobil görünümü test et
    await page.setViewportSize({ width: 375, height: 667 });
    await homePage.expectMobileLayoutVisible();
    
    // Tablet görünümü test et
    await page.setViewportSize({ width: 768, height: 1024 });
    await homePage.expectTabletLayoutVisible();
    
    // Desktop görünümü test et
    await page.setViewportSize({ width: 1920, height: 1080 });
    await homePage.expectDesktopLayoutVisible();
  });

  test('Klavye navigasyonu çalışmalı', async ({ page }) => {
    // Tab tuşu ile navigasyon
    await page.keyboard.press('Tab');
    await homePage.expectFocusOnSearchInput();
    
    // Enter tuşu ile arama
    await page.keyboard.type('GOOGL');
    await page.keyboard.press('Enter');
    await homePage.expectSearchResultsVisible();
    
    // Escape tuşu ile arama sonuçlarını kapat
    await page.keyboard.press('Escape');
    await homePage.expectSearchResultsClosed();
  });

  test('Hata durumları uygun şekilde işlenmeli', async ({ page }) => {
    // Ağ bağlantısını simüle et
    await page.route('**/api/stocks/**', route => route.abort());
    
    // Hisse senedi arama yap
    await homePage.searchStock('INVALID');
    
    // Hata mesajının görünür olduğunu kontrol et
    await homePage.expectErrorMessage('Ağ bağlantısı hatası');
    
    // Yeniden deneme butonunun çalıştığını kontrol et
    await homePage.clickRetryButton();
  });

  test('WebSocket bağlantısı çalışmalı', async () => {
    // WebSocket bağlantısının kurulduğunu kontrol et
    await homePage.expectWebSocketConnected();
    
    // Gerçek zamanlı veri güncellemelerini bekle
    await homePage.waitForRealTimeUpdate();
    
    // Bağlantı durumunun aktif olduğunu kontrol et
    await homePage.expectConnectionStatus('connected');
  });

  test('Sayfa yenileme sonrası durum korunmalı', async ({ page }) => {
    const stockSymbol = 'AMZN';
    
    // İzleme listesine hisse senedi ekle
    await homePage.searchStock(stockSymbol);
    await homePage.addToWatchlist(stockSymbol);
    
    // Zaman periyodu seç
    await homePage.selectTimePeriod('1M');
    
    // Sayfayı yenile
    await page.reload();
    
    // Durumun korunduğunu kontrol et
    await homePage.expectStockInWatchlist(stockSymbol);
    await homePage.expectTimePeriodSelected('1M');
  });

  test('Çoklu sekme desteği çalışmalı', async ({ context }) => {
    // Yeni sekme aç
    const newPage = await context.newPage();
    const newHomePage = new HomePage(newPage);
    
    // Her iki sekmede de ana sayfayı aç
    await newHomePage.navigateToHome();
    
    // Her iki sekmede de bağımsız işlemler yap
    await homePage.searchStock('AAPL');
    await newHomePage.searchStock('TSLA');
    
    // Her sekmenin kendi durumunu koruduğunu kontrol et
    await homePage.expectSearchTerm('AAPL');
    await newHomePage.expectSearchTerm('TSLA');
    
    await newPage.close();
  });
});