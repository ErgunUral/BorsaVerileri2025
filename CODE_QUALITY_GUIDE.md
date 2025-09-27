# Kod Kalitesi Analiz Rehberi

## 📋 Genel Bakış

Bu dokümantasyon, Borsa Verileri 2025 projesinde kod kalitesi analiz süreçlerini ve araçlarını açıklamaktadır. Proje, TypeScript, React ve Node.js teknolojileri kullanılarak geliştirilmiş olup, kapsamlı kod kalitesi kontrolü için çeşitli araçlar entegre edilmiştir.

## 🛠️ Kullanılan Araçlar

### 1. ESLint
- **Amaç**: JavaScript/TypeScript kod kalitesi ve stil kontrolü
- **Konfigürasyon**: `.eslintrc.json`
- **Özellikler**:
  - SonarJS kuralları entegrasyonu
  - TypeScript strict kuralları
  - React hooks kuralları
  - Güvenlik odaklı kurallar

### 2. SonarQube
- **Amaç**: Kapsamlı kod kalitesi analizi
- **Konfigürasyon**: `sonar-project.properties`
- **Özellikler**:
  - Kod kokuları tespiti
  - Güvenlik açıkları analizi
  - Teknik borç hesaplama
  - Kod kapsamı analizi

### 3. TypeScript Compiler
- **Amaç**: Tip güvenliği kontrolü
- **Komut**: `npx tsc --noEmit --skipLibCheck`
- **Özellikler**:
  - Strict tip kontrolü
  - Derleme hatalarının tespiti

### 4. npm audit
- **Amaç**: Güvenlik açıkları taraması
- **Komut**: `npm audit`
- **Özellikler**:
  - Bağımlılık güvenlik analizi
  - CVE veritabanı kontrolü

## 🚀 Hızlı Başlangıç

### Yerel Geliştirme Ortamında Analiz

```bash
# 1. Tüm bağımlılıkları yükle
npm install

# 2. TypeScript tip kontrolü
npm run type-check

# 3. ESLint analizi
npm run lint

# 4. Test kapsamı ile birlikte testleri çalıştır
npm run test:coverage

# 5. Güvenlik açıkları taraması
npm audit

# 6. E2E testleri
npm run test:e2e
```

### SonarQube Analizi

```bash
# 1. SonarQube Scanner kurulumu (global)
npm install -g sonarqube-scanner

# 2. Analiz raporlarını oluştur
npx eslint . --ext .ts,.tsx,.js,.jsx --format json --output-file eslint-report.json
npm audit --json > security-audit-report.json
npm run test:coverage

# 3. SonarQube analizi çalıştır
sonar-scanner
```

## 📊 Kalite Metrikleri

### Quality Gate Kriterleri

| Metrik | Hedef | Kritik Eşik |
|--------|-------|-------------|
| Kod Kapsamı | ≥ 80% | < 70% |
| Yinelenen Kod | ≤ 3% | > 5% |
| Güvenlik Derecelendirmesi | A | C veya altı |
| Güvenilirlik Derecelendirmesi | A | C veya altı |
| Sürdürülebilirlik Derecelendirmesi | A | C veya altı |
| Kritik Güvenlik Açıkları | 0 | > 0 |
| Yüksek Öncelikli Hatalar | 0 | > 5 |
| Teknik Borç | ≤ 30 dk | > 2 saat |

### ESLint Kuralları

#### Kritik Kurallar
- `@typescript-eslint/no-explicit-any`: `any` tip kullanımını engeller
- `@typescript-eslint/no-unused-vars`: Kullanılmayan değişkenleri tespit eder
- `sonarjs/no-duplicate-string`: Tekrarlanan string'leri tespit eder
- `sonarjs/cognitive-complexity`: Bilişsel karmaşıklığı kontrol eder

#### Güvenlik Kuralları
- `sonarjs/no-hardcoded-credentials`: Sabit kodlanmış kimlik bilgilerini tespit eder
- `sonarjs/no-weak-cipher`: Zayıf şifreleme algoritmalarını tespit eder

## 🔧 CI/CD Entegrasyonu

### GitHub Actions Workflow

Proje, `.github/workflows/code-quality.yml` dosyasında tanımlanan otomatik kalite kontrolü içerir:

#### Workflow Adımları
1. **Kod Checkout**: Repository'den kod çekme
2. **Node.js Kurulumu**: Çoklu versiyon desteği (18.x, 20.x)
3. **Bağımlılık Kurulumu**: npm ci ile hızlı kurulum
4. **TypeScript Kontrolü**: Tip güvenliği kontrolü
5. **ESLint Analizi**: Kod kalitesi analizi
6. **Güvenlik Taraması**: npm audit ve Trivy
7. **Test Çalıştırma**: Birim, entegrasyon ve E2E testleri
8. **SonarQube Analizi**: Kapsamlı kod analizi
9. **Rapor Yükleme**: Analiz sonuçlarının arşivlenmesi

#### Quality Gate Kontrolü

```yaml
# Otomatik kalite kontrolü
- ESLint hata sayısı: 0
- Kritik güvenlik açıkları: 0
- Yüksek öncelikli güvenlik açıkları: ≤ 5
```

## 📈 Raporlama

### Oluşturulan Raporlar

1. **ESLint Raporu**: `eslint-report.json`
   - Kod kalitesi sorunları
   - Stil ihlalleri
   - Güvenlik uyarıları

2. **Güvenlik Raporu**: `security-audit-report.json`
   - Bağımlılık güvenlik açıkları
   - CVE referansları
   - Düzeltme önerileri

3. **Kapsam Raporu**: `coverage/`
   - Test kapsamı metrikleri
   - Dosya bazında analiz
   - HTML raporu

4. **SonarQube Raporu**: SonarQube dashboard
   - Kapsamlı kod analizi
   - Teknik borç hesaplama
   - Trend analizi

5. **Kalite Analiz Raporu**: `code-quality-analysis-report.md`
   - Detaylı bulgular
   - Öncelikli eylem planı
   - Kalite metrikleri

## 🔍 Sorun Giderme

### Yaygın Sorunlar ve Çözümleri

#### 1. ESLint Hataları
```bash
# Otomatik düzeltme
npx eslint . --fix

# Belirli dosya için analiz
npx eslint src/components/MyComponent.tsx
```

#### 2. TypeScript Hataları
```bash
# Detaylı tip kontrolü
npx tsc --noEmit --strict

# Belirli dosya için kontrol
npx tsc --noEmit src/utils/helpers.ts
```

#### 3. Test Kapsamı Düşük
```bash
# Kapsam raporunu görüntüle
npm run test:coverage:open

# Belirli dosya için test yaz
# src/utils/helpers.ts -> src/__tests__/utils/helpers.test.ts
```

#### 4. Güvenlik Açıkları
```bash
# Otomatik düzeltme dene
npm audit fix

# Manuel güncelleme
npm update [package-name]

# Güvenlik açığı detayları
npm audit --audit-level high
```

## 📚 En İyi Uygulamalar

### Kod Yazma Standartları

1. **TypeScript Kullanımı**
   - `any` tipinden kaçının
   - Strict mod kullanın
   - Interface'leri tercih edin

2. **React Bileşenleri**
   - Fonksiyonel bileşenler kullanın
   - Props için tip tanımları yapın
   - Hooks kurallarına uyun

3. **Node.js Backend**
   - Express middleware'leri güvenli kullanın
   - Input validasyonu yapın
   - Error handling uygulayın

### Commit Öncesi Kontroller

```bash
# Pre-commit hook (Husky ile otomatik)
1. ESLint kontrolü
2. Prettier formatlaması
3. TypeScript tip kontrolü
4. Test çalıştırma
```

### Code Review Kriterleri

- [ ] ESLint uyarıları giderildi
- [ ] TypeScript hataları yok
- [ ] Test kapsamı %80'in üzerinde
- [ ] Güvenlik açıkları kontrol edildi
- [ ] Kod dokümantasyonu eklendi
- [ ] Performance etkileri değerlendirildi

## 🎯 Hedefler ve Roadmap

### Kısa Vadeli Hedefler (1-2 ay)
- [ ] Test kapsamını %90'a çıkarma
- [ ] Tüm kritik güvenlik açıklarını giderme
- [ ] SonarQube Quality Gate'i geçme
- [ ] Teknik borcu 15 dakikanın altına indirme

### Uzun Vadeli Hedefler (3-6 ay)
- [ ] Otomatik güvenlik taraması entegrasyonu
- [ ] Performance monitoring ekleme
- [ ] Accessibility testleri ekleme
- [ ] Bundle size optimizasyonu

## 📞 Destek ve İletişim

### Kod Kalitesi Sorunları
- ESLint konfigürasyonu: `.eslintrc.json`
- SonarQube ayarları: `sonar-project.properties`
- CI/CD pipeline: `.github/workflows/code-quality.yml`

### Dokümantasyon Güncellemeleri
Bu dokümantasyon düzenli olarak güncellenmektedir. Önerilerinizi ve geri bildirimlerinizi issue olarak açabilirsiniz.

---

**Son Güncelleme**: 2025-01-27  
**Versiyon**: 1.0.0  
**Sorumlu**: Development Team