#!/bin/bash

# Otomatik GitHub Deploy Script
# Her saat başı çalışacak cron job için tasarlanmıştır

# Renkli çıktı için ANSI kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Proje dizini
PROJECT_DIR="/Users/ergunural/Downloads/BorsaVerileri2025"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/auto-deploy.log"

# Log dizinini oluştur
mkdir -p "$LOG_DIR"

# Loglama fonksiyonu
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    case $level in
        "ERROR")
            echo -e "${RED}[$timestamp] [ERROR] $message${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[$timestamp] [SUCCESS] $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[$timestamp] [WARNING] $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}[$timestamp] [INFO] $message${NC}"
            ;;
        *)
            echo "[$timestamp] [$level] $message"
            ;;
    esac
}

# Hata durumunda çıkış
exit_on_error() {
    local exit_code=$1
    local error_message=$2
    if [ $exit_code -ne 0 ]; then
        log_message "ERROR" "$error_message"
        exit $exit_code
    fi
}

# Timestamp tabanlı commit mesajı oluştur
generate_commit_message() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "Auto-deploy: $timestamp - Scheduled update"
}

# Versiyon artırma fonksiyonu
increment_version() {
    log_message "INFO" "Versiyon artırılıyor..."
    
    cd "$PROJECT_DIR" || exit_on_error 1 "Proje dizinine geçilemedi"
    
    # package.json'dan mevcut versiyonu al
    current_version=$(node -p "require('./package.json').version")
    exit_on_error $? "package.json'dan versiyon okunamadı"
    
    log_message "INFO" "Mevcut versiyon: $current_version"
    
    # npm version patch ile versiyon artır
    new_version=$(npm version patch --no-git-tag-version)
    exit_on_error $? "Versiyon artırılamadı"
    
    # npm version patch 'v' prefixi ekler, onu kaldır
    new_version=${new_version#v}
    
    log_message "SUCCESS" "Yeni versiyon: $new_version"
    echo "$new_version"
}

# Git durumunu kontrol et
check_git_status() {
    cd "$PROJECT_DIR" || exit_on_error 1 "Proje dizinine geçilemedi"
    
    # Git deposu olup olmadığını kontrol et
    if [ ! -d ".git" ]; then
        log_message "ERROR" "Bu dizin bir Git deposu değil"
        exit 1
    fi
    
    # Remote repository kontrolü
    if ! git remote get-url origin > /dev/null 2>&1; then
        log_message "ERROR" "Git remote origin bulunamadı"
        exit 1
    fi
    
    log_message "INFO" "Git deposu kontrolü başarılı"
}

# Değişiklikleri kontrol et
check_for_changes() {
    cd "$PROJECT_DIR" || exit_on_error 1 "Proje dizinine geçilemedi"
    
    # Staged ve unstaged değişiklikleri kontrol et
    if git diff-index --quiet HEAD -- && [ -z "$(git ls-files --others --exclude-standard)" ]; then
        log_message "INFO" "Hiç değişiklik bulunamadı"
        return 1
    else
        log_message "INFO" "Değişiklikler tespit edildi"
        return 0
    fi
}

# Git işlemleri
perform_git_operations() {
    local commit_message=$1
    
    cd "$PROJECT_DIR" || exit_on_error 1 "Proje dizinine geçilemedi"
    
    log_message "INFO" "Git işlemleri başlatılıyor..."
    
    # Tüm değişiklikleri stage et
    git add .
    exit_on_error $? "Git add işlemi başarısız"
    
    # Commit yap
    git commit -m "$commit_message"
    exit_on_error $? "Git commit işlemi başarısız"
    
    # Remote'dan güncellemeleri çek
    log_message "INFO" "Remote'dan güncellemeler çekiliyor..."
    git pull origin main --no-rebase
    if [ $? -ne 0 ]; then
        log_message "WARNING" "Git pull işleminde çakışma olabilir, manuel müdahale gerekebilir"
    fi
    
    # Push yap
    log_message "INFO" "Değişiklikler GitHub'a gönderiliyor..."
    git push origin main
    exit_on_error $? "Git push işlemi başarısız"
    
    log_message "SUCCESS" "Git işlemleri başarıyla tamamlandı"
}

# Ana fonksiyon
main() {
    log_message "INFO" "=== Otomatik Deploy İşlemi Başlatıldı ==="
    
    # Git durumunu kontrol et
    check_git_status
    
    # Değişiklikleri kontrol et
    if check_for_changes; then
        # Versiyon artır
        new_version=$(increment_version)
        
        # Commit mesajı oluştur
        commit_message=$(generate_commit_message)
        commit_message="$commit_message (v$new_version)"
        
        # Git işlemlerini gerçekleştir
        perform_git_operations "$commit_message"
        
        log_message "SUCCESS" "=== Otomatik Deploy İşlemi Başarıyla Tamamlandı (v$new_version) ==="
    else
        log_message "INFO" "=== Değişiklik Olmadığı İçin Deploy İşlemi Atlandı ==="
    fi
    
    # Log dosyası boyutunu kontrol et (10MB'dan büyükse rotate et)
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
        mv "$LOG_FILE" "$LOG_FILE.old"
        log_message "INFO" "Log dosyası rotate edildi"
    fi
}

# Script'i çalıştır
main "$@"