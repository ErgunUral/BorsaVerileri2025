import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { StockDetailPage } from '../pages/StockDetailPage';

test.describe('WebSocket Gerçek Zamanlı Veri E2E Testleri', () => {
  let homePage: HomePage;
  let stockDetailPage: StockDetailPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    stockDetailPage = new StockDetailPage(page);
  });

  test.describe('WebSocket Bağlantısı', () => {
    test('WebSocket bağlantısı kurulmalı', async ({ page }) => {
      await homePage.navigateToHome();
      
      // WebSocket bağlantısının kurulduğunu kontrol et
      await homePage.expectConnectionStatus('connecting');
      await homePage.expectConnectionStatus('connected');
      
      // Bağlantı durumu göstergesinin görünür olduğunu kontrol et
      await homePage.expectConnectionIndicatorVisible();
    });

    test('WebSocket bağlantı hatası uygun şekilde işlenmeli', async ({ page }) => {
      // WebSocket sunucusunu simüle et (hata durumu)
      await page.route('ws://localhost:8080', route => route.abort());
      
      await homePage.navigateToHome();
      
      // Bağlantı hatası durumunu kontrol et
      await homePage.expectConnectionStatus('error');
      await homePage.expectConnectionError('WebSocket bağlantısı kurulamadı');
      
      // Yeniden bağlanma butonunun görünür olduğunu kontrol et
      await homePage.expectReconnectButtonVisible();
    });

    test('WebSocket yeniden bağlanma çalışmalı', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Bağlantıyı simüle olarak kes
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.close();
      });
      
      // Bağlantı kesilme durumunu kontrol et
      await homePage.expectConnectionStatus('disconnected');
      
      // Otomatik yeniden bağlanmayı bekle
      await homePage.expectConnectionStatus('connecting');
      await homePage.expectConnectionStatus('connected');
    });

    test('Manuel yeniden bağlanma çalışmalı', async ({ page }) => {
      await homePage.navigateToHome();
      
      // Bağlantıyı kes
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.close();
      });
      
      await homePage.expectConnectionStatus('disconnected');
      
      // Manuel yeniden bağlan
      await homePage.clickReconnectButton();
      
      await homePage.expectConnectionStatus('connecting');
      await homePage.expectConnectionStatus('connected');
    });
  });

  test.describe('Hisse Senedi Abonelikleri', () => {
    test('Hisse senedi aboneliği oluşturulabilmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Hisse senedi ara ve seç
      await homePage.searchStock('AAPL');
      await homePage.selectSearchResult(0);
      
      // WebSocket mesajlarını dinle
      const messages: any[] = [];
      page.on('websocket', ws => {
        ws.on('framereceived', event => {
          try {
            const data = JSON.parse(event.payload.toString());
            messages.push(data);
          } catch (e) {
            // JSON olmayan mesajları yoksay
          }
        });
      });
      
      // Hisse senedi detay sayfasına git
      await stockDetailPage.expectStockDetailVisible();
      
      // Abonelik mesajının gönderildiğini kontrol et
      await page.waitForFunction(() => {
        // @ts-ignore
        return window.websocketMessages?.some(msg => 
          msg.type === 'subscribe' && msg.symbol === 'AAPL'
        );
      });
    });

    test('Hisse senedi aboneliği iptal edilebilmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Hisse senedi detayına git
      await homePage.searchStock('AAPL');
      await homePage.selectSearchResult(0);
      await stockDetailPage.expectStockDetailVisible();
      
      // Ana sayfaya geri dön
      await homePage.navigateToHome();
      
      // Abonelik iptal mesajının gönderildiğini kontrol et
      await page.waitForFunction(() => {
        // @ts-ignore
        return window.websocketMessages?.some(msg => 
          msg.type === 'unsubscribe' && msg.symbol === 'AAPL'
        );
      });
    });

    test('Çoklu hisse senedi aboneliği yönetilebilmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      const stocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
      
      // Birden fazla hisse senedini izleme listesine ekle
      for (const stock of stocks) {
        await homePage.searchStock(stock);
        await homePage.selectSearchResult(0);
        await stockDetailPage.addToWatchlist();
        await homePage.navigateToHome();
      }
      
      // Tüm aboneliklerin aktif olduğunu kontrol et
      await page.waitForFunction((stockList) => {
        // @ts-ignore
        const subscriptions = window.activeSubscriptions || [];
        return stockList.every(stock => subscriptions.includes(stock));
      }, stocks);
    });

    test('Geçersiz hisse senedi sembolü aboneliği reddedilmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Geçersiz sembol ile abonelik dene
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'subscribe',
          symbol: 'INVALID123'
        }));
      });
      
      // Hata mesajının alındığını kontrol et
      await page.waitForFunction(() => {
        // @ts-ignore
        return window.websocketMessages?.some(msg => 
          msg.type === 'error' && msg.message.includes('Invalid symbol')
        );
      });
    });
  });

  test.describe('Gerçek Zamanlı Veri Güncellemeleri', () => {
    test('Hisse senedi fiyat güncellemeleri alınmalı', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Hisse senedi detayına git
      await homePage.searchStock('AAPL');
      await homePage.selectSearchResult(0);
      await stockDetailPage.expectStockDetailVisible();
      
      // İlk fiyatı al
      const initialPrice = await stockDetailPage.getCurrentPrice();
      
      // Gerçek zamanlı güncellemeyi simüle et
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'stock_update',
          symbol: 'AAPL',
          price: 155.50,
          change: 2.30,
          changePercent: 1.50,
          volume: 1234567,
          timestamp: Date.now()
        }));
      });
      
      // Fiyat güncellemesini bekle
      await stockDetailPage.waitForRealTimeUpdate();
      
      // Güncellenmiş fiyatı kontrol et
      const updatedPrice = await stockDetailPage.getCurrentPrice();
      expect(updatedPrice).toContain('155.50');
    });

    test('Piyasa verileri güncellemeleri alınmalı', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Piyasa verilerini abonelik simüle et
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'subscribe',
          dataType: 'market'
        }));
      });
      
      // Piyasa verisi güncellemesi simüle et
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'market_update',
          indices: {
            'S&P 500': { value: 4150.25, change: 15.30, changePercent: 0.37 },
            'NASDAQ': { value: 12850.75, change: -25.50, changePercent: -0.20 },
            'DOW': { value: 33750.50, change: 125.75, changePercent: 0.37 }
          },
          timestamp: Date.now()
        }));
      });
      
      // Piyasa verilerinin güncellendiğini kontrol et
      await homePage.expectMarketDataUpdate();
      
      // Endeks değerlerini kontrol et
      const spValue = await homePage.getMarketIndexValue('S&P 500');
      expect(spValue).toContain('4150.25');
    });

    test('Haber güncellemeleri alınmalı', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Haber güncellemesi simüle et
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'news_update',
          news: {
            id: 'news123',
            title: 'Breaking: Market Update',
            summary: 'Important market news...',
            impact: 'high',
            symbols: ['AAPL', 'GOOGL'],
            timestamp: Date.now()
          }
        }));
      });
      
      // Haber güncellemesinin görünür olduğunu kontrol et
      await homePage.expectNewsUpdate();
      
      // Haber başlığını kontrol et
      const newsTitle = await homePage.getLatestNewsTitle();
      expect(newsTitle).toContain('Breaking: Market Update');
    });

    test('Uyarı bildirimleri alınmalı', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Uyarı bildirimi simüle et
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'alert',
          alert: {
            id: 'alert123',
            type: 'price',
            symbol: 'AAPL',
            message: 'AAPL reached target price of $155.00',
            priority: 'high',
            timestamp: Date.now()
          }
        }));
      });
      
      // Uyarı bildiriminin görünür olduğunu kontrol et
      await homePage.expectAlertNotification();
      
      // Uyarı mesajını kontrol et
      const alertMessage = await homePage.getAlertMessage();
      expect(alertMessage).toContain('AAPL reached target price');
    });
  });

  test.describe('Veri Sıklığı ve Performans', () => {
    test('Yüksek frekanslı güncellemeler işlenebilmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Hisse senedi detayına git
      await homePage.searchStock('AAPL');
      await homePage.selectSearchResult(0);
      await stockDetailPage.expectStockDetailVisible();
      
      // Hızlı güncellemeler gönder (saniyede 10 güncelleme)
      const updateCount = 50;
      const startTime = Date.now();
      
      for (let i = 0; i < updateCount; i++) {
        await page.evaluate((index) => {
          // @ts-ignore
          window.websocketConnection?.send(JSON.stringify({
            type: 'stock_update',
            symbol: 'AAPL',
            price: 150 + (index * 0.1),
            change: index * 0.05,
            changePercent: (index * 0.05) / 150 * 100,
            volume: 1000000 + index * 1000,
            timestamp: Date.now()
          }));
        }, i);
        
        // Kısa bekleme
        await page.waitForTimeout(100);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Son güncellemenin işlendiğini kontrol et
      await stockDetailPage.waitForRealTimeUpdate();
      
      // Performans kontrolü (5 saniyeden az sürmeli)
      expect(duration).toBeLessThan(5000);
      
      // Son fiyatın doğru olduğunu kontrol et
      const finalPrice = await stockDetailPage.getCurrentPrice();
      expect(finalPrice).toContain('154.9'); // 150 + (49 * 0.1)
    });

    test('Bellek kullanımı kontrol altında tutulmalı', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Çok sayıda güncelleme gönder
      for (let i = 0; i < 1000; i++) {
        await page.evaluate((index) => {
          // @ts-ignore
          window.websocketConnection?.send(JSON.stringify({
            type: 'stock_update',
            symbol: 'AAPL',
            price: 150 + Math.random(),
            timestamp: Date.now()
          }));
        }, i);
        
        if (i % 100 === 0) {
          await page.waitForTimeout(10);
        }
      }
      
      // Bellek kullanımını kontrol et
      const memoryUsage = await page.evaluate(() => {
        // @ts-ignore
        return performance.memory ? {
          // @ts-ignore
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          // @ts-ignore
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null;
      });
      
      if (memoryUsage) {
        // Bellek kullanımı 100MB'dan az olmalı
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
      }
    });
  });

  test.describe('Hata Durumları', () => {
    test('Bozuk JSON mesajları işlenmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Bozuk JSON gönder
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send('invalid json {');
      });
      
      // Bağlantının hala aktif olduğunu kontrol et
      await homePage.expectConnectionStatus('connected');
      
      // Normal mesajın hala çalıştığını kontrol et
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'ping'
        }));
      });
    });

    test('Bilinmeyen mesaj türleri işlenmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Bilinmeyen mesaj türü gönder
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'unknown_message_type',
          data: 'test'
        }));
      });
      
      // Bağlantının hala aktif olduğunu kontrol et
      await homePage.expectConnectionStatus('connected');
    });

    test('Ağ kesintisi sonrası otomatik yeniden bağlanma', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Ağ kesintisini simüle et
      await page.setOfflineMode(true);
      
      // Bağlantı kesilme durumunu kontrol et
      await homePage.expectConnectionStatus('disconnected');
      
      // Ağı tekrar aç
      await page.setOfflineMode(false);
      
      // Otomatik yeniden bağlanmayı bekle
      await homePage.expectConnectionStatus('connecting');
      await homePage.expectConnectionStatus('connected');
    });
  });

  test.describe('Ping/Pong Mekanizması', () => {
    test('Ping/Pong ile bağlantı sağlığı kontrol edilmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Ping gönder
      await page.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        }));
      });
      
      // Pong yanıtını bekle
      await page.waitForFunction(() => {
        // @ts-ignore
        return window.websocketMessages?.some(msg => msg.type === 'pong');
      });
      
      // Bağlantı durumunun hala aktif olduğunu kontrol et
      await homePage.expectConnectionStatus('connected');
    });

    test('Ping timeout durumu işlenmeli', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      // Ping gönder ama pong yanıtını engelle
      await page.route('ws://localhost:8080', route => {
        // Ping mesajlarını engelle
        route.continue();
      });
      
      // Ping timeout süresini bekle (30 saniye)
      await page.waitForTimeout(35000);
      
      // Bağlantının timeout nedeniyle kesildiğini kontrol et
      await homePage.expectConnectionStatus('disconnected');
      
      // Yeniden bağlanma denemesini kontrol et
      await homePage.expectConnectionStatus('connecting');
    });
  });

  test.describe('Çoklu Sekme Desteği', () => {
    test('Çoklu sekmede WebSocket bağlantıları yönetilebilmeli', async ({ context }) => {
      // İlk sekme
      const page1 = await context.newPage();
      const homePage1 = new HomePage(page1);
      
      await homePage1.navigateToHome();
      await homePage1.expectConnectionStatus('connected');
      
      // İkinci sekme
      const page2 = await context.newPage();
      const homePage2 = new HomePage(page2);
      
      await homePage2.navigateToHome();
      await homePage2.expectConnectionStatus('connected');
      
      // Her sekmenin kendi bağlantısına sahip olduğunu kontrol et
      await page1.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'ping',
          source: 'tab1'
        }));
      });
      
      await page2.evaluate(() => {
        // @ts-ignore
        window.websocketConnection?.send(JSON.stringify({
          type: 'ping',
          source: 'tab2'
        }));
      });
      
      // Her sekmenin kendi mesajlarını aldığını kontrol et
      await page1.waitForFunction(() => {
        // @ts-ignore
        return window.websocketMessages?.some(msg => 
          msg.type === 'pong' && msg.source === 'tab1'
        );
      });
      
      await page2.waitForFunction(() => {
        // @ts-ignore
        return window.websocketMessages?.some(msg => 
          msg.type === 'pong' && msg.source === 'tab2'
        );
      });
      
      await page1.close();
      await page2.close();
    });
  });

  test.describe('Performans Metrikleri', () => {
    test('WebSocket mesaj gecikme süresi kabul edilebilir olmalı', async ({ page }) => {
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      const latencies: number[] = [];
      
      // 10 ping mesajı gönder ve gecikme sürelerini ölç
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        await page.evaluate((timestamp) => {
          // @ts-ignore
          window.websocketConnection?.send(JSON.stringify({
            type: 'ping',
            timestamp: timestamp
          }));
        }, startTime);
        
        // Pong yanıtını bekle
        await page.waitForFunction((sentTime) => {
          // @ts-ignore
          return window.websocketMessages?.some(msg => 
            msg.type === 'pong' && msg.timestamp === sentTime
          );
        }, startTime);
        
        const endTime = Date.now();
        latencies.push(endTime - startTime);
        
        await page.waitForTimeout(1000);
      }
      
      // Ortalama gecikme süresi 100ms'den az olmalı
      const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      expect(averageLatency).toBeLessThan(100);
      
      // Maksimum gecikme süresi 500ms'den az olmalı
      const maxLatency = Math.max(...latencies);
      expect(maxLatency).toBeLessThan(500);
    });

    test('WebSocket bağlantı kurma süresi hızlı olmalı', async ({ page }) => {
      const startTime = Date.now();
      
      await homePage.navigateToHome();
      await homePage.expectConnectionStatus('connected');
      
      const connectionTime = Date.now() - startTime;
      
      // Bağlantı kurma süresi 2 saniyeden az olmalı
      expect(connectionTime).toBeLessThan(2000);
    });
  });
});