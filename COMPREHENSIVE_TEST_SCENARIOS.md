# 🧪 KAPSAMLI TEST SENARYOLARI

**Proje**: Borsa Verileri 2025  
**Test Kapsamı**: End-to-End Sistem Testleri  
**Tarih**: 26 Eylül 2025  

---

## 📋 TEST SENARYOLARI İNDEKSİ

1. [Frontend UI/UX Testleri](#1-frontend-uiux-testleri)
2. [Backend API Testleri](#2-backend-api-testleri)
3. [WebSocket Real-time Testleri](#3-websocket-real-time-testleri)
4. [Veritabanı & Cache Testleri](#4-veritabanı--cache-testleri)
5. [Güvenlik Testleri](#5-güvenlik-testleri)
6. [Performans Testleri](#6-performans-testleri)
7. [Entegrasyon Testleri](#7-entegrasyon-testleri)
8. [Hata Yönetimi Testleri](#8-hata-yönetimi-testleri)
9. [Mobil Uyumluluk Testleri](#9-mobil-uyumluluk-testleri)
10. [Yük Testleri](#10-yük-testleri)

---

## 1. FRONTEND UI/UX TESTLERİ

### 1.1 Ana Sayfa Yükleme Testi
**Amaç**: Ana sayfanın doğru şekilde yüklendiğini doğrulamak

**Ön Koşullar**:
- Frontend server çalışır durumda (localhost:5173)
- Tarayıcı açık ve internet bağlantısı var

**Test Adımları**:
1. Tarayıcıda `http://localhost:5173` adresine git
2. Sayfa yükleme süresini ölç
3. Sayfa içeriğinin tamamen yüklendiğini kontrol et
4. Console hatalarını kontrol et

**Beklenen Sonuçlar**:
- ✅ Sayfa 3 saniye içinde yüklenir
- ✅ Tüm UI bileşenleri görünür
- ✅ Console'da kritik hata yok
- ✅ HTTP status 200

**Test Verileri**: Yok

---

### 1.2 Hisse Senedi Arama Testi
**Amaç**: Hisse senedi arama fonksiyonunun çalıştığını doğrulamak

**Ön Koşullar**:
- Ana sayfa yüklenmiş
- Arama kutusu görünür

**Test Adımları**:
1. Arama kutusuna "AKBNK" yaz
2. Enter tuşuna bas veya arama butonuna tıkla
3. Sonuçların görüntülendiğini kontrol et
4. Sonuç kartına tıkla
5. Detay sayfasının açıldığını kontrol et

**Beklenen Sonuçlar**:
- ✅ Arama sonuçları 2 saniye içinde görünür
- ✅ AKBNK hissesi sonuçlarda yer alır
- ✅ Detay sayfası doğru bilgileri gösterir
- ✅ Geri dönüş butonu çalışır

**Test Verileri**:
```
Arama Terimi: "AKBNK"
Beklenen Sonuç: Akbank T.A.Ş.
Hisse Kodu: AKBNK
```

---

### 1.3 Watchlist Ekleme/Çıkarma Testi
**Amaç**: Kullanıcının hisse senetlerini watchlist'e ekleyip çıkarabildiğini doğrulamak

**Ön Koşullar**:
- Kullanıcı giriş yapmış
- Hisse senedi detay sayfasında

**Test Adımları**:
1. "Watchlist'e Ekle" butonuna tıkla
2. Başarı mesajının görüntülendiğini kontrol et
3. Watchlist sayfasına git
4. Eklenen hissenin listede olduğunu kontrol et
5. "Watchlist'ten Çıkar" butonuna tıkla
6. Hissenin listeden kaldırıldığını kontrol et

**Beklenen Sonuçlar**:
- ✅ Ekleme işlemi başarılı mesajı görünür
- ✅ Hisse watchlist'te görünür
- ✅ Çıkarma işlemi başarılı
- ✅ UI durumu güncellenir

**Test Verileri**:
```
Test Hissesi: GARAN
Kullanıcı ID: test_user_001
```

---

## 2. BACKEND API TESTLERİ

### 2.1 Popüler Hisseler API Testi
**Amaç**: Popüler hisseler endpoint'inin doğru çalıştığını doğrulamak

**Ön Koşullar**:
- Backend server çalışır durumda (localhost:3001)
- Redis cache aktif

**Test Adımları**:
1. `GET /api/bulk/popular` endpoint'ine istek gönder
2. Response status code'unu kontrol et
3. Response body formatını kontrol et
4. Response süresini ölç
5. Veri yapısını doğrula

**Beklenen Sonuçlar**:
- ✅ HTTP Status: 200
- ✅ Response süresi < 1000ms
- ✅ JSON formatında response
- ✅ success: true
- ✅ data objesi mevcut

**Test Verileri**:
```bash
curl -X GET "http://localhost:3001/api/bulk/popular" \
  -H "Content-Type: application/json"
```

---

### 2.2 Tekil Hisse Verisi API Testi
**Amaç**: Belirli bir hisse senedinin verilerini getiren endpoint'i test etmek

**Ön Koşullar**:
- Backend server aktif
- Geçerli hisse senedi kodu

**Test Adımları**:
1. `GET /api/stocks/data/AKBNK` endpoint'ine istek gönder
2. Response formatını kontrol et
3. Hisse senedi bilgilerini doğrula
4. Fiyat verilerinin mevcut olduğunu kontrol et
5. Timestamp'in güncel olduğunu kontrol et

**Beklenen Sonuçlar**:
- ✅ HTTP Status: 200
- ✅ Hisse kodu: AKBNK
- ✅ Fiyat verileri mevcut
- ✅ Timestamp son 24 saat içinde

**Test Verileri**:
```
Hisse Kodu: AKBNK
Beklenen Alanlar: symbol, price, change, volume, timestamp
```

---

### 2.3 Batch Hisse Verisi API Testi
**Amaç**: Çoklu hisse senedi verilerini getiren endpoint'i test etmek

**Ön Koşullar**:
- Backend server aktif
- Geçerli hisse senedi kodları listesi

**Test Adımları**:
1. `POST /api/stocks/data/batch` endpoint'ine istek gönder
2. Request body'de hisse kodları listesi gönder
3. Response'da tüm hisselerin verilerini kontrol et
4. Hatalı kodlar için error handling'i kontrol et
5. Response süresini ölç

**Beklenen Sonuçlar**:
- ✅ HTTP Status: 200
- ✅ Tüm geçerli hisseler için veri
- ✅ Geçersiz kodlar için error mesajı
- ✅ Response süresi < 2000ms

**Test Verileri**:
```json
{
  "symbols": ["AKBNK", "GARAN", "INVALID_CODE", "ISCTR"]
}
```

---

## 3. WEBSOCKET REAL-TIME TESTLERİ

### 3.1 WebSocket Bağlantı Testi
**Amaç**: WebSocket bağlantısının başarıyla kurulduğunu doğrulamak

**Ön Koşullar**:
- WebSocket server aktif (localhost:3001)
- Socket.io client kütüphanesi yüklü

**Test Adımları**:
1. WebSocket bağlantısı kur
2. Connection event'ini dinle
3. Bağlantı durumunu kontrol et
4. Ping/Pong mesajlarını test et
5. Bağlantıyı kapat ve reconnection'ı test et

**Beklenen Sonuçlar**:
- ✅ Bağlantı 3 saniye içinde kurulur
- ✅ Connection event tetiklenir
- ✅ Ping/Pong çalışır
- ✅ Reconnection başarılı

**Test Verileri**:
```javascript
const socket = io('http://localhost:3001');
socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

---

### 3.2 Real-time Veri Akışı Testi
**Amaç**: Gerçek zamanlı hisse senedi verilerinin doğru şekilde aktığını doğrulamak

**Ön Koşullar**:
- WebSocket bağlantısı kurulmuş
- Polling service aktif

**Test Adımları**:
1. 'stockUpdate' event'ini dinle
2. 30 saniye bekle (BIST100 polling interval)
3. Gelen verilerin formatını kontrol et
4. Veri güncellik kontrolü yap
5. Multiple updates'i test et

**Beklenen Sonuçlar**:
- ✅ 30 saniyede bir veri gelir
- ✅ Veri formatı doğru
- ✅ Timestamp güncel
- ✅ Tüm gerekli alanlar mevcut

**Test Verileri**:
```javascript
socket.on('stockUpdate', (data) => {
  // Beklenen format:
  // { symbol, price, change, volume, timestamp }
});
```

---

### 3.3 Watchlist Real-time Güncelleme Testi
**Amaç**: Watchlist'teki hisselerin gerçek zamanlı güncellendiğini doğrulamak

**Ön Koşullar**:
- Kullanıcı giriş yapmış
- Watchlist'te hisseler mevcut
- WebSocket bağlantısı aktif

**Test Adımları**:
1. Watchlist sayfasını aç
2. 'watchlistUpdate' event'ini dinle
3. Watchlist'teki hisselerin güncellendiğini kontrol et
4. UI'ın gerçek zamanlı güncellendiğini doğrula
5. Yeni hisse ekleme/çıkarma durumunu test et

**Beklenen Sonuçlar**:
- ✅ Watchlist 20 saniyede bir güncellenir
- ✅ UI otomatik güncellenir
- ✅ Ekleme/çıkarma anında yansır
- ✅ Veri tutarlılığı korunur

**Test Verileri**:
```
Test Watchlist: ["AKBNK", "GARAN", "ISCTR"]
Kullanıcı: test_user_001
```

---

## 4. VERİTABANI & CACHE TESTLERİ

### 4.1 Redis Cache Performans Testi
**Amaç**: Redis cache'in performansını ve veri tutarlılığını test etmek

**Ön Koşullar**:
- Redis server aktif (localhost:6379)
- Cache service çalışır durumda

**Test Adımları**:
1. Cache'e veri yaz
2. Yazma süresini ölç
3. Veriyi oku
4. Okuma süresini ölç
5. TTL (Time To Live) kontrolü yap
6. Cache invalidation test et

**Beklenen Sonuçlar**:
- ✅ Yazma süresi < 5ms
- ✅ Okuma süresi < 2ms
- ✅ TTL doğru çalışır
- ✅ Invalidation başarılı

**Test Verileri**:
```javascript
const testData = {
  key: 'test_stock_AKBNK',
  value: { symbol: 'AKBNK', price: 45.50, timestamp: Date.now() },
  ttl: 300 // 5 dakika
};
```

---

### 4.2 Veri Tutarlılığı Testi
**Amaç**: Cache ve API arasındaki veri tutarlılığını doğrulamak

**Ön Koşullar**:
- Redis cache aktif
- API endpoints çalışır durumda

**Test Adımları**:
1. API'den fresh veri çek
2. Cache'e kaydet
3. Cache'den oku
4. Verilerin aynı olduğunu doğrula
5. Cache expire olduktan sonra API'den tekrar çek
6. Veri güncelliğini kontrol et

**Beklenen Sonuçlar**:
- ✅ Cache ve API verileri aynı
- ✅ Expire sonrası fresh veri
- ✅ Veri bütünlüğü korunur
- ✅ Timestamp tutarlılığı

**Test Verileri**:
```
Test Hissesi: GARAN
Cache TTL: 60 saniye
API Endpoint: /api/stocks/data/GARAN
```

---

## 5. GÜVENLİK TESTLERİ

### 5.1 API Rate Limiting Testi
**Amaç**: API rate limiting'in doğru çalıştığını doğrulamak

**Ön Koşullar**:
- Backend server aktif
- Rate limiting middleware aktif

**Test Adımları**:
1. API endpoint'ine normal hızda istek gönder
2. Rate limit'i aşacak şekilde hızlı istekler gönder
3. 429 (Too Many Requests) response'unu kontrol et
4. Rate limit reset süresini bekle
5. Normal isteklerin tekrar çalıştığını doğrula

**Beklenen Sonuçlar**:
- ✅ Normal istekler başarılı
- ✅ Limit aşımında 429 status
- ✅ Rate limit reset çalışır
- ✅ Error mesajı açıklayıcı

**Test Verileri**:
```
Rate Limit: 100 istek/dakika
Test Endpoint: /api/stocks/data/AKBNK
Test İstek Sayısı: 150 istek
```

---

### 5.2 Input Validation Testi
**Amaç**: API input validation'ının güvenlik açıklarını önlediğini doğrulamak

**Ön Koşullar**:
- Backend server aktif
- Validation middleware aktif

**Test Adımları**:
1. Geçerli input ile normal istek gönder
2. SQL injection denemesi yap
3. XSS payload gönder
4. Geçersiz JSON formatı gönder
5. Çok uzun string değerleri test et
6. Null/undefined değerleri test et

**Beklenen Sonuçlar**:
- ✅ Geçerli input kabul edilir
- ✅ SQL injection bloklanır
- ✅ XSS payload temizlenir
- ✅ Geçersiz format reddedilir
- ✅ Uygun error mesajları

**Test Verileri**:
```
SQL Injection: "'; DROP TABLE stocks; --"
XSS Payload: "<script>alert('xss')</script>"
Uzun String: "A" * 10000
```

---

## 6. PERFORMANS TESTLERİ

### 6.1 API Response Time Testi
**Amaç**: API endpoint'lerinin response sürelerini ölçmek

**Ön Koşullar**:
- Backend server aktif
- Test verileri hazır

**Test Adımları**:
1. Her endpoint için 10 istek gönder
2. Response sürelerini kaydet
3. Ortalama, minimum, maksimum süreleri hesapla
4. 95th percentile değerini hesapla
5. Hedef sürelerle karşılaştır

**Beklenen Sonuçlar**:
- ✅ Ortalama response < 500ms
- ✅ 95th percentile < 1000ms
- ✅ Maksimum response < 2000ms
- ✅ Tutarlı performans

**Test Verileri**:
```
Test Endpoints:
- /api/bulk/popular
- /api/stocks/data/AKBNK
- /api/stocks/data/batch
İstek Sayısı: 10 per endpoint
```

---

### 6.2 Frontend Loading Performance Testi
**Amaç**: Frontend sayfalarının yükleme performansını ölçmek

**Ön Koşullar**:
- Frontend server aktif
- Lighthouse CLI yüklü

**Test Adımları**:
1. Ana sayfa için Lighthouse audit çalıştır
2. Performance skorunu kaydet
3. Core Web Vitals metriklerini ölç
4. Bundle size'ı kontrol et
5. Optimizasyon önerilerini kaydet

**Beklenen Sonuçlar**:
- ✅ Performance skoru > 90
- ✅ FCP < 1.8s
- ✅ LCP < 2.5s
- ✅ CLS < 0.1

**Test Verileri**:
```bash
lighthouse http://localhost:5173 \
  --only-categories=performance \
  --output=json
```

---

## 7. ENTEGRASYON TESTLERİ

### 7.1 Frontend-Backend Entegrasyon Testi
**Amaç**: Frontend ve backend arasındaki veri akışını test etmek

**Ön Koşullar**:
- Frontend ve backend serverlar aktif
- CORS konfigürasyonu doğru

**Test Adımları**:
1. Frontend'den API çağrısı yap
2. CORS headers'ını kontrol et
3. Response data'sının UI'da doğru gösterildiğini kontrol et
4. Error handling'i test et
5. Loading states'leri kontrol et

**Beklenen Sonuçlar**:
- ✅ API çağrısı başarılı
- ✅ CORS headers doğru
- ✅ UI doğru güncellenir
- ✅ Error handling çalışır

**Test Verileri**:
```
Test Senaryosu: Hisse arama
Frontend: http://localhost:5173
Backend: http://localhost:3001
```

---

### 7.2 WebSocket-Cache Entegrasyon Testi
**Amaç**: WebSocket ve cache sisteminin entegrasyonunu test etmek

**Ön Koşullar**:
- WebSocket server aktif
- Redis cache aktif
- Polling service çalışır durumda

**Test Adımları**:
1. WebSocket bağlantısı kur
2. Cache'e veri yaz
3. Polling service'in cache'i güncellemesini bekle
4. WebSocket üzerinden güncelleme geldiğini kontrol et
5. Cache invalidation'ın WebSocket'e yansıdığını test et

**Beklenen Sonuçlar**:
- ✅ Cache güncellemeleri WebSocket'e yansır
- ✅ Veri tutarlılığı korunur
- ✅ Real-time sync çalışır
- ✅ Performance etkilenmez

**Test Verileri**:
```
Test Cache Key: bist100_data
WebSocket Event: stockUpdate
Polling Interval: 30s
```

---

## 8. HATA YÖNETİMİ TESTLERİ

### 8.1 API Error Handling Testi
**Amaç**: API'nin hataları doğru şekilde yönettiğini doğrulamak

**Ön Koşullar**:
- Backend server aktif
- Error handling middleware aktif

**Test Adımları**:
1. Geçersiz endpoint'e istek gönder (404)
2. Geçersiz method kullan (405)
3. Malformed JSON gönder (400)
4. Server error simüle et (500)
5. Timeout durumu test et

**Beklenen Sonuçlar**:
- ✅ Doğru HTTP status kodları
- ✅ Açıklayıcı error mesajları
- ✅ JSON formatında error response
- ✅ Error logging çalışır

**Test Verileri**:
```
404 Test: /api/nonexistent
405 Test: POST /api/stocks/data/AKBNK
400 Test: {invalid json}
500 Test: Simulated server error
```

---

### 8.2 Frontend Error Boundary Testi
**Amaç**: Frontend'in JavaScript hatalarını doğru yönettiğini doğrulamak

**Ön Koşullar**:
- Frontend server aktif
- Error boundary components aktif

**Test Adımları**:
1. Component'te JavaScript hatası oluştur
2. Error boundary'nin devreye girdiğini kontrol et
3. Fallback UI'ın gösterildiğini doğrula
4. Error reporting'in çalıştığını kontrol et
5. Recovery mechanism'i test et

**Beklenen Sonuçlar**:
- ✅ Error boundary devreye girer
- ✅ Fallback UI gösterilir
- ✅ Error log'lanır
- ✅ Uygulama crash olmaz

**Test Verileri**:
```javascript
// Simulated error
throw new Error('Test error for error boundary');
```

---

## 9. MOBİL UYUMLULUK TESTLERİ

### 9.1 Responsive Design Testi
**Amaç**: Uygulamanın farklı ekran boyutlarında doğru çalıştığını doğrulamak

**Ön Koşullar**:
- Frontend server aktif
- Farklı cihaz simülatörleri

**Test Adımları**:
1. Desktop görünümü test et (1920x1080)
2. Tablet görünümü test et (768x1024)
3. Mobile görünümü test et (375x667)
4. UI elementlerinin responsive olduğunu kontrol et
5. Touch interactions'ı test et

**Beklenen Sonuçlar**:
- ✅ Tüm ekran boyutlarında düzgün görünüm
- ✅ UI elementleri erişilebilir
- ✅ Touch interactions çalışır
- ✅ Performance etkilenmez

**Test Verileri**:
```
Test Cihazları:
- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667
```

---

### 9.2 Mobile Performance Testi
**Amaç**: Mobil cihazlarda performansı test etmek

**Ön Koşullar**:
- Mobile device emulator
- Network throttling aktif

**Test Adımları**:
1. 3G network simüle et
2. Sayfa yükleme sürelerini ölç
3. JavaScript execution time'ı kontrol et
4. Memory usage'ı izle
5. Battery impact'i değerlendir

**Beklenen Sonuçlar**:
- ✅ 3G'de sayfa < 5s yüklenir
- ✅ JavaScript execution smooth
- ✅ Memory usage < 50MB
- ✅ Battery impact minimal

**Test Verileri**:
```
Network: 3G (1.6 Mbps down, 750 Kbps up)
Device: iPhone 12 Pro simulation
Test Duration: 5 dakika
```

---

## 10. YÜK TESTLERİ

### 10.1 API Load Testing
**Amaç**: API'nin yüksek yük altındaki performansını test etmek

**Ön Koşullar**:
- Backend server aktif
- Load testing tool (Artillery/k6)

**Test Adımları**:
1. 10 concurrent user ile başla
2. Kademeli olarak 100 user'a çıkar
3. Response time'ları izle
4. Error rate'i kontrol et
5. Server resource usage'ı monitör et

**Beklenen Sonuçlar**:
- ✅ 100 concurrent user destekler
- ✅ Response time < 2s (95th percentile)
- ✅ Error rate < 1%
- ✅ Server stable kalır

**Test Verileri**:
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100
```

---

### 10.2 WebSocket Concurrent Connection Testi
**Amaç**: WebSocket'in çoklu bağlantıları yönetebilme kapasitesini test etmek

**Ön Koşullar**:
- WebSocket server aktif
- Connection testing script

**Test Adımları**:
1. 50 eşzamanlı WebSocket bağlantısı kur
2. Her bağlantıdan veri gönder/al
3. Bağlantı stabilitesini kontrol et
4. Memory leak kontrolü yap
5. Kademeli olarak 200 bağlantıya çıkar

**Beklenen Sonuçlar**:
- ✅ 200 concurrent connection destekler
- ✅ Tüm bağlantılar stable
- ✅ Memory leak yok
- ✅ Real-time data flow devam eder

**Test Verileri**:
```javascript
const connections = [];
for(let i = 0; i < 200; i++) {
  connections.push(io('http://localhost:3001'));
}
```

---

## 📊 TEST RAPORU ŞABLONu

### Test Execution Summary
```
Test Tarihi: [DATE]
Test Süresi: [DURATION]
Toplam Test Sayısı: [TOTAL]
Başarılı: [PASSED]
Başarısız: [FAILED]
Atlanan: [SKIPPED]
Başarı Oranı: [SUCCESS_RATE]%
```

### Kritik Bulgular
```
🔴 Kritik Hatalar: [COUNT]
🟡 Uyarılar: [COUNT]
🟢 Başarılı: [COUNT]
```

### Performans Metrikleri
```
Ortalama Response Time: [AVG_TIME]ms
95th Percentile: [P95_TIME]ms
Throughput: [REQUESTS_PER_SEC] req/s
Error Rate: [ERROR_RATE]%
```

### Öneriler
```
1. [RECOMMENDATION_1]
2. [RECOMMENDATION_2]
3. [RECOMMENDATION_3]
```

---

## 🔧 TEST OTOMASYON KOMUTLARI

### Tüm Testleri Çalıştır
```bash
# E2E Tests
npm run test:e2e

# Unit Tests
npm run test:unit

# API Tests
npm run test:api

# Performance Tests
npm run test:performance
```

### Spesifik Test Kategorileri
```bash
# Frontend Tests
npx playwright test --grep "frontend"

# Backend Tests
npx playwright test --grep "api"

# WebSocket Tests
npx playwright test --grep "websocket"

# Mobile Tests
npx playwright test --project="Mobile Chrome"
```

### Test Raporları
```bash
# HTML Report
npx playwright show-report

# JSON Report
npx playwright test --reporter=json

# JUnit Report
npx playwright test --reporter=junit
```

---

**Son Güncelleme**: 26 Eylül 2025  
**Versiyon**: 1.0  
**Hazırlayan**: SOLO Coding AI Assistant