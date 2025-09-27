# Kapsamlı Test Senaryoları Dokümantasyonu

## Test Altyapısı Özeti

### Kullanılan Test Framework'leri
- **Frontend Unit Tests**: Vitest + React Testing Library
- **Backend Unit Tests**: Jest + Supertest
- **E2E Tests**: Playwright
- **Coverage**: V8 (Frontend), Jest (Backend)

---

## 1. FRONTEND BİLEŞENLERİ TEST SENARYOLARI

### 1.1 Ana Sayfa (Home) Test Senaryoları

#### Test Senaryo Başlığı: "Ana sayfa yükleme ve hisse senedi listesi görüntüleme"
**Amaç**: Ana sayfanın doğru yüklendiğini ve hisse senedi listesinin görüntülendiğini doğrulamak

**Ön Koşullar**:
- Uygulama çalışır durumda
- Backend API erişilebilir
- Test veritabanında en az 5 hisse senedi verisi mevcut

**Test Adımları**:
1. Ana sayfaya git (http://localhost:5173)
2. Sayfa yüklenmesini bekle
3. Hisse senedi listesinin görüntülendiğini kontrol et
4. En az 5 hisse senedi kartının görüntülendiğini doğrula
5. Her kartın fiyat, değişim yüzdesi ve sembol bilgilerini içerdiğini kontrol et

**Beklenen Sonuçlar**:
- Sayfa 3 saniye içinde yüklenir
- Hisse senedi listesi görüntülenir
- Her kart gerekli bilgileri içerir
- Loading spinner doğru çalışır

---

### 1.2 Hisse Senedi Detay Sayfası Test Senaryoları

#### Test Senaryo Başlığı: "Hisse senedi detay sayfası veri görüntüleme"
**Amaç**: Seçilen hisse senedinin detay bilgilerinin doğru görüntülendiğini doğrulamak

**Ön Koşullar**:
- ASELS hisse senedi verisi mevcut
- API endpoint'i çalışır durumda

**Test Adımları**:
1. Ana sayfadan ASELS hisse senedine tıkla
2. Detay sayfasının yüklenmesini bekle
3. Hisse senedi adının doğru görüntülendiğini kontrol et
4. Güncel fiyatın görüntülendiğini doğrula
5. Grafik bileşeninin yüklendiğini kontrol et
6. Değişim yüzdesinin doğru renkte görüntülendiğini doğrula

**Beklenen Sonuçlar**:
- Detay sayfası 2 saniye içinde yüklenir
- Tüm veri alanları dolu görüntülenir
- Grafik doğru çalışır
- Pozitif değişim yeşil, negatif kırmızı renkte görüntülenir

---

### 1.3 Arama Fonksiyonu Test Senaryoları

#### Test Senaryo Başlığı: "Hisse senedi arama ve filtreleme"
**Amaç**: Arama fonksiyonunun doğru çalıştığını ve sonuçları filtrelediğini doğrulamak

**Ön Koşullar**:
- Arama bileşeni aktif
- En az 10 farklı hisse senedi verisi mevcut

**Test Adımları**:
1. Ana sayfada arama kutusuna "ASELS" yaz
2. Arama sonuçlarının filtrelendiğini kontrol et
3. Sadece ASELS ile ilgili sonuçların görüntülendiğini doğrula
4. Arama kutusunu temizle
5. Tüm hisse senetlerinin tekrar görüntülendiğini kontrol et

**Beklenen Sonuçlar**:
- Arama anında filtreleme yapar
- İlgili sonuçlar görüntülenir
- Temizleme işlemi doğru çalışır

---

## 2. BACKEND API TEST SENARYOLARI

### 2.1 Hisse Senedi Veri API Test Senaryoları

#### Test Senaryo Başlığı: "GET /api/stocks/data/{symbol} endpoint testi"
**Amaç**: Hisse senedi veri API'sinin doğru çalıştığını doğrulamak

**Ön Koşullar**:
- Backend server çalışır durumda
- Test veritabanında ASELS verisi mevcut

**Test Adımları**:
1. GET /api/stocks/data/ASELS isteği gönder
2. HTTP 200 status kodu döndüğünü kontrol et
3. Response body'nin JSON formatında olduğunu doğrula
4. Gerekli alanların (symbol, price, change, volume) mevcut olduğunu kontrol et
5. Fiyat değerinin sayısal olduğunu doğrula

**Beklenen Sonuçlar**:
- HTTP 200 status kodu
- Geçerli JSON response
- Tüm gerekli alanlar mevcut
- Veri tipleri doğru

---

### 2.2 Toplu Veri API Test Senaryoları

#### Test Senaryo Başlığı: "GET /api/stocks/bulk endpoint testi"
**Amaç**: Toplu hisse senedi verisi API'sinin performansını ve doğruluğunu test etmek

**Ön Koşullar**:
- Backend server çalışır durumda
- En az 50 hisse senedi verisi mevcut

**Test Adımları**:
1. GET /api/stocks/bulk isteği gönder
2. Response süresinin 5 saniyeden az olduğunu kontrol et
3. Dönen veri sayısının beklenen aralıkta olduğunu doğrula
4. Her hisse senedi objesinin gerekli alanları içerdiğini kontrol et
5. Pagination parametrelerinin çalıştığını test et

**Beklenen Sonuçlar**:
- Response süresi < 5 saniye
- Doğru veri sayısı
- Pagination çalışır
- Veri bütünlüğü korunur

---

### 2.3 Hata Durumları Test Senaryoları

#### Test Senaryo Başlığı: "Geçersiz hisse senedi sembolü hata testi"
**Amaç**: API'nin geçersiz girişlere doğru hata yanıtları verdiğini doğrulamak

**Ön Koşullar**:
- Backend server çalışır durumda

**Test Adımları**:
1. GET /api/stocks/data/INVALID_SYMBOL isteği gönder
2. HTTP 404 status kodu döndüğünü kontrol et
3. Hata mesajının anlamlı olduğunu doğrula
4. Response formatının tutarlı olduğunu kontrol et

**Beklenen Sonuçlar**:
- HTTP 404 status kodu
- Anlamlı hata mesajı
- Tutarlı response formatı

---

## 3. WEBSOCKET GERÇEK ZAMANLI VERİ TEST SENARYOLARI

### 3.1 WebSocket Bağlantı Test Senaryoları

#### Test Senaryo Başlığı: "WebSocket bağlantı kurma ve veri alma"
**Amaç**: WebSocket bağlantısının doğru kurulduğunu ve veri akışının çalıştığını doğrulamak

**Ön Koşullar**:
- Socket server çalışır durumda (port 9876)
- Frontend WebSocket client aktif

**Test Adımları**:
1. WebSocket bağlantısı kur (ws://localhost:9876)
2. Bağlantının başarılı olduğunu kontrol et
3. 'stockUpdate' event'ini dinle
4. 10 saniye içinde en az 1 veri güncellemesi geldiğini doğrula
5. Gelen verinin doğru formatda olduğunu kontrol et
6. Bağlantıyı kapat ve temizlik işlemlerini doğrula

**Beklenen Sonuçlar**:
- Bağlantı başarılı
- Düzenli veri akışı
- Doğru veri formatı
- Temiz bağlantı kapatma

---

### 3.2 Gerçek Zamanlı Fiyat Güncelleme Test Senaryoları

#### Test Senaryo Başlığı: "Gerçek zamanlı fiyat güncellemelerinin frontend'e yansıması"
**Amaç**: WebSocket üzerinden gelen fiyat güncellemelerinin UI'da doğru görüntülendiğini doğrulamak

**Ön Koşullar**:
- WebSocket bağlantısı aktif
- ASELS detay sayfası açık

**Test Adımları**:
1. ASELS detay sayfasını aç
2. Mevcut fiyatı kaydet
3. WebSocket üzerinden fiyat güncellemesi gönder
4. UI'daki fiyatın güncellendiğini kontrol et
5. Değişim animasyonunun çalıştığını doğrula
6. Değişim yüzdesinin doğru hesaplandığını kontrol et

**Beklenen Sonuçlar**:
- Fiyat anında güncellenir
- Animasyon çalışır
- Hesaplamalar doğru

---

## 4. SCRAPER VERİ ÇEKME TEST SENARYOLARI

### 4.1 İş Yatırım Scraper Test Senaryoları

#### Test Senaryo Başlığı: "İş Yatırım sitesinden ASELS verisi çekme"
**Amaç**: Scraper'ın İş Yatırım sitesinden doğru veri çektiğini doğrulamak

**Ön Koşullar**:
- İnternet bağlantısı mevcut
- İş Yatırım sitesi erişilebilir
- Puppeteer browser instance çalışır

**Test Adımları**:
1. Scraper'ı ASELS için çalıştır
2. İş Yatırım sayfasına gidildiğini kontrol et
3. Fiyat verisinin çekildiğini doğrula
4. Çekilen verinin sayısal olduğunu kontrol et
5. Veri validasyon kurallarının çalıştığını test et
6. Hata durumlarında retry mekanizmasının çalıştığını doğrula

**Beklenen Sonuçlar**:
- Veri başarıyla çekilir
- Validasyon kuralları çalışır
- Retry mekanizması aktif
- Hata durumları yönetilir

---

### 4.2 Veri Doğrulama Test Senaryoları

#### Test Senaryo Başlığı: "Çekilen veri doğrulama ve temizleme"
**Amaç**: Scraper'ın çektiği verinin doğrulandığını ve temizlendiğini kontrol etmek

**Ön Koşullar**:
- Scraper çalışır durumda
- Test veri setleri hazır

**Test Adımları**:
1. Geçerli fiyat verisi ile scraper'ı test et
2. Geçersiz fiyat verisi (string, null) ile test et
3. Aşırı yüksek/düşük fiyat değerleri ile test et
4. Veri temizleme fonksiyonlarının çalıştığını doğrula
5. Hata loglarının doğru oluşturulduğunu kontrol et

**Beklenen Sonuçlar**:
- Geçerli veri kabul edilir
- Geçersiz veri reddedilir
- Temizleme işlemleri çalışır
- Loglar doğru oluşturulur

---

## 5. VERİTABANI VE ENTEGRASYON TEST SENARYOLARI

### 5.1 Veri Saklama Test Senaryoları

#### Test Senaryo Başlığı: "Hisse senedi verilerinin veritabanına kaydedilmesi"
**Amaç**: Çekilen verilerin doğru şekilde veritabanına kaydedildiğini doğrulamak

**Ön Koşullar**:
- Test veritabanı bağlantısı aktif
- Temiz test ortamı

**Test Adımları**:
1. Yeni hisse senedi verisi oluştur
2. Veritabanına kaydetme işlemini çalıştır
3. Verinin doğru tabloya kaydedildiğini kontrol et
4. Tüm alanların doğru değerlerle dolu olduğunu doğrula
5. Timestamp alanlarının doğru set edildiğini kontrol et
6. Duplicate veri kontrolünün çalıştığını test et

**Beklenen Sonuçlar**:
- Veri başarıyla kaydedilir
- Tüm alanlar doğru
- Timestamp'ler doğru
- Duplicate kontrol çalışır

---

### 5.2 Cache Mekanizması Test Senaryoları

#### Test Senaryo Başlığı: "Redis cache performans ve doğruluk testi"
**Amaç**: Cache mekanizmasının performansını ve doğruluğunu test etmek

**Ön Koşullar**:
- Redis server çalışır durumda
- Cache service aktif

**Test Adımları**:
1. Cache'e veri kaydet
2. Aynı veriyi cache'den oku
3. Okuma süresinin 100ms'den az olduğunu kontrol et
4. Cache expiration'ın çalıştığını test et
5. Cache invalidation işlemlerini doğrula
6. Memory usage'ın kontrol altında olduğunu test et

**Beklenen Sonuçlar**:
- Hızlı okuma/yazma
- Expiration çalışır
- Memory kontrollü
- Invalidation doğru

---

## 6. END-TO-END KULLANICI SENARYOLARI

### 6.1 Tam Kullanıcı Akışı Test Senaryoları

#### Test Senaryo Başlığı: "Kullanıcının hisse senedi takip etme akışı"
**Amaç**: Kullanıcının baştan sona hisse senedi takip etme deneyimini test etmek

**Ön Koşullar**:
- Tüm servisler çalışır durumda
- Test verileri hazır

**Test Adımları**:
1. Ana sayfayı aç
2. Hisse senedi listesinin yüklendiğini kontrol et
3. ASELS hisse senedini ara
4. Arama sonuçlarından ASELS'i seç
5. Detay sayfasının açıldığını doğrula
6. Gerçek zamanlı güncellemeleri gözlemle
7. Geri butonuyla ana sayfaya dön
8. Farklı bir hisse senedi seç
9. Tüm işlemlerin sorunsuz çalıştığını doğrula

**Beklenen Sonuçlar**:
- Akış kesintisiz çalışır
- Tüm sayfalar doğru yüklenir
- Gerçek zamanlı güncellemeler aktif
- Navigasyon sorunsuz

---

## 7. PERFORMANS VE YÜK TESTİ SENARYOLARI

### 7.1 API Performans Test Senaryoları

#### Test Senaryo Başlığı: "API endpoint'lerinin yük altında performansı"
**Amaç**: API'lerin yüksek trafikte performansını test etmek

**Ön Koşullar**:
- Load testing tool (Artillery/K6) kurulu
- Backend server çalışır durumda

**Test Adımları**:
1. 100 eşzamanlı kullanıcı simüle et
2. /api/stocks/bulk endpoint'ine 1000 istek gönder
3. Response sürelerini ölç
4. Hata oranlarını kaydet
5. Memory ve CPU kullanımını monitör et
6. Rate limiting'in çalıştığını doğrula

**Beklenen Sonuçlar**:
- Ortalama response süresi < 2 saniye
- Hata oranı < %1
- Memory kullanımı kontrollü
- Rate limiting aktif

---

### 7.2 Frontend Performans Test Senaryoları

#### Test Senaryo Başlığı: "Frontend uygulamasının performans metrikleri"
**Amaç**: Frontend'in performans metriklerini ölçmek

**Ön Koşullar**:
- Lighthouse kurulu
- Production build hazır

**Test Adımları**:
1. Production build oluştur
2. Lighthouse audit çalıştır
3. Performance score'unu kontrol et
4. First Contentful Paint süresini ölç
5. Largest Contentful Paint süresini ölç
6. Cumulative Layout Shift'i kontrol et

**Beklenen Sonuçlar**:
- Performance score > 90
- FCP < 2 saniye
- LCP < 3 saniye
- CLS < 0.1

---

## 8. HATA DURUMLARI VE EDGE CASE TEST SENARYOLARI

### 8.1 Ağ Bağlantısı Hata Test Senaryoları

#### Test Senaryo Başlığı: "İnternet bağlantısı kesilme durumu testi"
**Amaç**: Ağ bağlantısı sorunlarında uygulamanın davranışını test etmek

**Ön Koşullar**:
- Network throttling tool mevcut
- Uygulama çalışır durumda

**Test Adımları**:
1. Normal bağlantıyla uygulamayı başlat
2. Ağ bağlantısını simüle olarak kes
3. Hata mesajlarının görüntülendiğini kontrol et
4. Retry mekanizmasının çalıştığını doğrula
5. Bağlantı geri geldiğinde otomatik recovery'yi test et
6. Offline mode'un çalıştığını kontrol et

**Beklenen Sonuçlar**:
- Anlamlı hata mesajları
- Retry mekanizması aktif
- Otomatik recovery çalışır
- Offline mode desteklenir

---

### 8.2 Veri Bütünlüğü Test Senaryoları

#### Test Senaryo Başlığı: "Bozuk veri ile sistem davranışı testi"
**Amaç**: Bozuk veya eksik veri durumlarında sistemin stabilitesini test etmek

**Ön Koşullar**:
- Test veri setleri hazır
- Hata yakalama mekanizmaları aktif

**Test Adımları**:
1. Null değerlerle API test et
2. Aşırı büyük sayısal değerlerle test et
3. Geçersiz string formatlarıyla test et
4. Eksik JSON alanlarıyla test et
5. Hata loglarının oluşturulduğunu kontrol et
6. Sistem stabilitesinin korunduğunu doğrula

**Beklenen Sonuçlar**:
- Sistem çökmez
- Hata logları oluşturulur
- Graceful degradation çalışır
- Kullanıcı deneyimi korunur

---

## TEST ÇALIŞTIRMA TALİMATLARI

### Tüm Testleri Çalıştırma
```bash
# Tüm testleri çalıştır
npm run test:all

# Sadece unit testler
npm run test:unit

# Sadece backend testler
npm run test:backend

# Sadece e2e testler
npm run test:e2e

# Coverage raporu ile
npm run test:coverage
```

### Test Raporları
- Unit test raporları: `./test-results/unit-test-report.html`
- E2E test raporları: `./playwright-report/index.html`
- Coverage raporları: `./coverage/lcov-report/index.html`

### Test Veritabanı Kurulumu
```bash
# Test veritabanını hazırla
npm run test:setup

# Test verilerini temizle
npm run test:cleanup
```

---

## BAŞARI KRİTERLERİ

### Minimum Gereksinimler
- Unit test coverage > %80
- E2E test pass rate > %95
- API response time < 2 saniye
- Frontend performance score > 90
- Zero critical bugs

### Kalite Metrikleri
- Code coverage: %85+
- Test execution time: < 10 dakika
- Flaky test rate: < %2
- Bug detection rate: %95+

Bu dokümantasyon, sistemin tüm bileşenlerini kapsayan kapsamlı test senaryolarını içermektedir. Her senaryo tekrarlanabilir, ölçülebilir ve doğrulanabilir şekilde tasarlanmıştır.