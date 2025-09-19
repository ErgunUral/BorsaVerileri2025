import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

export interface FinancialData {
  stockCode: string;
  companyName: string;
  period: string;
  currentAssets: number;
  shortTermLiabilities: number;
  longTermLiabilities: number;
  cashAndEquivalents: number;
  financialInvestments: number;
  financialDebts: number;
  totalAssets: number;
  totalLiabilities: number;
  ebitda: number;
  netProfit: number;
  equity: number;
  paidCapital: number;
  lastUpdated: Date;
}

export interface StockPrice {
  stockCode: string;
  price: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

export class StockScraper {
  private baseUrl = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx';
  private browser: any = null;

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      timeout: 120000,
      protocolTimeout: 120000
    });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Hisse senedi kodunun geçerli olup olmadığını kontrol et
  async validateStockCode(stockCode: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}?hisse=${stockCode.toUpperCase()}`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      // Şirket adı varsa geçerli hisse kodu
      const companyName = $('.company-name, .sirket-adi, h1').first().text().trim();
      return companyName.length > 0;
    } catch (error) {
      console.error(`Hisse kodu doğrulama hatası ${stockCode}:`, error);
      return false;
    }
  }

  // Mali tablo verilerini çek
  async scrapeFinancialData(stockCode: string, retryCount: number = 0): Promise<FinancialData | null> {
    const maxRetries = 3;
    
    // Önce axios ile deneme
    try {
      console.log(`${stockCode} için axios ile veri çekiliyor (Deneme: ${retryCount + 1})`);
      const url = `${this.baseUrl}?hisse=${stockCode.toUpperCase()}`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });
      
      if (response.data) {
        const $ = cheerio.load(response.data);
        const companyName = $('.company-name, .sirket-adi, h1').first().text().trim() || 
                           $('title').text().split('-')[0].trim() ||
                           stockCode.toUpperCase();
        
        const financialData = await this.extractFinancialData($, stockCode, companyName);
        if (financialData) {
          console.log(`✅ ${stockCode} verisi axios ile başarıyla çekildi`);
          return financialData;
        }
      }
    } catch (axiosError: any) {
      console.log(`Axios hatası ${stockCode}: ${axiosError.message}`);
    }

    // Axios başarısız olursa Puppeteer ile deneme
    let page = null;
    
    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      // Sayfa ayarları
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      const url = `${this.baseUrl}?hisse=${stockCode.toUpperCase()}`;
      console.log(`Mali tablo verisi Puppeteer ile çekiliyor: ${url} (Deneme: ${retryCount + 1})`);
      
      // Sayfa yükleme
      await page.goto(url, { 
        waitUntil: 'domcontentloaded', 
        timeout: 60000 
      });
      
      // Sayfanın yüklenmesini bekle
      await page.waitForTimeout(3000);
      
      // Mali tablo sekmesine tıkla
      try {
        await page.click('a[href*="mali-tablo"], .mali-tablo-tab, [data-tab="mali-tablo"]');
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('Mali tablo sekmesi bulunamadı, mevcut sayfada devam ediliyor');
      }

      // Sayfa içeriğini al
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Şirket adını al
      const companyName = $('.company-name, .sirket-adi, h1').first().text().trim() || 
                         $('title').text().split('-')[0].trim() ||
                         stockCode.toUpperCase();
      
      console.log(`Şirket adı bulundu: ${companyName}`);

      // Mali tablo verilerini çıkar
      const financialData = await this.extractFinancialData($, stockCode, companyName);
      
      return financialData;
      
    } catch (error: any) {
      console.error(`Mali tablo çekme hatası ${stockCode} (Deneme ${retryCount + 1}):`, error.message);
      
      // Retry mekanizması
      if (retryCount < maxRetries) {
        console.log(`${stockCode} için ${retryCount + 2}. deneme yapılıyor...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Exponential backoff
        return this.scrapeFinancialData(stockCode, retryCount + 1);
      }
      
      return null;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (e: any) {
          console.log('Sayfa kapatma hatası:', e.message);
        }
      }
    }
  }

  // Hisse fiyat verilerini çek
  async scrapeStockPrice(stockCode: string): Promise<StockPrice | null> {
    try {
      const url = `${this.baseUrl}?hisse=${stockCode.toUpperCase()}`;
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      // Fiyat bilgilerini çıkar
      const priceText = $('.price, .fiyat, .current-price').first().text().trim();
      const changeText = $('.change, .degisim, .change-percent').first().text().trim();
      const volumeText = $('.volume, .hacim').first().text().trim();
      
      const price = this.parseNumber(priceText);
      const changePercent = this.parseNumber(changeText.replace('%', ''));
      const volume = this.parseNumber(volumeText);
      
      return {
        stockCode: stockCode.toUpperCase(),
        price: price || 0,
        changePercent: changePercent || 0,
        volume: volume || 0,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error(`Fiyat çekme hatası ${stockCode}:`, error);
      return null;
    }
  }

  // Mali tablo verilerini HTML'den çıkar
  private async extractFinancialData($: cheerio.CheerioAPI, stockCode: string, companyName: string): Promise<FinancialData> {
    // En son çeyrek dönem verilerini bul
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
    const period = `${currentYear}-Q${currentQuarter}`;
    
    // Mali tablo değerlerini çıkar (İş Yatırım sayfası için geliştirilmiş selector'lar)
    const selectors = {
      currentAssets: [
        'tr:contains("Dönen Varlıklar") td:nth-child(2)',
        'tr:contains("Dönen Varlıklar") td:nth-child(3)',
        'tr:contains("Dönen Varlıklar") td:last',
        'td:contains("Dönen Varlıklar") + td',
        '[data-field="currentAssets"]'
      ],
      shortTermLiabilities: [
        'tr:contains("Kısa Vadeli Yükümlülükler") td:nth-child(2)',
        'tr:contains("Kısa Vadeli Yükümlülükler") td:nth-child(3)',
        'tr:contains("Kısa Vadeli Yükümlülükler") td:last',
        'td:contains("Kısa Vadeli Yükümlülükler") + td',
        'tr:contains("Kısa Vadeli Borçlar") td:nth-child(2)'
      ],
      longTermLiabilities: [
        'tr:contains("Uzun Vadeli Yükümlülükler") td:nth-child(2)',
        'tr:contains("Uzun Vadeli Yükümlülükler") td:nth-child(3)',
        'tr:contains("Uzun Vadeli Yükümlülükler") td:last',
        'td:contains("Uzun Vadeli Yükümlülükler") + td',
        'tr:contains("Uzun Vadeli Borçlar") td:nth-child(2)',
        'tr:contains("UZUN VADELİ YÜKÜMLÜLÜKLER") td:nth-child(2)',
        'tr:contains("Uzun Vadeli Finansal Borçlar") td:nth-child(2)'
      ],
      cashAndEquivalents: [
        'tr:contains("Nakit ve Nakit Benzerleri") td:nth-child(2)',
        'tr:contains("Nakit ve Nakit Benzerleri") td:nth-child(3)',
        'tr:contains("Nakit ve Nakit Benzerleri") td:last',
        'td:contains("Nakit ve Nakit Benzerleri") + td',
        'tr:contains("Nakit") td:nth-child(2)'
      ],
      financialInvestments: [
        'tr:contains("Finansal Yatırımlar") td:nth-child(2)',
        'tr:contains("Finansal Yatırımlar") td:nth-child(3)',
        'tr:contains("Finansal Yatırımlar") td:last',
        'td:contains("Finansal Yatırımlar") + td',
        'tr:contains("Menkul Kıymetler") td:nth-child(2)'
      ],
      financialDebts: [
        'tr:contains("Finansal Borçlar") td:nth-child(2)',
        'tr:contains("Finansal Borçlar") td:nth-child(3)',
        'tr:contains("Finansal Borçlar") td:last',
        'td:contains("Finansal Borçlar") + td',
        'tr:contains("Toplam Finansal Borçlar") td:nth-child(2)'
      ],
      totalAssets: [
        'tr:contains("Toplam Aktif") td:nth-child(2)',
        'tr:contains("Toplam Aktif") td:nth-child(3)',
        'tr:contains("Toplam Aktif") td:last',
        'tr:contains("Toplam Varlıklar") td:nth-child(2)',
        'tr:contains("TOPLAM AKTİF") td:nth-child(2)',
        'td:contains("Toplam Aktif") + td'
      ],
      totalLiabilities: [
        'tr:contains("Toplam Pasif") td:nth-child(2)',
        'tr:contains("Toplam Pasif") td:nth-child(3)',
        'tr:contains("Toplam Pasif") td:last',
        'tr:contains("Toplam Yükümlülükler") td:nth-child(2)',
        'tr:contains("TOPLAM PASİF") td:nth-child(2)',
        'td:contains("Toplam Pasif") + td'
      ],
      ebitda: [
        'tr:contains("FAVÖK") td:nth-child(2)',
        'tr:contains("FAVÖK") td:nth-child(3)',
        'tr:contains("FAVÖK") td:last',
        'tr:contains("EBITDA") td:nth-child(2)',
        'td:contains("FAVÖK") + td'
      ],
      netProfit: [
        'tr:contains("Net Dönem Karı") td:nth-child(2)',
        'tr:contains("Net Dönem Karı") td:nth-child(3)',
        'tr:contains("Net Dönem Karı") td:last',
        'tr:contains("Net Dönem Zararı") td:nth-child(2)',
        'tr:contains("Net Kar") td:nth-child(2)',
        'td:contains("Net Dönem Karı") + td'
      ],
      equity: [
        'tr:contains("Özkaynaklar") td:nth-child(2)',
        'tr:contains("Özkaynaklar") td:nth-child(3)',
        'tr:contains("Özkaynaklar") td:last',
        'tr:contains("ÖZKAYNAKLAR") td:nth-child(2)',
        'td:contains("Özkaynaklar") + td'
      ],
      paidCapital: [
        'tr:contains("Ödenmiş Sermaye") td:nth-child(2)',
        'tr:contains("Ödenmiş Sermaye") td:nth-child(3)',
        'tr:contains("Ödenmiş Sermaye") td:last',
        'tr:contains("Sermaye") td:nth-child(2)',
        'td:contains("Ödenmiş Sermaye") + td'
      ]
    };

    const data: any = {};
    
    // Mali tablo verilerini çıkar
    
    // Her bir mali tablo kalemi için değer çıkar
    Object.entries(selectors).forEach(([key, selectorList]) => {
      let value = 0;
      
      for (const selector of selectorList) {
        const elements = $(selector);
        
        elements.each((_i, element) => {
          if (value > 0) return; // Değer bulunduysa devam etme
          
          const $el = $(element);
          const elementText = $el.text().trim();
          
          // Element içinde sayı varsa direkt al
          if (elementText.match(/[0-9.,]+/)) {
            const numbers = elementText.match(/[0-9.,]+/g);
            if (numbers && numbers.length > 0) {
              // En büyük sayıyı al (genellikle ana değer)
              const parsedNumbers = numbers.map(n => this.parseNumber(n)).filter(n => n > 0);
              if (parsedNumbers.length > 0) {
                value = Math.max(...parsedNumbers);
                // Değer bulundu
                return;
              }
            }
          }
          
          // Aynı satırdaki sayısal değeri bul
          const valueText = $el.siblings('td').last().text().trim() ||
                           $el.next('td').text().trim() ||
                           $el.parent().find('td').last().text().trim() ||
                           $el.parent().next().text().trim();
          
          const parsedValue = this.parseNumber(valueText);
          if (parsedValue > 0) {
            value = parsedValue;
            // Sibling değer bulundu
          }
        });
        
        if (value > 0) break;
      }
      
      // Değer kontrolü tamamlandı
      
      data[key] = value;
    });
    
    // Eğer toplam aktif/pasif bulunamazsa, alternatif yöntemler dene
    if (data.totalAssets === 0) {
      // Tüm sayısal değerleri bul ve en büyüğünü toplam aktif olarak kabul et
      const allNumbers: number[] = [];
      $('td').each((_i, el) => {
        const text = $(el).text().trim();
        const num = this.parseNumber(text);
        if (num > 1000000) { // 1 milyon üzeri değerler
          allNumbers.push(num);
        }
      });
      
      if (allNumbers.length > 0) {
        data.totalAssets = Math.max(...allNumbers);
        // Toplam aktif alternatif yöntemle bulundu
      }
    }
    
    if (data.totalLiabilities === 0 && data.totalAssets > 0 && data.equity > 0) {
      // Toplam pasif = Toplam aktif - Özkaynaklar
      data.totalLiabilities = data.totalAssets - data.equity;
      // Toplam pasif hesaplandı
    }

    // Eğer veriler bulunamazsa varsayılan değerler kullan
    return {
      stockCode: stockCode.toUpperCase(),
      companyName,
      period,
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
      paidCapital: data.paidCapital || 0,
      lastUpdated: new Date()
    };
  }

  // Sayısal değerleri parse et
  private parseNumber(text: string): number {
    if (!text) return 0;
    
    // Sadece sayıları içeren kısmı al
    const numberMatch = text.match(/[0-9.,]+/);
    if (!numberMatch) return 0;
    
    let cleaned = numberMatch[0];
    
    // Türkçe sayı formatını temizle
    // Eğer virgül varsa ve sonrasında 3'ten az rakam varsa, virgül ondalık ayırıcısıdır
    if (cleaned.includes(',')) {
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= 3 && parts[1].length > 0) {
        // Virgül ondalık ayırıcısı
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Virgül binlik ayırıcısı
        cleaned = cleaned.replace(/,/g, '');
      }
    } else {
      // Sadece nokta var, binlik ayırıcısı olarak kabul et
      const parts = cleaned.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        // Binlik ayırıcısı
        cleaned = cleaned.replace(/\./g, '');
      }
    }
    
    const number = parseFloat(cleaned);
    
    // Çok büyük sayıları filtrele (muhtemelen hatalı parsing)
    if (isNaN(number) || number > 1e15) return 0;
    
    return number;
  }

  // Popüler hisse kodları listesi
  getPopularStocks(): string[] {
    return [
      'THYAO', 'AKBNK', 'BIMAS', 'TCELL', 'EREGL',
      'KCHOL', 'ASELS', 'SISE', 'PETKM', 'KOZAL',
      'TUPRS', 'ISCTR', 'HALKB', 'VAKBN', 'GARAN',
      'ARCLK', 'TOASO', 'SAHOL', 'KOZAA', 'EKGYO'
    ];
  }
}

export default StockScraper;