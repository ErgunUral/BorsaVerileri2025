const axios = require('axios');
const cheerio = require('cheerio');

async function testPage() {
  console.log('Testing page access...');
  
  try {
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    console.log('Fetching:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    console.log('Response status:', response.status);
    console.log('Response size:', response.data.length);
    
    const $ = cheerio.load(response.data);
    
    // Look for tables
    const tables = $('table');
    console.log('Tables found:', tables.length);
    
    // Look for specific financial terms
    const terms = ['Aktif Toplamı', 'Net Kar', 'Özkaynaklar'];
    
    terms.forEach(term => {
      const found = response.data.includes(term);
      console.log(`${term}: ${found ? 'FOUND' : 'NOT FOUND'}`);
    });
    
    // Examine all tables for financial data
    console.log('\n=== TABLE ANALYSIS ===');
    
    tables.each((i, table) => {
      const $table = $(table);
      const tableText = $table.text().trim();
      
      // Check if table contains financial terms
      const hasFinancialData = terms.some(term => tableText.includes(term));
      
      if (hasFinancialData) {
        console.log(`\n--- Table ${i + 1} (Contains Financial Data) ---`);
        console.log(tableText.substring(0, 800));
        
        // Look for rows with financial data
        const rows = $table.find('tr');
        console.log(`Rows in table: ${rows.length}`);
        
        rows.each((rowIndex, row) => {
          const $row = $(row);
          const rowText = $row.text().trim();
          
          if (terms.some(term => rowText.includes(term))) {
            console.log(`  Row ${rowIndex + 1}: ${rowText}`);
          }
        });
      }
    });
    
    // Also check for specific financial data patterns
    console.log('\n=== FINANCIAL DATA SEARCH ===');
    
    const financialPatterns = [
      { name: 'Aktif Toplamı', pattern: /Aktif Toplamı[\s\S]*?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i },
      { name: 'Net Kar', pattern: /Net Kar[\s\S]*?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i },
      { name: 'Özkaynaklar', pattern: /Özkaynaklar[\s\S]*?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i }
    ];
    
    financialPatterns.forEach(({ name, pattern }) => {
      const match = response.data.match(pattern);
      if (match) {
        console.log(`${name}: ${match[1]}`);
      } else {
        console.log(`${name}: Pattern not found`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPage();