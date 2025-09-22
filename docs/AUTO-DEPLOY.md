# Otomatik GitHub Deploy Sistemi

Bu dokümantasyon, projenizde kurulmuş olan otomatik GitHub deploy sisteminin nasıl çalıştığını ve nasıl yönetileceğini açıklar.

## 📋 Sistem Özeti

Otomatik deploy sistemi, her saat başı (dakika 0'da) çalışarak:
- Proje dosyalarındaki değişiklikleri algılar
- Otomatik olarak versiyon numarasını artırır (patch level)
- Değişiklikleri commit eder
- GitHub repository'sine push eder
- Tüm işlemleri loglar

## 🗂️ Dosya Yapısı

```
BorsaVerileri2025/
├── scripts/
│   ├── auto-deploy.sh          # Ana deploy script'i
│   └── crontab-config          # Cron job yapılandırması
├── logs/
│   ├── auto-deploy.log         # Script logları
│   └── cron.log               # Cron job logları
└── docs/
    └── AUTO-DEPLOY.md         # Bu dokümantasyon
```

## ⚙️ Sistem Bileşenleri

### 1. Ana Script (`scripts/auto-deploy.sh`)

**Özellikler:**
- ✅ Otomatik versiyon artırma (semantic versioning)
- ✅ Timestamp tabanlı commit mesajları
- ✅ Renkli konsol çıktısı
- ✅ Kapsamlı hata yönetimi
- ✅ Detaylı loglama
- ✅ Log dosyası rotasyonu (10MB üzerinde)
- ✅ Değişiklik algılama (tracked ve untracked dosyalar)
- ✅ Git conflict yönetimi

**Çalışma Mantığı:**
1. Git deposu durumunu kontrol eder
2. Değişiklikleri algılar (staged, unstaged, untracked)
3. Eğer değişiklik varsa:
   - package.json'daki versiyon numarasını artırır
   - Timestamp içeren commit mesajı oluşturur
   - Tüm değişiklikleri stage eder
   - Commit yapar
   - Remote'dan güncellemeleri çeker
   - GitHub'a push eder
4. Eğer değişiklik yoksa işlemi atlar

### 2. Cron Job Yapılandırması

**Zamanlama:** `0 * * * *` (Her saat başı)

**Örnek Çalışma Zamanları:**
- 09:00, 10:00, 11:00, 12:00, 13:00...

## 🚀 Kurulum ve Yapılandırma

### Sistem Durumunu Kontrol Etme

```bash
# Cron job'ın aktif olup olmadığını kontrol et
crontab -l

# Script'in çalıştırılabilir olup olmadığını kontrol et
ls -la scripts/auto-deploy.sh

# Son logları kontrol et
tail -f logs/auto-deploy.log
```

### Manuel Test

```bash
# Script'i manuel olarak çalıştır
./scripts/auto-deploy.sh

# Veya tam path ile
/Users/ergunural/Downloads/BorsaVerileri2025/scripts/auto-deploy.sh
```

## 📊 Log Yönetimi

### Log Dosyaları

1. **`logs/auto-deploy.log`** - Script'in detaylı logları
2. **`logs/cron.log`** - Cron job çıktıları

### Log Seviyeleri

- `[INFO]` - Genel bilgi mesajları
- `[SUCCESS]` - Başarılı işlemler
- `[WARNING]` - Uyarı mesajları
- `[ERROR]` - Hata mesajları

### Log Rotasyonu

Script, log dosyası 10MB'ı aştığında otomatik olarak eski dosyayı `.old` uzantısıyla yedekler.

## 🔧 Yönetim Komutları

### Cron Job Yönetimi

```bash
# Mevcut cron job'ları listele
crontab -l

# Cron job'ı devre dışı bırak
crontab -r

# Cron job'ı yeniden aktifleştir
crontab /Users/ergunural/Downloads/BorsaVerileri2025/scripts/crontab-config

# Cron servisinin durumunu kontrol et (macOS)
sudo launchctl list | grep cron
```

### Script Yönetimi

```bash
# Script'i çalıştırılabilir yap
chmod +x scripts/auto-deploy.sh

# Script'in syntax'ını kontrol et
bash -n scripts/auto-deploy.sh
```

## 🐛 Sorun Giderme

### Yaygın Sorunlar ve Çözümleri

#### 1. Cron Job Çalışmıyor

**Kontrol:**
```bash
# Cron servisinin çalışıp çalışmadığını kontrol et
ps aux | grep cron

# System log'ları kontrol et
tail -f /var/log/system.log | grep cron
```

**Çözüm:**
- macOS'ta Full Disk Access izni gerekebilir
- Terminal uygulamasına cron izni verin

#### 2. Git Push Başarısız

**Kontrol:**
```bash
# Git remote durumunu kontrol et
git remote -v

# Git credentials'ları kontrol et
git config --list | grep user
```

**Çözüm:**
- SSH key'lerinin doğru yapılandırıldığından emin olun
- GitHub token'ının geçerli olduğunu kontrol edin

#### 3. Versiyon Artırma Hatası

**Kontrol:**
```bash
# package.json'ın geçerli olup olmadığını kontrol et
node -p "require('./package.json').version"
```

**Çözüm:**
- package.json dosyasının geçerli JSON formatında olduğundan emin olun
- version alanının mevcut olduğunu kontrol edin

#### 4. İzin Sorunları

**Çözüm:**
```bash
# Script dosyasına execute izni ver
chmod +x scripts/auto-deploy.sh

# Log dizinine write izni ver
chmod 755 logs/
```

## 📈 İzleme ve Raporlama

### Günlük Kontroller

```bash
# Son 24 saatteki deploy'ları kontrol et
grep "$(date '+%Y-%m-%d')" logs/auto-deploy.log

# Başarılı deploy'ları say
grep "SUCCESS.*Başarıyla Tamamlandı" logs/auto-deploy.log | wc -l

# Hataları listele
grep "ERROR" logs/auto-deploy.log
```

### Versiyon Geçmişi

```bash
# Git tag'larını listele
git tag --sort=-version:refname

# Son commit'leri görüntüle
git log --oneline -10
```

## ⚠️ Önemli Notlar

1. **Backup:** Önemli değişiklikler yapmadan önce repository'yi yedekleyin
2. **Test:** Script'i production'da kullanmadan önce test ortamında deneyin
3. **Monitoring:** Log dosyalarını düzenli olarak kontrol edin
4. **Security:** Script'te hassas bilgiler (API key'ler) bulundurmayın
5. **Permissions:** macOS'ta cron job'lar için gerekli izinleri verin

## 🔄 Güncelleme ve Bakım

### Script Güncelleme

1. Script'i düzenleyin
2. Syntax kontrolü yapın: `bash -n scripts/auto-deploy.sh`
3. Manuel test edin: `./scripts/auto-deploy.sh`
4. Cron job'ı yeniden başlatın

### Sistem Bakımı

- Log dosyalarını düzenli olarak temizleyin
- Git repository boyutunu kontrol edin
- Disk alanını izleyin
- GitHub API rate limit'lerini takip edin

---

**Son Güncelleme:** 2025-09-20  
**Versiyon:** 1.0.0  
**Yazar:** Otomatik Deploy Sistemi