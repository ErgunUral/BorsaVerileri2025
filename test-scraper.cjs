const puppeteer = require('puppeteer');

async function testIsYatirimScraping() {
  let browser;
  try {
    console.log('Browser başlatılıyor...');
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    console.log('ASELS sayfasına gidiliyor...');
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Sayfa yüklendi, fiyat bilgileri aranıyor...');
    
    // Sayfadaki tüm text içeriği al
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Sayfa içeriği (ilk 1000 karakter):', pageText.substring(0, 1000));
    
    // TL içeren tüm elementleri bul
    const tlElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => el.innerText && el.innerText.includes('TL'))
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: el.innerText.trim(),
          selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : '') + (el.id ? '#' + el.id : '')
        }))
        .slice(0, 10); // İlk 10 sonuç
    });
    
    console.log('TL içeren elementler:', JSON.stringify(tlElements, null, 2));
    
    // Fiyat benzeri sayıları ara
    const priceElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements
        .filter(el => {
          const text = el.innerText;
          return text && /\d+[.,]\d+/.test(text) && text.length < 50;
        })
        .map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          text: el.innerText.trim(),
          selector: el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ').join('.') : '') + (el.id ? '#' + el.id : '')
        }))
        .slice(0, 15); // İlk 15 sonuç
    });
    
    console.log('Sayısal değer içeren elementler:', JSON.stringify(priceElements, null, 2));
    
    // Tablo yapılarını kontrol et
    const tables = await page.evaluate(() => {
      const tables = Array.from(document.querySelectorAll('table'));
      return tables.map((table, index) => ({
        index,
        className: table.className,
        id: table.id,
        rowCount: table.rows.length,
        firstRowText: table.rows[0] ? table.rows[0].innerText : '',
        hasNumbers: /\d+[.,]\d+/.test(table.innerText)
      }));
    });
    
    console.log('Tablolar:', JSON.stringify(tables, null, 2));
    
  } catch (error) {
    console.error('Hata:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testIsYatirimScraping();