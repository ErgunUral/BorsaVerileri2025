const axios = require('axios');
const cheerio = require('cheerio');

class IsYatirimScraper {
  extractNumbersFromRow(rowText) {
    console.log(`    Analyzing row: ${rowText}`);
    
    // Look for complete Turkish financial numbers: 169.002,7
    const fullNumberPattern = /\d+(?:\.\d{3})*,\d+/g;
    const matches = rowText.match(fullNumberPattern) || [];
    
    console.log(`    Found complete numbers: ${matches.join(', ')}`);
    
    const numbers = [];
    
    for (const match of matches) {
      // Convert Turkish format: 169.002,7 -> 169002700 (in thousands TL)
      const wholePart = match.split(',')[0].replace(/\./g, '');
      const decimalPart = match.split(',')[1];
      
      // Combine and convert to proper scale
      const fullNumber = wholePart + decimalPart.padEnd(3, '0');
      const finalValue = parseInt(fullNumber, 10);
      
      console.log(`    Converted: ${match} -> whole: ${wholePart}, decimal: ${decimalPart} -> ${finalValue}`);
      
      // Only accept reasonable financial values
      if (!isNaN(finalValue) && finalValue > 1000 && finalValue < 1e12) {
        numbers.push(finalValue);
      }
    }
    
    return numbers;
  }

  async scrapeFinancialData(symbol) {
    const url = `https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=${symbol}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      const financialData = {};
      
      // Find the table containing financial data
      const tables = $('table');
      let financialTable = null;
      
      tables.each((i, table) => {
        const $table = $(table);
        const tableText = $table.text();
        
        console.log(`Table ${i + 1} contains: ${tableText.includes('Özkaynaklar') ? 'Özkaynaklar' : ''} ${tableText.includes('Aktif Toplamı') ? 'Aktif Toplamı' : ''} ${tableText.includes('Net Kar') ? 'Net Kar' : ''}`);
        
        // Check if this table contains key financial terms
        if (tableText.includes('Özkaynaklar') || tableText.includes('Net Kar')) {
          financialTable = $table;
          console.log(`Found financial table: Table ${i + 1}`);
          return false; // Break the loop
        }
      });
      
      if (!financialTable) {
        throw new Error('Financial data table not found');
      }
      
      // Extract data from table rows
      const rows = financialTable.find('tr');
      console.log(`Processing ${rows.length} rows...`);
      
      // Financial terms mapping with their expected row patterns
      const financialTerms = {
        ozkaynaklar: /Özkaynaklar/i,
        aktifToplami: /Aktif Toplamı/i,
        netKar: /Dönem Net Kar|Net Kar/i,
        anaOrtaklikPayi: /Ana Ortaklığa Ait Özkaynaklar/i,
        donenVarliklar: /Dönen Varlıklar/i,
        kisaVadeliYukumlulukler: /Kısa Vadeli Yükümlülükler/i
      };
      
      rows.each((i, row) => {
        const $row = $(row);
        const rowText = $row.text().trim();
        
        // Check each financial term
        Object.entries(financialTerms).forEach(([field, pattern]) => {
          if (pattern.test(rowText)) {
            console.log(`\nFound ${field} in row ${i + 1}: ${rowText}`);
            
            // Extract the most recent value (usually the first number after the term)
            const numbers = this.extractNumbersFromRow(rowText);
            if (numbers.length > 0) {
              // Take the first (most recent) value
              const value = numbers[0];
              financialData[field] = value;
              console.log(`  Extracted value: ${value}`);
            }
          }
        });
      });
      
      return financialData;
      
    } catch (error) {
      console.error('Error scraping financial data:', error.message);
      throw error;
    }
  }
}

// Test the scraper
async function testScraper() {
  const scraper = new IsYatirimScraper();
  
  console.log('Testing final İş Yatırım scraper for ASELS...');
  
  try {
    const data = await scraper.scrapeFinancialData('ASELS');
    console.log('\n=== FINAL RESULTS ===');
    console.log('Financial Data:', data);
    
    // Convert to millions for readability
    console.log('\n=== FORMATTED RESULTS (in millions TL) ===');
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'number') {
        console.log(`${key}: ${(value / 1000000).toFixed(2)} million TL`);
      }
    });
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testScraper();