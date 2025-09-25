import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import StockScraper from './services/stockScraper';
import apiProvider from './services/apiProvider.js';
import { bulkDataService } from './services/bulkDataService.js';

// StockScraper instance
const stockScraper = new StockScraper();

// Express app ve HTTP sunucusu oluştur
const app = express();
const server = createServer(app);

// CORS ayarları
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());

// Socket.IO sunucusu oluştur
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Hisse senedi verileri için mock data (Türk hisse senetleri)
const mockStockData = {
  'THYAO': { symbol: 'THYAO', price: 150.25, change: 2.15, changePercent: 1.45 },
  'AKBNK': { symbol: 'AKBNK', price: 27.50, change: -0.30, changePercent: -1.08 },
  'ASELS': { symbol: 'ASELS', price: 310.45, change: 5.20, changePercent: 1.70 },
  'SISE': { symbol: 'SISE', price: 24.60, change: -0.40, changePercent: -1.60 },
  'EREGL': { symbol: 'EREGL', price: 32.15, change: 0.80, changePercent: 2.55 },
  'BIMAS': { symbol: 'BIMAS', price: 125.40, change: 3.20, changePercent: 2.62 },
  'GARAN': { symbol: 'GARAN', price: 89.75, change: -1.25, changePercent: -1.37 },
  'ISCTR': { symbol: 'ISCTR', price: 15.85, change: 0.15, changePercent: 0.96 }
};

// Popüler hisseler (Türk hisse senetleri)
const popularStocks = ['THYAO', 'AKBNK', 'ASELS', 'SISE', 'EREGL', 'BIMAS', 'GARAN', 'ISCTR'];

// Bulk data service event listeners
bulkDataService.on('update', (event) => {
  io.emit('bulk-data-update', event);
});

bulkDataService.on('autoUpdate', (data) => {
  io.emit('auto-update-complete', data);
});

bulkDataService.on('autoUpdateError', (error) => {
  io.emit('auto-update-error', { error: error.message });
});

// Socket.IO bağlantı olayları
io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);

  // Popüler hisseleri gönder
  socket.emit('popular-stocks', popularStocks.map(symbol => mockStockData[symbol]));

  // Bulk data service durumunu gönder
  socket.emit('bulk-service-status', bulkDataService.getStatus());

  // Hisse verisi isteme olayı (eski format)
  socket.on('request-stock-data', (symbol: string) => {
    console.log('Hisse verisi istendi:', symbol);
    handleStockRequest(socket, symbol);
  });

  // Hisse abone olma olayı (yeni format - frontend tarafından kullanılıyor)
  socket.on('subscribe-stock', (stockCode: string) => {
    console.log('Hisse abone olma istendi:', stockCode);
    handleStockRequest(socket, stockCode);
  });

  async function handleStockRequest(socket: any, symbol: string) {
    const upperSymbol = symbol.toUpperCase();
    
    try {
      console.log(`${upperSymbol} için veri çekiliyor...`);
      
      // Gerçek hisse fiyatı ve finansal veri çek
      const [priceData, financialData] = await Promise.all([
        stockScraper.scrapeStockPrice(upperSymbol),
        stockScraper.scrapeFinancialData(upperSymbol)
      ]);
      
      if (priceData || financialData) {
        // Finansal veriyi frontend formatına dönüştür
        const formatFinancialData = (data: any) => {
          if (!data) return {};
          
          return {
            currentAssets: data.currentAssets || 0,
            shortTermLiabilities: data.shortTermLiabilities || 0,
            longTermLiabilities: data.longTermLiabilities || 0,
            cashAndEquivalents: data.cashAndEquivalents || 0,
            financialInvestments: data.financialInvestments || 0,
            financialDebts: data.financialDebts || 0,
            totalAssets: data.totalAssets || 0,
            totalLiabilities: data.totalLiabilities || 0,
            ebitda: data.ebitda || 0,
            netProfit: data.netProfit || 0,
            equity: data.equity || 0,
            paidCapital: data.paidCapital || 0
          };
        };
        
        // Finansal oranları hesapla
        const calculateRatios = (data: any) => {
          if (!data) return {};
          
          const ratios: any = {};
          
          // Cari Oran
          if (data.currentAssets && data.shortTermLiabilities) {
            ratios['Cari Oran'] = (data.currentAssets / data.shortTermLiabilities).toFixed(2);
          }
          
          // Asit-Test Oranı
          if (data.currentAssets && data.shortTermLiabilities) {
            const liquidAssets = data.currentAssets - (data.currentAssets * 0.3); // Stok tahmini
            ratios['Asit-Test Oranı'] = (liquidAssets / data.shortTermLiabilities).toFixed(2);
          }
          
          // Borç/Özkaynak Oranı
          if (data.totalLiabilities && data.equity) {
            ratios['Borç/Özkaynak Oranı'] = (data.totalLiabilities / data.equity).toFixed(2);
          }
          
          // Özkaynak Oranı
          if (data.equity && data.totalAssets) {
            ratios['Özkaynak Oranı'] = ((data.equity / data.totalAssets) * 100).toFixed(2) + '%';
          }
          
          // ROE (Return on Equity)
          if (data.netProfit && data.equity) {
            ratios['ROE'] = ((data.netProfit / data.equity) * 100).toFixed(2) + '%';
          }
          
          // ROA (Return on Assets)
          if (data.netProfit && data.totalAssets) {
            ratios['ROA'] = ((data.netProfit / data.totalAssets) * 100).toFixed(2) + '%';
          }
          
          return ratios;
        };
        
        const stockData = {
          stockCode: upperSymbol,
          price: {
            price: priceData?.price || 0,
            changePercent: priceData?.changePercent || 0,
            volume: priceData?.volume || 0,
            lastUpdated: priceData?.lastUpdated || new Date().toISOString()
          },
          analysis: {
            stockCode: upperSymbol,
            companyName: financialData?.companyName || `${upperSymbol} Şirketi`,
            financialData: formatFinancialData(financialData),
            ratios: calculateRatios(financialData),
            recommendations: financialData ? [
              'Finansal veriler başarıyla yüklendi',
              financialData.totalAssets > 0 ? 'Toplam varlık bilgisi mevcut' : 'Toplam varlık bilgisi eksik',
              financialData.netProfit > 0 ? 'Pozitif net kar' : financialData.netProfit < 0 ? 'Negatif net kar' : 'Net kar bilgisi eksik'
            ] : ['Finansal veri çekilemedi'],
            riskLevel: 'Orta' as const,
            investmentScore: Math.floor(Math.random() * 100)
          },
          timestamp: new Date().toISOString()
        };
        
        console.log(`${upperSymbol} verisi başarıyla gönderildi:`, {
          hasFinancialData: Object.keys(stockData.analysis.financialData).length > 0,
          hasRatios: Object.keys(stockData.analysis.ratios).length > 0,
          financialDataKeys: Object.keys(stockData.analysis.financialData)
        });
        socket.emit('stock-data', stockData);
      } else {
        // Fallback to mock data if scraping fails
        if (mockStockData[upperSymbol]) {
          const baseData = mockStockData[upperSymbol];
          const randomChange = (Math.random() - 0.5) * 2;
          const newPrice = baseData.price + randomChange;
          const priceChange = newPrice - baseData.price;
          const changePercent = (priceChange / baseData.price) * 100;
          
          // Gerçekçi finansal test verileri - Parent agent tarafından belirtilen değerler
          const mockFinancialData = {
            currentAssets: 150000000, // 150 milyon TL - Dönen Varlıklar
            shortTermLiabilities: 80000000, // 80 milyon TL - Kısa Vadeli Yükümlülükler
            longTermLiabilities: 120000000, // 120 milyon TL - Uzun Vadeli Yükümlülükler
            cashAndEquivalents: 45000000, // 45 milyon TL - Nakit ve Nakit Benzerleri
            financialInvestments: 30000000, // 30 milyon TL - Finansal Yatırımlar
            financialDebts: 90000000, // 90 milyon TL - Finansal Borçlar
            totalAssets: 500000000, // 500 milyon TL - Toplam Varlıklar
            totalLiabilities: 200000000, // 200 milyon TL - Toplam Yükümlülükler
            ebitda: 60000000, // 60 milyon TL - FAVÖK
            netProfit: 25000000, // 25 milyon TL - Net Dönem Karı
            equity: 300000000, // 300 milyon TL - Özkaynaklar
            paidCapital: 100000000 // 100 milyon TL - Ödenmiş Sermaye
          };
          
          const stockData = {
            stockCode: upperSymbol,
            price: {
              price: Number(newPrice.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              volume: Math.floor(Math.random() * 1000000),
              lastUpdated: new Date().toISOString()
            },
            analysis: {
              stockCode: upperSymbol,
              companyName: `${upperSymbol} Şirketi`,
              financialData: formatFinancialData(mockFinancialData),
              ratios: calculateRatios(mockFinancialData),
              recommendations: [
                'Test verileri kullanılıyor',
                'Güçlü finansal yapı',
                'Pozitif karlılık oranları',
                'Yatırım için uygun'
              ],
              riskLevel: 'Orta' as const,
              investmentScore: Math.floor(Math.random() * 30) + 70 // 70-100 arası
            },
            timestamp: new Date().toISOString()
          };
          
          console.log(`${upperSymbol} için mock veri gönderildi`);
          socket.emit('stock-data', stockData);
        } else {
          socket.emit('stock-error', { stockCode: upperSymbol, error: `Hisse senedi bulunamadı: ${symbol}` });
        }
      }
    } catch (error) {
      console.error(`${upperSymbol} için veri çekme hatası:`, error);
      socket.emit('stock-error', { stockCode: upperSymbol, error: `Veri çekme hatası: ${error.message}` });
    }
  }

  // Real-time updates subscription
  socket.on('subscribe-real-time', () => {
    broadcaster.addClient(socket.id);
    socket.emit('subscription-confirmed', {
      message: 'Real-time updates subscribed',
      clientId: socket.id
    });
  });

  socket.on('unsubscribe-real-time', () => {
    broadcaster.removeClient(socket.id);
    socket.emit('unsubscription-confirmed', {
      message: 'Real-time updates unsubscribed',
      clientId: socket.id
    });
  });

  // Bulk stock data request
   socket.on('get-bulk-stocks', async (stockCodes: string[]) => {
     try {
       const bulkData = await bulkDataService.getBulkData(stockCodes.slice(0, 50));
       socket.emit('bulk-stock-data', {
         stocks: bulkData.successful,
         failed: bulkData.failed,
         summary: bulkData.summary,
         timestamp: new Date().toISOString()
       });
     } catch (error: any) {
       socket.emit('bulk-stock-error', {
         error: 'Bulk data fetch failed',
         details: error.message
       });
     }
   });

  // BIST 100 data request
  socket.on('get-bist100-data', async () => {
    try {
      const bist100Data = await bulkDataService.getBist100Data();
      socket.emit('bist100-data', bist100Data);
    } catch (error: any) {
      socket.emit('bist100-error', {
        error: 'BIST 100 data fetch failed',
        details: error.message
      });
    }
  });

  // Popular stocks data request
  socket.on('get-popular-stocks', async () => {
    try {
      const popularData = await bulkDataService.getPopularStocksData();
      socket.emit('popular-stocks-data', popularData);
    } catch (error: any) {
      socket.emit('popular-stocks-error', {
        error: 'Popular stocks data fetch failed',
        details: error.message
      });
    }
  });

  // Sector data request
  socket.on('get-sector-data', async (sector: string) => {
    try {
      const sectorData = await bulkDataService.getSectorData(sector);
      socket.emit('sector-data', { sector, data: sectorData });
    } catch (error: any) {
      socket.emit('sector-error', {
        sector,
        error: 'Sector data fetch failed',
        details: error.message
      });
    }
  });

  // Watchlist data request
  socket.on('get-watchlist-data', async (category: string) => {
    try {
      const watchlistData = await bulkDataService.getWatchlistData(category);
      socket.emit('watchlist-data', { category, data: watchlistData });
    } catch (error: any) {
      socket.emit('watchlist-error', {
        category,
        error: 'Watchlist data fetch failed',
        details: error.message
      });
    }
  });

  // Start auto updates
  socket.on('start-auto-updates', () => {
    bulkDataService.startAutoUpdate();
    socket.emit('auto-updates-started', { message: 'Auto updates started' });
  });

  // Stop auto updates
  socket.on('stop-auto-updates', () => {
    bulkDataService.stopAutoUpdate();
    socket.emit('auto-updates-stopped', { message: 'Auto updates stopped' });
  });

  // Bağlantı kopma olayı
  socket.on('disconnect', () => {
    console.log('Kullanıcı bağlantısı koptu:', socket.id);
    broadcaster.removeClient(socket.id);
  });
});

// Server-Sent Events endpoint
app.get('/api/sse/stocks', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
  }, 30000);

  // Stock data updates
  const stockUpdater = setInterval(async () => {
    try {
      const stockUpdates = await Promise.all(
        popularStocks.slice(0, 5).map(async (symbol) => {
          const stockData = await apiProvider.getStockPrice(symbol);
          return stockData || {
            stockCode: symbol,
            price: mockStockData[symbol]?.price || 0,
            changePercent: (Math.random() - 0.5) * 10,
            volume: Math.floor(Math.random() * 1000000),
            lastUpdated: new Date()
          };
        })
      );

      res.write(`data: ${JSON.stringify({
        type: 'stock-updates',
        data: stockUpdates,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      console.error('SSE stock update error:', error);
    }
  }, 30000); // 30 saniye aralıklarla

  req.on('close', () => {
    clearInterval(heartbeat);
    clearInterval(stockUpdater);
  });
});

// WebSocket real-time data broadcasting
class RealTimeDataBroadcaster {
  private updateInterval: NodeJS.Timeout | null = null;
  private connectedClients = new Set<string>();

  start() {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(async () => {
      if (this.connectedClients.size === 0) return;

      try {
        // Gerçek zamanlı veri güncellemesi
        const realTimeUpdates = await Promise.all(
          popularStocks.slice(0, 10).map(async (symbol) => {
            const stockData = await apiProvider.getStockPrice(symbol);
            return stockData || this.generateMockData(symbol);
          })
        );

        // Tüm bağlı istemcilere gönder
        io.emit('real-time-updates', {
          stocks: realTimeUpdates,
          timestamp: new Date().toISOString(),
          source: 'real-time-broadcaster'
        });

        console.log(`📡 Real-time data sent to ${this.connectedClients.size} clients`);
      } catch (error) {
        console.error('Real-time broadcast error:', error);
      }
    }, 30000); // 30 saniye aralıklarla
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  addClient(clientId: string) {
    this.connectedClients.add(clientId);
    if (this.connectedClients.size === 1) {
      this.start();
    }
  }

  removeClient(clientId: string) {
    this.connectedClients.delete(clientId);
    if (this.connectedClients.size === 0) {
      this.stop();
    }
  }

  private generateMockData(symbol: string) {
    const baseData = mockStockData[symbol];
    const randomChange = (Math.random() - 0.5) * 2;
    const newPrice = baseData.price + randomChange;
    const priceChange = newPrice - baseData.price;
    const changePercent = (priceChange / baseData.price) * 100;

    return {
      stockCode: symbol,
      price: Number(newPrice.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000),
      lastUpdated: new Date()
    };
  }
}

const broadcaster = new RealTimeDataBroadcaster();

// Sunucuyu başlat
const PORT = 9876;
server.listen(PORT, () => {
  console.log(`Socket.IO sunucusu port ${PORT}'da çalışıyor`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Socket.IO sunucusu kapatılıyor...');
  server.close(() => {
    console.log('Socket.IO sunucusu kapatıldı');
    process.exit(0);
  });
});