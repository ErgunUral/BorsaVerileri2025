import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import stockRoutes from './routes/stocks';
import stockScraper from './services/stockScraper';
import financialCalculator from './services/financialCalculator';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8765",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 9876;
const FRONTEND_URL = 'http://localhost:8765';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stocks', stockRoutes);

// Ana sayfa
app.get('/', (req, res) => {
  res.json({
    message: 'Borsa Hisse Mali Tablo Analiz Sistemi API',
    version: '1.0.0',
    endpoints: {
      stocks: '/api/stocks',
      auth: '/api/auth'
    },
    websocket: 'Socket.IO aktif',
    status: 'Çalışıyor'
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Kullanıcı bağlandı:', socket.id);
  
  // Gerçek zamanlı hisse verisi istekleri
  socket.on('subscribe-stock', async (stockCode: string) => {
    try {
      console.log(`${socket.id} kullanıcısı ${stockCode} hissesine abone oldu`);
      
      // Hemen ilk veriyi gönder
      const [priceData, financialData] = await Promise.all([
        stockScraper.scrapeStockPrice(stockCode),
        stockScraper.scrapeFinancialData(stockCode)
      ]);
      
      if (financialData) {
        const analysis = financialCalculator.calculateAnalysis(financialData);
        
        socket.emit('stock-data', {
          stockCode: stockCode.toUpperCase(),
          price: priceData,
          analysis,
          timestamp: new Date().toISOString()
        });
        
        // Socket'i ilgili odaya ekle
        socket.join(`stock-${stockCode.toUpperCase()}`);
      } else {
        socket.emit('stock-error', {
          stockCode: stockCode.toUpperCase(),
          error: 'Hisse verisi bulunamadı'
        });
      }
    } catch (error) {
      console.error('Socket hisse verisi hatası:', error);
      socket.emit('stock-error', {
        stockCode: stockCode.toUpperCase(),
        error: 'Veri çekme hatası'
      });
    }
  });
  
  // Hisse aboneliğini iptal et
  socket.on('unsubscribe-stock', (stockCode: string) => {
    console.log(`${socket.id} kullanıcısı ${stockCode} aboneliğini iptal etti`);
    socket.leave(`stock-${stockCode.toUpperCase()}`);
  });
  
  // Çoklu hisse aboneliği
  socket.on('subscribe-multiple', async (stockCodes: string[]) => {
    try {
      if (!Array.isArray(stockCodes) || stockCodes.length > 5) {
        socket.emit('error', 'Maksimum 5 hisse takip edilebilir');
        return;
      }
      
      for (const stockCode of stockCodes) {
        socket.join(`stock-${stockCode.toUpperCase()}`);
      }
      
      socket.emit('subscriptions-updated', {
        subscribed: stockCodes.map(code => code.toUpperCase()),
        count: stockCodes.length
      });
    } catch (error) {
      socket.emit('error', 'Çoklu abonelik hatası');
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Kullanıcı ayrıldı:', socket.id);
  });
});

// Periyodik veri güncelleme (5 dakikada bir)
setInterval(async () => {
  const rooms = io.sockets.adapter.rooms;
  
  for (const [roomName] of rooms) {
    if (roomName.startsWith('stock-')) {
      const stockCode = roomName.replace('stock-', '');
      
      try {
        const [priceData, financialData] = await Promise.all([
          stockScraper.scrapeStockPrice(stockCode),
          stockScraper.scrapeFinancialData(stockCode)
        ]);
        
        if (financialData) {
          const analysis = financialCalculator.calculateAnalysis(financialData);
          
          io.to(roomName).emit('stock-update', {
            stockCode,
            price: priceData,
            analysis,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Periyodik güncelleme hatası ${stockCode}:`, error);
      }
    }
  }
}, 5 * 60 * 1000); // 5 dakika

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Server kapatılıyor...');
  await stockScraper.closeBrowser();
  server.close(() => {
    console.log('Server kapatıldı');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log(`WebSocket bağlantısı: ws://localhost:${PORT}`);
});