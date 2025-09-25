import axios from 'axios';
import * as cheerio from 'cheerio';

async function testDetailedScraping() {
  try {
    console.log('Testing detailed İş Yatırım scraping...');
    
    const response = await axios.get('https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('\n=== All numeric values found on page ===');
    
    const allNumbers = [];
    
    // Find all text nodes and extract numbers
    $('*').each((i, el) => {
      const text = $(el).text().trim();
      
      // Look for decimal numbers
      const matches = text.match(/\d+[.,]\d+/g);
      if (matches) {
        matches.forEach(match => {
          const numValue = parseFloat(match.replace(',', '.'));
          if (numValue >= 0.01 && numValue <= 5000) {
            allNumbers.push({
              value: numValue,
              text: match,
              context: text.substring(0, 50),
              tag: el.tagName,
              id: $(el).attr('id') || '',
              class: $(el).attr('class') || ''
            });
          }
        });
      }
    });
    
    // Remove duplicates and sort
    const uniqueNumbers = allNumbers.filter((item, index, self) => 
      index === self.findIndex(t => t.value === item.value && t.text === item.text)
    ).sort((a, b) => a.value - b.value);
    
    console.log(`\nFound ${uniqueNumbers.length} unique potential price values:`);
    uniqueNumbers.slice(0, 20).forEach((item, index) => {
      console.log(`${index + 1}. ${item.value} ("${item.text}") - Tag: ${item.tag}, Context: "${item.context}"`);
      if (item.id) console.log(`   ID: ${item.id}`);
      if (item.class) console.log(`   Class: ${item.class}`);
    });
    
    // Look specifically for ASELS price in scripts
    console.log('\n=== Looking for ASELS price in JavaScript ===');
    $('script').each((i, el) => {
      const content = $(el).html() || '';
      if (content.includes('ASELS')) {
        const lines = content.split('\n');
        lines.forEach((line, lineNum) => {
          if (line.includes('ASELS') && line.match(/\d+[.,]\d+/)) {
            console.log(`Script ${i}, Line ${lineNum}: ${line.trim()}`);
          }
        });
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDetailedScraping();