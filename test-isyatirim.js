import axios from 'axios';
import * as cheerio from 'cheerio';

async function testIsYatirimScraping() {
  try {
    console.log('Testing İş Yatırım scraping for ASELS...');
    
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response length:', response.data.length);
    
    const $ = cheerio.load(response.data);
    
    // Test various selectors
    console.log('\n=== Testing Selectors ===');
    
    const selectors = [
      '#hisse_Son',
      '.hisse-fiyat',
      '.price-value',
      '[data-field="price"]',
      '.son-fiyat',
      '#hisse_Degisim',
      '.hisse-degisim',
      '.change-value',
      '[data-field="change"]',
      '#hisse_Hacim',
      '.hisse-hacim',
      '.volume-value',
      '[data-field="volume"]'
    ];
    
    selectors.forEach(selector => {
      const element = $(selector);
      console.log(`${selector}: found=${element.length}, text="${element.text().trim()}", html="${element.html()?.substring(0, 100)}"`);  
    });
    
    // Look for any elements containing numbers that might be price
    console.log('\n=== Looking for price-like elements ===');
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/^\d+[.,]\d+$/) && text.length < 20) {
        console.log(`Potential price: "${text}" in <${el.tagName}> with classes: ${$(el).attr('class') || 'none'} and id: ${$(el).attr('id') || 'none'}`);
      }
    });
    
    // Look for script tags that might contain data
    console.log('\n=== Script tags ===');
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      if (content.includes('ASELS') || content.includes('hisse') || content.includes('price')) {
        console.log(`Script ${i}: ${content.substring(0, 200)}...`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testIsYatirimScraping();