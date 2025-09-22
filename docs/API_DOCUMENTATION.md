# API Dokümantasyonu

## Genel Bakış

Bu dokümantasyon, Borsa Analizi uygulamasının API endpoint'lerini ve WebSocket bağlantılarını açıklar.

## WebSocket API

### Bağlantı

```javascript
const socket = io('http://localhost:3001');
```

### Events

#### Client → Server

##### `analyze-stock`
Hisse senedi analizi başlatır.

**Parametreler:**
- `stockCode` (string): Analiz edilecek hisse senedi kodu (örn: "THYAO")

**Örnek:**
```javascript
socket.emit('analyze-stock', 'THYAO');
```

##### `get-port-status`
Port durumu bilgilerini alır.

**Parametreler:** Yok

**Örnek:**
```javascript
socket.emit('get-port-status');
```

##### `start-port-monitoring`
Port izlemeyi başlatır.

**Parametreler:**
- `port` (number): İzlenecek port numarası

**Örnek:**
```javascript
socket.emit('start-port-monitoring', 3001);
```

##### `stop-port-monitoring`
Port izlemeyi durdurur.

**Parametreler:**
- `port` (number): İzleme durdurulacak port numarası

**Örnek:**
```javascript
socket.emit('stop-port-monitoring', 3001);
```

#### Server → Client

##### `analysis-result`
Hisse senedi analiz sonuçlarını döner.

**Veri Yapısı:**
```typescript
interface AnalysisResult {
  stockCode: string;
  price: {
    price: number;
    changePercent: number;
    volume: number;
    lastUpdated: string;
  };
  analysis: {
    stockCode: string;
    companyName: string;
    totalAssets: number;
    totalLiabilities: number;
    equity: number;
    currentAssets: number;
    shortTermLiabilities: number;
    netProfit: number;
    revenue: number;
    operatingProfit: number;
    lastUpdated: Date;
  };
}
```

##### `analysis-error`
Analiz hatası durumunda hata mesajı döner.

**Veri Yapısı:**
```typescript
string // Hata mesajı
```

##### `port-status`
Port durumu bilgilerini döner.

**Veri Yapısı:**
```typescript
interface PortStatus {
  port: number;
  status: 'active' | 'inactive';
  lastChecked: string;
  responseTime?: number;
}
```

##### `system-stats`
Sistem istatistiklerini döner.

**Veri Yapısı:**
```typescript
interface SystemStats {
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  uptime: number;
  timestamp: string;
}
```

##### `connection-status`
Bağlantı durumu değişikliklerini bildirir.

**Veri Yapısı:**
```typescript
interface ConnectionStatus {
  connected: boolean;
  timestamp: string;
  clientCount?: number;
}
```

## REST API Endpoints

### Hisse Senedi Endpoints

#### `GET /api/stocks/:stockCode`
Belirli bir hisse senedinin temel bilgilerini getirir.

**Parametreler:**
- `stockCode` (string): Hisse senedi kodu

**Yanıt:**
```json
{
  "stockCode": "THYAO",
  "companyName": "Türk Hava Yolları",
  "sector": "Ulaştırma",
  "marketCap": 15000000000,
  "lastPrice": 150.50
}
```

#### `GET /api/stocks/:stockCode/analysis`
Detaylı finansal analiz verilerini getirir.

**Parametreler:**
- `stockCode` (string): Hisse senedi kodu

**Yanıt:**
```json
{
  "stockCode": "THYAO",
  "financialRatios": {
    "pe": 12.5,
    "pb": 1.8,
    "roe": 15.2,
    "roa": 8.7,
    "currentRatio": 1.5,
    "quickRatio": 1.2,
    "debtToEquity": 0.8
  },
  "technicalIndicators": {
    "rsi": 65.4,
    "macd": {
      "macd": 2.1,
      "signal": 1.8,
      "histogram": 0.3
    },
    "bollingerBands": {
      "upper": 155.0,
      "middle": 150.0,
      "lower": 145.0
    }
  },
  "patterns": [
    {
      "type": "head_and_shoulders",
      "confidence": 0.85,
      "direction": "bearish"
    }
  ]
}
```

#### `GET /api/stocks/:stockCode/price-history`
Fiyat geçmişi verilerini getirir.

**Query Parametreleri:**
- `period` (string): Zaman aralığı ("1d", "1w", "1m", "3m", "6m", "1y")
- `interval` (string): Veri aralığı ("1m", "5m", "15m", "1h", "1d")

**Yanıt:**
```json
{
  "stockCode": "THYAO",
  "period": "1m",
  "interval": "1d",
  "data": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "open": 148.0,
      "high": 152.0,
      "low": 147.5,
      "close": 150.5,
      "volume": 1000000
    }
  ]
}
```

### Piyasa Endpoints

#### `GET /api/market/overview`
Piyasa genel durumunu getirir.

**Yanıt:**
```json
{
  "indices": {
    "bist100": {
      "value": 8500.0,
      "change": 85.0,
      "changePercent": 1.01
    },
    "bist30": {
      "value": 9200.0,
      "change": 92.0,
      "changePercent": 1.01
    }
  },
  "marketStats": {
    "totalVolume": 15000000000,
    "totalValue": 25000000000,
    "risingStocks": 245,
    "fallingStocks": 180,
    "unchangedStocks": 75
  }
}
```

#### `GET /api/market/top-movers`
En çok hareket eden hisseleri getirir.

**Query Parametreleri:**
- `type` (string): "gainers" | "losers" | "volume"
- `limit` (number): Sonuç sayısı (varsayılan: 10)

**Yanıt:**
```json
{
  "type": "gainers",
  "stocks": [
    {
      "stockCode": "THYAO",
      "companyName": "Türk Hava Yolları",
      "price": 150.5,
      "change": 7.5,
      "changePercent": 5.24,
      "volume": 1000000
    }
  ]
}
```

### Analiz Endpoints

#### `POST /api/analysis/pattern-recognition`
Grafik formasyonu tanıma analizi yapar.

**İstek Gövdesi:**
```json
{
  "stockCode": "THYAO",
  "period": "3m",
  "patterns": ["head_and_shoulders", "triangle", "flag"]
}
```

**Yanıt:**
```json
{
  "stockCode": "THYAO",
  "analysisDate": "2024-01-01T12:00:00Z",
  "patterns": [
    {
      "type": "ascending_triangle",
      "confidence": 0.78,
      "direction": "bullish",
      "targetPrice": 165.0,
      "stopLoss": 145.0,
      "timeframe": "2-4 weeks"
    }
  ]
}
```

#### `POST /api/analysis/ai-signals`
Yapay zeka tabanlı işlem sinyalleri üretir.

**İstek Gövdesi:**
```json
{
  "stockCode": "THYAO",
  "timeframe": "1d",
  "riskLevel": "medium"
}
```

**Yanıt:**
```json
{
  "stockCode": "THYAO",
  "signals": [
    {
      "type": "buy",
      "strength": 0.85,
      "price": 150.5,
      "targetPrice": 165.0,
      "stopLoss": 145.0,
      "reasoning": "Strong bullish momentum with volume confirmation",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "riskAssessment": {
    "level": "medium",
    "factors": ["market_volatility", "sector_performance"]
  }
}
```

## Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 400 | Geçersiz istek parametreleri |
| 401 | Yetkilendirme hatası |
| 404 | Hisse senedi bulunamadı |
| 429 | Çok fazla istek (rate limiting) |
| 500 | Sunucu hatası |
| 503 | Servis geçici olarak kullanılamıyor |

## Rate Limiting

- API istekleri dakikada 100 istek ile sınırlıdır
- WebSocket bağlantıları saniyede 10 mesaj ile sınırlıdır
- Aşım durumunda 429 hata kodu döner

## Kimlik Doğrulama

Şu anda API açık erişimlidir. Gelecek sürümlerde API key tabanlı kimlik doğrulama eklenecektir.

## Örnekler

### JavaScript/TypeScript

```javascript
// WebSocket bağlantısı
const socket = io('http://localhost:3001');

// Hisse analizi
socket.emit('analyze-stock', 'THYAO');
socket.on('analysis-result', (data) => {
  console.log('Analiz sonucu:', data);
});

// REST API kullanımı
const response = await fetch('/api/stocks/THYAO/analysis');
const analysis = await response.json();
console.log('Finansal analiz:', analysis);
```

### Python

```python
import socketio
import requests

# WebSocket
sio = socketio.Client()

@sio.on('analysis-result')
def on_analysis_result(data):
    print('Analiz sonucu:', data)

sio.connect('http://localhost:3001')
sio.emit('analyze-stock', 'THYAO')

# REST API
response = requests.get('http://localhost:3001/api/stocks/THYAO/analysis')
analysis = response.json()
print('Finansal analiz:', analysis)
```

## Sürüm Geçmişi

### v1.0.0
- İlk API sürümü
- Temel hisse analizi
- WebSocket desteği

### v1.1.0
- Pattern recognition eklendi
- AI sinyalleri eklendi
- Rate limiting eklendi

### v1.2.0 (Planlanan)
- API key kimlik doğrulaması
- Gerçek zamanlı fiyat akışı
- Portföy yönetimi endpoints