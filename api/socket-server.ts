import { Server } from 'socket.io';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import { StockScraper } from './services/stockScraper.js';

// StockScraper instance
const stockScraper = new StockScraper();

// Express app oluştur
const app = express();
const server = createServer(app);

// CORS ayarları
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

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

// Socket.IO bağlantı olayları
io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);

  // Popüler hisseleri gönder
  socket.emit('popular-stocks', popularStocks.map(symbol => mockStockData[symbol]));

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

  // Bağlantı kopma olayı
  socket.on('disconnect', () => {
    console.log('Kullanıcı bağlantısı koptu:', socket.id);
  });
});

// Periyodik veri güncellemesi
setInterval(() => {
  // Popüler hisselerin verilerini güncelle ve gönder
  const updatedStocks = popularStocks.map(symbol => {
    const baseData = mockStockData[symbol];
    const randomChange = (Math.random() - 0.5) * 2;
    const newPrice = baseData.price + randomChange;
    const priceChange = newPrice - baseData.price;
    const changePercent = (priceChange / baseData.price) * 100;
    
    return {
      symbol,
      price: Number(newPrice.toFixed(2)),
      change: Number(priceChange.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  });
  
  io.emit('popular-stocks-update', updatedStocks);
}, 5000); // Her 5 saniyede bir güncelle

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