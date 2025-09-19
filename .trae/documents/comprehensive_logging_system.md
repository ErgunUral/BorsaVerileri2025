# Kapsamlı Loglama Sistemi Dokümantasyonu

## 1. Genel Bakış
Bu dokümantasyon, BorsaVerileri2025 projesi için kapsamlı bir loglama sistemi tasarımını ve implementasyon rehberini sunmaktadır. Sistem, tüm işlem hareketlerinin izlenebilirliğini sağlamak, hataları tespit etmek ve sistem performansını monitör etmek için tasarlanmıştır.

## 2. Log Seviyeleri ve Kullanım Alanları

### 2.1 Log Seviye Hiyerarşisi
| Seviye | Açıklama | Kullanım Alanı |
|--------|----------|----------------|
| **ERROR** | Kritik hatalar | Sistem çökmeleri, veri kaybı, API bağlantı hataları |
| **WARN** | Uyarılar | Performans sorunları, deprecated fonksiyonlar, retry işlemleri |
| **INFO** | Bilgilendirme | İşlem başlangıç/bitiş, kullanıcı eylemleri, sistem durumu |
| **DEBUG** | Detaylı bilgi | Değişken değerleri, fonksiyon çağrıları, veri akışı |
| **TRACE** | En detaylı | Kod satır satır takip, performance profiling |

### 2.2 Seviye Konfigürasyonu
```javascript
// Geliştirme ortamı
const DEV_LOG_LEVEL = 'DEBUG';

// Üretim ortamı
const PROD_LOG_LEVEL = 'INFO';

// Test ortamı
const TEST_LOG_LEVEL = 'WARN';
```

## 3. İşlem Türlerine Göre Log Formatları

### 3.1 Standart Log Formatı
```json
{
  "timestamp": "2025-01-27T10:30:45.123Z",
  "level": "INFO",
  "service": "stockScraper",
  "module": "dataFetcher",
  "operation": "fetchStockData",
  "message": "Hisse verisi başarıyla alındı",
  "data": {
    "symbol": "THYAO",
    "price": 125.50,
    "volume": 1500000
  },
  "requestId": "req_123456789",
  "userId": "user_001",
  "duration": 1250,
  "metadata": {
    "source": "investing.com",
    "retryCount": 0
  }
}
```

### 3.2 Hisse Verisi Çekme İşlemleri
```javascript
// Başarılı veri çekme
logger.info('Stock data fetched successfully', {
  symbol: 'THYAO',
  price: 125.50,
  volume: 1500000,
  source: 'investing.com',
  duration: 1250
});

// Hata durumu
logger.error('Stock data fetch failed', {
  symbol: 'THYAO',
  error: 'Connection timeout',
  retryCount: 3,
  source: 'investing.com'
});
```

### 3.3 Finansal Hesaplama İşlemleri
```javascript
// Hesaplama başlangıcı
logger.info('Financial calculation started', {
  calculationType: 'portfolioValue',
  inputParameters: {
    stocks: ['THYAO', 'AKBNK'],
    quantities: [100, 200]
  }
});

// Hesaplama sonucu
logger.info('Financial calculation completed', {
  calculationType: 'portfolioValue',
  result: 45750.00,
  duration: 350
});
```

### 3.4 API İşlemleri
```javascript
// API isteği
logger.info('API request received', {
  endpoint: '/api/stocks/THYAO',
  method: 'GET',
  userAgent: 'Mozilla/5.0...',
  clientIP: '192.168.1.100'
});

// API yanıtı
logger.info('API response sent', {
  endpoint: '/api/stocks/THYAO',
  statusCode: 200,
  responseSize: 1024,
  duration: 150
});
```

## 4. Log Dosyası Yönetimi ve Rotasyon

### 4.1 Dosya Yapısı
```
logs/
├── application/
│   ├── app-2025-01-27.log
│   ├── app-2025-01-26.log
│   └── archived/
├── error/
│   ├── error-2025-01-27.log
│   └── archived/
├── access/
│   ├── access-2025-01-27.log
│   └── archived/
└── audit/
    ├── audit-2025-01-27.log
    └── archived/
```

### 4.2 Rotasyon Politikaları
| Log Türü | Rotasyon Sıklığı | Maksimum Dosya Boyutu | Saklama Süresi |
|----------|------------------|----------------------|----------------|
| Application | Günlük | 100MB | 30 gün |
| Error | Günlük | 50MB | 90 gün |
| Access | Günlük | 200MB | 7 gün |
| Audit | Günlük | 50MB | 1 yıl |

### 4.3 Arşivleme ve Sıkıştırma
```javascript
// Winston rotasyon konfigürasyonu
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/application/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '100m',
  maxFiles: '30d'
});
```

## 5. Hata İzleme ve Alerting Sistemi

### 5.1 Kritik Hata Tespiti
```javascript
// Kritik hata durumları
const CRITICAL_ERRORS = [
  'DATABASE_CONNECTION_FAILED',
  'API_RATE_LIMIT_EXCEEDED',
  'MEMORY_LEAK_DETECTED',
  'SECURITY_BREACH_ATTEMPT'
];

// Alert tetikleme
function triggerAlert(errorType, details) {
  logger.error('Critical error detected', {
    errorType,
    details,
    alertSent: true,
    timestamp: new Date().toISOString()
  });
  
  // Email/SMS/Slack bildirimi gönder
  notificationService.sendAlert(errorType, details);
}
```

### 5.2 Alert Seviyeleri
| Seviye | Tetikleme Koşulu | Bildirim Yöntemi | Yanıt Süresi |
|--------|------------------|------------------|---------------|
| **P1 - Kritik** | Sistem çökmesi, veri kaybı | SMS + Email + Slack | 5 dakika |
| **P2 - Yüksek** | API hataları, performans düşüşü | Email + Slack | 15 dakika |
| **P3 - Orta** | Uyarılar, retry işlemleri | Email | 1 saat |
| **P4 - Düşük** | Bilgilendirme | Dashboard | 24 saat |

### 5.3 Hata Eşikleri
```javascript
const ERROR_THRESHOLDS = {
  API_ERROR_RATE: 5, // 5 dakikada 10'dan fazla hata
  RESPONSE_TIME: 5000, // 5 saniyeden uzun yanıt süresi
  MEMORY_USAGE: 85, // %85'ten fazla bellek kullanımı
  CPU_USAGE: 90, // %90'dan fazla CPU kullanımı
  DISK_USAGE: 80 // %80'den fazla disk kullanımı
};
```

## 6. Log Analizi ve Monitoring Araçları

### 6.1 Önerilen Araçlar
| Araç | Kullanım Alanı | Avantajları |
|------|----------------|-------------|
| **ELK Stack** | Log toplama ve analiz | Güçlü arama, görselleştirme |
| **Grafana** | Dashboard ve metrikler | Gerçek zamanlı monitoring |
| **Prometheus** | Metrik toplama | Zaman serisi veritabanı |
| **Jaeger** | Distributed tracing | Mikroservis izleme |
| **Sentry** | Hata izleme | Otomatik hata gruplandırma |

### 6.2 Özel Metrikler
```javascript
// Hisse verisi çekme başarı oranı
const stockFetchSuccessRate = {
  name: 'stock_fetch_success_rate',
  description: 'Hisse verisi çekme başarı oranı',
  type: 'gauge',
  labels: ['symbol', 'source']
};

// API yanıt süresi
const apiResponseTime = {
  name: 'api_response_time_seconds',
  description: 'API yanıt süresi (saniye)',
  type: 'histogram',
  labels: ['endpoint', 'method', 'status_code']
};
```

### 6.3 Dashboard Örnekleri
```javascript
// Grafana dashboard konfigürasyonu
const dashboardConfig = {
  title: 'BorsaVerileri2025 Monitoring',
  panels: [
    {
      title: 'API Request Rate',
      type: 'graph',
      targets: ['rate(api_requests_total[5m])'],
      yAxis: { unit: 'reqps' }
    },
    {
      title: 'Error Rate by Service',
      type: 'graph',
      targets: ['rate(log_entries{level="error"}[5m])'],
      yAxis: { unit: 'errors/sec' }
    },
    {
      title: 'Stock Data Fetch Success Rate',
      type: 'stat',
      targets: ['stock_fetch_success_rate'],
      thresholds: [0.95, 0.99]
    }
  ]
};
```

## 7. Güvenlik ve Compliance Gereksinimleri

### 7.1 Veri Gizliliği
```javascript
// Hassas veri maskeleme
function maskSensitiveData(data) {
  const masked = { ...data };
  
  // Kullanıcı bilgilerini maskele
  if (masked.email) {
    masked.email = masked.email.replace(/(.{2}).*(@.*)/, '$1***$2');
  }
  
  // API anahtarlarını maskele
  if (masked.apiKey) {
    masked.apiKey = masked.apiKey.substring(0, 4) + '***';
  }
  
  return masked;
}
```

### 7.2 Log Şifreleme
```javascript
// Log dosyası şifreleme
const crypto = require('crypto');

function encryptLogEntry(logEntry) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.LOG_ENCRYPTION_KEY);
  let encrypted = cipher.update(JSON.stringify(logEntry), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

### 7.3 Erişim Kontrolü
```javascript
// Log dosyası erişim izinleri
const LOG_ACCESS_PERMISSIONS = {
  'logs/application/': ['admin', 'developer'],
  'logs/error/': ['admin', 'developer', 'support'],
  'logs/audit/': ['admin', 'compliance'],
  'logs/access/': ['admin', 'security']
};
```

### 7.4 Compliance Gereksinimleri
| Standart | Gereksinim | Implementasyon |
|----------|------------|----------------|
| **GDPR** | Kişisel veri koruması | Veri maskeleme, silme hakkı |
| **SOX** | Finansal kayıt tutma | Audit log, değişiklik izleme |
| **PCI DSS** | Ödeme verisi güvenliği | Şifreleme, erişim kontrolü |
| **ISO 27001** | Bilgi güvenliği | Log monitoring, incident response |

## 8. Performance Impact Değerlendirmesi

### 8.1 Performans Metrikleri
```javascript
// Log yazma performansı ölçümü
const logPerformance = {
  async: true, // Asenkron log yazma
  bufferSize: 1000, // Buffer boyutu
  flushInterval: 5000, // Flush aralığı (ms)
  compressionLevel: 6 // Sıkıştırma seviyesi
};

// Performans izleme
function measureLogPerformance() {
  const start = process.hrtime.bigint();
  logger.info('Performance test log entry');
  const end = process.hrtime.bigint();
  
  return Number(end - start) / 1000000; // Milisaniye cinsinden
}
```

### 8.2 Optimizasyon Stratejileri
| Strateji | Açıklama | Performans Kazancı |
|----------|----------|--------------------|
| **Asenkron Yazma** | Log yazma işlemlerini arka planda yap | %70-80 |
| **Buffering** | Logları toplu olarak yaz | %50-60 |
| **Sıkıştırma** | Log dosyalarını sıkıştır | %60-70 disk tasarrufu |
| **Sampling** | Yüksek trafikte log örnekleme | %30-50 |

### 8.3 Resource Monitoring
```javascript
// Kaynak kullanımı izleme
function monitorLogResources() {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  logger.debug('Log system resource usage', {
    memory: {
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    }
  });
}
```

## 9. Log Retention Politikaları

### 9.1 Saklama Süreleri
| Log Türü | Aktif Saklama | Arşiv Saklama | Toplam Saklama |
|----------|---------------|---------------|----------------|
| **Application** | 30 gün | 6 ay | 7 ay |
| **Error** | 90 gün | 1 yıl | 15 ay |
| **Access** | 7 gün | 1 ay | 37 gün |
| **Audit** | 1 yıl | 7 yıl | 8 yıl |
| **Security** | 6 ay | 2 yıl | 2.5 yıl |

### 9.2 Otomatik Temizleme
```javascript
// Otomatik log temizleme
const cron = require('node-cron');

// Her gün gece 2'de çalış
cron.schedule('0 2 * * *', () => {
  cleanupOldLogs();
});

function cleanupOldLogs() {
  const retentionPolicies = {
    'logs/application/': 30, // 30 gün
    'logs/error/': 90,       // 90 gün
    'logs/access/': 7,       // 7 gün
    'logs/audit/': 365       // 1 yıl
  };
  
  Object.entries(retentionPolicies).forEach(([path, days]) => {
    deleteOldFiles(path, days);
  });
}
```

### 9.3 Arşivleme Stratejisi
```javascript
// Log arşivleme
function archiveOldLogs() {
  const archiveConfig = {
    source: 'logs/application/',
    destination: 'archive/logs/',
    compression: 'gzip',
    encryption: true,
    ageThreshold: 30 // 30 günden eski
  };
  
  // S3 veya benzeri cloud storage'a yükle
  uploadToCloudStorage(archiveConfig);
}
```

## 10. StockScraper İçin Özel Log Stratejileri

### 10.1 Scraping İşlemleri
```javascript
// Scraping başlangıcı
logger.info('Stock scraping started', {
  operation: 'scrapeStockData',
  symbols: ['THYAO', 'AKBNK', 'GARAN'],
  source: 'investing.com',
  batchSize: 10,
  timeout: 30000
});

// Her hisse için ayrı log
logger.debug('Scraping individual stock', {
  symbol: 'THYAO',
  url: 'https://investing.com/equities/thyao',
  attempt: 1,
  userAgent: 'Mozilla/5.0...'
});

// Başarılı scraping
logger.info('Stock data scraped successfully', {
  symbol: 'THYAO',
  data: {
    price: 125.50,
    change: 2.30,
    volume: 1500000
  },
  duration: 2500,
  retryCount: 0
});
```

### 10.2 Hata Durumları
```javascript
// Puppeteer hataları
logger.error('Puppeteer connection failed', {
  symbol: 'THYAO',
  error: 'Protocol error: Connection closed',
  browserVersion: '119.0.6045.105',
  retryCount: 3,
  nextRetryIn: 5000
});

// Rate limiting
logger.warn('Rate limit detected', {
  source: 'investing.com',
  rateLimitType: 'IP_BASED',
  waitTime: 60000,
  requestCount: 100
});

// Anti-bot detection
logger.warn('Anti-bot detection triggered', {
  source: 'investing.com',
  detectionType: 'CAPTCHA',
  action: 'SWITCH_PROXY',
  proxyUsed: '192.168.1.100:8080'
});
```

### 10.3 Performance Monitoring
```javascript
// Scraping performansı
logger.info('Scraping performance metrics', {
  totalSymbols: 50,
  successfulScrapes: 47,
  failedScrapes: 3,
  averageResponseTime: 1850,
  totalDuration: 92500,
  throughput: 0.54 // symbols per second
});
```

## 11. Finansal İşlemler İçin Log Stratejileri

### 11.1 Portföy Hesaplamaları
```javascript
// Portföy değeri hesaplama
logger.info('Portfolio calculation initiated', {
  operation: 'calculatePortfolioValue',
  userId: 'user_001',
  portfolioId: 'portfolio_123',
  stockCount: 5,
  calculationMethod: 'REAL_TIME'
});

// Hesaplama sonucu
logger.info('Portfolio calculation completed', {
  portfolioId: 'portfolio_123',
  totalValue: 125750.50,
  dailyChange: -2.3,
  dailyChangePercent: -1.8,
  calculationDuration: 450
});
```

### 11.2 Risk Analizi
```javascript
// Risk hesaplama
logger.info('Risk analysis started', {
  operation: 'calculatePortfolioRisk',
  portfolioId: 'portfolio_123',
  riskModel: 'VAR_95',
  timeHorizon: 30
});

// Risk sonuçları
logger.info('Risk analysis completed', {
  portfolioId: 'portfolio_123',
  var95: 15750.25,
  beta: 1.25,
  sharpeRatio: 0.85,
  maxDrawdown: -12.5
});
```

## 12. İmplementasyon Rehberi

### 12.1 Winston Logger Konfigürasyonu
```javascript
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'BorsaVerileri2025',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // Application logs
    new DailyRotateFile({
      filename: 'logs/application/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '30d'
    }),
    
    // Error logs
    new DailyRotateFile({
      level: 'error',
      filename: 'logs/error/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '90d'
    })
  ]
});

module.exports = logger;
```

### 12.2 Express Middleware
```javascript
const morgan = require('morgan');
const logger = require('./logger');

// HTTP request logging
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      logger.info(message.trim(), { type: 'http_access' });
    }
  }
}));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### 12.3 Monitoring Setup
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.APP_VERSION
  };
  
  logger.info('Health check performed', healthStatus);
  res.json(healthStatus);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  // Prometheus formatında metrikler
  const metrics = generatePrometheusMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

Bu kapsamlı loglama sistemi dokümantasyonu, BorsaVerileri2025 projesi için tüm işlem hareketlerinin detaylı bir şekilde izlenmesini, hataların tespit edilmesini ve sistem performansının optimize edilmesini sağlayacaktır.