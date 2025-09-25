const axios = require('axios');
const cheerio = require('cheerio');

async function debugASELS() {
  console.log('=== ASELS Debug Analysis ===');
  
  try {
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    console.log(`Fetching: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('\n=== All potential price elements ===');
    
    // Look for all numeric values that could be prices
    const allNumbers = [];
    
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      const numMatch = text.match(/\b(\d{1,3}(?:[.,]\d{2,3})*(?:[.,]\d{1,2})?)\b/);
      if (numMatch) {
        const numStr = numMatch[1].replace(/[.,]/g, match => match === ',' ? '.' : '');
        const num = parseFloat(numStr);
        if (num >= 200 && num <= 250) {
          const classes = $(el).attr('class') || '';
          const id = $(el).attr('id') || '';
          const parent = $(el).parent();
          const parentClasses = parent.attr('class') || '';
          const parentId = parent.attr('id') || '';
          
          allNumbers.push({
            value: num,
            text: text,
            element: el.tagName,
            classes: classes,
            id: id,
            parentClasses: parentClasses,
            parentId: parentId,
            selector: `${el.tagName}${id ? '#' + id : ''}${classes ? '.' + classes.split(' ').join('.') : ''}`
          });
        }
      }
    });
    
    // Sort by value descending
    allNumbers.sort((a, b) => b.value - a.value);
    
    console.log(`Found ${allNumbers.length} potential prices:`);
    allNumbers.forEach((item, index) => {
      console.log(`${index + 1}. ${item.value} - ${item.text} - ${item.selector} - classes: ${item.classes} - parent: ${item.parentClasses}`);
    });
    
    // Look for specific patterns
    console.log('\n=== Specific CSS selectors ===');
    const selectors = [
      '#hisse_Son',
      '.hisse-fiyat',
      '.text-right',
      '.price',
      '.son-fiyat',
      '[data-field="Son"]',
      '.table td',
      '.data-table td'
    ];
    
    selectors.forEach(selector => {
      const elements = $(selector);
      if (elements.length > 0) {
        elements.each((i, el) => {
          const text = $(el).text().trim();
          const numMatch = text.match(/\b(\d{1,3}(?:[.,]\d{2,3})*(?:[.,]\d{1,2})?)\b/);
          if (numMatch) {
            const numStr = numMatch[1].replace(/[.,]/g, match => match === ',' ? '.' : '');
            const num = parseFloat(numStr);
            if (num >= 200 && num <= 250) {
              console.log(`${selector}: ${num} - "${text}"`);
            }
          }
        });
      }
    });
    
    // Look for table data specifically
    console.log('\n=== Table analysis ===');
    $('table').each((tableIndex, table) => {
      $(table).find('td, th').each((cellIndex, cell) => {
        const text = $(cell).text().trim();
        const numMatch = text.match(/\b(\d{1,3}(?:[.,]\d{2,3})*(?:[.,]\d{1,2})?)\b/);
        if (numMatch) {
          const numStr = numMatch[1].replace(/[.,]/g, match => match === ',' ? '.' : '');
          const num = parseFloat(numStr);
          if (num >= 200 && num <= 250) {
            const classes = $(cell).attr('class') || '';
            console.log(`Table ${tableIndex}, Cell ${cellIndex}: ${num} - "${text}" - classes: ${classes}`);
          }
        }
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugASELS();