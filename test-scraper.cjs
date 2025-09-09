const axios = require('axios');
const cheerio = require('cheerio');

async function testScraper() {
  try {
    console.log('ASELS hissesi için İş Yatırım sayfası test ediliyor...');
    
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('Sayfa başlığı:', $('title').text());
    console.log('Sayfa boyutu:', response.data.length, 'karakter');
    
    // Mali tablo verilerini ara
    const financialTerms = [
      'Dönen Varlıklar',
      'Kısa Vadeli Yükümlülükler', 
      'Nakit ve Nakit Benzerleri',
      'Finansal Yatırımlar',
      'Finansal Borçlar',
      'Toplam Varlıklar',
      'Toplam Yükümlülükler',
      'FAVÖK',
      'Net Dönem Karı',
      'Özkaynaklar',
      'Ödenmiş Sermaye'
    ];
    
    console.log('\nMali tablo terimleri aranıyor...');
    
    financialTerms.forEach(term => {
      const found = $('*').filter(function() {
        return $(this).text().includes(term);
      });
      
      if (found.length > 0) {
        console.log(`✓ "${term}" bulundu (${found.length} adet)`);
        found.each((i, el) => {
          const text = $(el).text().trim();
          if (text.length < 200) {
            console.log(`  - ${text}`);
          }
        });
      } else {
        console.log(`✗ "${term}" bulunamadı`);
      }
    });
    
    // Tablo yapılarını kontrol et
    console.log('\nSayfadaki tablolar:');
    $('table').each((i, table) => {
      const tableText = $(table).text().trim();
      if (tableText.length > 0) {
        console.log(`Tablo ${i+1}: ${tableText.substring(0, 100)}...`);
      }
    });
    
  } catch (error) {
    console.error('Hata:', error.message);
  }
}

testScraper();